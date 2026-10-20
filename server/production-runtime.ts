import { createServer } from "node:https";
import { X509Certificate, createPrivateKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import express from "express";
import { createProductionConsumerCandidate } from "./consumer-workspace";
import type { ProductionAccountCandidateConfig } from "./account-auth";

export interface ProductionRuntimeConfig extends ProductionAccountCandidateConfig {
  ingress: {
    peerCertificateSha256: readonly string[];
    admission?: "client-ip" | "shared";
  };
  tls: { key: Buffer; cert: Buffer; ca: Buffer };
  assets: string;
}

/** Explicit composition only; caller owns the database, sender and activation. */
export async function prepareProductionRuntime(
  config: ProductionRuntimeConfig,
) {
  if (
    !config.ingress ||
    typeof config.deliverCode !== "function" ||
    !isAbsolute(config.assets)
  )
    throw Error("Invalid production runtime configuration.");
  // Validate files and TLS before opening database admission or a listening socket.
  try {
    const leaf = new X509Certificate(config.tls.cert);
    const ca = new X509Certificate(config.tls.ca);
    const now = Date.now();
    for (const certificate of [leaf, ca]) {
      if (
        Date.parse(certificate.validFrom) > now ||
        Date.parse(certificate.validTo) <= now
      )
        throw Error("Certificate outside validity period.");
    }
    if (
      leaf.ca ||
      !ca.ca ||
      !leaf.checkPrivateKey(createPrivateKey(config.tls.key))
    )
      throw Error("Invalid certificate role or key.");
    await readFile(resolve(config.assets, "index.html"));
  } catch {
    throw Error("Production TLS or browser assets are invalid.");
  }
  const server = createServer({
    ...config.tls,
    minVersion: "TLSv1.2",
    requestCert: true,
    rejectUnauthorized: true,
    maxHeaderSize: 16 * 1024,
  });
  const candidate = createProductionConsumerCandidate(config);
  candidate.app.use(
    express.static(config.assets, { index: false, dotfiles: "deny" }),
  );
  candidate.app.get(["/", "/account"], (_req, res) =>
    res.sendFile(resolve(config.assets, "index.html")),
  );
  server.on("request", candidate.app);
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5000;
  let state: "prepared" | "starting" | "listening" | "stopped" = "prepared";
  let stopping: Promise<{ drained: boolean }> | undefined;
  const stop = (deadlineMs = 10_000) => {
    if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30_000)
      throw Error("Invalid drain deadline.");
    if (stopping) return stopping;
    state = "stopped";
    candidate.operations.beginDrain();
    stopping = candidate.operations.shutdown(server, deadlineMs);
    return stopping;
  };
  const listen = async (
    port: number,
    host: "127.0.0.1" | "0.0.0.0" = "127.0.0.1",
  ) => {
    if (
      state !== "prepared" ||
      !Number.isInteger(port) ||
      port < 0 ||
      port > 65535 ||
      !["127.0.0.1", "0.0.0.0"].includes(host)
    )
      throw Error("Invalid runtime listen request.");
    state = "starting";
    if (!(await candidate.ready) || state !== "starting") {
      state = "stopped";
      candidate.operations.beginDrain();
      throw Error("Production startup was not admitted.");
    }
    try {
      await new Promise<void>((done, reject) => {
        const failed = () => {
          server.off("listening", listening);
          reject(Error("Production listener unavailable."));
        };
        const listening = () => {
          server.off("error", failed);
          done();
        };
        server.once("error", failed);
        server.once("listening", listening);
        server.listen(port, host);
      });
      // A stop requested during socket startup must not leave a late listener alive.
      if (state !== "starting") {
        server.closeAllConnections();
        server.close();
        throw Error("Production startup was cancelled.");
      }
      state = "listening";
      return (server.address() as { port: number }).port;
    } catch {
      state = "stopped";
      candidate.operations.beginDrain();
      throw Error("Production listener unavailable.");
    }
  };
  return { ...candidate, server, listen, stop };
}
