import { X509Certificate } from "node:crypto";
import { isIP } from "node:net";
import { TLSSocket } from "node:tls";
import type { Request, RequestHandler } from "express";
import ipaddr from "ipaddr.js";

export interface AuthenticatedIngress {
  middleware: RequestHandler;
  clientAddress(request: Request): string | undefined;
}

/** Inactive proxy boundary. The TLS listener must verify a dedicated client CA. */
export function createMutualTlsIngress(config: {
  origin: string;
  peerCertificateSha256: readonly string[];
}): AuthenticatedIngress {
  const origin = new URL(config.origin);
  if (
    origin.protocol !== "https:" ||
    origin.origin !== config.origin ||
    origin.username ||
    origin.password
  )
    throw Error("Authenticated ingress requires an exact HTTPS origin.");
  if (
    config.peerCertificateSha256.length < 1 ||
    config.peerCertificateSha256.length > 2 ||
    config.peerCertificateSha256.some((pin) => !/^[a-f0-9]{64}$/.test(pin)) ||
    new Set(config.peerCertificateSha256).size !==
      config.peerCertificateSha256.length
  )
    throw Error(
      "Configure one or two distinct SHA-256 proxy certificate pins.",
    );
  const pins = new Set(config.peerCertificateSha256);
  const verified = new WeakMap<Request, string>();
  function singleHeader(request: Request, name: string) {
    const values: string[] = [];
    for (let index = 0; index < request.rawHeaders.length; index += 2)
      if (request.rawHeaders[index].toLowerCase() === name)
        values.push(request.rawHeaders[index + 1]);
    return values.length === 1 ? values[0] : undefined;
  }
  return {
    clientAddress: (request) => verified.get(request),
    middleware(request, response, next) {
      verified.delete(request);
      response.setHeader("Cache-Control", "no-store");
      try {
        const socket = request.socket;
        if (
          !(socket instanceof TLSSocket) ||
          !socket.encrypted ||
          !socket.authorized
        )
          throw Error("Unverified transport");
        const raw = socket.getPeerCertificate().raw;
        if (!raw) throw Error("Missing client certificate");
        const certificate = new X509Certificate(raw);
        const now = Date.now();
        if (
          !pins.has(
            certificate.fingerprint256.replaceAll(":", "").toLowerCase(),
          ) ||
          Date.parse(certificate.validFrom) > now ||
          Date.parse(certificate.validTo) <= now
        )
          throw Error("Unapproved client certificate");
        const address = singleHeader(request, "x-privateai-edge-client-ip");
        if (
          singleHeader(request, "host") !== origin.host ||
          singleHeader(request, "x-privateai-edge-proto") !== "https" ||
          !address ||
          address.length > 45 ||
          address.includes("%") ||
          !isIP(address)
        )
          throw Error("Invalid edge metadata");
        verified.set(request, ipaddr.process(address).toString());
        // All downstream consumers must use clientAddress, never forwarded input.
        for (const header of [
          "forwarded",
          "x-forwarded-for",
          "x-forwarded-host",
          "x-forwarded-proto",
          "x-real-ip",
          "x-privateai-client-ip",
          "x-privateai-edge-client-ip",
          "x-privateai-edge-proto",
        ])
          delete request.headers[header];
      } catch {
        response
          .status(403)
          .json({ error: "Authenticated HTTPS ingress required." });
        return;
      }
      next();
    },
  };
}
