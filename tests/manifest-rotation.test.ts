// Manifest rotation: the plain-language diff (server/manifest-diff.ts) on the two real manifests
// of 12 and 14 November, the 6-hourly check and its "paused" status (server/manifest-watch.ts),
// and the live manifest served only when approved. Offline: no attestation, no provider call.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { createServer } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, type Config } from "../server/app";
import { manifestChanges, rotationDraft } from "../server/manifest-diff";
import {
  manifestPaused,
  MANIFEST_CHECK_MS,
  PROVIDER_UPDATE_PAUSE,
  resetManifestWatch,
  runManifestCheck,
  scheduleManifestCheck,
} from "../server/manifest-watch";
import { validateQualification } from "../shared/contracts";
import { serverMessage } from "../src/server-messages";
import { fakeManifest, fakeManifestDigest, privatemodeReport } from "./fixtures/privatemode-report";

const OLD = new Uint8Array(readFileSync("tests/fixtures/privatemode-manifest-5fa927e3.json"));
const NEW = new Uint8Array(readFileSync("tests/fixtures/privatemode-manifest-d63eb5cf.json"));
const OLD_DIGEST = "5fa927e3b864738da35d427c10ba8e49ebeeb1531e49618899cf95f654d240c1";
const NEW_DIGEST = "d63eb5cf91cb3079fe25a848573a4d0e9d869f462dab4f71fd02bdb372f8e833";
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const edit = (bytes: Uint8Array, change: (m: any) => void) => {
  const m = JSON.parse(new TextDecoder().decode(bytes));
  change(m);
  return new TextEncoder().encode(JSON.stringify(m));
};

const servers: Server[] = [];
afterEach(async () => {
  resetManifestWatch();
  vi.useRealTimers();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});

it("the fixtures are the exact bytes of the two real manifests", () => {
  expect([sha256(OLD), sha256(NEW)]).toEqual([OLD_DIGEST, NEW_DIGEST]);
});

it("the rotation of 14 November names exactly the four kinds of change, none of them a warning", () => {
  const changes = manifestChanges(OLD, NEW);
  expect([...new Set(changes.map((c) => c.kind))].sort()).toEqual(["recovery-key", "snp", "tdx", "workloads"]);
  expect(changes.filter((c) => c.warning)).toEqual([]);
  const text = changes.map((c) => c.text).join("\n");
  expect(text).toContain("8 workloads kept, moved from namespace continuum-a225c8 to continuum-13d78c; 8 of 8 policy hashes are new.");
  expect(text).toContain("AMD minimum firmware (SNP) version raised 28 → 30 (stricter).");
  expect(text).toContain("required security mitigations 15 → 1023 (more required, none dropped: stricter).");
  expect(text).toContain("trusted launch measurement changed");
  expect(text).toContain("RTMR 2 changed");
  expect(text).not.toMatch(/RTMR [013]|MRTD|MRSEAM/);
  expect(text).toContain("The key-recovery owner key changed (new key starts 3082020a02820201009eb7f0");
  // Nothing else: one workload line, three AMD lines, one Intel line, one recovery line.
  expect(changes).toHaveLength(6);
  expect(manifestChanges(OLD, OLD)).toEqual([]);
});

it("an added workload is a warning, listed first", () => {
  const added = edit(NEW, (m) => {
    m.Policies["f".repeat(64)] = {
      SANs: ["continuum-etcd-client", "workload-new-service"],
      WorkloadSecretID: "apps/v1/Deployment/continuum-13d78c/workload-new-service",
    };
  });
  const changes = manifestChanges(OLD, added);
  expect(changes[0]).toEqual({
    kind: "workloads",
    warning: true,
    text: expect.stringMatching(/^Workloads ADDED: workload-new-service \(Deployment\)\. A new service could receive data/),
  });
  expect(changes.filter((c) => c.warning)).toHaveLength(1);
});

it("a lowered AMD minimum, dropped mitigations, more chips or a second recovery key are warnings", () => {
  const looser = edit(OLD, (m) => {
    const snp = m.ReferenceValues.snp[0];
    snp.MinimumTCB.SNPVersion = 27;
    snp.MinimumMitigationVector = 7;
    snp.AllowedChipIDs.push("AB".repeat(64));
    m.SeedshareOwnerPubKeys.push("3082" + "00".repeat(20));
  });
  const warnings = manifestChanges(OLD, looser).filter((c) => c.warning);
  expect(warnings.map((c) => c.kind)).toEqual(["snp", "snp", "snp", "recovery-key"]);
  expect(warnings.map((c) => c.text).join("\n")).toMatch(/SNP\) version LOWERED 28 → 27 \(looser/);
  expect(warnings.map((c) => c.text).join("\n")).toMatch(/mitigations LOOSER 15 → 7 \(mitigations dropped: bit mask 8\)/);
  expect(warnings.map((c) => c.text).join("\n")).toMatch(/allowed AMD chips: 1 added/);
  expect(warnings.map((c) => c.text).join("\n")).toMatch(/MORE key-recovery owner keys \(1 → 2/);
});

it("a field the tool does not know is a warning, never silently accepted", () => {
  const odd = edit(OLD, (m) => {
    m.ReferenceValues.tdx[0].Xfam = "ffffffffffffffff";
    m.ReferenceValues.nvidia = [{ Platform: "H100" }];
    m.Extra = true;
  });
  const warnings = manifestChanges(OLD, odd).filter((c) => c.warning);
  expect(warnings.map((c) => c.kind).sort()).toEqual(["other", "other", "tdx"]);
});

it("the report draft lists the new digest first, keeps the old one, and cannot load until the owner dates it", () => {
  const signed = privatemodeReport({ releaseDigests: [OLD_DIGEST] });
  expect(() => validateQualification(signed)).not.toThrow();
  const draft = rotationDraft(signed, NEW_DIGEST, "2026-11-15");
  expect(draft.releaseDigests).toEqual([NEW_DIGEST, OLD_DIGEST]);
  expect(() => validateQualification(draft)).toThrow();
  expect(rotationDraft(draft, NEW_DIGEST, "2026-11-15").releaseDigests).toEqual([NEW_DIGEST, OLD_DIGEST]);
  expect(signed.releaseDigests).toEqual([OLD_DIGEST]);
});

it("the check pauses on an unapproved live manifest, and on an approved one the server does not serve; it clears by itself", async () => {
  const lines: string[] = [];
  const log = (line: string) => lines.push(line);
  await runManifestCheck(async () => NEW, [OLD_DIGEST], OLD, log);
  expect(manifestPaused()).toBe(true);
  expect(lines.pop()).toBe(
    `CometRow manifest alert: Privatemode published a new deployment manifest ${NEW_DIGEST}; chat is paused until the report approves it (docs/manifest-rotation-20261114.md)`,
  );
  // Approved, but the file on the server is still the old one (and the live manifest is off).
  await runManifestCheck(async () => NEW, [NEW_DIGEST, OLD_DIGEST], OLD, log);
  expect(manifestPaused()).toBe(true);
  expect(lines.pop()).toMatch(/^CometRow manifest alert: the live Privatemode manifest d63eb5cf.* is approved, but the manifest file on the server is another one/);
  // A check that cannot run changes nothing.
  await runManifestCheck(async () => Promise.reject(Error("fetch failed")), [NEW_DIGEST], NEW, log);
  expect(manifestPaused()).toBe(true);
  expect(lines.pop()).toMatch(/^CometRow manifest alert: the manifest check failed \(fetch failed\)\. .*status is unchanged/);
  await runManifestCheck(async () => NEW, [NEW_DIGEST, OLD_DIGEST], NEW, log);
  expect(manifestPaused()).toBe(false);
  expect(lines.pop()).toBe(`CometRow manifest check: the live Privatemode manifest ${NEW_DIGEST} is approved and served.`);
  // With the live manifest on, an approved live manifest is served whatever the file holds.
  resetManifestWatch(true);
  await runManifestCheck(async () => NEW, [NEW_DIGEST, OLD_DIGEST], OLD, log);
  expect(manifestPaused()).toBe(false);
});

it("runs at start and every 6 hours, only for a Privatemode report, never twice at once", async () => {
  vi.useFakeTimers();
  const readLive = vi.fn(async () => fakeManifest);
  const lines: string[] = [];
  const stop = scheduleManifestCheck(privatemodeReport(), "TEST_KEY_NOT_REAL", fakeManifest, (l) => lines.push(l), { readLive });
  await vi.advanceTimersByTimeAsync(0);
  expect(readLive).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(MANIFEST_CHECK_MS);
  expect(readLive).toHaveBeenCalledTimes(2);
  stop();
  await vi.advanceTimersByTimeAsync(MANIFEST_CHECK_MS);
  expect(readLive).toHaveBeenCalledTimes(2);
  expect(lines.every((l) => l.startsWith("CometRow manifest check:"))).toBe(true);
  expect(lines.join()).not.toContain("TEST_KEY_NOT_REAL");
  const hung = vi.fn(() => new Promise<Uint8Array>(() => {}));
  const stopHung = scheduleManifestCheck(privatemodeReport(), "K", fakeManifest, () => {}, { readLive: hung });
  await vi.advanceTimersByTimeAsync(MANIFEST_CHECK_MS * 2);
  expect(hung).toHaveBeenCalledTimes(1);
  stopHung();
  scheduleManifestCheck({ ...privatemodeReport(), provider: "tinfoil" }, "K", undefined, () => {}, { readLive })();
  expect(readLive).toHaveBeenCalledTimes(2);
});

async function listen(extra: Partial<Config> = {}) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({ origin: root, qualification: privatemodeReport(), apiKey: "TEST_KEY_NOT_REAL", providerManifest: fakeManifest, ...extra }),
  );
  return root;
}
async function status(root: string) {
  const response = await fetch(root + "/api/status");
  return { body: await response.json(), cookie: response.headers.get("set-cookie")!.split(";")[0] };
}

it("/api/status says paused during a rotation, the stop switch still wins, and it clears when approved", async () => {
  let stopped = false;
  const root = await listen({ inferenceStopped: () => stopped });
  expect((await status(root)).body.inference.ready).toBe(true);
  await runManifestCheck(async () => NEW, [fakeManifestDigest], fakeManifest, () => {});
  const paused = (await status(root)).body;
  expect(paused.inference).toEqual({ ready: false, reason: PROVIDER_UPDATE_PAUSE });
  expect(paused.operatorNotice).toBe(PROVIDER_UPDATE_PAUSE);
  stopped = true;
  expect((await status(root)).body.inference.reason).toBe("Private chat is paused by the operator.");
  stopped = false;
  await runManifestCheck(async () => fakeManifest, [fakeManifestDigest], fakeManifest, () => {});
  const ready = (await status(root)).body;
  expect(ready.inference.ready).toBe(true);
  expect(ready.operatorNotice).toBeUndefined();
  expect(serverMessage(PROVIDER_UPDATE_PAUSE, "de")).toBe(
    "CometRow prüft ein Update seines KI-Anbieters. Der Chat ist pausiert, bis das Update freigegeben ist.",
  );
});

it("live manifest: served only when the report approves it, else the configured file; never when switched off", async () => {
  const get = async (root: string) => {
    const { cookie } = await status(root);
    const reply = await fetch(root + "/api/inference/privatemode/manifest", { headers: { Cookie: cookie } });
    return reply.status === 200 ? sha256(new Uint8Array(await reply.arrayBuffer())) : reply.status;
  };
  const both = privatemodeReport({ releaseDigests: [NEW_DIGEST, fakeManifestDigest] });
  const root = await listen({ qualification: both });
  // No live read yet (or it failed): the configured file.
  resetManifestWatch(true);
  expect(await get(root)).toBe(fakeManifestDigest);
  // An approved live manifest is served instead of the file.
  await runManifestCheck(async () => NEW, both.releaseDigests, fakeManifest, () => {});
  expect(await get(root)).toBe(NEW_DIGEST);
  // An unapproved live manifest is never served: fail closed to the configured file.
  await runManifestCheck(async () => OLD, both.releaseDigests, fakeManifest, () => {});
  expect(manifestPaused()).toBe(true);
  expect(await get(root)).toBe(fakeManifestDigest);
  // Neither approved: nothing.
  const none = await listen({ qualification: both, providerManifest: new TextEncoder().encode("{}") });
  expect(await get(none)).toBe(503);
  // Switched off: the approved live manifest is not served.
  resetManifestWatch(false);
  await runManifestCheck(async () => NEW, both.releaseDigests, fakeManifest, () => {});
  expect(await get(root)).toBe(fakeManifestDigest);
});
