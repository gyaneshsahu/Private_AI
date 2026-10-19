import { openDB } from "idb";
import type { Conversation } from "../shared/contracts";
import {
  containsTemporaryResearch,
  savedConversationSchema,
} from "./saved-conversation";
import { derive, seal, unseal, type Cipher } from "./vault-crypto";
export type { Cipher } from "./vault-crypto";
import {
  encodeVaultBackup,
  decodeVaultBackup,
  BACKUP_MAX_CONVERSATIONS,
} from "./vault-backup";
const db = (name: string) =>
  openDB(name, 1, {
    upgrade(database) {
      database.createObjectStore("meta");
      database.createObjectStore("conversations");
    },
  });
function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}
export class VaultConflictError extends Error {
  constructor() {
    super(
      "This saved conversation changed in another tab. Save your work as a new conversation to keep both versions.",
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
export class Vault {
  private observed = new Map<string, string>();
  private versions = new WeakMap<Conversation, string>();
  private databaseName = "privateai-vault";
  selectAccount(id?: string) {
    if (this.unlocked)
      throw new Error("Lock the vault before switching accounts.");
    if (id !== undefined && !/^[a-f0-9-]{36}$/.test(id))
      throw new Error("Invalid account scope.");
    this.lock(false);
    this.databaseName = id ? `privateai-vault-${id}` : "privateai-vault";
    this.connectChannel();
  }
  private key?: CryptoKey;
  private salt?: Uint8Array<ArrayBuffer>;
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private channel?: BroadcastChannel;
  onInvalidate?: () => void;
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
    this.key = undefined;
    this.salt = undefined;
    this.generation++;
    if (broadcast) this.channel?.postMessage("lock");
  }
  close(broadcast = true) {
    this.lock(broadcast);
    this.channel?.close();
    this.channel = undefined;
  }
  async unlock(passphrase: string) {
    const generation = ++this.generation;
    this.key = undefined;
    this.salt = undefined;
    if (passphrase.length < 12)
      throw new Error(
        "Use a passphrase of at least 12 characters. There is no recovery service.",
      );
    const database = await db(this.databaseName);
    try {
      const existing = (await database.get("meta", "vault")) as
        { salt: Uint8Array<ArrayBuffer>; check: Cipher } | undefined;
      const salt = existing?.salt ?? random(16);
      const key = await derive(passphrase, salt);
      if (existing) {
        if (
          (await unseal(key, existing.check, "vault-check-v1")) !==
          "privateai-v1"
        )
          throw new Error("Vault unlock failed.");
      } else {
        const check = await seal(key, "privateai-v1", "vault-check-v1");
        // add, not put: two simultaneous first-time unlocks must not overwrite each other.
        await database.add("meta", { salt, check }, "vault");
      }
      if (generation !== this.generation) throw new Error("Unlock cancelled.");
      this.key = key;
      this.salt = salt.slice();
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
    if (containsTemporaryResearch(conversation))
      return Promise.reject(
        new Error(
          "Search conversations are temporary in this test version and cannot be saved. Start a new conversation to save other work.",
        ),
      );
    const key = this.key,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(new Error("Unlock your vault before saving."));
    const snapshot = structuredClone(conversation);
    return this.enqueue(async () => {
      const expected =
        basedOn === undefined
          ? this.observed.get(snapshot.id)
          : basedOn === null
            ? undefined
            : this.versions.get(basedOn);
      if (basedOn && (basedOn.id !== snapshot.id || expected === undefined))
        throw new VaultConflictError();
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
        throw new Error("Vault locked before save completed.");
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw new Error("Vault locked before save completed.");
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        if (await tx.objectStore("meta").get(`deleted:${snapshot.id}`)) {
          await tx.done;
          throw new Error(
            "This conversation was deleted. Create a new conversation instead.",
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
          throw new Error("Vault locked before save completed.");
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
        return snapshot;
      } finally {
        database.close();
      }
    });
  }
  async list(): Promise<Conversation[]> {
    const result = await this.readAvailable();
    if (result.unreadable)
      throw new Error("Some saved snapshots could not be read.");
    return result.conversations;
  }
  async readAvailable(maximum = Number.POSITIVE_INFINITY): Promise<{
    conversations: Conversation[];
    unreadable: number;
  }> {
    const key = this.key,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) throw new Error("Vault is locked.");
    await this.queue;
    if (generation !== this.generation) throw new Error("Vault was locked.");
    const database = await db(databaseName);
    try {
      const tx = database.transaction("conversations", "readonly");
      const store = tx.objectStore("conversations");
      if ((await store.count()) > maximum) {
        await tx.done;
        throw Error(`Backup supports at most ${maximum} saved conversations.`);
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
          const raw = new Uint8Array(
            JSON.parse(await unseal(key, record.wrapped, `key:${id}`)),
          );
          const dataKey = await crypto.subtle.importKey(
            "raw",
            raw,
            "AES-GCM",
            false,
            ["decrypt"],
          );
          const decoded: unknown = JSON.parse(
            await unseal(dataKey, record.data, `conversation:${id}`),
          );
          savedConversationSchema.parse(decoded);
          // Validate without rewriting snapshots or dropping fields from older writers.
          const conversation = decoded as Conversation;
          if (containsTemporaryResearch(conversation))
            throw new Error("Temporary research snapshot cannot be reopened.");
          if (conversation.id !== id)
            throw new Error("Snapshot identity mismatch.");
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
          throw new Error("Vault was locked.");
      }
      if (generation !== this.generation) throw new Error("Vault was locked.");
      return { conversations: output, unreadable };
    } finally {
      database.close();
    }
  }
  async exportBackup(): Promise<string> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation;
    if (!key || !salt)
      throw Error("Unlock your vault before creating a backup.");
    const available = await this.readAvailable(BACKUP_MAX_CONVERSATIONS);
    if (available.unreadable)
      throw Error(
        "Unreadable snapshots prevent a complete backup. Existing data was not changed.",
      );
    const text = await encodeVaultBackup(key, salt, available.conversations);
    if (generation !== this.generation || !this.key)
      throw Error("Backup cancelled because the vault changed.");
    return text;
  }
  restoreBackup(text: string, passphrase: string): Promise<number> {
    const key = this.key,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(
        Error("Unlock the destination vault before restoring."),
      );
    return this.enqueue(async () => {
      const conversations = await decodeVaultBackup(text, passphrase);
      const encrypted = [];
      for (const original of conversations) {
        if (generation !== this.generation || !this.key)
          throw Error("Restore cancelled because the vault changed.");
        const snapshot = { ...original, id: crypto.randomUUID() };
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
        throw Error("Restore cancelled because the vault changed.");
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw Error("Restore cancelled because the vault changed.");
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        try {
          for (const { id, ...record } of encrypted) {
            if (
              generation !== this.generation ||
              !this.key ||
              (await tx.objectStore("meta").get(`deleted:${id}`))
            )
              throw Error("Restore cancelled because the vault changed.");
            await tx.objectStore("conversations").add(record, id);
          }
          if (generation !== this.generation || !this.key)
            throw Error("Restore cancelled because the vault changed.");
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
        return encrypted.length;
      } finally {
        database.close();
      }
    });
  }
  delete(id: string) {
    const generation = this.generation,
      databaseName = this.databaseName;
    if (!this.key)
      return Promise.reject(new Error("Unlock your vault before deleting."));
    return this.enqueue(async () => {
      if (generation !== this.generation || !this.key)
        throw new Error("Deletion cancelled because the vault changed.");
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw new Error("Deletion cancelled because the vault changed.");
        const tx = database.transaction(["meta", "conversations"], "readwrite");
        await tx.objectStore("meta").put(true, `deleted:${id}`);
        if (generation !== this.generation || !this.key) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new Error("Deletion cancelled because the vault changed.");
        }
        await tx.objectStore("conversations").delete(id);
        await tx.done;
        if (generation === this.generation) this.channel?.postMessage("delete");
      } finally {
        database.close();
      }
    });
  }
}
