/**
 * Two stores, routed by mode (docs/secure-store-20261116.md, .local/modes-contract.md).
 *   "max"    = the existing vault that src/App.tsx holds (a passphrase vault or the encrypted sync).
 *   "secure" = a second Vault instance in its own database, opened with the key the server hands to
 *              the signed-in session, with a second sync engine in custodial form (no devices).
 * A chat's or project's mode is the store that holds it; this module remembers which id came from
 * which store and merges the two lists for the screens. Nothing here exists while
 * `status.secureStore` is absent: no request, no database, and every read goes straight to the vault.
 */
import { useSyncExternalStore } from "react";
import { deleteDB } from "idb";
import type { Conversation } from "../shared/contracts";
import type { Mode } from "../shared/modes";
import type { Project } from "./projects";
import { fromBase64 } from "./sync/crypto";
import { SyncEngine, type Fetcher } from "./sync/engine";
import { FILES_OFF, bindFileActions, publishFiles } from "./sync/files";
import { Vault } from "./vault";

const VAULT_PREFIX = "cometrow-secure";
const DEFAULT_KEY = "cometrow.defaultMode";
interface Open {
  vault: Vault;
  engine: SyncEngine;
}
export interface SecureState {
  /** The Secure store is open on this device (signed in, key received). */
  ready: boolean;
  /** The account's default for new chats; from the server, with this browser's last known value as fallback. */
  defaultMode: Mode;
}
let current: Open | undefined;
let opening = 0;
let state: SecureState = { ready: false, defaultMode: "secure" };
const listeners = new Set<() => void>();
const modes = new Map<string, Mode>();
const set = (patch: Partial<SecureState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const within = <T>(work: Promise<T>, ms: number) => Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, ms))]);
const remembered = (): Mode => {
  try {
    return localStorage.getItem(DEFAULT_KEY) === "max" ? "max" : "secure";
  } catch {
    return "secure";
  }
};
const remember = (mode?: Mode) => {
  try {
    if (mode) localStorage.setItem(DEFAULT_KEY, mode);
    else localStorage.removeItem(DEFAULT_KEY);
  } catch {
    /* storage blocked: the server's value is asked again at the next sign-in */
  }
};

export function useSecureState(): SecureState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
/** The Secure vault while it is open; undefined while Secure is off, signed out or still opening. */
export const secureVault = (): Vault | undefined => (state.ready && current?.vault.unlocked ? current.vault : undefined);
/** The store of a mode: `max` is the vault the app holds. */
export const vaultFor = (mode: Mode, max: Vault | null): Vault | null => (mode === "secure" ? (secureVault() ?? null) : max);
/** The mode of a saved chat or project (the store it was read from); undefined for something not saved yet. */
export const modeOf = (id?: string): Mode | undefined => (id ? modes.get(id) : undefined);
/** A chat or project just created in a mode, before the lists are read again. */
export const assignMode = (id: string, mode: Mode) => void modes.set(id, mode);

async function eraseDatabases(open: Open | undefined, accountId: string) {
  // Never hangs on another tab that still holds a database open: it is deleted when that tab closes.
  if (open) {
    await within(open.engine.eraseLocal(), 2000);
    await within(open.vault.eraseEverything(), 2000);
  } else {
    await within(deleteDB(`cometrow-secure-sync-${accountId}`, { blocked() {} }), 2000);
    await within(deleteDB(`${VAULT_PREFIX}-${accountId}`, { blocked() {} }), 2000);
  }
}

/**
 * Right after sign-in: asks the server for this account's key, opens the Secure database with it
 * (the key stays in memory only, in the vault object, as the sync key does), pulls, and keeps
 * syncing on focus, every 60 seconds while visible and after each save. False: Secure is not
 * available right now (offline, or the server refused).
 */
export async function openSecure(o: { accountId: string; csrf: () => string; onApplied: () => void; fetch?: Fetcher }): Promise<boolean> {
  const turn = ++opening;
  set({ defaultMode: remembered() });
  let body: { key?: unknown; accountId?: unknown; defaultMode?: unknown };
  try {
    const r = await fetch("/api/secure/key", { cache: "no-store", credentials: "same-origin" });
    if (!r.ok) return false;
    body = await r.json();
  } catch {
    return false;
  }
  if (typeof body.key !== "string" || body.accountId !== o.accountId || turn !== opening) return false;
  const key = fromBase64(body.key);
  const vault = new Vault();
  vault.selectAccount(o.accountId, VAULT_PREFIX);
  try {
    await vault.unlockWithAccountKey(key);
  } catch {
    // A local copy under another key (the server's data was reset): the server is the source, start empty.
    await eraseDatabases(undefined, o.accountId);
    await vault.unlockWithAccountKey(key);
  }
  if (turn !== opening) {
    vault.close(false);
    return false;
  }
  const engine = new SyncEngine({
    vault,
    accountId: o.accountId,
    csrf: o.csrf,
    custodial: true,
    ...(o.fetch ? { fetch: o.fetch } : {}),
    onApplied: o.onApplied,
    onFiles: (view) => publishFiles(view, "secure"),
  });
  bindFileActions(engine, "secure");
  current = { vault, engine };
  // Locked from another tab (its sign-out): this tab has no Secure store any more.
  vault.onInvalidate = () => current?.vault === vault && set({ ready: false });
  const defaultMode: Mode = body.defaultMode === "max" ? "max" : "secure";
  remember(defaultMode);
  // The first pull; a failure (offline) still opens what this device already holds.
  await engine.init().catch(() => {});
  if (current?.vault !== vault) return false;
  engine.start();
  set({ ready: true, defaultMode });
  return true;
}
/** Before sign-out, while the session still works: one bounded attempt to send what is not sent yet. */
export async function flushSecure() {
  if (current) await within(current.engine.syncNow().catch(() => {}), 3000);
}
/**
 * Stops the Secure store. `erase` (sign-out, another account): the local Secure databases on this
 * device are deleted, with this browser's remembered default; the server copy stays with the account.
 */
export async function closeSecure(erase: boolean, accountId?: string) {
  opening++;
  const open = current;
  current = undefined;
  bindFileActions(undefined, "secure");
  publishFiles(FILES_OFF, "secure");
  for (const [id, mode] of modes) if (mode === "secure") modes.delete(id);
  if (state.ready) set({ ready: false });
  if (erase) {
    remember(undefined);
    if (open || accountId) await eraseDatabases(open, accountId ?? "");
  } else open?.engine.detach();
  open?.vault.close(false);
}
/** Stores the account's default mode on the server (so it follows the user) and in this browser. */
export async function saveDefaultMode(mode: Mode, csrf: string): Promise<boolean> {
  try {
    const r = await fetch("/api/secure/default-mode", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": csrf },
      body: JSON.stringify({ mode }),
    });
    if (r.status !== 204) return false;
  } catch {
    return false;
  }
  remember(mode);
  set({ defaultMode: mode });
  return true;
}

const sources = (max: Vault | null): [Mode, Vault][] => {
  const secure = secureVault();
  return [...(secure ? [["secure", secure] as [Mode, Vault]] : []), ...(max?.unlocked ? [["max", max] as [Mode, Vault]] : [])];
};
/** Saved chats of both modes (the lists sort themselves). Without Secure this is the vault's own answer, errors included. */
export async function readAvailable(max: Vault | null): Promise<{ conversations: Conversation[]; unreadable: number }> {
  if (!secureVault()) {
    const own = await max!.readAvailable();
    for (const c of own.conversations) modes.set(c.id, "max");
    return own;
  }
  const out = { conversations: [] as Conversation[], unreadable: 0 };
  for (const [mode, vault] of sources(max)) {
    const part = await vault.readAvailable();
    for (const c of part.conversations) modes.set(c.id, mode);
    out.conversations.push(...part.conversations);
    out.unreadable += part.unreadable;
  }
  return out;
}
export async function readProjects(max: Vault | null): Promise<Project[]> {
  if (!secureVault()) {
    const own = await max!.readProjects();
    for (const p of own) modes.set(p.id, "max");
    return own;
  }
  const out: Project[] = [];
  for (const [mode, vault] of sources(max)) {
    const part = await vault.readProjects();
    for (const p of part) modes.set(p.id, mode);
    out.push(...part);
  }
  return out;
}
