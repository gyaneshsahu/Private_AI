import { projectsSchema, type Project } from "./projects";
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
  decodeVaultBackupContent,
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
      "Vault changed in another tab. Lock and unlock before continuing.",
    );
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
      salt = this.salt,
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
            "Project no longer exists. Remove its assignment before saving.",
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
        throw new Error("Vault locked before save completed.");
      const database = await db(databaseName);
      try {
        if (generation !== this.generation || !this.key)
          throw new Error("Vault locked before save completed.");
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
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key) throw new Error("Vault is locked.");
    await this.queue;
    if (generation !== this.generation) throw new Error("Vault was locked.");
    const database = await db(databaseName);
    try {
      const tx = database.transaction(["meta", "conversations"], "readonly");
      requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
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
  async readProjects(): Promise<Project[]> {
    const key = this.key,
      generation = this.generation;
    if (!key) throw Error("Unlock your vault first.");
    await this.queue;
    if (generation !== this.generation) throw Error("Vault changed.");
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
      if (generation !== this.generation) throw Error("Vault changed.");
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
    if (!key) return Promise.reject(Error("Unlock your vault first."));
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
            "Projects changed in another tab. Unlock again and retry.",
          );
        }
        await tx.store.put(encrypted, "projects");
        await tx.done;
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
    if (!key) return Promise.reject(Error("Unlock your vault first."));
    return this.enqueue(async () => {
      const database = await db(databaseName);
      const unchanged = () => {
        if (generation !== this.generation || !this.key)
          throw Error("Vault changed during project update.");
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
        await read.done;
        const projects = previous
          ? projectsSchema.parse(
              JSON.parse(await unseal(key, previous, "projects-v1")),
            )
          : [];
        if (!projects.some((p) => p.id === id))
          throw Error("Project no longer exists. Unlock again to refresh.");
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
              throw Error("Unreadable history prevents safe project removal.");
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
            throw Error("Projects changed in another tab.");
          const store = tx.objectStore("conversations");
          if (name === undefined) {
            if ((await store.count()) !== records.length)
              throw Error("History changed during removal. Try again.");
            for (const [index, recordId] of ids.entries()) {
              const existing = await store.get(recordId);
              if (
                !existing ||
                recordVersion(existing) !== recordVersion(records[index])
              )
                throw Error("History changed during removal. Try again.");
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
          unchanged();
          await tx.done;
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
    const text = await encodeVaultBackup(
      key,
      salt,
      available.conversations,
      await this.readProjects(),
    );
    if (generation !== this.generation || !this.key)
      throw Error("Backup cancelled because the vault changed.");
    return text;
  }
  restoreBackup(text: string, passphrase: string): Promise<number> {
    const key = this.key,
      salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!key)
      return Promise.reject(
        Error("Unlock the destination vault before restoring."),
      );
    return this.enqueue(async () => {
      const { conversations, projects } = await decodeVaultBackupContent(
        text,
        passphrase,
      );
      const databaseBefore = await db(databaseName);
      let projectRecord: Cipher | undefined;
      try {
        projectRecord = await databaseBefore.get("meta", "projects");
      } finally {
        databaseBefore.close();
      }
      const existingProjects = projectRecord
        ? projectsSchema.parse(
            JSON.parse(await unseal(key, projectRecord, "projects-v1")),
          )
        : [];
      const projectIds = new Map(
        projects.map((p) => [p.id, crypto.randomUUID()]),
      );
      const mergedProjects = projectsSchema.parse([
        ...existingProjects,
        ...projects.map((p) => ({ ...p, id: projectIds.get(p.id)! })),
      ]);
      const nextProjects = await seal(
        key,
        JSON.stringify(mergedProjects),
        "projects-v1",
      );
      const encrypted = [];
      for (const original of conversations) {
        if (generation !== this.generation || !this.key)
          throw Error("Restore cancelled because the vault changed.");
        const snapshot = {
          ...original,
          id: crypto.randomUUID(),
          projectId: original.projectId
            ? projectIds.get(original.projectId)
            : undefined,
        };
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
          requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
          const currentProjects = (await tx
            .objectStore("meta")
            .get("projects")) as Cipher | undefined;
          if (
            JSON.stringify(
              currentProjects && Array.from(currentProjects.iv),
            ) !== JSON.stringify(projectRecord && Array.from(projectRecord.iv))
          )
            throw Error("Projects changed during restore.");
          await tx.objectStore("meta").put(nextProjects, "projects");
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
  changePassphrase(
    currentPassphrase: string,
    nextPassphrase: string,
  ): Promise<void> {
    const salt = this.salt,
      generation = this.generation,
      databaseName = this.databaseName;
    if (!this.key || !salt)
      return Promise.reject(Error("Unlock the vault first."));
    if (nextPassphrase.length < 12 || nextPassphrase === currentPassphrase)
      return Promise.reject(
        Error("Choose a different passphrase of at least 12 characters."),
      );
    return this.enqueue(async () => {
      const unchanged = () => {
        if (generation !== this.generation || !this.key)
          throw Error("Passphrase change cancelled because the vault changed.");
      };
      unchanged();
      const database = await db(databaseName);
      try {
        unchanged();
        const read = database.transaction(
          ["meta", "conversations"],
          "readonly",
        );
        const meta = (await read.objectStore("meta").get("vault")) as {
          salt: Uint8Array<ArrayBuffer>;
          check: Cipher;
        };
        requireVaultIdentity(meta, salt);
        const [ids, records] = await Promise.all([
          read.objectStore("conversations").getAllKeys(),
          read.objectStore("conversations").getAll(),
        ]);
        const projectRecord = (await read
          .objectStore("meta")
          .get("projects")) as Cipher | undefined;
        await read.done;
        const currentKey = await derive(currentPassphrase, meta.salt);
        if (
          (await unseal(currentKey, meta.check, "vault-check-v1")) !==
          "privateai-v1"
        )
          throw Error("Current passphrase is incorrect.");
        const nextSalt = random(16);
        const nextKey = await derive(nextPassphrase, nextSalt);
        const check = await seal(nextKey, "privateai-v1", "vault-check-v1");
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
              "Saved history changed. Review it before changing the passphrase.",
            );
          for (const replacement of replacements) {
            unchanged();
            const current = await store.get(replacement.id);
            if (!current || recordVersion(current) !== replacement.version)
              throw Error(
                "Saved history changed. Review it before changing the passphrase.",
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
            throw Error("Projects changed during passphrase update.");
          if (nextProjects)
            await tx.objectStore("meta").put(nextProjects, "projects");
          await tx.objectStore("meta").put({ salt: nextSalt, check }, "vault");
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
        if (generation === this.generation) this.lock();
      } finally {
        database.close();
      }
    });
  }
  delete(id: string) {
    const generation = this.generation,
      salt = this.salt,
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
        requireVaultIdentity(await tx.objectStore("meta").get("vault"), salt);
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
