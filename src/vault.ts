import { textFor } from "./text/core";
import { vaultText } from "./text/vault";
import { z } from "zod";
import {
  ProjectError,
  projectFilesSchema,
  projectsSchema,
  type Project,
  type ProjectFiles,
} from "./projects";
import { memoriesSchema, mergeMemories, MemoryError, type Memory } from "./memory";
import { mergeTasks, scheduledTasksSchema, TaskError } from "./scheduled";
import type { ScheduledTask } from "../shared/scheduled-tasks";
import { IDENTIFIER_KINDS } from "./identifier-masking";
import { deleteDB, openDB } from "idb";
import type { Conversation } from "../shared/contracts";
import {
  containsTemporaryResearch,
  stripLiveSearch,
  containsImageData,
  savedConversationSchema,
} from "./saved-conversation";
import { derive, seal, unseal, type Cipher } from "./vault-crypto";
import { localVaultKey, toBase64, fromBase64 } from "./sync/crypto";
import { vaultSyncText } from "./text/vault-sync";
export type { Cipher } from "./vault-crypto";
/**
 * The vault's identity record. A passphrase vault is { salt, check } as always. A vault keyed by
 * sync's account key (docs/vault-sync-20261115.md) adds `sync: 1` (its key is HKDF of AK; salt is
 * then only its identity) and, optionally, AK wrapped under a local passphrase that never leaves
 * this device.
 */
type VaultMeta = {
  salt: Uint8Array<ArrayBuffer>;
  check: Cipher;
  sync?: 1;
  passphrase?: { salt: Uint8Array<ArrayBuffer>; wrap: Cipher };
};
const AK_LABEL = "account-key-v1";
import {
  encodeVaultBackup,
  decodeVaultBackupContent,
  BACKUP_MAX_CONVERSATIONS,
  BackupError,
  planBackupParts,
} from "./vault-backup";
// "Remember this device" (docs/vault-sync-screens-20261115.md): the vault key itself, as the
// non-extractable CryptoKey that derive() returns, kept in "meta". The page can use it, never read it.
const REMEMBERED = "remembered-key";
/** A stable identity for a restored copy: the same backup item always gets the same new id. */
async function restoredId(id: string, content: unknown): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`restore:${id}:${JSON.stringify(content)}`)),
  );
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash.subarray(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
const db = (name: string) =>
  openDB(name, 1, {
    upgrade(database) {
      database.createObjectStore("meta");
      database.createObjectStore("conversations");
    },
  });
// Memories (src/memory.ts) are one encrypted record in "meta", like projects: an older vault
// simply has none, so no database upgrade is needed. The label carries the format version.
const MEMORY_LABEL = "memories-v1";
const recordIv = (record?: Cipher) => JSON.stringify(record && Array.from(record.iv));
async function openMemories(key: CryptoKey, record?: Cipher): Promise<Memory[]> {
  return record ? memoriesSchema.parse(JSON.parse(await unseal(key, record, MEMORY_LABEL))) : [];
}
// Project files (src/projects.ts) are one more encrypted record in "meta", keyed by project id.
// Kept apart from the project list, which every save of a project chat reads.
const FILES_LABEL = "project-files-v1";
const projectFilesRecord = z.record(z.string().uuid(), projectFilesSchema);
async function openProjectFiles(key: CryptoKey, record?: Cipher): Promise<ProjectFiles> {
  return record ? projectFilesRecord.parse(JSON.parse(await unseal(key, record, FILES_LABEL))) : {};
}
// Scheduled tasks (src/scheduled.ts) are one more encrypted record in "meta", Manual and Auto.
const TASKS_LABEL = "scheduled-tasks-v1";
// A background task's masking map (placeholder and original value of its document) sits in the
// same record and goes with its task. It never leaves the device unencrypted: with sync on it
// travels end-to-end encrypted inside the tasks item, like the task itself (security review L8).
// Without maps the record is the plain list, as before.
const taskMasksSchema = z.record(
  z.string().uuid(),
  z
    .array(z.object({ kind: z.enum(IDENTIFIER_KINDS), placeholder: z.string().max(40), value: z.string().max(1000) }).strict())
    .max(2000),
);
export type TaskMasks = z.infer<typeof taskMasksSchema>;
type TaskRecord = { tasks: ScheduledTask[]; masks: TaskMasks };
async function openTaskRecord(key: CryptoKey, record?: Cipher): Promise<TaskRecord> {
  if (!record) return { tasks: [], masks: {} };
  const data: unknown = JSON.parse(await unseal(key, record, TASKS_LABEL));
  return Array.isArray(data)
    ? { tasks: scheduledTasksSchema.parse(data), masks: {} }
    : z.object({ tasks: scheduledTasksSchema, masks: taskMasksSchema }).strict().parse(data);
}
const openTasks = async (key: CryptoKey, record?: Cipher) => (await openTaskRecord(key, record)).tasks;
/** The record's text; a map whose task is gone is dropped here. */
function taskRecordText({ tasks, masks }: TaskRecord) {
  const kept = Object.entries(masks).filter(([id]) => tasks.some((task) => task.id === id && task.mode === "auto"));
  return JSON.stringify(kept.length ? { tasks, masks: Object.fromEntries(kept) } : tasks);
}
function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}
/** A save of a conversation that was deleted here before. */
export class ConversationDeletedError extends Error {}
export class VaultConflictError extends Error {
  constructor() {
    super(
      textFor(vaultText).savedChangedElsewhere,
    );
  }
}
function recordVersion(record: { wrapped: Cipher }): string {
  // Each save wraps a fresh data key. Existing encrypted records need no migration.
  return JSON.stringify([
    Array.from(record.wrapped.iv),
    Array.from(new Uint8Array(record.wrapped.data)),
  ]);
}
function requireVaultIdentity(
  meta: { salt: Uint8Array } | undefined,
  salt: Uint8Array | undefined,
) {
  if (
    !salt ||
    !(meta?.salt instanceof Uint8Array) ||
    meta.salt.length !== salt.length ||
    meta.salt.some((value, index) => value !== salt[index])
  )
    throw Error(
      textFor(vaultText).changedInTab,
    );
}
export class Vault {
  private observed = new Map<string, string>();
  private versions = new WeakMap<Conversation, string>();
  /**
   * Record versions renamed by an internal re-encryption (the move under sync's account key, or
   * back): a save based on a copy read before the move still matches (wiring finding 4).
   */
  private renamed = new Map<string, string>();
  /** True while this vault was opened with the recovery key (security review L2). */
  private recovered = false;
  private databaseName = "privateai-vault";
  /** `prefix`: the Secure store keeps its own database beside the vault's (src/stores.ts). */
  selectAccount(id?: string, prefix = "privateai-vault") {
    if (this.unlocked)
      throw new Error(textFor(vaultText).lockBeforeSwitch);
    if (id !== undefined && !/^[a-f0-9-]{36}$/.test(id))
      throw new Error(textFor(vaultText).invalidScope);
    this.lock(false);
    this.databaseName = id ? `${prefix}-${id}` : prefix;
    this.connectChannel();
  }
  private key?: CryptoKey;
  private salt?: Uint8Array<ArrayBuffer>;
  /** Sync's account key while a synced vault is unlocked; absent for a passphrase vault. */
  private accountKeyRaw?: Uint8Array<ArrayBuffer>;
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private channel?: BroadcastChannel;
  onInvalidate?: () => void;
  /** The sync engine listens (src/sync/engine.ts); unset while sync is off. */
  onSync?: (event: "unlocked" | "written") => void;
  private written() {
    this.onSync?.("written");
  }
  constructor() {
    this.connectChannel();
  }
  private connectChannel() {
    this.channel?.close();
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(this.databaseName)
        : undefined;
    if (this.channel)
      this.channel.onmessage = () => {
        this.lock(false);
        this.onInvalidate?.();
      };
  }
  get unlocked() {
    return !!this.key;
  }
  lock(broadcast = true) {
    this.observed.clear();
    this.versions = new WeakMap();
    this.renamed = new Map();
    this.recovered = false;
    this.key = undefined;
    this.salt = undefined;
    this.accountKeyRaw = undefined;
    this.generation++;
    if (broadcast) this.channel?.postMessage("lock");
  }
  close(broadcast = true) {
    this.lock(broadcast);
    this.channel?.close();
    this.channel = undefined;
  }
  /** Whether the vault database is on this device, without creating it (opening an absent one would). */
  private async present(): Promise<boolean> {
    if (typeof indexedDB.databases !== "function") return true; // Old browsers: fall back to opening.
    return (await indexedDB.databases()).some((d) => d.name === this.databaseName);
  }
  /** Whether this device holds a vault for the selected account (false: unlock creates one). */
  async exists(): Promise<boolean> {
    if (!(await this.present())) return false;
    const database = await db(this.databaseName);
    try {
      return (await database.get("meta", "vault")) !== undefined;
    } finally {
      database.close();
    }
  }
  /** Whether this device keeps the vault key, so it opens without the passphrase. */
  async isRemembered(): Promise<boolean> {
    if (!(await this.present())) return false;
    const database = await db(this.databaseName);
    try {
      return (await database.get("meta", REMEMBERED)) instanceof CryptoKey;
    } finally {
      database.close();
    }
  }
  /** Keeps (or forgets) the unlocked vault's key on this device. */
  async rememberDevice(remember: boolean) {
    const key = this.key;
    if (remember && !key) throw Error(textFor(vaultText).unlockFirst);
    const database = await db(this.databaseName);
    try {
      // A synced vault is remembered through sync's device key (engine setRememberDevice), never
      // through this slot, which would open it without the account key (security review M7, L3).
      if (remember && this.accountKeyRaw) await database.delete("meta", REMEMBERED);
      else if (remember) await database.put("meta", key, REMEMBERED);
      else await database.delete("meta", REMEMBERED);
    } finally {
      database.close();
    }
  }
  /** Opens with the remembered key; false when there is none or it no longer fits (it is then forgotten). */
  async unlockRemembered(): Promise<boolean> {
    const generation = ++this.generation;
    this.key = undefined;
    this.salt = undefined;
    if (!(await this.present())) return false;
    const database = await db(this.databaseName);
    try {
      const key = (await database.get("meta", REMEMBERED)) as CryptoKey | undefined;
      const existing = (await database.get("meta", "vault")) as VaultMeta | undefined;
      if (!(key instanceof CryptoKey) || !existing) return false;
      // A synced vault never opens from this slot: it is opened by sync (device key, local
      // passphrase or recovery key), so the account key is always there (security review M7, L3).
      if (existing.sync) {
        await database.delete("meta", REMEMBERED);
        return false;
      }
      const fits = await unseal(key, existing.check, "vault-check-v1").then(
        (value) => value === "privateai-v1",
        () => false,
      );
      if (!fits) {
        await database.delete("meta", REMEMBERED);
        return false;
      }
      if (generation !== this.generation) throw new Error(textFor(vaultText).unlockCancelled);
      this.key = key;
      this.salt = existing.salt.slice();
      return true;
    } finally {
      database.close();
    }
  }
  async unlock(passphrase: string, remember?: boolean) {
    await this.unlockWithPassphrase(passphrase);
    // undefined leaves the device's choice as it is (callers that predate the choice).
    if (remember !== undefined) await this.rememberDevice(remember);
  }
  private async unlockWithPassphrase(passphrase: string) {
    const generation = ++this.generation;
    this.key = undefined;
    this.salt = undefined;
    if (passphrase.length < 12)
      throw new Error(
        textFor(vaultText).shortPassphrase,
      );
    const database = await db(this.databaseName);
    try {
      const existing = (await database.get("meta", "vault")) as VaultMeta | undefined;
      // A synced vault: the local passphrase (if one is set) unwraps AK; nothing else changes here.
      if (existing?.sync) {
        if (!existing.passphrase) throw new Error(textFor(vaultSyncText).noLocalPassphrase);
        let ak: Uint8Array<ArrayBuffer>;
        let key: CryptoKey;
        try {
          const wrapKey = await derive(passphrase, existing.passphrase.salt);
          ak = fromBase64(await unseal(wrapKey, existing.passphrase.wrap, AK_LABEL));
          key = await localVaultKey(ak);
          if ((await unseal(key, existing.check, "vault-check-v1")) !== "privateai-v1") throw Error();
        } catch {
          throw new Error(textFor(vaultText).unlockFailed);
        }
        if (generation !== this.generation) throw new Error(textFor(vaultText).unlockCancelled);
        this.key = key;
        this.salt = existing.salt.slice();
        this.accountKeyRaw = ak;
        this.onSync?.("unlocked");
        return;
      }
      const salt = existing?.salt ?? random(16);
      const key = await derive(passphrase, salt);
      if (existing) {
        if (
          (await unseal(key, existing.check, "vault-check-v1")) !==
          "privateai-v1"
        )
          throw new Error(textFor(vaultText).unlockFailed);
      } else {
        const check = await seal(key, "privateai-v1", "vault-check-v1");
        // add, not put: two simultaneous first-time unlocks must not overwrite each other.
        await database.add("meta", { salt, check }, "vault");
      }
      if (generation !== this.generation) throw new Error(textFor(vaultText).unlockCancelled);
      this.key = key;
      this.salt = salt.slice();
    } finally {
      database.close();
    }
  }
  /** Which kind of vault this account has on this device, without unlocking it. */
  async mode(): Promise<"none" | "passphrase" | "sync"> {
    const database = await db(this.databaseName);
    try {
      const meta = (await database.get("meta", "vault")) as VaultMeta | undefined;
      return !meta ? "none" : meta.sync ? "sync" : "passphrase";
    } finally {
      database.close();
    }
  }
  /** True when this synced vault has a local passphrase (it then opens without a device or the recovery key). */
  async hasLocalPassphrase(): Promise<boolean> {
    const database = await db(this.databaseName);
    try {
      return !!((await database.get("meta", "vault")) as VaultMeta | undefined)?.passphrase;
    } finally {
      database.close();
    }
  }
  /** Sync's account key while a synced vault is unlocked (a copy). */
  accountKey(): Uint8Array<ArrayBuffer> | undefined {
    return this.accountKeyRaw?.slice();
  }
  /** True when this unlocked vault is keyed by this account key. */
  hasAccountKey(ak: Uint8Array): boolean {
    const own = this.accountKeyRaw;
    return !!own && own.length === ak.length && own.every((b, i) => b === ak[i]);
  }
  /**
   * Opens a synced vault with sync's account key (from this device's key, the recovery key or a
   * device approval), or creates an empty synced vault when this account has none here. A passphrase
   * vault is refused: it must be unlocked with its passphrase and then moved with adoptAccountKey.
   */
  async unlockWithAccountKey(ak: Uint8Array, opts: { recovered?: boolean } = {}): Promise<void> {
    const generation = ++this.generation;
    this.key = undefined;
    this.salt = undefined;
    this.accountKeyRaw = undefined;
    this.recovered = false;
    const key = await localVaultKey(ak);
    const database = await db(this.databaseName);
    try {
      const existing = (await database.get("meta", "vault")) as VaultMeta | undefined;
      let salt: Uint8Array<ArrayBuffer>;
      if (existing) {
        if (!existing.sync) throw new Error(textFor(vaultSyncText).passphraseVaultLocked);
        try {
          if ((await unseal(key, existing.check, "vault-check-v1")) !== "privateai-v1") throw Error();
        } catch {
          throw new Error(textFor(vaultText).unlockFailed);
        }
        salt = existing.salt;
        // A Stage-0 "remember" slot left from before sync goes (security review M7).
        await database.delete("meta", REMEMBERED);
      } else {
        salt = random(16);
        const meta: VaultMeta = { salt, check: await seal(key, "privateai-v1", "vault-check-v1"), sync: 1 };
        await database.add("meta", meta, "vault");
      }
      if (generation !== this.generation) throw new Error(textFor(vaultText).unlockCancelled);
      this.key = key;
      this.salt = salt.slice();
      this.accountKeyRaw = new Uint8Array(ak);
      this.recovered = !!opts.recovered;
    } finally {
      database.close();
    }
    this.onSync?.("unlocked");
  }
  /** After an internal re-encryption: open with the new key, keeping the open chats' version tracking. */
  private reopen(nextKey: CryptoKey, nextMeta: VaultMeta, renamed: Map<string, string>, ak: Uint8Array<ArrayBuffer> | undefined) {
    // A copy: lock() clears this.observed in place.
    const observed = new Map(this.observed),
      versions = this.versions,
      previous = this.renamed;
    // Other tabs and in-flight work hold the old key: lock them out, then open with the new one.
    this.lock();
    this.key = nextKey;
    this.salt = nextMeta.salt.slice();
    this.accountKeyRaw = ak;
    this.versions = versions;
    this.observed = new Map([...observed].map(([id, v]) => [id, renamed.get(v) ?? v]));
    this.renamed = new Map([...[...previous].map(([from, to]) => [from, renamed.get(to) ?? to] as const), ...renamed]);
  }
  /**
   * Moves this unlocked vault (a passphrase vault, or one keyed by another account key) under sync's
   * account key: every record is re-encrypted in one transaction, as a passphrase change does, so
   * nothing is lost or half-moved. The old passphrase no longer opens it; setLocalPassphrase can add one.
   */
  adoptAccountKey(ak: Uint8Array, opts: { recovered?: boolean } = {}): Promise<void> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key || !salt) return Promise.reject(Error(textFor(vaultText).unlockTheVault));
    const accountKey = new Uint8Array(ak);
    // The Stage-0 "remember" slot is dropped: a synced vault is remembered through sync's device key.
    return this.reencrypt(salt, generation, databaseName, async () => {
      const nextKey = await localVaultKey(accountKey);
      const nextMeta: VaultMeta = { salt: random(16), check: await seal(nextKey, "privateai-v1", "vault-check-v1"), sync: 1 };
      return { currentKey: key, nextKey, nextMeta };
    }, "forget").then(({ nextKey, nextMeta, renamed }) => {
      if (generation !== this.generation) return;
      this.reopen(nextKey, nextMeta, renamed, accountKey);
      this.recovered = !!opts.recovered;
      this.onSync?.("unlocked");
    });
  }
  /**
   * Leaves sync on this device (security review L9): the vault is re-encrypted under the local
   * passphrase as a plain passphrase vault, so the account key no longer stays on this device. An
   * existing local passphrase must be the one given.
   */
  leaveSync(passphrase: string): Promise<void> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key || !salt || !this.accountKeyRaw) return Promise.reject(Error(textFor(vaultSyncText).notSynced));
    if (passphrase.length < 12) return Promise.reject(Error(textFor(vaultText).shortPassphrase));
    return this.reencrypt(salt, generation, databaseName, async (meta) => {
      if (meta.passphrase)
        try {
          await unseal(await derive(passphrase, meta.passphrase.salt), meta.passphrase.wrap, AK_LABEL);
        } catch {
          throw Error(textFor(vaultText).wrongPassphrase);
        }
      const nextSalt = random(16);
      const nextKey = await derive(passphrase, nextSalt);
      return { currentKey: key, nextKey, nextMeta: { salt: nextSalt, check: await seal(nextKey, "privateai-v1", "vault-check-v1") } };
    }, "forget").then(({ nextKey, nextMeta, renamed }) => {
      if (generation !== this.generation) return;
      this.reopen(nextKey, nextMeta, renamed, undefined);
    });
  }
  /**
   * The optional local passphrase of a synced vault: AK wrapped under PBKDF2 of it, kept only in this
   * device's vault, never on the server. null removes it. Replacing or removing an existing one needs
   * `current`, except right after a recovery-key unlock, which is how a forgotten one is replaced
   * (security review L2: a device-key unlock alone is not enough).
   */
  setLocalPassphrase(next: string | null, current?: string): Promise<void> {
    const ak = this.accountKeyRaw,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!this.key || !ak) return Promise.reject(Error(textFor(vaultSyncText).notSynced));
    if (next !== null && next.length < 12) return Promise.reject(Error(textFor(vaultText).shortPassphrase));
    const recovered = this.recovered;
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        const meta = (await database.get("meta", "vault")) as VaultMeta;
        requireVaultIdentity(meta, salt);
        if (current === undefined && meta.passphrase && !recovered) throw Error(textFor(vaultText).wrongPassphrase);
        if (current !== undefined && meta.passphrase) {
          try {
            await unseal(await derive(current, meta.passphrase.salt), meta.passphrase.wrap, AK_LABEL);
          } catch {
            throw Error(textFor(vaultText).wrongPassphrase);
          }
        }
        const { passphrase: _old, ...rest } = meta;
        let nextMeta: VaultMeta = rest;
        if (next !== null) {
          const wrapSalt = random(16);
          nextMeta = { ...rest, passphrase: { salt: wrapSalt, wrap: await seal(await derive(next, wrapSalt), toBase64(ak), AK_LABEL) } };
        }
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        if (generation !== this.generation) {
          tx.abort();
          await tx.done.catch(() => {});
          throw Error(textFor(vaultText).passphraseCancelled);
        }
        await tx.store.put(nextMeta, "vault");
        await tx.done;
      } finally {
        database.close();
      }
    });
  }
  /** Ids of conversations deleted on this device (their tombstones), for sync. */
  async readTombstones(): Promise<string[]> {
    if (!this.key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      return (await database.getAllKeys("meta")).map(String).filter((k) => k.startsWith("deleted:")).map((k) => k.slice(8));
    } finally {
      database.close();
    }
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }
  save(conversation: Conversation, basedOn?: Conversation | null) {
    // Live search results and links never reach storage: the snapshot keeps the
    // written answers and the approved query, marked as from a live search.
    conversation = stripLiveSearch(conversation);
    if (containsTemporaryResearch(conversation))
      return Promise.reject(
        new Error(
          textFor(vaultText).temporaryNotRemoved,
        ),
      );
    // Pictures are never stored. Nothing puts one into a conversation; this refuses if one is there.
    if (containsImageData(conversation))
      return Promise.reject(new Error(textFor(vaultText).pictureNotSaved));
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(new Error(textFor(vaultText).unlockBeforeSaving));
    const snapshot = structuredClone(conversation);
    return this.enqueue(async () => {
      const seen =
        basedOn === undefined
          ? this.observed.get(snapshot.id)
          : basedOn === null
            ? undefined
            : this.versions.get(basedOn);
      const expected = seen === undefined ? undefined : (this.renamed.get(seen) ?? seen);
      if (basedOn && (basedOn.id !== snapshot.id || expected === undefined))
        throw new VaultConflictError();
      let projectRecord: Cipher | undefined;
      if (snapshot.projectId) {
        const projectDb = await db(databaseName);
        try {
          projectRecord = await projectDb.get("meta", "projects");
        } finally {
          projectDb.close();
        }
        const projects = projectRecord
          ? projectsSchema.parse(
              JSON.parse(await unseal(key, projectRecord, "projects-v1")),
            )
          : [];
        if (!projects.some((p) => p.id === snapshot.projectId))
          throw Error(
            textFor(vaultText).projectGone,
          );
      }
      const dataKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const raw = Array.from(
        new Uint8Array(await crypto.subtle.exportKey("raw", dataKey)),
      );
      const wrapped = await seal(
        key,
        JSON.stringify(raw),
        `key:${snapshot.id}`,
      );
      const data = await seal(
        dataKey,
        JSON.stringify(snapshot),
        `conversation:${snapshot.id}`,
      );
      if (generation !== this.generation || !this.key)
        throw new Error(textFor(vaultText).lockedBeforeSave);
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw new Error(textFor(vaultText).lockedBeforeSave);
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
        if (snapshot.projectId) {
          const currentProjects = (await tx
            .objectStore("meta")
            .get("projects")) as Cipher | undefined;
          if (
            JSON.stringify(
              currentProjects && Array.from(currentProjects.iv),
            ) !== JSON.stringify(projectRecord && Array.from(projectRecord.iv))
          ) {
            tx.abort();
            await tx.done.catch(() => {});
            throw new VaultConflictError();
          }
        }
        if (await tx.objectStore("meta").get(`deleted:${snapshot.id}`)) {
          await tx.done;
          throw new ConversationDeletedError(
            textFor(vaultText).conversationDeleted,
          );
        }
        const existing = await tx.objectStore("conversations").get(snapshot.id);
        if ((existing ? recordVersion(existing) : undefined) !== expected) {
          await tx.done;
          throw new VaultConflictError();
        }
        if (generation !== this.generation || !this.key) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new Error(textFor(vaultText).lockedBeforeSave);
        }
        await tx
          .objectStore("conversations")
          .put({ wrapped, data }, snapshot.id);
        await tx.done;
        const version = recordVersion({ wrapped });
        if (generation === this.generation) {
          this.observed.set(snapshot.id, version);
          this.versions.set(snapshot, version);
        }
        this.written();
        return snapshot;
      } finally {
        database.close();
      }
    });
  }
  async list(): Promise<Conversation[]> {
    const result = await this.readAvailable();
    if (result.unreadable)
      throw new Error(textFor(vaultText).unreadableSnapshots);
    return result.conversations;
  }
  async readAvailable(maximum = Number.POSITIVE_INFINITY): Promise<{
    conversations: Conversation[];
    unreadable: number;
  }> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) throw new Error(textFor(vaultText).locked);
    await this.queue;
    if (generation !== this.generation) throw new Error(textFor(vaultText).wasLocked);
    const database = await db(databaseName);
    try {
      const tx = database.transaction(["meta", "conversations"], "readonly");
      requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
      const store = tx.objectStore("conversations");
      if ((await store.count()) > maximum) {
        await tx.done;
        throw Error(textFor(vaultText).backupMaximum(maximum));
      }
      const [ids, records] = await Promise.all([
        store.getAllKeys(),
        store.getAll(),
      ]);
      await tx.done;
      const output: Conversation[] = [];
      let unreadable = 0;
      for (const [index, id] of ids.entries()) {
        const record = records[index];
        if (record === undefined) continue;
        try {
          const conversation = await this.openRecord(key, id, record);
          output.push(conversation);
          const version = recordVersion(record);
          if (generation === this.generation) {
            this.observed.set(conversation.id, version);
            this.versions.set(conversation, version);
          }
        } catch {
          unreadable++;
        }
        if (generation !== this.generation)
          throw new Error(textFor(vaultText).wasLocked);
      }
      if (generation !== this.generation) throw new Error(textFor(vaultText).wasLocked);
      return { conversations: output, unreadable };
    } finally {
      database.close();
    }
  }
  private async openRecord(
    key: CryptoKey,
    id: IDBValidKey,
    record: { wrapped: Cipher; data: Cipher },
  ): Promise<Conversation> {
    const raw = new Uint8Array(
      JSON.parse(await unseal(key, record.wrapped, `key:${id}`)),
    );
    const dataKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const decoded: unknown = JSON.parse(
      await unseal(dataKey, record.data, `conversation:${id}`),
    );
    savedConversationSchema.parse(decoded);
    // Validate without rewriting snapshots or dropping fields from older writers.
    const conversation = decoded as Conversation;
    if (containsTemporaryResearch(conversation))
      throw new Error(textFor(vaultText).temporaryReopen);
    if (conversation.id !== id)
      throw new Error(textFor(vaultText).identityMismatch);
    return conversation;
  }
  async readProjects(): Promise<Project[]> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    if (generation !== this.generation) throw Error(textFor(vaultText).changed);
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      const record = (await database.get("meta", "projects")) as
        Cipher | undefined;
      const projects = record
        ? projectsSchema.parse(
            JSON.parse(await unseal(key, record, "projects-v1")),
          )
        : [];
      if (generation !== this.generation) throw Error(textFor(vaultText).changed);
      return projects;
    } finally {
      database.close();
    }
  }
  createProject(name: string): Promise<Project[]> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        requireVaultIdentity(await database.get("meta", "vault"), salt);
        const previous = (await database.get("meta", "projects")) as
          Cipher | undefined;
        const projects = previous
          ? projectsSchema.parse(
              JSON.parse(await unseal(key, previous, "projects-v1")),
            )
          : [];
        const next = projectsSchema.parse([
          ...projects,
          { id: crypto.randomUUID(), name },
        ]);
        const encrypted = await seal(key, JSON.stringify(next), "projects-v1");
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        const current = (await tx.store.get("projects")) as Cipher | undefined;
        if (
          JSON.stringify(current && Array.from(current.iv)) !==
            JSON.stringify(previous && Array.from(previous.iv)) ||
          generation !== this.generation
        ) {
          tx.abort();
          await tx.done.catch(() => {});
          throw Error(
            textFor(vaultText).projectsChangedRetry,
          );
        }
        await tx.store.put(encrypted, "projects");
        await tx.done;
        this.written();
        return next;
      } finally {
        database.close();
      }
    });
  }
  editProject(id: string, name?: string): Promise<void> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      const unchanged = () => {
        if (generation !== this.generation || !this.key)
          throw Error(textFor(vaultText).changedDuringProject);
      };
      try {
        unchanged();
        const read = database.transaction(
          ["meta", "conversations"],
          "readonly",
        );
        requireVaultIdentity(await read.objectStore("meta").get("vault"), salt);
        const previous = (await read.objectStore("meta").get("projects")) as
          Cipher | undefined;
        const ids = await read.objectStore("conversations").getAllKeys();
        const records = await read.objectStore("conversations").getAll();
        const filesRecord = (await read.objectStore("meta").get("project-files")) as Cipher | undefined;
        await read.done;
        // A removed project's files go with it, in the same transaction.
        let nextFiles: Cipher | undefined | "unchanged" = "unchanged";
        if (name === undefined && filesRecord) {
          const { [id]: removed, ...rest } = await openProjectFiles(key, filesRecord);
          if (removed)
            nextFiles = Object.keys(rest).length
              ? await seal(key, JSON.stringify(rest), FILES_LABEL)
              : undefined;
        }
        const projects = previous
          ? projectsSchema.parse(
              JSON.parse(await unseal(key, previous, "projects-v1")),
            )
          : [];
        if (!projects.some((p) => p.id === id))
          throw Error(textFor(vaultText).projectGoneRefresh);
        const next = projectsSchema.parse(
          name === undefined
            ? projects.filter((p) => p.id !== id)
            : projects.map((p) => (p.id === id ? { ...p, name } : p)),
        );
        const encryptedProjects = await seal(
          key,
          JSON.stringify(next),
          "projects-v1",
        );
        const replacements: {
          id: IDBValidKey;
          version: string;
          wrapped: Cipher;
          data: Cipher;
        }[] = [];
        if (name === undefined)
          for (const [index, recordId] of ids.entries()) {
            unchanged();
            const record = records[index] as { wrapped: Cipher; data: Cipher };
            const raw = await unseal(key, record.wrapped, `key:${recordId}`);
            const dataKey = await crypto.subtle.importKey(
              "raw",
              new Uint8Array(JSON.parse(raw)),
              "AES-GCM",
              false,
              ["encrypt", "decrypt"],
            );
            const decoded = JSON.parse(
              await unseal(dataKey, record.data, `conversation:${recordId}`),
            ) as Conversation;
            savedConversationSchema.parse(decoded);
            if (decoded.id !== recordId || containsTemporaryResearch(decoded))
              throw Error(textFor(vaultText).unreadableHistoryRemoval);
            if (decoded.projectId === id) {
              delete decoded.projectId;
              replacements.push({
                id: recordId,
                version: recordVersion(record),
                wrapped: await seal(key, raw, `key:${recordId}`),
                data: await seal(
                  dataKey,
                  JSON.stringify(decoded),
                  `conversation:${recordId}`,
                ),
              });
            }
          }
        unchanged();
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        try {
          requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
          const current = (await tx.objectStore("meta").get("projects")) as
            Cipher | undefined;
          if (
            JSON.stringify(current && Array.from(current.iv)) !==
            JSON.stringify(previous && Array.from(previous.iv))
          )
            throw Error(textFor(vaultText).projectsChanged);
          const store = tx.objectStore("conversations");
          if (name === undefined) {
            if ((await store.count()) !== records.length)
              throw Error(textFor(vaultText).historyChangedRemoval);
            for (const [index, recordId] of ids.entries()) {
              const existing = await store.get(recordId);
              if (
                !existing ||
                recordVersion(existing) !== recordVersion(records[index])
              )
                throw Error(textFor(vaultText).historyChangedRemoval);
            }
          }
          for (const {
            id: recordId,
            version: _version,
            ...record
          } of replacements) {
            unchanged();
            await store.put(record, recordId);
          }
          unchanged();
          await tx.objectStore("meta").put(encryptedProjects, "projects");
          if (nextFiles !== "unchanged") {
            if (recordIv(await tx.objectStore("meta").get("project-files")) !== recordIv(filesRecord))
              throw Error(textFor(vaultText).projectsChanged);
            if (nextFiles) await tx.objectStore("meta").put(nextFiles, "project-files");
            else await tx.objectStore("meta").delete("project-files");
          }
          unchanged();
          await tx.done;
          // A removed project: other tabs lock, so none keeps sending its instructions or files.
          if (name === undefined) this.channel?.postMessage("projects");
          this.written();
        } catch (error) {
          try {
            tx.abort();
          } catch {}
          await tx.done.catch(() => {});
          throw error;
        }
      } finally {
        database.close();
      }
    });
  }
  /**
   * A change to the project list that touches no conversation (project instructions):
   * `change` gets the stored list and returns the next one.
   */
  changeProjects(change: (current: Project[]) => Project[]): Promise<Project[]> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        requireVaultIdentity(await database.get("meta", "vault"), salt);
        const previous = (await database.get("meta", "projects")) as Cipher | undefined;
        const next = projectsSchema.parse(
          change(
            previous
              ? projectsSchema.parse(JSON.parse(await unseal(key, previous, "projects-v1")))
              : [],
          ),
        );
        const encrypted = await seal(key, JSON.stringify(next), "projects-v1");
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        if (recordIv(await tx.store.get("projects")) !== recordIv(previous) || generation !== this.generation) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new ProjectError("changed");
        }
        await tx.store.put(encrypted, "projects");
        await tx.done;
        // Other tabs lock, as after a deletion: none keeps sending instructions changed here.
        this.channel?.postMessage("projects");
        this.written();
        return next;
      } finally {
        database.close();
      }
    });
  }
  async readProjectFiles(): Promise<ProjectFiles> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    if (generation !== this.generation) throw Error(textFor(vaultText).changed);
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      const files = await openProjectFiles(key, await database.get("meta", "project-files"));
      if (generation !== this.generation) throw Error(textFor(vaultText).changed);
      return files;
    } finally {
      database.close();
    }
  }
  /**
   * Every change to project files: `change` gets the stored files and returns the next ones. Files
   * of a project that no longer exists are refused ("gone").
   */
  changeProjectFiles(change: (current: ProjectFiles) => ProjectFiles): Promise<ProjectFiles> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        requireVaultIdentity(await database.get("meta", "vault"), salt);
        const previous = (await database.get("meta", "project-files")) as Cipher | undefined;
        const projectRecord = (await database.get("meta", "projects")) as Cipher | undefined;
        const projects = projectRecord
          ? projectsSchema.parse(JSON.parse(await unseal(key, projectRecord, "projects-v1")))
          : [];
        // Empty lists are dropped, so a project without files leaves nothing behind.
        const next = Object.fromEntries(
          Object.entries(projectFilesRecord.parse(change(await openProjectFiles(key, previous)))).filter(
            ([, files]) => files.length,
          ),
        );
        if (Object.keys(next).some((id) => !projects.some((p) => p.id === id)))
          throw new ProjectError("gone");
        const encrypted = Object.keys(next).length
          ? await seal(key, JSON.stringify(next), FILES_LABEL)
          : undefined;
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        if (
          recordIv(await tx.store.get("project-files")) !== recordIv(previous) ||
          recordIv(await tx.store.get("projects")) !== recordIv(projectRecord) ||
          generation !== this.generation
        ) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new ProjectError("changed");
        }
        if (encrypted) await tx.store.put(encrypted, "project-files");
        else await tx.store.delete("project-files");
        await tx.done;
        // Other tabs lock: none keeps sending passages of a file that was removed here.
        this.channel?.postMessage("projects");
        return next;
      } finally {
        database.close();
      }
    });
  }
  async readMemories(): Promise<Memory[]> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    if (generation !== this.generation) throw Error(textFor(vaultText).changed);
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      const memories = await openMemories(key, await database.get("meta", "memories"));
      if (generation !== this.generation) throw Error(textFor(vaultText).changed);
      return memories;
    } finally {
      database.close();
    }
  }
  /** Every change to the memories: `change` gets the stored list and returns the next one. */
  writeMemories(change: (current: Memory[]) => Memory[]): Promise<Memory[]> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        requireVaultIdentity(await database.get("meta", "vault"), salt);
        const previous = (await database.get("meta", "memories")) as Cipher | undefined;
        const next = memoriesSchema.parse(change(await openMemories(key, previous)));
        const encrypted = next.length
          ? await seal(key, JSON.stringify(next), MEMORY_LABEL)
          : undefined;
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        if (
          recordIv(await tx.store.get("memories")) !== recordIv(previous) ||
          generation !== this.generation
        ) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new MemoryError("changed");
        }
        // "Forget all" leaves no record behind, not an encrypted empty list.
        if (encrypted) await tx.store.put(encrypted, "memories");
        else await tx.store.delete("memories");
        await tx.done;
        // Other tabs lock, as after a deletion: none keeps sending a memory that was removed here.
        this.channel?.postMessage("memories");
        this.written();
        return next;
      } finally {
        database.close();
      }
    });
  }
  async readTasks(): Promise<ScheduledTask[]> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    if (generation !== this.generation) throw Error(textFor(vaultText).changed);
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      const tasks = await openTasks(key, await database.get("meta", "scheduled-tasks"));
      if (generation !== this.generation) throw Error(textFor(vaultText).changed);
      return tasks;
    } finally {
      database.close();
    }
  }
  /** The background tasks' masking maps, to put the original values back into their results. */
  async readTaskMasks(): Promise<TaskMasks> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error(textFor(vaultText).unlockFirst);
    await this.queue;
    const database = await db(this.databaseName);
    try {
      requireVaultIdentity(await database.get("meta", "vault"), this.salt);
      const { masks } = await openTaskRecord(key, await database.get("meta", "scheduled-tasks"));
      if (generation !== this.generation) throw Error(textFor(vaultText).changed);
      return masks;
    } finally {
      database.close();
    }
  }
  /**
   * Every change to the scheduled tasks (src/scheduled.ts), as writeMemories does for memories.
   * `masks` sets the masking map of the tasks it names, in the same write.
   */
  writeTasks(change: (current: ScheduledTask[]) => ScheduledTask[], masks: TaskMasks = {}): Promise<ScheduledTask[]> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) return Promise.reject(Error(textFor(vaultText).unlockFirst));
    const newMasks = taskMasksSchema.parse(masks);
    return this.enqueue(async () => {
      const database = await db(databaseName);
      try {
        requireVaultIdentity(await database.get("meta", "vault"), salt);
        const previous = (await database.get("meta", "scheduled-tasks")) as Cipher | undefined;
        const current = await openTaskRecord(key, previous);
        const next = scheduledTasksSchema.parse(change(current.tasks));
        const encrypted = next.length
          ? await seal(key, taskRecordText({ tasks: next, masks: { ...current.masks, ...newMasks } }), TASKS_LABEL)
          : undefined;
        const tx = database.transaction("meta", "readwrite");
        requireVaultIdentity(await tx.store.get("vault"), salt);
        if (recordIv(await tx.store.get("scheduled-tasks")) !== recordIv(previous) || generation !== this.generation) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new TaskError("changed");
        }
        if (encrypted) await tx.store.put(encrypted, "scheduled-tasks");
        else await tx.store.delete("scheduled-tasks");
        await tx.done;
        // Other tabs lock: none keeps showing or running a task that was changed here.
        this.channel?.postMessage("scheduled-tasks");
        this.written();
        return next;
      } finally {
        database.close();
      }
    });
  }
  async exportBackup(): Promise<string> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation;
    if (!key || !salt)
      throw Error(textFor(vaultText).unlockBeforeBackup);
    const available = await this.readAvailable(BACKUP_MAX_CONVERSATIONS);
    if (available.unreadable)
      throw Error(
        textFor(vaultText).unreadableBackup,
      );
    const text = await encodeVaultBackup(
      key,
      salt,
      available.conversations,
      await this.readProjects(),
      await this.readMemories(),
      await this.readTasks(),
    );
    if (generation !== this.generation || !this.key)
      throw Error(textFor(vaultText).backupCancelled);
    return text;
  }
  /**
   * The backup as one or more files (planBackupParts: at most 100 chats and 10 MiB each), with the
   * project files when asked. Memories or tasks alone are enough; an empty vault is refused.
   */
  async exportBackupParts(includeFiles: boolean): Promise<string[]> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation;
    if (!key || !salt) throw Error(textFor(vaultText).unlockBeforeBackup);
    const available = await this.readAvailable();
    if (available.unreadable) throw new BackupError("unreadable");
    const shared = {
      projects: await this.readProjects(),
      memories: await this.readMemories(),
      scheduledTasks: await this.readTasks(),
    };
    const files = includeFiles ? await this.readProjectFiles() : {};
    if (!available.conversations.length && !shared.projects.length && !shared.memories.length && !shared.scheduledTasks.length)
      throw new BackupError("empty");
    const texts: string[] = [];
    for (const [index, part] of planBackupParts(available.conversations, shared, files).entries())
      texts.push(
        await encodeVaultBackup(key, salt, part, shared.projects, shared.memories, shared.scheduledTasks, index ? {} : files),
      );
    if (generation !== this.generation || !this.key) throw Error(textFor(vaultText).backupCancelled);
    return texts;
  }
  restoreBackup(text: string, passphrase: string): Promise<number> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(
        Error(textFor(vaultText).unlockDestination),
      );
    return this.enqueue(async () => {
      const { conversations, projects, memories, scheduledTasks, projectFiles } = await decodeVaultBackupContent(
        text,
        passphrase,
      );
      // A restored item keeps its id when the same item is already here (then it is skipped), and
      // otherwise gets a stable new id (restoredId), so restoring the same backup again adds nothing.
      const copyIds = new Map<string, string>();
      for (const original of conversations) copyIds.set(original.id, await restoredId(original.id, original));
      const databaseBefore = await db(databaseName);
      let projectRecord: Cipher | undefined;
      let memoryRecord: Cipher | undefined;
      let taskRecord: Cipher | undefined;
      let filesRecord: Cipher | undefined;
      const present = new Map<string, { record?: { wrapped: Cipher; data: Cipher }; copyTaken: boolean }>();
      try {
        projectRecord = await databaseBefore.get("meta", "projects");
        memoryRecord = await databaseBefore.get("meta", "memories");
        taskRecord = await databaseBefore.get("meta", "scheduled-tasks");
        filesRecord = await databaseBefore.get("meta", "project-files");
        for (const original of conversations) {
          const copyId = copyIds.get(original.id)!;
          present.set(original.id, {
            record: await databaseBefore.get("conversations", original.id),
            copyTaken:
              (await databaseBefore.get("conversations", copyId)) !== undefined ||
              (await databaseBefore.get("meta", `deleted:${copyId}`)) !== undefined,
          });
        }
      } finally {
        databaseBefore.close();
      }
      const existingProjects = projectRecord
        ? projectsSchema.parse(
            JSON.parse(await unseal(key, projectRecord, "projects-v1")),
          )
        : [];
      const projectIds = new Map<string, string>();
      const addedProjects: Project[] = [];
      for (const p of projects) {
        const same = existingProjects.find((e) => e.id === p.id);
        if (same && JSON.stringify(same) === JSON.stringify(p)) {
          projectIds.set(p.id, p.id);
          continue;
        }
        const id = await restoredId(p.id, p);
        projectIds.set(p.id, id);
        if (!existingProjects.some((e) => e.id === id) && !addedProjects.some((e) => e.id === id))
          addedProjects.push({ ...p, id });
      }
      const mergedProjects = projectsSchema.parse([...existingProjects, ...addedProjects]);
      let nextFiles: Cipher | undefined;
      if (Object.keys(projectFiles).length) {
        const merged = await openProjectFiles(key, filesRecord);
        for (const [projectId, files] of Object.entries(projectFiles)) {
          const target = projectIds.get(projectId)!;
          const have = merged[target] ?? [];
          merged[target] = [...have, ...files.filter((file) => !have.some((h) => h.id === file.id))];
        }
        nextFiles = await seal(key, JSON.stringify(projectFilesRecord.parse(merged)), FILES_LABEL);
      }
      const nextProjects = await seal(
        key,
        JSON.stringify(mergedProjects),
        "projects-v1",
      );
      // The backup's memories are added to the ones here (src/memory.ts: mergeMemories).
      const nextMemories = memories.length
        ? await seal(
            key,
            JSON.stringify(
              memoriesSchema.parse(
                mergeMemories(memories)(await openMemories(key, memoryRecord)),
              ),
            ),
            MEMORY_LABEL,
          )
        : undefined;
      // The backup's tasks are added as Manual tasks (src/scheduled.ts: mergeTasks).
      const currentTasks = await openTaskRecord(key, taskRecord);
      const nextTasks = scheduledTasks.length
        ? await seal(
            key,
            taskRecordText({ ...currentTasks, tasks: scheduledTasksSchema.parse(mergeTasks(scheduledTasks)(currentTasks.tasks)) }),
            TASKS_LABEL,
          )
        : undefined;
      const encrypted = [];
      for (const original of conversations) {
        if (generation !== this.generation || !this.key)
          throw Error(textFor(vaultText).restoreCancelled);
        const mapped = {
          ...original,
          projectId: original.projectId
            ? projectIds.get(original.projectId)
            : undefined,
        };
        const { record, copyTaken } = present.get(original.id)!;
        if (record) {
          const stored = await this.openRecord(key, original.id, record).catch(() => undefined);
          if (JSON.stringify(stored) === JSON.stringify(mapped)) continue;
        }
        if (copyTaken) continue;
        const snapshot = { ...mapped, id: copyIds.get(original.id)! };
        const dataKey = await crypto.subtle.generateKey(
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"],
        );
        const raw = Array.from(
          new Uint8Array(await crypto.subtle.exportKey("raw", dataKey)),
        );
        encrypted.push({
          id: snapshot.id,
          wrapped: await seal(key, JSON.stringify(raw), `key:${snapshot.id}`),
          data: await seal(
            dataKey,
            JSON.stringify(snapshot),
            `conversation:${snapshot.id}`,
          ),
        });
      }
      if (generation !== this.generation || !this.key)
        throw Error(textFor(vaultText).restoreCancelled);
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw Error(textFor(vaultText).restoreCancelled);
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        try {
          requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
          const currentProjects = (await tx
            .objectStore("meta")
            .get("projects")) as Cipher | undefined;
          if (
            JSON.stringify(
              currentProjects && Array.from(currentProjects.iv),
            ) !== JSON.stringify(projectRecord && Array.from(projectRecord.iv))
          )
            throw Error(textFor(vaultText).projectsChangedRestore);
          await tx.objectStore("meta").put(nextProjects, "projects");
          if (nextMemories) {
            if (recordIv(await tx.objectStore("meta").get("memories")) !== recordIv(memoryRecord))
              throw Error(textFor(vaultText).restoreCancelled);
            await tx.objectStore("meta").put(nextMemories, "memories");
          }
          if (nextTasks) {
            if (recordIv(await tx.objectStore("meta").get("scheduled-tasks")) !== recordIv(taskRecord))
              throw Error(textFor(vaultText).restoreCancelled);
            await tx.objectStore("meta").put(nextTasks, "scheduled-tasks");
          }
          if (nextFiles) {
            if (recordIv(await tx.objectStore("meta").get("project-files")) !== recordIv(filesRecord))
              throw Error(textFor(vaultText).restoreCancelled);
            await tx.objectStore("meta").put(nextFiles, "project-files");
          }
          for (const { id, ...record } of encrypted) {
            if (
              generation !== this.generation ||
              !this.key ||
              (await tx.objectStore("meta").get(`deleted:${id}`))
            )
              throw Error(textFor(vaultText).restoreCancelled);
            await tx.objectStore("conversations").add(record, id);
          }
          if (generation !== this.generation || !this.key)
            throw Error(textFor(vaultText).restoreCancelled);
          await tx.done;
        } catch (error) {
          try {
            tx.abort();
          } catch {
            /* Transaction may already have aborted. */
          }
          await tx.done.catch(() => {});
          throw error;
        }
        this.written();
        return encrypted.length;
      } finally {
        database.close();
      }
    });
  }
  changePassphrase(
    currentPassphrase: string,
    nextPassphrase: string,
  ): Promise<void> {
    const salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!this.key || !salt)
      return Promise.reject(Error(textFor(vaultText).unlockTheVault));
    if (nextPassphrase.length < 12 || nextPassphrase === currentPassphrase)
      return Promise.reject(
        Error(textFor(vaultText).differentPassphrase),
      );
    // A synced vault: the passphrase only wraps AK on this device, so changing it re-wraps AK.
    if (this.accountKeyRaw)
      return this.setLocalPassphrase(nextPassphrase, currentPassphrase).then(() => {
        if (generation === this.generation) this.lock();
      });
    return this.reencrypt(salt, generation, databaseName, async (meta) => {
      const currentKey = await derive(currentPassphrase, meta.salt);
      if (
        (await unseal(currentKey, meta.check, "vault-check-v1")) !==
        "privateai-v1"
      )
        throw Error(textFor(vaultText).wrongPassphrase);
      const nextSalt = random(16);
      const nextKey = await derive(nextPassphrase, nextSalt);
      const check = await seal(nextKey, "privateai-v1", "vault-check-v1");
      return { currentKey, nextKey, nextMeta: { salt: nextSalt, check } };
    }).then(() => {
      if (generation === this.generation) this.lock();
    });
  }
  /**
   * Re-encrypts every record from one vault key to another in one transaction: the passphrase
   * change, and the move of a vault under sync's account key. `keys` gets the stored identity record.
   */
  private reencrypt(
    salt: Uint8Array<ArrayBuffer>,
    generation: number,
    databaseName: string,
    keys: (meta: VaultMeta) => Promise<{ currentKey: CryptoKey; nextKey: CryptoKey; nextMeta: VaultMeta }>,
    /** "keep": a remembered device stays remembered with the new key (passphrase change); "forget": the slot goes (moves into and out of sync). */
    remembered: "keep" | "forget" = "keep",
  ): Promise<{ nextKey: CryptoKey; nextMeta: VaultMeta; renamed: Map<string, string> }> {
    return this.enqueue(async () => {
      const unchanged = () => {
        if (generation !== this.generation || !this.key)
          throw Error(textFor(vaultText).passphraseCancelled);
      };
      unchanged();
      const database = await db(databaseName);
      try {
        unchanged();
        const read = database.transaction(
          ["meta", "conversations"],
          "readonly",
        );
        const meta = (await read.objectStore("meta").get("vault")) as VaultMeta;
        requireVaultIdentity(meta, salt);
        const [ids, records] = await Promise.all([
          read.objectStore("conversations").getAllKeys(),
          read.objectStore("conversations").getAll(),
        ]);
        const projectRecord = (await read
          .objectStore("meta")
          .get("projects")) as Cipher | undefined;
        const memoryRecord = (await read
          .objectStore("meta")
          .get("memories")) as Cipher | undefined;
        const filesRecord = (await read.objectStore("meta").get("project-files")) as Cipher | undefined;
        const taskRecord = (await read.objectStore("meta").get("scheduled-tasks")) as Cipher | undefined;
        await read.done;
        const { currentKey, nextKey, nextMeta } = await keys(meta);
        const nextProjects = projectRecord
          ? await seal(
              nextKey,
              JSON.stringify(
                projectsSchema.parse(
                  JSON.parse(
                    await unseal(currentKey, projectRecord, "projects-v1"),
                  ),
                ),
              ),
              "projects-v1",
            )
          : undefined;
        const nextMemories = memoryRecord
          ? await seal(
              nextKey,
              JSON.stringify(await openMemories(currentKey, memoryRecord)),
              MEMORY_LABEL,
            )
          : undefined;
        const nextFiles = filesRecord
          ? await seal(
              nextKey,
              JSON.stringify(await openProjectFiles(currentKey, filesRecord)),
              FILES_LABEL,
            )
          : undefined;
        const nextTasks = taskRecord
          ? await seal(nextKey, taskRecordText(await openTaskRecord(currentKey, taskRecord)), TASKS_LABEL)
          : undefined;
        const replacements: {
          id: IDBValidKey;
          version: string;
          wrapped: Cipher;
        }[] = [];
        for (const [index, id] of ids.entries()) {
          unchanged();
          const record = records[index] as { wrapped: Cipher; data: Cipher };
          const raw = await unseal(currentKey, record.wrapped, `key:${id}`);
          const dataKey = await crypto.subtle.importKey(
            "raw",
            new Uint8Array(JSON.parse(raw)),
            "AES-GCM",
            false,
            ["decrypt"],
          );
          const decoded = savedConversationSchema.parse(
            JSON.parse(
              await unseal(dataKey, record.data, `conversation:${id}`),
            ),
          );
          if (decoded.id !== id || containsTemporaryResearch(decoded))
            throw Error("A saved record cannot be safely updated.");
          replacements.push({
            id,
            version: recordVersion(record),
            wrapped: await seal(nextKey, raw, `key:${id}`),
          });
        }
        unchanged();
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        try {
          requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
          const store = tx.objectStore("conversations");
          if ((await store.count()) !== replacements.length)
            throw Error(
              textFor(vaultText).historyChangedPassphrase,
            );
          for (const replacement of replacements) {
            unchanged();
            const current = await store.get(replacement.id);
            if (!current || recordVersion(current) !== replacement.version)
              throw Error(
                textFor(vaultText).historyChangedPassphrase,
              );
            await store.put(
              { ...current, wrapped: replacement.wrapped },
              replacement.id,
            );
          }
          unchanged();
          const currentProjects = (await tx
            .objectStore("meta")
            .get("projects")) as Cipher | undefined;
          if (
            JSON.stringify(
              currentProjects && Array.from(currentProjects.iv),
            ) !== JSON.stringify(projectRecord && Array.from(projectRecord.iv))
          )
            throw Error(textFor(vaultText).projectsChangedPassphrase);
          if (nextProjects)
            await tx.objectStore("meta").put(nextProjects, "projects");
          if (recordIv(await tx.objectStore("meta").get("memories")) !== recordIv(memoryRecord))
            throw Error(textFor(vaultText).historyChangedPassphrase);
          if (nextMemories)
            await tx.objectStore("meta").put(nextMemories, "memories");
          if (recordIv(await tx.objectStore("meta").get("project-files")) !== recordIv(filesRecord))
            throw Error(textFor(vaultText).historyChangedPassphrase);
          if (nextFiles) await tx.objectStore("meta").put(nextFiles, "project-files");
          if (recordIv(await tx.objectStore("meta").get("scheduled-tasks")) !== recordIv(taskRecord))
            throw Error(textFor(vaultText).historyChangedPassphrase);
          if (nextTasks) await tx.objectStore("meta").put(nextTasks, "scheduled-tasks");
          await tx.objectStore("meta").put(nextMeta, "vault");
          // A remembered device stays remembered, with the new key; a move into or out of sync drops the slot.
          if (remembered === "forget") await tx.objectStore("meta").delete(REMEMBERED);
          else if (await tx.objectStore("meta").get(REMEMBERED)) await tx.objectStore("meta").put(nextKey, REMEMBERED);
          unchanged();
          await tx.done;
        } catch (error) {
          try {
            tx.abort();
          } catch {
            /* Already completed or aborted. */
          }
          await tx.done.catch(() => {});
          throw error;
        }
        const renamed = new Map(replacements.map((r) => [r.version, recordVersion({ wrapped: r.wrapped })]));
        return { nextKey, nextMeta, renamed };
      } finally {
        database.close();
      }
    });
  }
  /**
   * Deletes a conversation (and leaves its tombstone). `basedOn` (sync applying a remote delete):
   * refused with VaultConflictError when the stored copy changed since that copy was read.
   */
  delete(id: string, basedOn?: Conversation) {
    const generation = this.generation,
      salt = this.salt,
      databaseName = this.databaseName;
    if (!this.key)
      return Promise.reject(new Error(textFor(vaultText).unlockBeforeDeleting));
    const seen = basedOn ? this.versions.get(basedOn) : undefined;
    return this.enqueue(async () => {
      if (generation !== this.generation || !this.key)
        throw new Error(textFor(vaultText).deletionCancelled);
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw new Error(textFor(vaultText).deletionCancelled);
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
        if (basedOn) {
          const existing = await tx.objectStore("conversations").get(id);
          const expected = seen === undefined ? undefined : (this.renamed.get(seen) ?? seen);
          if (basedOn.id !== id || expected === undefined || (existing ? recordVersion(existing) : undefined) !== expected) {
            tx.abort();
            await tx.done.catch(() => {});
            throw new VaultConflictError();
          }
        }
        await tx.objectStore("meta").put(true, `deleted:${id}`);
        if (generation !== this.generation || !this.key) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new Error(textFor(vaultText).deletionCancelled);
        }
        await tx.objectStore("conversations").delete(id);
        await tx.done;
        if (generation === this.generation) this.channel?.postMessage("delete");
        this.written();
      } finally {
        database.close();
      }
    });
  }
  /**
   * Deletes this account's whole vault database on this device (every saved
   * conversation, project and tombstone) and locks. Device-only: nothing on
   * the secure server, the provider or our request records is affected.
   */
  async eraseEverything(): Promise<void> {
    const databaseName = this.databaseName;
    this.lock();
    await this.queue;
    await deleteDB(databaseName, {
      blocked() {
        /* another tab still holds the database open; deletion completes when it closes */
      },
    });
    this.channel?.postMessage("lock");
  }
}
