// stub: replaced by Agent C's engine at merge.
// Exactly the browser engine API of the shared sync contract (.local/sync-contract.md), backed by an
// in-memory fake so the screens build and run. Nothing here talks to a server or stores anything.
// The screens rely on nothing beyond the contract, plus the three additions marked PROPOSED below
// (see docs/vault-sync-screens-20261115.md, "Contract changes"). Screens never import this file's
// internals; tests replace the whole module (tests/fixtures/sync-fake.ts).
import { useSyncExternalStore } from "react";
import { formatRecoveryKey, makeRecoveryKey, normalizeRecoveryKey, recoveryKeyGroups } from "../recovery-key-format";

export type SyncPhase = "off" | "locked" | "needs-approval" | "syncing" | "idle" | "error";
export interface SyncState {
  phase: SyncPhase;
  lastSyncAt?: string;
  pending: number;
  error?: string;
  quota?: { usedBytes: number; limitBytes: number };
  devices: Array<{ deviceId: string; label: string; createdAt: string; lastSeenAt: string; thisDevice: boolean; revoked: boolean }>;
  /** PROPOSED: another device asked to pair, so this one shows the approval prompt by itself. */
  pairingRequested?: boolean;
}

let state: SyncState = { phase: "off", pending: 0, devices: [] };
let shownKey: string | undefined;
let accountKey: string | undefined;
let thisLabel = "";
const listeners = new Set<() => void>();
function set(next: Partial<SyncState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, () => state);
}
export async function setUpSync(opts: { deviceLabel: string; rememberDevice: boolean }): Promise<{ recoveryKey: string }> {
  thisLabel = opts.deviceLabel;
  shownKey = formatRecoveryKey(makeRecoveryKey());
  return { recoveryKey: shownKey };
}
export async function confirmRecoveryKeySaved(lastGroup: string): Promise<boolean> {
  if (!shownKey || normalizeRecoveryKey(lastGroup) !== recoveryKeyGroups(shownKey).at(-1)) return false;
  accountKey = normalizeRecoveryKey(shownKey);
  shownKey = undefined;
  const now = new Date().toISOString();
  set({
    phase: "idle",
    lastSyncAt: now,
    devices: [{ deviceId: crypto.randomUUID(), label: thisLabel, createdAt: now, lastSeenAt: now, thisDevice: true, revoked: false }],
  });
  return true;
}
/** PROPOSED: `opts` (remember the new device once approved), optional so the contract call still fits. */
export async function startPairing(_opts?: { rememberDevice: boolean }): Promise<{ code: string; wait: Promise<"approved" | "expired" | "refused"> }> {
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  return { code, wait: new Promise((resolve) => setTimeout(() => resolve("expired"), 10 * 60 * 1000)) };
}
export async function approvePairing(_code: string, _deviceLabel: string): Promise<"approved" | "wrong-code" | "expired"> {
  return "wrong-code";
}
export async function unlockWithRecoveryKey(
  recoveryKey: string,
  _opts: { deviceLabel: string; rememberDevice: boolean },
): Promise<"ok" | "wrong-key"> {
  return accountKey && normalizeRecoveryKey(recoveryKey) === accountKey ? "ok" : "wrong-key";
}
/** PROPOSED: after a recovery-key unlock of a locked device, set a new local vault passphrase. */
export async function setLocalPassphrase(_passphrase: string): Promise<void> {}
export async function revokeDevice(deviceId: string): Promise<void> {
  set({ devices: state.devices.map((d) => (d.deviceId === deviceId ? { ...d, revoked: true } : d)) });
}
export async function resetSync(confirm: string): Promise<void> {
  if (confirm !== "DELETE SYNCED DATA") throw Error("Confirmation phrase required");
  accountKey = undefined;
  set({ phase: "off", devices: [], lastSyncAt: undefined, pending: 0, error: undefined });
}
export async function syncNow(): Promise<void> {
  if (state.phase !== "off") set({ lastSyncAt: new Date().toISOString() });
}
export async function turnOffSyncOnThisDevice(): Promise<void> {
  set({ phase: "off", devices: [] });
}
