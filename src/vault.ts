import { openDB } from "idb";
import type { Conversation } from "../shared/contracts";
import { savedConversationSchema } from "./saved-conversation";
const encoder = new TextEncoder();
const db = (name: string) =>
  openDB(name, 1, {
    upgrade(database) {
      database.createObjectStore("meta");
      database.createObjectStore("conversations");
    },
  });
export type Cipher = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer };
function random(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}
async function seal(
  key: CryptoKey,
  value: string,
  aad: string,
): Promise<Cipher> {
  const iv = random(12);
  return {
    iv,
    data: await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
      key,
      encoder.encode(value),
    ),
  };
}
async function unseal(
  key: CryptoKey,
  value: Cipher,
  aad: string,
): Promise<string> {
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: value.iv, additionalData: encoder.encode(aad) },
      key,
      value.data,
    ),
  );
}
async function derive(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export class Vault {
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
    this.key = undefined;
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
    if (passphrase.length < 12)
      throw new Error(
        "Use a passphrase of at least 12 characters. There is no recovery service.",
      );
    const database = await db(this.databaseName);
    const existing = (await database.get("meta", "vault")) as
      { salt: Uint8Array<ArrayBuffer>; check: Cipher } | undefined;
    const salt = existing?.salt ?? random(16);
    const key = await derive(passphrase, salt);
    if (existing) {
      if (
        (await unseal(key, existing.check, "vault-check-v1")) !== "privateai-v1"
      )
        throw new Error("Vault unlock failed.");
    } else {
      const check = await seal(key, "privateai-v1", "vault-check-v1");
      // add, not put: two simultaneous first-time unlocks must not overwrite each other.
      await database.add("meta", { salt, check }, "vault");
    }
    if (generation !== this.generation) throw new Error("Unlock cancelled.");
    this.key = key;
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }
  save(conversation: Conversation) {
    const key = this.key,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(new Error("Unlock your vault before saving."));
    const snapshot = structuredClone(conversation);
    return this.enqueue(async () => {
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
        if (generation !== this.generation || !this.key) {
          tx.abort();
          await tx.done.catch(() => {});
          throw new Error("Vault locked before save completed.");
        }
        await tx
          .objectStore("conversations")
          .put({ wrapped, data }, snapshot.id);
        await tx.done;
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
  async readAvailable(): Promise<{
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
      const ids = await database.getAllKeys("conversations");
      const output: Conversation[] = [];
      let unreadable = 0;
      for (const id of ids) {
        const record = await database.get("conversations", id);
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
          if (conversation.id !== id)
            throw new Error("Snapshot identity mismatch.");
          output.push(conversation);
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
