/**
 * The sync engine's public API for the screens (.local/sync-contract.md, "Browser engine API").
 * The app calls attachSync once the account and the vault are known and status.vaultSync is
 * present; every other function works on that one engine.
 */
import { useSyncExternalStore } from "react";
import type { Vault } from "../vault";
import { SyncEngine, SyncError, type Fetcher, type SyncState } from "./engine";
export { SyncError, type SyncErrorCode, type SyncPhase, type SyncState, type SyncDevice } from "./engine";
/** The recovery key's own format (28 Crockford base32 characters, 7 groups of 4, mod-1021 check) for the screens. */
export { encodeRecoveryKey, decodeRecoveryKey } from "./crypto";

const OFF: SyncState = { phase: "off", pending: 0, devices: [] };
let engine: SyncEngine | undefined;
let snapshot = OFF;
const listeners = new Set<() => void>();
const appliedListeners = new Set<() => void>();
const publish = (state: SyncState) => {
  snapshot = state;
  listeners.forEach((l) => l());
};
const need = () => {
  if (!engine) throw new SyncError("not-set-up");
  return engine;
};

/** Binds sync to this account's vault; unlocks a remembered device and starts the timers. */
export async function attachSync(opts: { vault: Vault; accountId: string; csrf: () => string; fetch?: Fetcher; pollMs?: number }) {
  detachSync();
  const next = new SyncEngine({ ...opts, onState: publish, onApplied: () => appliedListeners.forEach((l) => l()) });
  engine = next;
  await next.init();
  if (engine === next) next.start();
}
export function detachSync() {
  engine?.detach();
  engine = undefined;
  publish(OFF);
}
/** Called after remote changes were written into the vault (or it was opened or moved by sync). */
export function onSyncApplied(listener: () => void): () => void {
  appliedListeners.add(listener);
  return () => appliedListeners.delete(listener);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );
}
export const setUpSync = (opts: { deviceLabel: string; rememberDevice: boolean }) => need().setUp(opts);
export const confirmRecoveryKeySaved = (lastGroup: string) => need().confirmRecoveryKeySaved(lastGroup);
export const startPairing = (opts?: { rememberDevice?: boolean; deviceLabel?: string }) => need().startPairing(opts);
export const approvePairing = (code: string, deviceLabel: string) => need().approvePairing(code, deviceLabel);
export const unlockWithRecoveryKey = (recoveryKey: string, opts: { deviceLabel: string; rememberDevice: boolean }) =>
  need().unlockWithRecoveryKey(recoveryKey, opts);
export const revokeDevice = (deviceId: string) => need().revokeDevice(deviceId);
export const resetSync = (confirm: string, opts?: { localPassphrase?: string }) => need().resetSync(confirm, opts);
export const syncNow = () => need().syncNow();
/** A remembered device opens its vault again after a lock; see openLocalVault. */
export const unlockThisDevice = () => need().unlockThisDevice();
export const turnOffSyncOnThisDevice = (opts?: { localPassphrase?: string }) => need().turnOffSyncOnThisDevice(opts);
/** "Remember this device" on or off while sync is on here. */
export const setRememberDevice = (remember: boolean) => need().setRememberDevice(remember);
/** "Delete everything on this device"; the screen asks whether to delete the synced copy too. */
export const deleteEverythingOnThisDevice = (opts: { alsoDeleteSyncedData: boolean }) => need().deleteEverythingOnThisDevice(opts);
/**
 * Sets, replaces or (null) removes the optional local passphrase of a synced vault. After a
 * recovery-key unlock no current passphrase is needed: that is how a forgotten one is replaced.
 */
export const setLocalPassphrase = (passphrase: string | null, current?: string) => need().vault.setLocalPassphrase(passphrase, current);
/**
 * Opens this account's vault with this device's own key when the device is remembered for sync
 * (also after the idle lock or a lock from another tab). False: not remembered here, so the
 * passphrase, the recovery key or another device is needed. The app calls it on start and
 * whenever the engine leaves "needs-approval".
 */
export const openLocalVault = async (vault: Vault): Promise<boolean> => {
  if (!engine || need().vault !== vault) return false;
  return (await engine.unlockThisDevice().catch(() => "not-remembered")) === "ok";
};

// Stage 3: project files as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3: project files").
export {
  useSyncFiles,
  downloadProjectFile,
  removeSyncedProjectFile,
  ensureProjectFiles,
  type FilesView,
  type FileState,
  type FileEntry,
  type DownloadResult,
} from "./files";

// Security review of 15 November (docs/vault-sync-20261115.md, section 15): the pairing code is 8
// Crockford base32 characters (show it with formatPairingCode, accept any case, spaces and hyphens),
// and SyncState.detached names a device that is no longer part of sync but keeps its data.
export { PAIRING_CODE_LENGTH, formatPairingCode, normalizePairingCode } from "./crypto";
export type { SyncDetached } from "./engine";
