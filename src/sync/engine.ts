/**
 * The browser sync engine (docs/vault-sync-20261115.md). It reads the vault, encrypts each item
 * under a key derived from the account key (AK) and pushes it; it pulls newer items, decrypts,
 * merges (src/sync/merge.ts) and writes them into the vault. Nothing leaves the device unencrypted.
 * The vault holds AK while unlocked; this engine never keeps it longer than the vault does.
 *
 * Security review of 15 November (docs/vault-sync-20261115.md, section 15): no server response
 * ever deletes this device's key or its local data (C1); pairing is authenticated both ways (H1);
 * merge bases move only after the vault write (H2), chat writes are version-checked (H3); deletes
 * are authenticated tombstones and the device token is sealed under AK at rest (H4).
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
/**
 * This device is no longer part of the account's sync, said by the server (review C1). Its key and
 * local data stay: the vault opens as before, nothing syncs until it joins again or sync is turned
 * off here. "removed": removed from another device; "reset-elsewhere": the synced data was reset.
 */
export type SyncDetached = "removed" | "reset-elsewhere";
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
  /** An existing unlocked device: another device asked to be approved. */
  pairingRequested?: boolean;
  /** When the newest waiting request was made (server time, ISO). */
  pairingRequestedAt?: string;
  /** Set with phase "error" and the same `error` code; see SyncDetached. */
  detached?: SyncDetached;
  /** This device opens its vault with its own key ("remember this device" for sync). */
  remembered?: boolean;
  /** Items written by a newer app version that this one cannot read; they are left alone (review M5). */
  needsUpgrade?: number;
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
  | "item-too-large"
  | "revoked"
  | "removed"
  | "reset-elsewhere"
  | "needs-local-passphrase"
  | "locked"
  | "wrong-confirmation"
  | "wrong-key"
  | "wrong-proof"
  | "pairing-unverified"
  | "needs-upgrade";
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
const KINDS: readonly string[] = ["conversation", "memories", "projects", "scheduled-tasks"];
/** "left": this device left by the user's own action here (reset, removed itself); not shown as an error. */
type Detached = SyncDetached | "left";
interface DeviceRecord {
  deviceId: string;
  label: string;
  remembered: boolean;
  keyPair?: CryptoKeyPair;
  wrapper?: string;
  /** The device token, sealed under an AK-derived key (review H4); in memory only while unlocked. */
  sealedToken?: Cipher;
  /** Records written before the review only; never written now. */
  token?: string;
  detached?: Detached;
  /** A copy of the account's recovery wrapper: the recovery key opens this device's data even after a reset elsewhere (C1). */
  recoveryWrapper?: string;
}
interface BaseEntry {
  itemId: string;
  kind?: Kind;
  localId?: string;
  version: number;
  deleted: boolean;
  hash?: string;
  sealed?: Cipher;
  /** Written by a newer app version: neither applied nor overwritten here (review M5). */
  hold?: boolean;
}
interface LocalItem {
  itemId: string;
  kind: Kind;
  localId: string;
  data: unknown;
  text: string;
}
type RemoteItem = { itemId: string; version: number; ciphertext: string | null; deleted: boolean };
type Opened = { type: "tombstone" } | { type: "item"; kind: Kind; data: unknown } | { type: "unreadable" } | { type: "needs-upgrade" };
type TaskData = { tasks: ScheduledTask[]; masks: TaskMasks };
const RESET_CONFIRMATION = "DELETE SYNCED DATA";
const PAIRING_MS = 10 * 60_000;
const CONCURRENCY = 6;
// Forward compatible (review M5): unknown envelope fields are ignored; an unknown kind or a payload
// this version cannot parse holds the item instead of stopping sync.
const envelope = z.object({ kind: z.string(), data: z.unknown() });
const tombstoneSchema = z.object({ kind: z.literal("conversation"), at: z.string() });
const taskData = z.object({ tasks: scheduledTasksSchema, masks: z.record(z.string(), z.unknown()) }).strict();
const omitPin = ({ pinned: _p, ...m }: Memory): Memory => m;
const isChat = (o: Opened) => o.type === "item" && o.kind === "conversation";

const realFetch: Fetcher = async (path, init) => {
  const r = await fetch(path, { ...init, credentials: "same-origin" });
  return { status: r.status, json: () => r.json(), arrayBuffer: () => r.arrayBuffer(), body: r.body };
};
const FILE_LABEL = "sync-files";
const stripHere = ({ here: _h, ...entry }: FileRecord["entries"][number]): FileEntry => entry;

export class SyncEngine {
  private db?: Promise<IDBPDatabase>;
  private device?: DeviceRecord;
  /** This device's token, unsealed while the vault is unlocked with AK. */
  private token?: string;
  private optedOut = false;
  private hasWrappers = false;
  private serverOn = true;
  private state: SyncState = { phase: "off", pending: 0, devices: [], remembered: false };
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

  // Local storage of sync: this device's key and sealed token, the merge bases and the cursor.
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
  /** Whether the sync database exists, without creating it (nothing is stored before sync is used; wiring finding 7). */
  private async storeExists() {
    if (this.db) return true;
    if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return true;
    return (await indexedDB.databases()).some((d) => d.name === this.storeName);
  }
  private async saveDevice(record: DeviceRecord | undefined) {
    const { token: _legacy, ...kept } = record ?? ({} as DeviceRecord);
    this.device = record ? kept : undefined;
    const d = await this.store();
    if (record) await d.put("device", kept, "this");
    else await d.delete("device", "this");
  }
  /** Saves this device's record with its token sealed under AK, and makes it the active one. */
  private async keep(record: Omit<DeviceRecord, "sealedToken" | "token" | "detached">, token: string, ak: Uint8Array) {
    const sealedToken = await seal(await k.tokenKey(ak), token, `sync-token|${record.deviceId}`);
    this.token = token;
    await this.saveDevice({ ...record, sealedToken });
    this.set({ detached: undefined, error: undefined });
  }
  private async loadToken(ak = this.o.vault.accountKey()) {
    const d = this.device;
    if (!d || this.token || !ak) return;
    if (d.token) this.token = d.token;
    else if (d.sealedToken)
      try {
        const token = await unseal(await k.tokenKey(ak), d.sealedToken, `sync-token|${d.deviceId}`);
        // Only for the record it was sealed for, and never over a token set meanwhile.
        if (this.device === d && !this.token) this.token = token;
      } catch {
        // Sealed under another account key (a vault moved since): this record cannot sync.
      }
  }
  /** This device takes part in sync now: a record, not detached, its token unsealed. */
  private active() {
    return !!this.device && !this.device.detached && !!this.token;
  }
  private header() {
    return this.active() && this.o.vault.accountKey() ? `${this.device!.deviceId}.${this.token}` : undefined;
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
    this.state = { ...this.state, ...patch, remembered: !!this.device?.remembered && !!this.device.keyPair };
    this.o.onState?.(this.state);
  }
  getState() {
    return this.state;
  }

  private async call(
    method: string,
    path: string,
    body?: unknown,
    /** header: undefined = this device's own (when active), null = none. detach: false for calls not made as this device. */
    opts: { header?: string | null; detach?: boolean; bytes?: boolean } = {},
  ) {
    const own = this.header();
    const header = opts.header === undefined ? own : (opts.header ?? undefined);
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
    const data = (r.status === 204 || (opts.bytes && r.status === 200) ? {} : await r.json().catch(() => ({}))) as Record<string, unknown>;
    // Removed or reset elsewhere: this device stops syncing; its key and its data stay (review C1).
    if (header && header === own && opts.detach !== false && ((r.status === 403 && data.code === "revoked") || (r.status === 401 && data.code === "device-unknown"))) {
      const reason: SyncDetached = r.status === 403 ? "removed" : "reset-elsewhere";
      await this.detachHere(reason);
      throw new SyncError(reason);
    }
    if (r.status >= 500) throw new SyncError("server");
    if (r.status === 429) throw new SyncError("rate-limited");
    return { status: r.status, data, response: r };
  }
  /**
   * The server says this device is not part of the account's sync any more. Nothing that opens the
   * vault is deleted (not the key pair, not the cached wrapper, not the recovery wrapper copy), the
   * vault is not locked, local data stays as it is. Only the sync bookkeeping goes.
   */
  private async detachHere(reason: SyncDetached) {
    if (!this.device || this.device.detached) return;
    await this.saveDevice({ ...this.device, detached: reason });
    this.token = undefined;
    await this.forgetSyncState();
    this.set({ phase: "error", error: reason, detached: reason, pending: 0, pairingRequested: false, pairingRequestedAt: undefined });
  }
  /** This device left sync by the user's own action here: as detached, but quietly ("off" or "needs-approval"). */
  private async leftHere() {
    if (this.device) await this.saveDevice({ ...this.device, detached: "left" });
    this.token = undefined;
    await this.forgetSyncState();
    this.set({ detached: undefined, error: undefined, pending: 0 });
  }

  /** Loads this device's record; a remembered device unlocks the vault with its key. */
  async init() {
    // Nothing is created here: the sync database exists only once sync was used on this device.
    if (await this.storeExists()) {
      const d = await this.store();
      this.device = await d.get("device", "this");
      this.optedOut = !!(await d.get("meta", "optedOut"));
      // Items held for a newer app version (review M5): this may be that version, so the next pull
      // starts from the beginning once and reads them again (everything else is skipped by version).
      if (((await d.getAll("base")) as BaseEntry[]).some((b) => b.hold)) await d.delete("meta", "cursor");
    }
    this.o.vault.onSync = (event) => {
      if (event === "unlocked") void this.onUnlocked();
      else if (!this.applying) this.later(2000);
    };
    await this.unlockThisDevice().catch(() => {});
    if (this.device?.detached === "removed" || this.device?.detached === "reset-elsewhere")
      this.set({ phase: "error", error: this.device.detached, detached: this.device.detached });
    await this.refresh().catch(() => {});
    if (this.o.vault.unlocked) await this.syncNow().catch(() => {});
  }
  /**
   * A remembered device opens its vault with its own key (also offline: the wrapper is cached
   * here), at start and after any lock (idle timer, another tab), also when it is detached.
   * "not-remembered": use the local passphrase, the recovery key or another device.
   */
  async unlockThisDevice(): Promise<"ok" | "not-remembered"> {
    const d = this.device;
    const vault = this.o.vault;
    if (vault.unlocked && vault.accountKey()) {
      await this.loadToken();
      return "ok";
    }
    // Locked, or open without AK (never a synced vault since the review, but a passphrase vault whose move did not finish).
    if (!d?.remembered || !d.keyPair || !d.wrapper) return "not-remembered";
    const ak = await k.unwrapWithDevice(d.wrapper, d.keyPair.privateKey, this.o.accountId, d.deviceId);
    await this.bindAccountKey(ak);
    await this.loadToken(ak);
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
    if (this.stopped || !this.active()) return;
    this.timers.forEach(clearTimeout);
    this.timers = [setTimeout(() => void this.syncNow().catch(() => {}), ms)];
  }
  private async onUnlocked() {
    const vault = this.o.vault;
    const d = this.device;
    const ak = vault.accountKey();
    if (!ak && d?.keyPair && d.wrapper && !d.detached) {
      // A passphrase vault whose move under AK did not finish: move it now (it opens again with AK).
      try {
        const deviceKey = await k.unwrapWithDevice(d.wrapper, d.keyPair.privateKey, this.o.accountId, d.deviceId);
        if ((await vault.mode()) === "passphrase") await vault.adoptAccountKey(deviceKey);
        else await vault.unlockWithAccountKey(deviceKey);
      } catch {
        /* stays open as it is */
      }
      return;
    }
    if (ak) await this.loadToken(ak);
    void this.syncNow().catch(() => {});
  }
  /**
   * Opens (or moves) the local vault under AK; see Vault.unlockWithAccountKey and adoptAccountKey.
   * An unlocked vault keyed by another account key (joining a new setup) is moved; a locked one
   * must be unlocked first, so it is never left without a working unlocker.
   */
  private async bindAccountKey(ak: Uint8Array, opts: { recovered?: boolean } = {}) {
    const vault = this.o.vault;
    if (vault.unlocked) {
      if (vault.hasAccountKey(ak)) {
        if (opts.recovered) await vault.unlockWithAccountKey(ak, opts);
      } else if (!vault.accountKey() && (await vault.mode()) === "sync") {
        // Open without AK (review L3): open it with AK, never re-encrypt it (that would drop its local passphrase).
        try {
          await vault.unlockWithAccountKey(ak, opts);
        } catch {
          throw new SyncError("unlock-first");
        }
      } else await vault.adoptAccountKey(ak, opts);
    } else {
      if ((await vault.mode()) === "passphrase") throw new SyncError("unlock-first");
      try {
        await vault.unlockWithAccountKey(ak, opts);
      } catch {
        throw new SyncError("unlock-first");
      }
    }
    // The vault was opened or moved: the screens reload what they show.
    this.o.onApplied?.();
  }
  /**
   * Joining: a locked passphrase vault must be unlocked first (it is moved under AK). A new setup
   * (a new AK) also needs a locked synced vault unlocked, or nothing could open it afterwards; an
   * approval may open a locked synced vault of the same account (a device that is not remembered,
   * at every visit). The earlier record stays until the vault opened or moved (bindAccountKey first).
   */
  private async requireUsableVault(forNewKey = false) {
    if (this.o.vault.unlocked) return;
    const mode = await this.o.vault.mode();
    if (mode === "passphrase" || (forNewKey && mode === "sync")) throw new SyncError("unlock-first");
  }

  async refresh() {
    // Wiring finding 5: decisions are about the record this request was sent for, not one saved meanwhile.
    const before = this.device;
    const header = this.header();
    const r = await this.call("GET", "/state", undefined, { header: header ?? null, detach: false });
    if (r.status === 404 || r.status === 401) {
      this.serverOn = r.status !== 404;
      this.set({ phase: "off", devices: [] });
      return;
    }
    const s = r.data as {
      hasWrappers: boolean;
      thisDevice: string;
      pairingPending?: boolean;
      pairingRequestedAt?: string;
      devices: { deviceId: string; labelCiphertext: string; createdAt: string; lastSeenAt: string; revoked: boolean }[];
      quota: { usedBytes: number; limitBytes: number };
      files?: FileQuota;
    };
    this.hasWrappers = s.hasWrappers;
    this.files = s.files;
    // Only with this device's own header: without one (locked) "unknown" means nothing.
    if (header && before && this.device === before && !before.detached) {
      if (s.thisDevice === "revoked") await this.detachHere("removed");
      else if (s.thisDevice === "unknown") await this.detachHere("reset-elsewhere");
    }
    const ak = this.o.vault.accountKey();
    const devices = await Promise.all(
      s.devices.map(async (d) => ({
        deviceId: d.deviceId,
        label: ak ? await k.decryptLabel(ak, this.o.accountId, d.deviceId, d.labelCiphertext).catch(() => "") : "",
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt,
        thisDevice: d.deviceId === this.device?.deviceId && !this.device.detached,
        revoked: d.revoked,
      })),
    );
    const waiting = !!s.pairingPending && !!ak && this.active();
    this.set({ quota: s.quota, devices, phase: this.phase(), pairingRequested: waiting, pairingRequestedAt: waiting ? s.pairingRequestedAt : undefined });
    this.publishView();
  }
  private phase(): SyncPhase {
    if (!this.serverOn || this.optedOut) return "off";
    const d = this.device;
    if (d?.detached === "removed" || d?.detached === "reset-elsewhere") return "error";
    if (!d || d.detached) return this.hasWrappers ? "needs-approval" : "off";
    if (!this.o.vault.accountKey()) return "locked";
    return this.state.phase === "error" || this.state.phase === "syncing" ? this.state.phase : "idle";
  }

  // Setup on the first device.
  async setUp(opts: { deviceLabel: string; rememberDevice: boolean }) {
    await this.requireUsableVault(true);
    const s = await this.call("GET", "/state", undefined, { header: null, detach: false });
    if (s.status === 404) throw new SyncError("not-set-up");
    if ((s.data as { hasWrappers?: boolean }).hasWrappers) throw new SyncError("already-set-up");
    const rk = k.newRecoveryKey();
    this.pendingSetup = { ak: k.newAccountKey(), rk, ...opts };
    return { recoveryKey: rk.text };
  }
  /** Sync starts only after the user typed the recovery key's last group back (case, spaces, O, I and L forgiven). */
  async confirmRecoveryKeySaved(lastGroup: string) {
    const p = this.pendingSetup;
    if (!p) throw new SyncError("not-set-up");
    const typed = lastGroup.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    if (typed !== p.rk.text.slice(-4)) return false;
    await this.requireUsableVault(true);
    const deviceId = crypto.randomUUID();
    const token = this.newToken();
    const keyPair = await k.newDeviceKeyPair();
    const pub = await k.exportPublicKey(keyPair.publicKey);
    const wrapper = await k.wrapToDevice(p.ak, pub, this.o.accountId, deviceId);
    const recoveryWrapper = await k.wrapWithRecovery(p.ak, p.rk.bytes, this.o.accountId);
    const r = await this.call(
      "POST",
      "/setup",
      {
        deviceId,
        devicePublicKey: k.toBase64(pub),
        deviceWrapper: p.rememberDevice ? wrapper : null,
        recoveryWrapper,
        labelCiphertext: await k.encryptLabel(p.ak, this.o.accountId, deviceId, p.deviceLabel),
        accountProof: await k.accountProof(p.ak, this.o.accountId),
        recoveryProof: await k.recoveryProof(p.rk.bytes, this.o.accountId),
      },
      { header: `${deviceId}.${token}`, detach: false },
    );
    if (r.status === 409) throw new SyncError("already-set-up");
    if (r.status !== 204) throw new SyncError("server");
    this.pendingSetup = undefined;
    // Server first, then the move of the vault, then this device's record: until the move worked,
    // the earlier record (and the key that opens the vault) stays (review C1).
    await this.bindAccountKey(p.ak);
    await this.forgetSyncState();
    await this.keep({ deviceId, label: p.deviceLabel, remembered: p.rememberDevice, ...(p.rememberDevice ? { keyPair, wrapper } : {}), recoveryWrapper }, token, p.ak);
    await this.setOptedOut(false);
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

  // Pairing (review H1): the new device shows an 8-character code; an existing device types it.
  async startPairing(opts: { rememberDevice?: boolean; deviceLabel?: string } = {}) {
    await this.requireUsableVault();
    const remember = opts.rememberDevice ?? true;
    const deviceId = crypto.randomUUID();
    const pairingId = crypto.randomUUID();
    const token = this.newToken();
    const keyPair = await k.newDeviceKeyPair();
    const pub = await k.exportPublicKey(keyPair.publicKey);
    const header = `${deviceId}.${token}`;
    const secret = k.newPairingSecret();
    const { commitment, tagKey } = await k.pairingKeys(secret.bytes, this.o.accountId, pairingId, pub);
    const r = await this.call("POST", "/pairings", { pairingId, deviceId, newDevicePublicKey: k.toBase64(pub), commitment }, { header, detach: false });
    if (r.status === 404) throw new SyncError("not-set-up");
    if (r.status !== 200) throw new SyncError("server");
    // Ten minutes by this device's own clock, whatever the server says.
    const served = Date.parse(String(r.data.expiresAt));
    const deadline = Math.min(Date.now() + PAIRING_MS, Number.isFinite(served) ? served + 5000 : Infinity);
    const pairing = { pairingId, deviceId, token, header, keyPair, pub, tagKey, remember, label: opts.deviceLabel ?? "" };
    const wait = (async (): Promise<"approved" | "expired" | "refused"> => {
      while (Date.now() < deadline) {
        const res = await this.call("GET", `/pairings/${pairingId}/result`, undefined, { header, detach: false }).catch((e) => {
          if (e instanceof SyncError && (e.code === "offline" || e.code === "server")) return { status: 0, data: {} as Record<string, unknown> };
          throw e;
        });
        if (res.status === 200) return this.finishPairing(pairing, res.data);
        if (res.status === 410) return "expired";
        if (res.status === 403) return "refused";
        await new Promise((resolve) => setTimeout(resolve, this.o.pollMs ?? 2000));
      }
      return "expired";
    })();
    return { code: secret.code, wait };
  }
  /** The approval arrived: check its tag before anything from it is used, kept or adopted. */
  private async finishPairing(
    p: { pairingId: string; deviceId: string; token: string; header: string; keyPair: CryptoKeyPair; pub: Uint8Array; tagKey: CryptoKey; remember: boolean; label: string },
    data: Record<string, unknown>,
  ): Promise<"approved" | "expired" | "refused"> {
    const wrapper = typeof data.deviceWrapper === "string" ? data.deviceWrapper : "";
    const tag = typeof data.tag === "string" ? data.tag : "";
    if (!(await k.verifyPairingTag(p.tagKey, p.pairingId, p.pub, wrapper, tag))) throw new SyncError("pairing-unverified");
    let ak: Uint8Array<ArrayBuffer>;
    try {
      ak = await k.unwrapWithDevice(wrapper, p.keyPair.privateKey, this.o.accountId, p.deviceId);
    } catch {
      throw new SyncError("pairing-unverified");
    }
    // The server creates this device only now (its wrapper only when remembered: review L9).
    const done = await this.call("POST", `/pairings/${p.pairingId}/complete`, { remember: p.remember }, { header: p.header, detach: false });
    if (done.status === 410) return "expired";
    if (done.status === 403 || done.status === 409) return "refused";
    if (done.status !== 204) throw new SyncError("server");
    const wrappers = await this.call("GET", "/wrappers", undefined, { header: null, detach: false }).catch(() => undefined);
    const recoveryWrapper = wrappers?.status === 200 && typeof wrappers.data.recovery === "string" ? wrappers.data.recovery : undefined;
    // Only after the tag check: open or move this device's vault under AK.
    await this.bindAccountKey(ak);
    await this.forgetSyncState();
    await this.keep(
      { deviceId: p.deviceId, label: p.label, remembered: p.remember, ...(p.remember ? { keyPair: p.keyPair, wrapper } : {}), ...(recoveryWrapper ? { recoveryWrapper } : {}) },
      p.token,
      ak,
    );
    await this.setOptedOut(false);
    await this.syncNow().catch(() => {});
    return "approved";
  }
  /**
   * On a signed-in device: the code the new device shows (8 characters; case, spaces, hyphens, O,
   * I and L forgiven). The request whose commitment matches is approved; a key swapped on the way
   * gives no match. "expired": no request waits.
   */
  async approvePairing(code: string, deviceLabel: string): Promise<"approved" | "wrong-code" | "expired"> {
    const ak = this.o.vault.accountKey();
    // Right after an unlock the token may not be loaded yet (the unlock event runs later).
    if (ak) await this.loadToken(ak);
    if (!ak || !this.active()) throw new SyncError("locked");
    const secret = k.decodePairingCode(code);
    if (!secret) return "wrong-code";
    const list = await this.call("GET", "/pairings");
    if (list.status !== 200) throw new SyncError("server");
    const pending = (list.data.pairings ?? []) as { pairingId: string; deviceId: string; newDevicePublicKey: string; commitment: string }[];
    if (!pending.length) return "expired";
    for (const p of pending) {
      const pub = k.fromBase64(p.newDevicePublicKey);
      const { commitment, tagKey } = await k.pairingKeys(secret, this.o.accountId, p.pairingId, pub);
      if (commitment !== p.commitment) continue;
      const wrapper = await k.wrapToDevice(ak, pub, this.o.accountId, p.deviceId);
      const r = await this.call("POST", `/pairings/${p.pairingId}/approve`, {
        deviceWrapper: wrapper,
        labelCiphertext: await k.encryptLabel(ak, this.o.accountId, p.deviceId, deviceLabel),
        tag: await k.pairingTag(tagKey, p.pairingId, pub, wrapper),
        accountProof: await k.accountProof(ak, this.o.accountId),
      });
      if (r.status === 410) return "expired";
      if (r.status === 409) throw new SyncError("device-limit");
      if (r.status !== 204) throw new SyncError("server");
      await this.refresh().catch(() => {});
      return "approved";
    }
    return "wrong-code";
  }

  /**
   * The recovery key opens this account's synced data on a new device, and also on this device
   * when it is locked: a forgotten local passphrase is replaced afterwards with setLocalPassphrase.
   * After a reset elsewhere, the copy of the old recovery wrapper kept here still opens this
   * device's own data (it stays detached).
   */
  async unlockWithRecoveryKey(text: string, opts: { deviceLabel: string; rememberDevice: boolean }): Promise<"ok" | "wrong-key"> {
    const rk = k.decodeRecoveryKey(text);
    if (!rk) return "wrong-key";
    const r = await this.call("GET", "/wrappers", undefined, { header: null, detach: false });
    if (r.status !== 200 && r.status !== 404) throw new SyncError("server");
    const served = r.status === 200 ? String(r.data.recovery) : undefined;
    const ak = served ? await k.unwrapWithRecovery(served, rk, this.o.accountId).catch(() => undefined) : undefined;
    if (ak) {
      await this.bindAccountKey(ak, { recovered: true });
      // This browser's own token (sealed on disk) first, so its existing device id is reused.
      await this.loadToken(ak);
      await this.register(ak, opts.deviceLabel, opts.rememberDevice, rk, served);
      await this.setOptedOut(false);
      await this.syncNow().catch(() => {});
      return "ok";
    }
    const cached = this.device?.recoveryWrapper;
    if (!cached && r.status === 404) throw new SyncError("not-set-up");
    const local = cached ? await k.unwrapWithRecovery(cached, rk, this.o.accountId).catch(() => undefined) : undefined;
    // Only to open this vault as it is: never to move a vault keyed by another account key.
    if (!local || (this.o.vault.accountKey() && !this.o.vault.hasAccountKey(local))) return "wrong-key";
    await this.bindAccountKey(local, { recovered: true });
    await this.loadToken(local);
    this.set({ phase: this.phase() });
    return "ok";
  }
  /** Registers this browser (or changes its own wrapper) with proof of AK. */
  private async register(ak: Uint8Array, label: string, remember: boolean, rk?: Uint8Array, recoveryWrapper?: string) {
    for (let attempt = 0; attempt < 2; attempt++) {
      // A new id needs the recovery key's proof (server/vault-sync.ts); without it only this id is updated.
      const reuse = attempt === 0 && this.active() ? this.device : undefined;
      if (!reuse && !rk) throw new SyncError("removed");
      const deviceId = reuse?.deviceId ?? crypto.randomUUID();
      const token = reuse ? this.token! : this.newToken();
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
      const r = await this.call("POST", "/devices", body, { header: `${deviceId}.${token}`, detach: false });
      // This browser's old entry was removed: register it again under a new id.
      if (r.status === 403 && r.data.code !== "wrong-proof" && attempt === 0) continue;
      if (r.status === 403) throw new SyncError("removed");
      if (r.status === 409) throw new SyncError("device-limit");
      if (r.status !== 204) throw new SyncError("server");
      if (!reuse) await this.forgetSyncState();
      const kept = recoveryWrapper ?? this.device?.recoveryWrapper;
      await this.keep({ deviceId, label, remembered: remember, ...(remember && wrapper ? { keyPair, wrapper } : {}), ...(kept ? { recoveryWrapper: kept } : {}) }, token, ak);
      return;
    }
    throw new SyncError("server");
  }
  /** "Remember this device" on or off for a device that already syncs. */
  async setRememberDevice(remember: boolean) {
    const ak = this.o.vault.accountKey();
    // Right after an unlock the token may not be loaded yet (the unlock event runs later).
    if (ak) await this.loadToken(ak);
    if (!ak || !this.active()) throw new SyncError("locked");
    await this.register(ak, this.device!.label, remember);
    this.set({});
  }
  /** Removes a device; needs this device unlocked (a fresh proof of AK, review H4). */
  async revokeDevice(deviceId: string) {
    const ak = this.o.vault.accountKey();
    // Right after an unlock the token may not be loaded yet (the unlock event runs later).
    if (ak) await this.loadToken(ak);
    if (!ak || !this.active()) throw new SyncError("locked");
    const r = await this.call("POST", `/devices/${deviceId}/revoke`, { accountProof: await k.accountProof(ak, this.o.accountId) });
    if (r.status !== 204 && r.status !== 404) throw new SyncError("server");
    if (deviceId === this.device!.deviceId) await this.leftHere();
    await this.refresh().catch(() => {});
  }
  /** The reset proof: this unlocked device (token and AK proof), or the recovery key when every device is lost. */
  private async resetBody(recoveryKey?: string) {
    const ak = this.o.vault.accountKey();
    if (ak) await this.loadToken(ak);
    if (ak && this.active()) return { confirm: RESET_CONFIRMATION, accountProof: await k.accountProof(ak, this.o.accountId) };
    if (recoveryKey !== undefined) {
      const rk = k.decodeRecoveryKey(recoveryKey);
      if (!rk) throw new SyncError("wrong-key");
      return { confirm: RESET_CONFIRMATION, recoveryProof: await k.recoveryProof(rk, this.o.accountId) };
    }
    throw new SyncError("locked");
  }
  /**
   * Deletes all synced data and wrappers on the server (to start over, or when every device is lost:
   * then with the recovery key). Local data stays and keeps opening as before: this device keeps its
   * key; a device that is not remembered needs a local passphrase first.
   */
  async resetSync(confirm: string, opts: { localPassphrase?: string; recoveryKey?: string } = {}) {
    if (confirm !== RESET_CONFIRMATION) throw new SyncError("wrong-confirmation");
    const body = await this.resetBody(opts.recoveryKey);
    await this.keepLocalAccess(opts.localPassphrase);
    const r = await this.call("POST", "/reset", body, { detach: false });
    if (r.status === 403) throw new SyncError(body.recoveryProof ? "wrong-key" : "wrong-proof");
    if (r.status !== 204 && r.status !== 404) throw new SyncError("server");
    await this.leftHere();
    this.hasWrappers = false;
    await this.refresh().catch(() => {});
  }
  private async keepLocalAccess(localPassphrase?: string) {
    const vault = this.o.vault;
    if (!vault.accountKey() || (await vault.hasLocalPassphrase())) return;
    if (localPassphrase) await vault.setLocalPassphrase(localPassphrase);
    else if (!(this.device?.remembered && this.device.keyPair)) throw new SyncError("needs-local-passphrase");
  }
  /**
   * Turns sync off on this device: the vault becomes a plain passphrase vault again under
   * `localPassphrase` (an existing local passphrase must be the one given), so the account key no
   * longer stays here (review L9); then this device is removed from the account and forgets its key.
   */
  async turnOffSyncOnThisDevice(opts: { localPassphrase?: string } = {}) {
    const vault = this.o.vault;
    if ((await vault.mode()) === "sync") {
      const ak = vault.accountKey();
      if (!vault.unlocked || !ak) throw new SyncError("locked");
      if (!opts.localPassphrase) throw new SyncError("needs-local-passphrase");
      const proof = await k.accountProof(ak, this.o.accountId);
      const header = this.header();
      await vault.leaveSync(opts.localPassphrase);
      if (this.device && header) await this.call("POST", `/devices/${this.device.deviceId}/revoke`, { accountProof: proof }, { header, detach: false }).catch(() => {});
    }
    // Safe now: nothing here needs this device's key any more.
    await this.saveDevice(undefined);
    this.token = undefined;
    await this.forgetSyncState();
    await this.setOptedOut(true);
    this.set({ phase: "off", pending: 0, detached: undefined, error: undefined });
  }
  /**
   * "Delete everything on this device"; with `alsoDeleteSyncedData` the server copy goes too: this
   * device unlocked, or `recoveryKey` (a locked device, a forgotten passphrase). Without it, a locked
   * device cannot remove itself from the account (that needs AK); another device can.
   */
  async deleteEverythingOnThisDevice(opts: { alsoDeleteSyncedData: boolean; recoveryKey?: string }) {
    if (opts.alsoDeleteSyncedData) {
      const body = await this.resetBody(opts.recoveryKey);
      const r = await this.call("POST", "/reset", body, { detach: false });
      if (r.status === 403) throw new SyncError(body.recoveryProof ? "wrong-key" : "wrong-proof");
      if (r.status !== 204 && r.status !== 404) throw new SyncError("server");
    } else {
      const ak = this.o.vault.accountKey();
      if (ak && this.active())
        await this.call("POST", `/devices/${this.device!.deviceId}/revoke`, { accountProof: await k.accountProof(ak, this.o.accountId) }, { detach: false }).catch(() => {});
    }
    this.stop();
    if (this.db) (await this.store()).close();
    this.db = undefined;
    this.device = undefined;
    this.token = undefined;
    await deleteDB(this.storeName);
    await this.o.vault.eraseEverything();
    this.set({ phase: "off", pending: 0, devices: [], detached: undefined, error: undefined });
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
    if (ak) await this.loadToken(ak);
    else this.token = undefined; // locked: no usable token in memory either
    if (!this.active() || this.optedOut || !ak) {
      // Locked: the names of other devices' files leave memory and the screen too.
      if (this.remote.length || Object.keys(this.fileStates).length) {
        this.remote = [];
        this.fileStates = {};
        this.publishView();
      }
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
        // A file's blob goes up before the projects item that lists it. A failed upload never holds
        // back chats and lists: they are pushed first, then the failure counts (backoff).
        const uploads = await this.uploadFiles(ak);
        ({ waiting, error } = await this.push(ak));
        waiting += uploads.waiting;
        if (uploads.failure) throw uploads.failure;
        if (!this.again) break;
      }
      // A blob goes only after the projects item without it was accepted.
      waiting += await this.deleteBlobs(ak);
      await this.refresh();
      this.failures = 0;
      const held = [...(await this.bases()).values()].filter((b) => b.hold).length;
      this.set({ phase: error ? "error" : "idle", pending: waiting, lastSyncAt: new Date().toISOString(), error, needsUpgrade: held || undefined });
    } catch (error) {
      if (error instanceof Retry || error instanceof VaultConflictError || (error as { problem?: string }).problem === "changed") {
        this.set({ phase: "idle" });
        this.later(1000);
        return;
      }
      const code = error instanceof SyncError ? error.code : "server";
      if (code === "removed" || code === "reset-elsewhere") throw error;
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
  private listSchema(kind: Exclude<Kind, "conversation">): z.ZodType<unknown> {
    return kind === "memories" ? memoriesSchema : kind === "projects" ? projectsDataSchema : taskData;
  }
  /**
   * Decrypts and checks one server item. A tombstone must open under the item's key with the
   * tombstone AAD; anything that does not open is "unreadable" (forged or damaged: this device's
   * version wins); an envelope or payload this version cannot parse is "needs-upgrade" (left alone).
   */
  private async open(ak: Uint8Array, item: RemoteItem): Promise<Opened> {
    if (!item.ciphertext) return { type: "unreadable" };
    if (item.deleted) {
      const t = await k.decryptTombstone(ak, this.o.accountId, item.itemId, item.version, item.ciphertext).catch(() => undefined);
      // A tombstone of anything but a chat is never valid (review M3: lists are never deleted).
      return tombstoneSchema.safeParse(t).success ? { type: "tombstone" } : { type: "unreadable" };
    }
    let plain: unknown;
    try {
      plain = await k.decryptItem(ak, this.o.accountId, item.itemId, item.version, item.ciphertext);
    } catch {
      return { type: "unreadable" };
    }
    const env = envelope.safeParse(plain);
    if (!env.success || !KINDS.includes(env.data.kind)) return { type: "needs-upgrade" };
    const kind = env.data.kind as Kind;
    const parsed = kind === "conversation" ? savedConversationSchema.safeParse(env.data.data) : this.listSchema(kind).safeParse(env.data.data);
    if (!parsed.success) return { type: "needs-upgrade" };
    // A chat is kept as written (the vault keeps fields a newer version added, as for its own records).
    const data =
      kind === "conversation" ? env.data.data : kind === "scheduled-tasks" ? { tasks: (parsed.data as TaskData).tasks, masks: (parsed.data as TaskData).masks } : parsed.data;
    return { type: "item", kind, data };
  }

  private async projectIds() {
    return new Set((await this.o.vault.readProjects()).map((p) => p.id));
  }
  private async pull(ak: Uint8Array) {
    const d = await this.store();
    let cursor = String((await d.get("meta", "cursor")) ?? "0");
    let local = await this.snapshot(ak);
    // Chats whose project arrives on a later page are held back until every page is in (review M4).
    const deferred: { item: RemoteItem; opened: Opened }[] = [];
    for (;;) {
      const r = await this.call("GET", `/items?since=${encodeURIComponent(cursor)}&limit=200`);
      if (r.status !== 200) throw new SyncError("server");
      const page = r.data as { items: (RemoteItem & { updatedAt: string })[]; cursor: string; more: boolean };
      const bases = await this.bases();
      const decoded: { item: RemoteItem; opened: Opened }[] = [];
      for (const item of page.items) {
        const base = bases.get(item.itemId);
        // Never backwards: an older version than the one synced here is ignored (rollback by the server).
        // A held item is read again at its own version (this app version may now understand it).
        if (base && (item.version < base.version || (item.version === base.version && !base.hold))) continue;
        decoded.push({ item, opened: await this.open(ak, item) });
      }
      // Lists before conversations, so a project exists before its chats.
      decoded.sort((a, b) => Number(isChat(a.opened)) - Number(isChat(b.opened)));
      let applied = false;
      for (const entry of decoded) {
        const { item, opened } = entry;
        if (page.more && opened.type === "item" && opened.kind === "conversation") {
          const projectId = (opened.data as Conversation).projectId;
          if (projectId && !(await this.projectIds()).has(projectId)) {
            deferred.push(entry);
            continue;
          }
        }
        applied = (await this.apply(ak, item, opened, bases.get(item.itemId), local.items)) || applied;
        if (applied && !isChat(opened)) local = await this.snapshot(ak);
      }
      cursor = page.cursor;
      // The cursor never passes an item that is not applied yet (review H2, M4).
      if (!deferred.length) await d.put("meta", cursor, "cursor");
      if (applied) this.o.onApplied?.();
      if (!page.more) break;
      local = await this.snapshot(ak);
    }
    if (deferred.length) {
      local = await this.snapshot(ak);
      const bases = await this.bases();
      let applied = false;
      for (const { item, opened } of deferred) applied = (await this.apply(ak, item, opened, bases.get(item.itemId), local.items)) || applied;
      await d.put("meta", cursor, "cursor");
      if (applied) this.o.onApplied?.();
    }
  }
  /**
   * Writes one remote item into the vault, merged with local changes; true when the vault changed.
   * The merge base moves only after the vault write succeeded (review H2); every write is checked
   * against the copy the merge used, so an edit made here meanwhile is never overwritten (H3).
   */
  private async apply(ak: Uint8Array, item: { itemId: string; version: number }, opened: Opened, base: BaseEntry | undefined, local: Map<string, LocalItem>): Promise<boolean> {
    const vault = this.o.vault;
    const mine = local.get(item.itemId);
    const localChanged = !!mine && (!base || base.hash !== (await k.baseHash(ak, mine.text)));
    const unreadable = () =>
      // Not ours to apply: this device's version wins at the next push.
      this.putBase({ itemId: item.itemId, version: item.version, deleted: false, kind: base?.kind, localId: base?.localId, hash: "unreadable", sealed: base?.sealed });
    this.applying = true;
    try {
      if (opened.type === "unreadable") {
        await unreadable();
        return false;
      }
      if (opened.type === "needs-upgrade") {
        await this.putBase({ itemId: item.itemId, version: item.version, deleted: base?.deleted ?? false, kind: base?.kind, localId: base?.localId, hash: base?.hash, sealed: base?.sealed, hold: true });
        return false;
      }
      if (opened.type === "tombstone") {
        if ((base?.kind && base.kind !== "conversation") || (mine && mine.kind !== "conversation")) {
          await unreadable();
          return false;
        }
        const entry: BaseEntry = { itemId: item.itemId, kind: "conversation", localId: base?.localId ?? mine?.localId, version: item.version, deleted: true };
        if (!mine) {
          await this.putBase(entry);
          return false;
        }
        const conversation = mine.data as Conversation;
        // Anything edited here since the last sync is kept as a copy (review L5, M2), whatever the clocks say.
        if (localChanged) await this.saveCopy(conversation);
        await vault.delete(conversation.id, conversation);
        await this.putBase(entry);
        return true;
      }
      const { kind, data } = opened;
      if (kind === "conversation") {
        const remote = data as Conversation;
        const entry = await this.baseEntry(ak, item.itemId, kind, remote.id, item.version, remote);
        // Deleted here, edited elsewhere since: the delete stands, the newer edit survives as a copy.
        if (!mine && base && !base.deleted && base.hash !== entry.hash && (await vault.readTombstones()).includes(remote.id)) {
          await this.saveCopy(remote);
          await this.putBase(entry);
          return true;
        }
        let next: Conversation;
        if (!mine || !localChanged) next = remote;
        else {
          const merged = mergeConversation((await this.baseData(ak, base)) as Conversation | undefined, mine.data as Conversation, remote);
          if (savedConversationSchema.safeParse(merged).success) next = merged;
          else {
            await this.saveCopy(mine.data as Conversation);
            next = remote;
          }
        }
        const changed = !(mine && JSON.stringify(next) === mine.text);
        if (changed) await this.writeConversation(next, mine ? (mine.data as Conversation) : null);
        await this.putBase(entry);
        return changed;
      }
      const baseList = this.parseList(kind, await this.baseData(ak, base));
      const next = !mine || !localChanged ? data : this.mergeList(kind, baseList, mine.data, data);
      const entry = await this.baseEntry(ak, item.itemId, kind, kind, item.version, data);
      const changed = !(mine && JSON.stringify(next) === mine.text);
      if (changed) await this.writeList(ak, kind, next, mine?.text);
      await this.putBase(entry);
      return changed;
    } catch (error) {
      if (error instanceof VaultConflictError || (error as { problem?: string }).problem === "changed") throw new Retry();
      throw error;
    } finally {
      this.applying = false;
    }
  }
  /** A list as this device stored it (its own base or vault): parsed, empty when absent. */
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
  /** `basedOn`: the copy the merge used (null: none may exist yet); a newer local save refuses the write. */
  private async writeConversation(c: Conversation, basedOn: Conversation | null) {
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
      // Deleted, or held for a newer app version (never overwritten from here).
      if (base?.deleted || base?.hold) continue;
      if (base && base.hash === (await k.baseHash(ak, item.text))) continue;
      if (!base && item.kind !== "conversation" && item.text === JSON.stringify(this.parseList(item.kind, undefined))) continue;
      puts.push({ item, base });
    }
    for (const localId of tombstones) {
      const itemId = await this.itemId("conversation", localId, ak);
      const base = bases.get(itemId);
      if (base && !base.deleted && !base.hold) deletes.push({ itemId, localId, base });
    }
    return { items, puts, deletes };
  }
  /** Changes not yet on the server (for the screens), counted without the network. */
  async pendingCount(): Promise<number> {
    const ak = this.o.vault.accountKey();
    if (!ak || !this.active()) return 0;
    const { puts, deletes } = await this.changes(ak);
    const files = await this.fileWork(ak);
    const uploads = files.uploads.filter(({ file }) => this.fileStates[file.id]?.state !== "too-large");
    return puts.length + deletes.length + uploads.length + files.deletes.length;
  }
  /**
   * A 409 on a push: merge the server's version, unless it is not newer than the base (a rollback,
   * review M2) or gone (a tombstone purged after 90 days: this device's edit is kept as a new chat).
   */
  private async onConflict(ak: Uint8Array, item: LocalItem, base: BaseEntry | undefined, current: { version: number; ciphertext: string | null; deleted?: boolean }, items: Map<string, LocalItem>) {
    if (current.version === 0) {
      if (item.kind !== "conversation" || !base) return false;
      const conversation = item.data as Conversation;
      await this.saveCopy(conversation);
      await this.o.vault.delete(conversation.id, conversation).catch((error) => {
        if (error instanceof VaultConflictError) throw new Retry();
        throw error;
      });
      await this.putBase({ ...base, deleted: true, hold: undefined });
      return true;
    }
    if (base && current.version <= base.version) return false;
    await this.apply(ak, { itemId: item.itemId, version: current.version }, await this.open(ak, { itemId: item.itemId, version: current.version, ciphertext: current.ciphertext, deleted: !!current.deleted }), base, items);
    return true;
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
          // Changed elsewhere since: merge it now, push the result in the next round.
          waiting++;
          if (await this.onConflict(ak, item, base, r.data.current as { version: number; ciphertext: string | null; deleted?: boolean }, items)) this.again = true;
        } else if (r.status === 413) {
          // Review M6: "quota" is the account's storage; anything else is this item being too large.
          waiting++;
          if (r.data.code === "quota") {
            quota = true;
            error = "quota";
          } else error ??= "item-too-large";
        } else throw new SyncError("server");
      });
    }
    const tombstone = async (itemId: string, version: number) =>
      this.call("PUT", `/items/${itemId}`, {
        baseVersion: version,
        ciphertext: await k.encryptTombstone(ak, this.o.accountId, itemId, version + 1, { kind: "conversation", at: new Date().toISOString() }),
        deleted: true,
      });
    for (const { itemId, localId, base } of deletes) {
      work.push(async () => {
        const gone = (version: number) => this.putBase({ itemId, kind: "conversation", localId, version, deleted: true });
        const r = await tombstone(itemId, base.version);
        if (r.status === 200) return gone(Number(r.data.version));
        if (r.status !== 409) throw new SyncError("server");
        const current = r.data.current as { version: number; ciphertext: string | null; deleted?: boolean };
        if (current.version === 0) return gone(base.version); // purged on the server: nothing left to delete
        if (current.version <= base.version) {
          waiting++;
          return;
        }
        const opened = await this.open(ak, { itemId, version: current.version, ciphertext: current.ciphertext, deleted: !!current.deleted });
        if (opened.type === "tombstone") return gone(current.version);
        if (opened.type === "needs-upgrade") {
          waiting++;
          return this.putBase({ ...base, version: current.version, hold: true });
        }
        // Edited elsewhere after this device deleted it: the delete stands, the edit is kept as a copy.
        if (opened.type === "item" && opened.kind === "conversation") await this.saveCopy(opened.data as Conversation);
        const again = await tombstone(itemId, current.version);
        if (again.status === 200) await gone(Number(again.data.version));
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
      this.files && this.device && !this.device.detached && !this.optedOut
        ? { enabled: true, quota: this.files, remote: this.o.vault.accountKey() ? this.remote : [], states: { ...this.fileStates } }
        : FILES_OFF;
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
  /** Uploads each new local file as one blob; how many still wait, and an error that stopped the uploads. */
  private async uploadFiles(ak: Uint8Array): Promise<{ waiting: number; failure?: unknown }> {
    try {
      return { waiting: await this.uploadEach(ak) };
    } catch (failure) {
      if (failure instanceof SyncError && (failure.code === "removed" || failure.code === "reset-elsewhere")) throw failure;
      for (const [id, s] of Object.entries(this.fileStates)) if (s.state === "uploading") this.setFileState(id, { state: "waiting" });
      return { waiting: 0, failure };
    }
  }
  private async uploadEach(ak: Uint8Array): Promise<number> {
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
      const r = await this.call("GET", `/blobs/${entry.blobId}`, undefined, { bytes: true });
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
