/**
 * The browser sync engine (docs/vault-sync-20261115.md). It reads the vault, encrypts each item
 * under a key derived from the account key (AK) and pushes it; it pulls newer items, decrypts,
 * merges (src/sync/merge.ts) and writes them into the vault. Nothing leaves the device unencrypted.
 * The vault holds AK while unlocked; this engine never keeps it longer than the vault does.
 */
import { deleteDB, openDB, type IDBPDatabase } from "idb";
import { z } from "zod";
import type { Conversation } from "../../shared/contracts";
import type { ScheduledTask } from "../../shared/scheduled-tasks";
import { ConversationDeletedError, VaultConflictError, type TaskMasks, type Vault } from "../vault";
import { seal, unseal, type Cipher } from "../vault-crypto";
import { savedConversationSchema } from "../saved-conversation";
import { memoriesSchema, type Memory } from "../memory";
import { holdProjects, projectFilesSchema, projectsSchema, type Project, type ProjectFile } from "../projects";
import { scheduledTasksSchema } from "../scheduled";
import * as k from "./crypto";
import { mergeById, mergeConversation } from "./merge";
import {
  FILES_OFF,
  bindFileActions,
  fileRecordSchema,
  projectsDataSchema,
  publishFiles,
  type FileEntry,
  type FileRecord,
  type DownloadResult,
  type FileState,
  type FilesView,
  type ProjectsData,
} from "./files";

export type SyncPhase = "off" | "locked" | "needs-approval" | "syncing" | "idle" | "error";
export interface SyncDevice {
  deviceId: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  thisDevice: boolean;
  revoked: boolean;
}
export interface SyncState {
  phase: SyncPhase;
  lastSyncAt?: string;
  pending: number;
  error?: string;
  quota?: { usedBytes: number; limitBytes: number };
  devices: SyncDevice[];
  /** An existing unlocked device: another device asked to be approved (the prompt opens by itself). */
  pairingRequested?: boolean;
}
export type SyncErrorCode =
  | "unlock-first"
  | "already-set-up"
  | "not-set-up"
  | "rate-limited"
  | "device-limit"
  | "offline"
  | "server"
  | "quota"
  | "revoked"
  | "needs-local-passphrase"
  | "locked"
  | "wrong-confirmation"
  | "code-mismatch";
/** A refusal the screens explain; `code` names it. */
export class SyncError extends Error {
  constructor(public code: SyncErrorCode) {
    super(`Sync: ${code}`);
  }
}
class Retry extends Error {}

/** Bytes bodies and responses are for project-file blobs (Stage 3) only. */
export type Fetcher = (
  path: string,
  init: { method: string; headers: Record<string, string>; body?: string | Uint8Array<ArrayBuffer> },
) => Promise<{ status: number; json(): Promise<unknown>; arrayBuffer?(): Promise<ArrayBuffer>; body?: ReadableStream<Uint8Array> | null }>;
export interface EngineOptions {
  vault: Vault;
  accountId: string;
  csrf: () => string;
  fetch?: Fetcher;
  /** The local sync database (default cometrow-sync-<accountId>); tests give each simulated device its own. */
  storeName?: string;
  /** Pairing poll interval (tests shorten it). */
  pollMs?: number;
  onState?: (state: SyncState) => void;
  /** After remote changes were written into the vault: the screens reload their lists. */
  onApplied?: () => void;
  /** Project files' sync view (Stage 3); default: the shared one the project screen reads. */
  onFiles?: (view: FilesView) => void;
}
type FileQuota = NonNullable<FilesView["quota"]>;

type Kind = "conversation" | "memories" | "projects" | "scheduled-tasks";
const LIST_KINDS = ["projects", "memories", "scheduled-tasks"] as const;
interface DeviceRecord {
  deviceId: string;
  token: string;
  label: string;
  remembered: boolean;
  keyPair?: CryptoKeyPair;
  wrapper?: string;
}
interface BaseEntry {
  itemId: string;
  kind?: Kind;
  localId?: string;
  version: number;
  deleted: boolean;
  hash?: string;
  sealed?: Cipher;
}
interface LocalItem {
  itemId: string;
  kind: Kind;
  localId: string;
  data: unknown;
  text: string;
}
type TaskData = { tasks: ScheduledTask[]; masks: TaskMasks };
const RESET_CONFIRMATION = "DELETE SYNCED DATA";
const CONCURRENCY = 6;
const itemPayload = z.object({ kind: z.enum(["conversation", "memories", "projects", "scheduled-tasks"]), data: z.unknown() }).strict();
const taskData = z.object({ tasks: scheduledTasksSchema, masks: z.record(z.string(), z.unknown()) }).strict();
const newestAt = (c: Conversation) => c.messages.reduce((t, m) => (m.at && m.at > t ? m.at : t), "");
const omitPin = ({ pinned: _p, ...m }: Memory): Memory => m;

const realFetch: Fetcher = async (path, init) => {
  const r = await fetch(path, { ...init, credentials: "same-origin" });
  return { status: r.status, json: () => r.json(), arrayBuffer: () => r.arrayBuffer(), body: r.body };
};
const FILE_LABEL = "sync-files";
const stripHere = ({ here: _h, ...entry }: FileRecord["entries"][number]): FileEntry => entry;

export class SyncEngine {
  private db?: Promise<IDBPDatabase>;
  private device?: DeviceRecord;
  private optedOut = false;
  private hasWrappers = false;
  private serverOn = true;
  private state: SyncState = { phase: "off", pending: 0, devices: [] };
  private chain: Promise<void> = Promise.resolve();
  private queued?: Promise<void>;
  private again = false;
  private failures = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pendingSetup?: { ak: Uint8Array<ArrayBuffer>; rk: { bytes: Uint8Array<ArrayBuffer>; text: string }; deviceLabel: string; rememberDevice: boolean };
  private ids = new Map<string, string>();
  private fetcher: Fetcher;
  private applying = false;
  private stopped = false;
  private storeName: string;
  // Stage 3: project files. `files` is set while the server keeps blobs (from /state).
  private files?: FileQuota;
  private fileStates: Record<string, FileState> = {};
  private remote: FileEntry[] = [];
  private fileLock: Promise<unknown> = Promise.resolve();
  private view: FilesView = FILES_OFF;
  constructor(private o: EngineOptions) {
    this.fetcher = o.fetch ?? realFetch;
    this.storeName = o.storeName ?? `cometrow-sync-${o.accountId}`;
  }

  // Local storage of sync: this device's key and token, the merge bases and the cursor.
  private store() {
    this.db ??= openDB(this.storeName, 1, {
      upgrade(d) {
        d.createObjectStore("device");
        d.createObjectStore("base");
        d.createObjectStore("meta");
      },
    });
    return this.db;
  }
  private async saveDevice(record: DeviceRecord | undefined) {
    this.device = record;
    const d = await this.store();
    if (record) await d.put("device", record, "this");
    else await d.delete("device", "this");
  }
  private async forgetSyncState() {
    const d = await this.store();
    const tx = d.transaction(["base", "meta"], "readwrite");
    await tx.objectStore("base").clear();
    await tx.objectStore("meta").delete("cursor");
    await tx.objectStore("meta").delete("files");
    await tx.done;
    this.remote = [];
    this.fileStates = {};
    this.publishView();
  }
  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    this.o.onState?.(this.state);
  }
  getState() {
    return this.state;
  }

  private async call(
    method: string,
    path: string,
    body?: unknown,
    header = this.device && `${this.device.deviceId}.${this.device.token}`,
    handleRevoked = true,
    /** A blob download: a 200 response is returned unread. */
    bytes = false,
  ) {
    let r: Awaited<ReturnType<Fetcher>>;
    const raw = body instanceof Uint8Array;
    try {
      r = await this.fetcher(`/api/sync${path}`, {
        method,
        headers: {
          ...(method === "GET" ? {} : { "X-PrivateAI-CSRF": this.o.csrf() }),
          ...(body === undefined ? {} : { "Content-Type": raw ? "application/octet-stream" : "application/json" }),
          ...(header ? { "X-Sync-Device": header } : {}),
        },
        ...(body === undefined ? {} : { body: raw ? (body as Uint8Array<ArrayBuffer>) : JSON.stringify(body) }),
      });
    } catch {
      throw new SyncError("offline");
    }
    const data = (r.status === 204 || (bytes && r.status === 200) ? {} : await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (handleRevoked && ((r.status === 403 && data.code === "revoked") || (r.status === 401 && data.code === "device-unknown"))) {
      await this.revokedHere();
      throw new SyncError("revoked");
    }
    if (r.status >= 500) throw new SyncError("server");
    if (r.status === 429) throw new SyncError("rate-limited");
    return { status: r.status, data, response: r };
  }
  /** This device was removed from another one: forget its key, lock the vault, keep local data. */
  private async revokedHere() {
    await this.saveDevice(undefined);
    await this.forgetSyncState();
    this.o.vault.lock();
    this.o.vault.onInvalidate?.();
    this.set({ phase: "needs-approval", error: "revoked" });
  }

  /** Loads this device's record; a remembered device unlocks the vault with its key. */
  async init() {
    const d = await this.store();
    this.device = await d.get("device", "this");
    this.optedOut = !!(await d.get("meta", "optedOut"));
    this.o.vault.onSync = (event) => {
      if (event === "unlocked") void this.onUnlocked();
      else if (!this.applying) this.later(2000);
    };
    await this.unlockThisDevice().catch(() => {});
    await this.refresh().catch(() => {});
    if (this.o.vault.unlocked) await this.syncNow().catch(() => {});
  }
  /**
   * A remembered device opens its vault with its own key (also offline: the wrapper is cached
   * here), at start and after any lock (idle timer, another tab). "not-remembered": use the local
   * passphrase, the recovery key or another device.
   */
  async unlockThisDevice(): Promise<"ok" | "not-remembered"> {
    const d = this.device;
    if (this.o.vault.unlocked) return "ok";
    if (!d?.remembered || !d.keyPair || !d.wrapper) return "not-remembered";
    const ak = await k.unwrapWithDevice(d.wrapper, d.keyPair.privateKey, this.o.accountId, d.deviceId);
    await this.bindAccountKey(ak);
    this.set({ phase: this.phase() });
    return "ok";
  }
  /** Timers: every 60 s while visible, on focus, 2 s after a local save, backoff after errors. */
  start() {
    if (typeof window === "undefined") return;
    const tick = () => {
      if (document.visibilityState === "visible") void this.syncNow().catch(() => {});
    };
    const every = setInterval(tick, 60_000);
    // A light poll (state only) so a waiting new device is noticed within seconds.
    const light = setInterval(() => {
      if (document.visibilityState === "visible" && this.o.vault.accountKey()) void this.refresh().catch(() => {});
    }, 10_000);
    window.addEventListener("focus", tick);
    this.stop = () => {
      this.stopped = true;
      clearInterval(every);
      clearInterval(light);
      window.removeEventListener("focus", tick);
      this.timers.forEach(clearTimeout);
    };
  }
  stop() {
    this.stopped = true;
    this.timers.forEach(clearTimeout);
  }
  get vault() {
    return this.o.vault;
  }
  detach() {
    this.stop();
    this.o.vault.onSync = undefined;
    if (!this.o.onFiles) bindFileActions(undefined);
    (this.o.onFiles ?? publishFiles)(FILES_OFF);
  }
  private later(ms: number) {
    if (this.stopped || !this.device) return;
    this.timers.forEach(clearTimeout);
    this.timers = [setTimeout(() => void this.syncNow().catch(() => {}), ms)];
  }
  private async onUnlocked() {
    // Opened without AK (a passphrase vault whose move did not finish, or a synced vault opened by
    // another local unlocker): open it again with AK, moving it first when it is still a passphrase vault.
    const vault = this.o.vault;
    if (this.device?.keyPair && this.device.wrapper && !vault.accountKey()) {
      try {
        const ak = await k.unwrapWithDevice(this.device.wrapper, this.device.keyPair.privateKey, this.o.accountId, this.device.deviceId);
        if ((await vault.mode()) === "sync") await vault.unlockWithAccountKey(ak);
        else await vault.adoptAccountKey(ak);
      } catch {
        return;
      }
    }
    void this.syncNow().catch(() => {});
  }
  /** Opens (or moves) the local vault under AK; see Vault.unlockWithAccountKey and adoptAccountKey. */
  private async bindAccountKey(ak: Uint8Array) {
    const vault = this.o.vault;
    if (vault.unlocked) {
      if (!vault.hasAccountKey(ak)) await vault.adoptAccountKey(ak);
    } else {
      if ((await vault.mode()) === "passphrase") throw new SyncError("unlock-first");
      try {
        await vault.unlockWithAccountKey(ak);
      } catch {
        throw new SyncError("unlock-first");
      }
    }
    // The vault was opened or moved: the screens reload what they show.
    this.o.onApplied?.();
  }
  private async requireUsableVault() {
    if (!this.o.vault.unlocked && (await this.o.vault.mode()) === "passphrase") throw new SyncError("unlock-first");
  }

  async refresh() {
    const r = await this.call("GET", "/state");
    if (r.status === 404 || r.status === 401) {
      this.serverOn = r.status !== 404;
      this.set({ phase: "off", devices: [] });
      return;
    }
    const s = r.data as {
      hasWrappers: boolean;
      thisDevice: string;
      pairingPending?: boolean;
      devices: { deviceId: string; labelCiphertext: string; createdAt: string; lastSeenAt: string; revoked: boolean }[];
      quota: { usedBytes: number; limitBytes: number };
      files?: FileQuota;
    };
    this.hasWrappers = s.hasWrappers;
    this.files = s.files;
    if (s.thisDevice === "revoked" || (this.device && s.thisDevice === "unknown" && s.hasWrappers)) await this.revokedHere();
    else if (this.device && !s.hasWrappers) {
      // The synced data was reset from another device: this one is no longer part of it.
      await this.saveDevice(undefined);
      await this.forgetSyncState();
    }
    const ak = this.o.vault.accountKey();
    const devices = await Promise.all(
      s.devices.map(async (d) => ({
        deviceId: d.deviceId,
        label: ak ? await k.decryptLabel(ak, this.o.accountId, d.deviceId, d.labelCiphertext).catch(() => "") : "",
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt,
        thisDevice: d.deviceId === this.device?.deviceId,
        revoked: d.revoked,
      })),
    );
    this.set({ quota: s.quota, devices, phase: this.phase(), pairingRequested: !!s.pairingPending && !!ak });
    this.publishView();
  }
  private phase(): SyncPhase {
    if (!this.serverOn || this.optedOut) return "off";
    if (!this.device) return this.hasWrappers ? "needs-approval" : "off";
    if (!this.o.vault.accountKey()) return "locked";
    return this.state.phase === "error" || this.state.phase === "syncing" ? this.state.phase : "idle";
  }

  // Setup on the first device.
  async setUp(opts: { deviceLabel: string; rememberDevice: boolean }) {
    await this.requireUsableVault();
    const s = await this.call("GET", "/state");
    if (s.status === 404) throw new SyncError("not-set-up");
    if ((s.data as { hasWrappers?: boolean }).hasWrappers) throw new SyncError("already-set-up");
    const rk = k.newRecoveryKey();
    this.pendingSetup = { ak: k.newAccountKey(), rk, ...opts };
    return { recoveryKey: rk.text };
  }
  /** Sync starts only after the user typed the recovery key's last group back. */
  async confirmRecoveryKeySaved(lastGroup: string) {
    const p = this.pendingSetup;
    if (!p) throw new SyncError("not-set-up");
    if (lastGroup.toUpperCase().replace(/[\s-]/g, "") !== p.rk.text.slice(-4)) return false;
    const deviceId = crypto.randomUUID();
    const token = k.toBase64(k.random(32)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const keyPair = await k.newDeviceKeyPair();
    const pub = await k.exportPublicKey(keyPair.publicKey);
    const wrapper = await k.wrapToDevice(p.ak, pub, this.o.accountId, deviceId);
    const r = await this.call(
      "POST",
      "/setup",
      {
        deviceId,
        devicePublicKey: k.toBase64(pub),
        deviceWrapper: p.rememberDevice ? wrapper : null,
        recoveryWrapper: await k.wrapWithRecovery(p.ak, p.rk.bytes, this.o.accountId),
        labelCiphertext: await k.encryptLabel(p.ak, this.o.accountId, deviceId, p.deviceLabel),
        accountProof: await k.accountProof(p.ak, this.o.accountId),
        recoveryProof: await k.recoveryProof(p.rk.bytes, this.o.accountId),
      },
      `${deviceId}.${token}`,
    );
    if (r.status === 409) throw new SyncError("already-set-up");
    if (r.status !== 204) throw new SyncError("server");
    // Server first, then this device's record, then the move of the vault: a failure in between
    // leaves the vault as it was, and the move is repeated at the next unlock (onUnlocked).
    await this.saveDevice({ deviceId, token, label: p.deviceLabel, remembered: p.rememberDevice, ...(p.rememberDevice ? { keyPair, wrapper } : {}) });
    await this.setOptedOut(false);
    this.pendingSetup = undefined;
    await this.bindAccountKey(p.ak);
    await this.syncNow();
    return true;
  }
  private async setOptedOut(value: boolean) {
    this.optedOut = value;
    const d = await this.store();
    if (value) await d.put("meta", true, "optedOut");
    else await d.delete("meta", "optedOut");
  }
  private newToken() {
    return k.toBase64(k.random(32)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  // Pairing: the new device asks and shows the code; an existing device approves.
  async startPairing(opts: { rememberDevice?: boolean; deviceLabel?: string } = {}) {
    await this.requireUsableVault();
    const remember = opts.rememberDevice ?? true;
    const deviceId = crypto.randomUUID();
    const token = this.newToken();
    const keyPair = await k.newDeviceKeyPair();
    const pub = await k.exportPublicKey(keyPair.publicKey);
    const header = `${deviceId}.${token}`;
    const r = await this.call("POST", "/pairings", { newDevicePublicKey: k.toBase64(pub), deviceId }, header);
    if (r.status === 404) throw new SyncError("not-set-up");
    if (r.status !== 200) throw new SyncError("server");
    const { pairingId, code, expiresAt } = r.data as { pairingId: string; code: string; expiresAt: string };
    // The code is computed here from this device's own key, never taken from the server.
    const local = await k.pairingCode(this.o.accountId, pub);
    if (local !== code) throw new SyncError("code-mismatch");
    const wait = (async (): Promise<"approved" | "expired" | "refused"> => {
      while (Date.now() < Date.parse(expiresAt) + 5000) {
        const res = await this.call("GET", `/pairings/${pairingId}/result`, undefined, header).catch((e) => {
          if (e instanceof SyncError && (e.code === "offline" || e.code === "server")) return { status: 0, data: {} as Record<string, unknown> };
          throw e;
        });
        if (res.status === 200) {
          const wrapper = String(res.data.deviceWrapper);
          const ak = await k.unwrapWithDevice(wrapper, keyPair.privateKey, this.o.accountId, deviceId);
          await this.saveDevice({ deviceId, token, label: opts.deviceLabel ?? "", remembered: remember, ...(remember ? { keyPair, wrapper } : {}) });
          await this.setOptedOut(false);
          if (!remember)
            await this.call("POST", "/devices", {
              deviceId,
              devicePublicKey: k.toBase64(pub),
              deviceWrapper: null,
              labelCiphertext: await k.encryptLabel(ak, this.o.accountId, deviceId, opts.deviceLabel ?? ""),
              accountProof: await k.accountProof(ak, this.o.accountId),
            });
          await this.bindAccountKey(ak);
          await this.syncNow().catch(() => {});
          return "approved";
        }
        if (res.status === 410) return "expired";
        if (res.status === 403) return "refused";
        await new Promise((resolve) => setTimeout(resolve, this.o.pollMs ?? 2000));
      }
      return "expired";
    })();
    return { code: local, wait };
  }
  async approvePairing(code: string, deviceLabel: string): Promise<"approved" | "wrong-code" | "expired"> {
    const ak = this.o.vault.accountKey();
    if (!ak || !this.device) throw new SyncError("locked");
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return "wrong-code";
    const found = await this.call("POST", "/pairings/find", { code: code.replace(/\s/g, "") });
    if (found.status === 404) return "wrong-code";
    if (found.status !== 200) throw new SyncError("server");
    const { pairingId, deviceId, newDevicePublicKey } = found.data as { pairingId: string; deviceId: string; newDevicePublicKey: string };
    const pub = k.fromBase64(newDevicePublicKey);
    // A key swapped on the way gives another code: refuse it (docs: "Pairing").
    if ((await k.pairingCode(this.o.accountId, pub)) !== code.replace(/\s/g, "")) return "wrong-code";
    const r = await this.call("POST", `/pairings/${pairingId}/approve`, {
      deviceWrapper: await k.wrapToDevice(ak, pub, this.o.accountId, deviceId),
      labelCiphertext: await k.encryptLabel(ak, this.o.accountId, deviceId, deviceLabel),
    });
    if (r.status === 410) return "expired";
    if (r.status === 409) throw new SyncError("device-limit");
    if (r.status !== 204) throw new SyncError("server");
    await this.refresh().catch(() => {});
    return "approved";
  }

  /**
   * The recovery key opens this account's synced data on a new device, and also on this device
   * when it is locked: a forgotten local passphrase is replaced afterwards with setLocalPassphrase.
   */
  async unlockWithRecoveryKey(text: string, opts: { deviceLabel: string; rememberDevice: boolean }): Promise<"ok" | "wrong-key"> {
    const rk = k.decodeRecoveryKey(text);
    if (!rk) return "wrong-key";
    const r = await this.call("GET", "/wrappers");
    if (r.status === 404) throw new SyncError("not-set-up");
    if (r.status !== 200) throw new SyncError("server");
    let ak: Uint8Array<ArrayBuffer>;
    try {
      ak = await k.unwrapWithRecovery(String(r.data.recovery), rk, this.o.accountId);
    } catch {
      return "wrong-key";
    }
    await this.bindAccountKey(ak);
    await this.register(ak, opts.deviceLabel, opts.rememberDevice, rk);
    await this.setOptedOut(false);
    await this.syncNow().catch(() => {});
    return "ok";
  }
  /** Registers this browser (or changes its own wrapper) with proof of AK. */
  private async register(ak: Uint8Array, label: string, remember: boolean, rk?: Uint8Array) {
    for (let attempt = 0; attempt < 2; attempt++) {
      // A new id needs the recovery key's proof (server/vault-sync.ts); without it only this id is updated.
      const reuse = attempt === 0 ? this.device : undefined;
      if (!reuse && !rk) throw new SyncError("revoked");
      const deviceId = reuse?.deviceId ?? crypto.randomUUID();
      const token = reuse?.token ?? this.newToken();
      const keyPair = reuse?.keyPair ?? (await k.newDeviceKeyPair());
      const pub = await k.exportPublicKey(keyPair.publicKey);
      const wrapper = remember ? await k.wrapToDevice(ak, pub, this.o.accountId, deviceId) : null;
      const body = {
        deviceId,
        devicePublicKey: k.toBase64(pub),
        deviceWrapper: wrapper,
        labelCiphertext: await k.encryptLabel(ak, this.o.accountId, deviceId, label),
        accountProof: await k.accountProof(ak, this.o.accountId),
        ...(rk ? { recoveryProof: await k.recoveryProof(rk, this.o.accountId) } : {}),
      };
      const r = await this.call("POST", "/devices", body, `${deviceId}.${token}`, false);
      // This browser's old entry was removed: register it again under a new id.
      if (r.status === 403 && r.data.code !== "wrong-proof" && attempt === 0) continue;
      if (r.status === 403) throw new SyncError("revoked");
      if (r.status === 409) throw new SyncError("device-limit");
      if (r.status !== 204) throw new SyncError("server");
      await this.saveDevice({ deviceId, token, label, remembered: remember, ...(remember && wrapper ? { keyPair, wrapper } : {}) });
      return;
    }
    throw new SyncError("server");
  }
  /** "Remember this device" on or off for a device that already syncs. */
  async setRememberDevice(remember: boolean) {
    const ak = this.o.vault.accountKey();
    if (!ak || !this.device) throw new SyncError("locked");
    await this.register(ak, this.device.label, remember);
  }
  async revokeDevice(deviceId: string) {
    if (!this.device) throw new SyncError("locked");
    const r = await this.call("POST", `/devices/${deviceId}/revoke`);
    if (r.status !== 204 && r.status !== 404) throw new SyncError("server");
    if (deviceId === this.device.deviceId) {
      await this.saveDevice(undefined);
      await this.forgetSyncState();
    }
    await this.refresh().catch(() => {});
  }
  /**
   * Deletes all synced data and wrappers on the server (when the recovery key and every device are
   * lost, or to start over). Local data stays; an unlocked vault needs a local passphrase first,
   * since no device key or recovery key will open it afterwards.
   */
  async resetSync(confirm: string, opts: { localPassphrase?: string } = {}) {
    if (confirm !== RESET_CONFIRMATION) throw new SyncError("wrong-confirmation");
    await this.keepLocalAccess(opts.localPassphrase);
    const r = await this.call("POST", "/reset", { confirm });
    if (r.status !== 204) throw new SyncError("server");
    await this.saveDevice(undefined);
    await this.forgetSyncState();
    this.hasWrappers = false;
    await this.refresh().catch(() => {});
  }
  private async keepLocalAccess(localPassphrase?: string) {
    const vault = this.o.vault;
    if (!vault.accountKey()) return;
    if (localPassphrase) await vault.setLocalPassphrase(localPassphrase);
    else if (!(await vault.hasLocalPassphrase())) throw new SyncError("needs-local-passphrase");
  }
  /** Keeps local data (opened by the local passphrase from now on) and forgets this device's wrapper. */
  async turnOffSyncOnThisDevice(opts: { localPassphrase?: string } = {}) {
    if (!this.o.vault.unlocked && (await this.o.vault.mode()) === "sync" && !(await this.o.vault.hasLocalPassphrase()))
      throw new SyncError("locked");
    await this.keepLocalAccess(opts.localPassphrase);
    if (this.device) await this.call("POST", `/devices/${this.device.deviceId}/revoke`).catch(() => {});
    await this.saveDevice(undefined);
    await this.forgetSyncState();
    await this.setOptedOut(true);
    this.set({ phase: "off", pending: 0 });
  }
  /** "Delete everything on this device"; with `alsoDeleteSyncedData` the server copy goes too. */
  async deleteEverythingOnThisDevice(opts: { alsoDeleteSyncedData: boolean }) {
    if (opts.alsoDeleteSyncedData) {
      const r = await this.call("POST", "/reset", { confirm: RESET_CONFIRMATION });
      if (r.status !== 204) throw new SyncError("server");
    } else if (this.device) await this.call("POST", `/devices/${this.device.deviceId}/revoke`).catch(() => {});
    this.stop();
    (await this.store()).close();
    this.db = undefined;
    this.device = undefined;
    await deleteDB(this.storeName);
    await this.o.vault.eraseEverything();
    this.set({ phase: "off", pending: 0, devices: [] });
  }

  // The sync cycle.
  /** Cycles never overlap: a call during a cycle waits for one more cycle after it (at most one queued). */
  syncNow(): Promise<void> {
    if (this.queued) return this.queued;
    const next = this.chain.catch(() => {}).then(() => {
      this.queued = undefined;
      return this.cycle();
    });
    this.queued = next;
    this.chain = next;
    return next;
  }
  private async cycle() {
    const ak = this.o.vault.accountKey();
    if (!this.device || this.optedOut || !ak) {
      this.set({ phase: this.phase() });
      return;
    }
    this.set({ phase: "syncing" });
    try {
      let waiting = 0;
      let error: string | undefined;
      // A conflict merged during the push is pushed in the same cycle (bounded).
      for (let round = 0; round < 3; round++) {
        this.again = false;
        await this.pull(ak);
        // A file's blob goes up before the projects item that lists it.
        const uploads = await this.uploadFiles(ak);
        ({ waiting, error } = await this.push(ak));
        waiting += uploads;
        if (!this.again) break;
      }
      // A blob goes only after the projects item without it was accepted.
      waiting += await this.deleteBlobs(ak);
      await this.refresh();
      this.failures = 0;
      this.set({ phase: error ? "error" : "idle", pending: waiting, lastSyncAt: new Date().toISOString(), error });
    } catch (error) {
      if (error instanceof Retry || (error as { problem?: string }).problem === "changed") {
        this.set({ phase: "idle" });
        this.later(1000);
        return;
      }
      const code = error instanceof SyncError ? error.code : "server";
      if (code === "revoked") throw error;
      this.failures++;
      this.set({ phase: "error", error: code, pending: await this.pendingCount().catch(() => this.state.pending) });
      // Backoff: 5 s, 10 s, 20 s ... at most 5 minutes; the queue is the vault itself, so nothing is lost.
      if (code !== "quota") this.later(Math.min(300_000, 5000 * 2 ** (this.failures - 1)));
      throw error;
    }
  }
  private async itemId(kind: Kind, localId: string, ak: Uint8Array) {
    const key = `${kind}|${localId}`;
    let id = this.ids.get(key);
    if (!id) this.ids.set(key, (id = await k.itemIdFor(ak, kind, localId)));
    return id;
  }
  /** The vault's current content as sync items. Incognito chats and project files are never items. */
  private async snapshot(ak: Uint8Array) {
    const vault = this.o.vault;
    const items = new Map<string, LocalItem>();
    const add = async (kind: Kind, localId: string, data: unknown) => {
      const itemId = await this.itemId(kind, localId, ak);
      items.set(itemId, { itemId, kind, localId, data, text: JSON.stringify(data) });
    };
    for (const c of (await vault.readAvailable()).conversations) if (!c.incognito) await add("conversation", c.id, c);
    const projects = await vault.readProjects();
    await add("projects", "projects", { projects, files: await this.manifest(ak, projects) } satisfies ProjectsData);
    await add("memories", "memories", await vault.readMemories());
    await add("scheduled-tasks", "scheduled-tasks", { tasks: await vault.readTasks(), masks: await vault.readTaskMasks() });
    const tombstones = await vault.readTombstones();
    return { items, tombstones };
  }
  private async bases() {
    const d = await this.store();
    return new Map(((await d.getAll("base")) as BaseEntry[]).map((b) => [b.itemId, b]));
  }
  private async putBase(entry: BaseEntry) {
    await (await this.store()).put("base", entry, entry.itemId);
  }
  private async baseEntry(ak: Uint8Array, itemId: string, kind: Kind, localId: string, version: number, data: unknown): Promise<BaseEntry> {
    const text = JSON.stringify(data);
    return { itemId, kind, localId, version, deleted: false, hash: await k.baseHash(ak, text), sealed: await seal(await k.baseKey(ak), text, `sync-base|${itemId}`) };
  }
  private async baseData(ak: Uint8Array, base?: BaseEntry): Promise<unknown> {
    return base?.sealed ? JSON.parse(await unseal(await k.baseKey(ak), base.sealed, `sync-base|${base.itemId}`)) : undefined;
  }

  private async pull(ak: Uint8Array) {
    const d = await this.store();
    let cursor = String((await d.get("meta", "cursor")) ?? "0");
    let local = await this.snapshot(ak);
    for (;;) {
      const r = await this.call("GET", `/items?since=${encodeURIComponent(cursor)}&limit=200`);
      if (r.status !== 200) throw new SyncError(r.status === 401 ? "revoked" : "server");
      const page = r.data as { items: { itemId: string; version: number; ciphertext: string | null; deleted: boolean; updatedAt: string }[]; cursor: string; more: boolean };
      const bases = await this.bases();
      // Decrypt the page, then apply lists before conversations so a project exists before its chats.
      const decoded: { item: (typeof page.items)[number]; payload?: z.infer<typeof itemPayload> }[] = [];
      for (const item of page.items) {
        const base = bases.get(item.itemId);
        // Never backwards: an older version than the one synced here is ignored (rollback by the server).
        if (base && item.version <= base.version) continue;
        if (item.deleted || !item.ciphertext) decoded.push({ item });
        else {
          const payload = itemPayload.safeParse(await k.decryptItem(ak, this.o.accountId, item.itemId, item.version, item.ciphertext).catch(() => undefined));
          // An item that does not decrypt or parse is not ours to apply; the local version wins at the next push.
          if (!payload.success) {
            await this.putBase({ itemId: item.itemId, version: item.version, deleted: false, kind: base?.kind, localId: base?.localId, hash: "unreadable" });
            continue;
          }
          decoded.push({ item, payload: payload.data });
        }
      }
      decoded.sort((a, b) => Number(a.payload?.kind === "conversation") - Number(b.payload?.kind === "conversation"));
      let applied = false;
      for (const { item, payload } of decoded) {
        applied = (await this.apply(ak, item, payload, bases.get(item.itemId), local.items)) || applied;
        if (applied && payload?.kind !== "conversation") local = await this.snapshot(ak);
      }
      cursor = page.cursor;
      await d.put("meta", cursor, "cursor");
      if (applied) this.o.onApplied?.();
      if (!page.more) break;
      local = await this.snapshot(ak);
    }
  }
  /** Writes one remote item into the vault, merged with local changes; true when the vault changed. */
  private async apply(
    ak: Uint8Array,
    item: { itemId: string; version: number; updatedAt: string },
    payload: z.infer<typeof itemPayload> | undefined,
    base: BaseEntry | undefined,
    local: Map<string, LocalItem>,
  ): Promise<boolean> {
    const vault = this.o.vault;
    const mine = local.get(item.itemId);
    const localChanged = !!mine && (!base || base.hash !== (await k.baseHash(ak, mine.text)));
    this.applying = true;
    try {
      if (!payload) {
        await this.putBase({ itemId: item.itemId, kind: base?.kind, localId: base?.localId, version: item.version, deleted: true });
        if (mine?.kind !== "conversation") return false;
        const conversation = mine.data as Conversation;
        // A delete wins over an older edit; an edit made here after it is kept as a copy.
        if (localChanged && newestAt(conversation) > item.updatedAt) await this.saveCopy(conversation);
        await vault.delete(conversation.id);
        return true;
      }
      const { kind, data } = payload;
      let next: unknown;
      if (kind === "conversation") {
        const remote = savedConversationSchema.parse(data) as Conversation;
        // Deleted here, edited elsewhere since: the delete stands, the newer edit survives as a copy.
        if (!mine && base && !base.deleted && base.hash !== (await k.baseHash(ak, JSON.stringify(remote))) && (await vault.readTombstones()).includes(remote.id)) {
          await this.saveCopy(remote);
          await this.putBase(await this.baseEntry(ak, item.itemId, kind, remote.id, item.version, remote));
          return true;
        }
        if (!mine) next = remote;
        else if (!localChanged) next = remote;
        else {
          const merged = mergeConversation((await this.baseData(ak, base)) as Conversation | undefined, mine.data as Conversation, remote);
          if (savedConversationSchema.safeParse(merged).success) next = merged;
          else {
            await this.saveCopy(mine.data as Conversation);
            next = remote;
          }
        }
        await this.putBase(await this.baseEntry(ak, item.itemId, kind, remote.id, item.version, remote));
        if (mine && JSON.stringify(next) === mine.text) return false;
        await this.writeConversation(next as Conversation);
        return true;
      }
      const remote = this.parseList(kind, data);
      const baseList = this.parseList(kind, await this.baseData(ak, base));
      next = !mine || !localChanged ? remote : this.mergeList(kind, baseList, mine.data, remote);
      await this.putBase(await this.baseEntry(ak, item.itemId, kind, kind, item.version, remote));
      if (mine && JSON.stringify(next) === mine.text) return false;
      await this.writeList(ak, kind, next, mine?.text);
      return true;
    } catch (error) {
      if (error instanceof VaultConflictError) throw new Retry();
      throw error;
    } finally {
      this.applying = false;
    }
  }
  private parseList(kind: Kind, data: unknown): unknown {
    if (kind === "memories") return memoriesSchema.parse(data ?? []);
    if (kind === "projects") return projectsDataSchema.parse(data ?? []);
    const t = taskData.parse(data ?? { tasks: [], masks: {} });
    return { tasks: t.tasks, masks: t.masks as TaskMasks };
  }
  private mergeList(kind: Kind, base: unknown, local: unknown, remote: unknown): unknown {
    const pick = <T>(schema: z.ZodType<T>, full: { merged: T; copies: number }, fallback: T, withoutCopies: T) =>
      schema.safeParse(full.merged).success ? full.merged : schema.safeParse(withoutCopies).success ? withoutCopies : fallback;
    if (kind === "memories") {
      const m = mergeById(base as Memory[], local as Memory[], remote as Memory[], {
        newer: (a, b) => a.at > b.at,
        copy: (x) => ({ ...omitPin(x), id: crypto.randomUUID() }),
      });
      return pick(memoriesSchema, m, remote as Memory[], m.merged.slice(0, m.merged.length - m.copies));
    }
    if (kind === "projects") {
      const [b, l, r] = [base, local, remote] as ProjectsData[];
      const m = mergeById(b.projects, l.projects, r.projects, {
        copy: (p) => ({ ...p, id: crypto.randomUUID(), name: `${p.name.slice(0, 76)} (2)` }),
      });
      const projects = pick(projectsSchema, m, r.projects, m.merged.slice(0, m.merged.length - m.copies));
      // Files apart from projects (a file added while the instructions changed elsewhere makes no
      // project copy). A file is never edited, only added or removed, so a pair never conflicts.
      const ids = new Set(projects.map((p) => p.id));
      const files = mergeById(b.files, l.files, r.files, { settle: (_mine, theirs) => theirs, copy: (x) => x }).merged.filter((f) => ids.has(f.projectId));
      return { projects, files } satisfies ProjectsData;
    }
    const [b, l, r] = [base, local, remote] as TaskData[];
    const runFree = ({ lastRunAt: _l, nextDueAt: _n, ...rest }: ScheduledTask) => JSON.stringify(rest);
    const m = mergeById(b.tasks, l.tasks, r.tasks, {
      // The same task run on two devices: the later run counts, no copy.
      settle: (x, y) => (runFree(x) === runFree(y) ? ((x.lastRunAt ?? "") > (y.lastRunAt ?? "") ? x : y) : undefined),
      copy: (t) => ({ ...t, id: crypto.randomUUID(), mode: "manual" as const }),
    });
    const tasks = pick(scheduledTasksSchema, m, r.tasks, m.merged.slice(0, m.merged.length - m.copies));
    return { tasks, masks: { ...r.masks, ...l.masks } };
  }
  private async saveCopy(c: Conversation) {
    const copy: Conversation = { ...structuredClone(c), id: crypto.randomUUID(), title: `${c.title} (conflict copy)`.slice(0, 200) };
    await this.writeConversation(copy, null);
  }
  private async writeConversation(c: Conversation, basedOn?: null) {
    const projects = await this.o.vault.readProjects();
    if (c.projectId && !projects.some((p) => p.id === c.projectId)) {
      c = { ...c };
      delete c.projectId;
    }
    try {
      await this.o.vault.save(c, basedOn);
    } catch (error) {
      // Deleted here: the local delete wins and is pushed.
      if (!(error instanceof ConversationDeletedError)) throw error;
    }
  }
  private async writeList(ak: Uint8Array, kind: Kind, next: unknown, expected?: string) {
    const vault = this.o.vault;
    const guard = <T>(current: T, value: T) => {
      // Changed in this tab since the snapshot: try again in the next cycle, never overwrite.
      if (expected !== undefined && JSON.stringify(current) !== expected) throw new VaultConflictError();
      return value;
    };
    if (kind === "memories") await vault.writeMemories((current) => guard(current, next as Memory[]));
    else if (kind === "projects") {
      const { projects: list, files } = next as ProjectsData;
      const current = await vault.readProjects();
      if (expected !== undefined && JSON.stringify({ projects: current, files: await this.manifest(ak, current) }) !== expected)
        throw new VaultConflictError();
      // A project removed elsewhere goes with its files and its chats' assignment, as a local removal.
      for (const p of current) if (!list.some((x) => x.id === p.id)) await vault.editProject(p.id);
      await vault.changeProjects(() => list);
      await this.applyManifest(ak, files);
    } else {
      const t = next as TaskData;
      const currentMasks = await vault.readTaskMasks();
      await vault.writeTasks((current) => guard({ tasks: current, masks: currentMasks }, t).tasks, t.masks);
    }
  }

  /** What this device changed since its last sync: the offline queue is the vault itself. */
  private async changes(ak: Uint8Array) {
    const { items, tombstones } = await this.snapshot(ak);
    const bases = await this.bases();
    const puts: { item: LocalItem; base?: BaseEntry }[] = [];
    const deletes: { itemId: string; localId: string; base: BaseEntry }[] = [];
    // Lists first, so a project reaches the server before the chats assigned to it.
    const ordered = [...items.values()].sort((a, b) => Number(a.kind === "conversation") - Number(b.kind === "conversation"));
    for (const item of ordered) {
      const base = bases.get(item.itemId);
      if (base?.deleted) continue;
      if (base && base.hash === (await k.baseHash(ak, item.text))) continue;
      if (!base && item.kind !== "conversation" && item.text === JSON.stringify(this.parseList(item.kind, undefined))) continue;
      puts.push({ item, base });
    }
    for (const localId of tombstones) {
      const itemId = await this.itemId("conversation", localId, ak);
      const base = bases.get(itemId);
      if (base && !base.deleted) deletes.push({ itemId, localId, base });
    }
    return { items, puts, deletes };
  }
  /** Changes not yet on the server (for the screens), counted without the network. */
  async pendingCount(): Promise<number> {
    const ak = this.o.vault.accountKey();
    if (!ak || !this.device) return 0;
    const { puts, deletes } = await this.changes(ak);
    const files = await this.fileWork(ak);
    const uploads = files.uploads.filter(({ file }) => this.fileStates[file.id]?.state !== "too-large");
    return puts.length + deletes.length + uploads.length + files.deletes.length;
  }
  /** Pushes every local change; returns how many are still waiting and why. */
  private async push(ak: Uint8Array): Promise<{ waiting: number; error?: string }> {
    const { items, puts, deletes } = await this.changes(ak);
    const work: (() => Promise<void>)[] = [];
    let waiting = 0;
    let quota = false;
    let error: string | undefined;
    for (const { item, base } of puts) {
      work.push(async () => {
        if (quota) {
          waiting++;
          return;
        }
        const version = (base?.version ?? 0) + 1;
        const ciphertext = await k.encryptItem(ak, this.o.accountId, item.itemId, version, { kind: item.kind, data: item.data });
        if (ciphertext.length > Math.ceil((4 * 1024 * 1024) / 3) * 4) {
          waiting++;
          error ??= "item-too-large";
          return;
        }
        const r = await this.call("PUT", `/items/${item.itemId}`, { baseVersion: base?.version ?? 0, ciphertext });
        if (r.status === 200) {
          if (item.kind === "projects") {
            // Files the accepted list no longer has: their blobs are deleted now (and retried until done).
            const kept = new Set((item.data as ProjectsData).files.map((f) => f.blobId));
            const before = (this.parseList("projects", await this.baseData(ak, base)) as ProjectsData).files;
            const gone = before.filter((f) => !kept.has(f.blobId)).map((f) => f.blobId);
            if (gone.length) await this.updateFiles(ak, (rec) => ({ ...rec, deletes: [...new Set([...rec.deletes, ...gone])] }));
          }
          await this.putBase(await this.baseEntry(ak, item.itemId, item.kind, item.localId, version, item.data));
        } else if (r.status === 409) {
          // Changed elsewhere since: merge it now, push the result in the next cycle.
          waiting++;
          const current = r.data.current as { version: number; ciphertext: string | null };
          let payload: z.infer<typeof itemPayload> | undefined;
          if (current.ciphertext) {
            const parsed = itemPayload.safeParse(await k.decryptItem(ak, this.o.accountId, item.itemId, current.version, current.ciphertext).catch(() => undefined));
            if (!parsed.success) return;
            payload = parsed.data;
          }
          await this.apply(ak, { itemId: item.itemId, version: current.version, updatedAt: new Date().toISOString() }, payload, base, items);
          this.again = true;
        } else if (r.status === 413) {
          quota = true;
          waiting++;
          error = "quota";
        } else throw new SyncError("server");
      });
    }
    for (const { itemId, localId, base } of deletes) {
      work.push(async () => {
        const r = await this.call("DELETE", `/items/${itemId}?baseVersion=${base.version}`);
        if (r.status === 200) return this.putBase({ itemId, kind: "conversation", localId, version: Number(r.data.version), deleted: true });
        if (r.status !== 409) throw new SyncError("server");
        const current = r.data.current as { version: number; ciphertext: string | null };
        if (!current.ciphertext) return this.putBase({ itemId, kind: "conversation", localId, version: current.version, deleted: true });
        // Edited elsewhere after this device deleted it: the delete stands, the edit is kept as a copy.
        const parsed = itemPayload.safeParse(await k.decryptItem(ak, this.o.accountId, itemId, current.version, current.ciphertext).catch(() => undefined));
        const remote = parsed.success && parsed.data.kind === "conversation" ? savedConversationSchema.safeParse(parsed.data.data) : undefined;
        if (remote?.success) await this.saveCopy(remote.data as Conversation);
        const again = await this.call("DELETE", `/items/${itemId}?baseVersion=${current.version}`);
        if (again.status === 200) await this.putBase({ itemId, kind: "conversation", localId, version: Number(again.data.version), deleted: true });
        else waiting++;
      });
    }
    const queue = [...work];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) await job();
      }),
    );
    return { waiting, error };
  }

  // Stage 3: project files as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3: project files").
  /** What the project screen shows of file sync on this device (tests read it per device). */
  fileView() {
    return this.view;
  }
  private publishView() {
    this.view =
      this.files && this.device && !this.optedOut ? { enabled: true, quota: this.files, remote: this.remote, states: { ...this.fileStates } } : FILES_OFF;
    // The engine attached for the app serves the project screen's buttons.
    if (!this.o.onFiles) bindFileActions(this.view.enabled ? this : undefined);
    (this.o.onFiles ?? publishFiles)(this.view);
  }
  private setFileState(id: string, state?: FileState) {
    const { [id]: _old, ...rest } = this.fileStates;
    this.fileStates = state ? { ...rest, [id]: state } : rest;
    this.publishView();
  }
  private async fileRecord(ak: Uint8Array): Promise<FileRecord> {
    const sealed = (await (await this.store()).get("meta", "files")) as Cipher | undefined;
    const rec = sealed ? fileRecordSchema.parse(JSON.parse(await unseal(await k.baseKey(ak), sealed, FILE_LABEL))) : { entries: [], deletes: [] };
    this.remote = rec.entries.filter((e) => !e.here).map(stripHere);
    return rec;
  }
  /** Changes this device's file record one change at a time (a cycle and a download can overlap). */
  private updateFiles(ak: Uint8Array, change: (rec: FileRecord) => FileRecord | Promise<FileRecord>): Promise<FileRecord> {
    const next = this.fileLock
      .catch(() => {})
      .then(async () => {
        const rec = await change(await this.fileRecord(ak));
        await (await this.store()).put("meta", await seal(await k.baseKey(ak), JSON.stringify(rec), FILE_LABEL), "files");
        this.remote = rec.entries.filter((e) => !e.here).map(stripHere);
        this.publishView();
        return rec;
      });
    this.fileLock = next;
    return next;
  }
  private async holdFiles() {
    // The questions of a project chat use what is held (src/projects.ts withProjectFiles).
    holdProjects({ files: await this.o.vault.readProjectFiles() });
  }
  private async localFiles() {
    return Object.entries(await this.o.vault.readProjectFiles()).flatMap(([projectId, list]) => list.map((file) => ({ projectId, file })));
  }
  /** The manifest this device would push: its record, minus files deleted here and files of removed projects. */
  private async manifest(ak: Uint8Array, projects: readonly Project[]): Promise<FileEntry[]> {
    const rec = await this.fileRecord(ak);
    if (!rec.entries.length) return [];
    const ids = new Set(projects.map((p) => p.id));
    const here = new Set((await this.localFiles()).map(({ file }) => file.id));
    return rec.entries.filter((e) => ids.has(e.projectId) && (!e.here || here.has(e.id))).map(stripHere);
  }
  /** Writes a merged manifest: files removed elsewhere leave this vault, files added elsewhere are listed as not downloaded. */
  private async applyManifest(ak: Uint8Array, files: FileEntry[]) {
    let changed = false;
    await this.updateFiles(ak, async (rec) => {
      const keep = new Set(files.map((f) => f.id));
      const known = new Set(rec.entries.map((e) => e.id));
      // Only files this device synced before can go; a file added here and not uploaded yet stays.
      if ((await this.localFiles()).some(({ file }) => known.has(file.id) && !keep.has(file.id))) {
        await this.o.vault.changeProjectFiles((all) =>
          Object.fromEntries(Object.entries(all).map(([p, list]) => [p, list.filter((f) => !known.has(f.id) || keep.has(f.id))])),
        );
        changed = true;
      }
      const here = new Set((await this.localFiles()).map(({ file }) => file.id));
      return { ...rec, entries: files.map((f) => ({ ...f, here: here.has(f.id) })) };
    });
    if (changed) await this.holdFiles();
  }
  /** Local files not on the server yet, and blob deletes still owed (nothing while files do not sync here). */
  private async fileWork(ak: Uint8Array) {
    if (!this.files) return { uploads: [], deletes: [] };
    const rec = await this.fileRecord(ak);
    const known = new Set(rec.entries.map((e) => e.id));
    const projects = new Set((await this.o.vault.readProjects()).map((p) => p.id));
    const uploads = (await this.localFiles()).filter(({ projectId, file }) => projects.has(projectId) && !known.has(file.id));
    return { uploads, deletes: rec.deletes };
  }
  /** Uploads each new local file as one blob; returns how many still wait (quota). */
  private async uploadFiles(ak: Uint8Array): Promise<number> {
    const { uploads } = await this.fileWork(ak);
    const ids = new Set(uploads.map(({ file }) => file.id));
    for (const [id, s] of Object.entries(this.fileStates))
      if (["waiting", "uploading", "too-large", "quota"].includes(s.state) && !ids.has(id)) this.setFileState(id);
    for (const id of ids) if (!this.fileStates[id]) this.setFileState(id, { state: "waiting" });
    let waiting = 0;
    let full = false;
    for (const { projectId, file } of uploads) {
      const plain = enc.encode(JSON.stringify(file));
      if (plain.length > (this.files?.maxFileBytes ?? 0)) {
        this.setFileState(file.id, { state: "too-large" });
        continue;
      }
      waiting++;
      if (full) {
        this.setFileState(file.id, { state: "quota" });
        continue;
      }
      this.setFileState(file.id, { state: "uploading" });
      const blobId = await k.blobIdFor(ak, file.id);
      const r = await this.call("PUT", `/blobs/${blobId}`, await k.encryptBlob(ak, this.o.accountId, blobId, plain)).catch((error: unknown) => {
        this.setFileState(file.id, { state: "waiting" });
        throw error;
      });
      if (r.status === 413) {
        full = r.data.code === "quota";
        if (!full) waiting--;
        this.setFileState(file.id, { state: full ? "quota" : "too-large" });
        continue;
      }
      if (r.status !== 204) throw new SyncError("server");
      const entry = { id: file.id, projectId, name: file.name, characters: file.characters, at: file.at, size: plain.length, type: "extracted-text-v1" as const, blobId, hash: await k.contentHash(plain) };
      await this.updateFiles(ak, async (rec) => {
        const still = (await this.localFiles()).some(({ file: f }) => f.id === file.id);
        // Removed while it was uploading: the blob goes again at once.
        return still ? { ...rec, entries: [...rec.entries.filter((e) => e.id !== file.id), { ...entry, here: true }] } : { ...rec, deletes: [...rec.deletes, blobId] };
      });
      waiting--;
      this.setFileState(file.id);
    }
    return waiting;
  }
  /** Deletes the blobs of files removed from the accepted manifest; 404 counts as done. */
  private async deleteBlobs(ak: Uint8Array): Promise<number> {
    const { deletes } = await this.fileWork(ak);
    if (!deletes.length) return 0;
    const done = new Set<string>();
    for (const blobId of deletes) {
      const r = await this.call("DELETE", `/blobs/${blobId}`);
      if (r.status !== 204 && r.status !== 404) throw new SyncError("server");
      done.add(blobId);
    }
    await this.updateFiles(ak, (rec) => ({ entries: rec.entries.filter((e) => !done.has(e.blobId)), deletes: rec.deletes.filter((d) => !done.has(d)) }));
    return 0;
  }
  private downloads = new Map<string, Promise<DownloadResult>>();
  /** Downloads a file another device listed, checks it against the manifest and keeps it in this vault. */
  downloadFile(fileId: string): Promise<DownloadResult> {
    let running = this.downloads.get(fileId);
    if (!running) {
      running = this.download(fileId).finally(() => this.downloads.delete(fileId));
      this.downloads.set(fileId, running);
    }
    return running;
  }
  private async download(fileId: string): Promise<DownloadResult> {
    const ak = this.o.vault.accountKey();
    const entry = this.remote.find((e) => e.id === fileId);
    if (!ak || !entry || !this.files) return "gone";
    const fail = (reason: Extract<FileState, { state: "error" }>["reason"]) => {
      this.setFileState(fileId, { state: "error", reason });
      return reason;
    };
    try {
      this.setFileState(fileId, { state: "downloading", progress: 0 });
      const r = await this.call("GET", `/blobs/${entry.blobId}`, undefined, undefined, true, true);
      if (r.status === 404) return fail("gone");
      if (r.status !== 200) return fail("server");
      const sealed = await readBytes(r.response, entry.size + 28, (progress) => this.setFileState(fileId, { state: "downloading", progress }));
      let file: ProjectFile;
      try {
        const plain = await k.decryptBlob(ak, this.o.accountId, entry.blobId, sealed);
        if ((await k.contentHash(plain)) !== entry.hash) throw Error("hash");
        file = projectFilesSchema.element.parse(JSON.parse(new TextDecoder().decode(plain)));
        if (file.id !== entry.id) throw Error("id");
      } catch {
        return fail("damaged");
      }
      let refused: DownloadResult | undefined;
      await this.updateFiles(ak, async (rec) => {
        const at = rec.entries.findIndex((e) => e.id === fileId && !e.here);
        if (at < 0) return rec; // removed meanwhile
        try {
          await this.o.vault.changeProjectFiles((all) => ({ ...all, [entry.projectId]: [...(all[entry.projectId] ?? []).filter((f) => f.id !== fileId), file] }));
        } catch (error) {
          // The project's file limit, reached by files added on two devices at once.
          refused = fail(error instanceof z.ZodError ? "full" : "server");
          return rec;
        }
        return { ...rec, entries: rec.entries.map((e, i) => (i === at ? { ...e, here: true } : e)) };
      });
      if (refused) return refused;
      this.setFileState(fileId);
      await this.holdFiles();
      return "ok";
    } catch (error) {
      return fail(error instanceof SyncError && error.code === "offline" ? "offline" : "server");
    }
  }
  /** Downloads every not yet downloaded file of a project, before a question in one of its chats. */
  async ensureProjectFiles(projectId: string): Promise<boolean> {
    const results = await Promise.all(this.remote.filter((e) => e.projectId === projectId).map((e) => this.downloadFile(e.id)));
    return results.every((r) => r === "ok");
  }
  /** Removes a file another device listed and this one never downloaded; its blob goes after the next sync. */
  async removeRemoteFile(fileId: string) {
    const ak = this.o.vault.accountKey();
    if (!ak) throw new SyncError("locked");
    await this.updateFiles(ak, (rec) => ({ ...rec, entries: rec.entries.filter((e) => e.here || e.id !== fileId) }));
    this.setFileState(fileId);
    this.later(500);
  }
}

const enc = new TextEncoder();
/** A blob response's bytes, reporting the share received when the body streams. */
async function readBytes(r: Awaited<ReturnType<Fetcher>>, total: number, progress: (share: number) => void): Promise<Uint8Array> {
  const reader = r.body?.getReader();
  if (!reader) return new Uint8Array(await r.arrayBuffer!());
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    progress(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
