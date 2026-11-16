// Test fake for src/sync/index.ts (the engine contract, .local/sync-contract.md), served in its place
// by tests/vault-sync-screens-ui.test.ts. Every call goes to /__sync/<operation>, which the test
// answers from one shared fake account in Node, so two browser contexts act as two devices.
import { useSyncExternalStore } from "react";

const device = (() => {
  try {
    let id = localStorage.getItem("fake-sync-device");
    if (!id) localStorage.setItem("fake-sync-device", (id = crypto.randomUUID()));
    return id;
  } catch {
    return "no-storage";
  }
})();
let state = { phase: "off", pending: 0, devices: [] };
const listeners = new Set();
async function call(operation, body = {}) {
  const response = await fetch(`/__sync/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device, ...body }),
  });
  const json = await response.json();
  if (json.state && JSON.stringify(json.state) !== JSON.stringify(state)) {
    state = json.state;
    for (const listener of listeners) listener();
  }
  if (!response.ok) throw Error(json.error ?? "failed");
  return json.result;
}
void call("state").catch(() => {});
setInterval(() => void call("state").catch(() => {}), 250);

export function useSyncState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
export const setUpSync = (opts) => call("setup", opts);
export const confirmRecoveryKeySaved = (lastGroup) => call("confirm", { lastGroup });
export async function startPairing(opts) {
  const { code } = await call("pair-start", opts ?? {});
  const wait = (async () => {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const result = await call("pair-result");
      if (result !== "waiting") return result;
    }
  })();
  return { code, wait };
}
export const approvePairing = (code, deviceLabel) => call("pair-approve", { code, deviceLabel });
export const unlockWithRecoveryKey = (recoveryKey, opts) => call("recover", { recoveryKey, ...opts });
export const setLocalPassphrase = () => call("set-passphrase");
export const revokeDevice = (deviceId) => call("revoke", { deviceId });
export const resetSync = (confirm) => call("reset", { confirm });
export const syncNow = () => call("sync-now");
export class SyncError extends Error {
  constructor(code) {
    super(`Sync: ${code}`);
    this.code = code;
  }
}
// As the engine: turning sync off needs a local passphrase first (the screen asks, then retries).
export async function turnOffSyncOnThisDevice(opts) {
  if (!opts?.localPassphrase) throw new SyncError("needs-local-passphrase");
  return call("turn-off");
}
// The app's wiring (src/App.tsx); the fake engine never opens the vault itself.
export const attachSync = async () => {};
export const detachSync = () => {};
export const onSyncApplied = () => () => {};
export const openLocalVault = async () => false;
export const unlockThisDevice = async () => "not-remembered";
export const setRememberDevice = async () => {};
export const deleteEverythingOnThisDevice = async () => {};
export { encodeRecoveryKey, decodeRecoveryKey, PAIRING_CODE_LENGTH, formatPairingCode, normalizePairingCode } from "/src/sync/crypto.ts";
