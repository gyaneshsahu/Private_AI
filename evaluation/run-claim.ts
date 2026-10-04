import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function claimExperiment(runs: string, approvalId: string) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(approvalId))
    throw new Error("Invalid approval ID");
  await mkdir(runs, { recursive: true, mode: 0o700 });
  const runDir = resolve(runs, approvalId);
  // Existence means consumed, including crashes before any request. Never reset
  // automatically: remote charges after an interrupted request may be unknown.
  await mkdir(runDir, { mode: 0o700 });
  return runDir;
}
