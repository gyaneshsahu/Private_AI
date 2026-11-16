// Test fake for src/sync/files.ts, served in its place by tests/vault-sync-screens-ui.test.ts: file
// sync is on for this device and a project's files cannot be downloaded (ensureProjectFiles false).
export const FILES_OFF = { enabled: false, remote: [], states: {} };
const view = { enabled: true, remote: [], states: {} };
export const useSyncFiles = () => view;
export const bindFileActions = () => {};
// The real engine (imported by src/stores.ts for Secure mode, unused here) needs these names to load.
export const fileRecordSchema = undefined;
export const projectsDataSchema = undefined;
export const publishFiles = () => {};
export const downloadProjectFile = async () => "gone";
export const removeSyncedProjectFile = async () => {};
export async function ensureProjectFiles() {
  window.__ensureProjectFiles = (window.__ensureProjectFiles ?? 0) + 1;
  return false;
}
