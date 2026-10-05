import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Evidence identity only. No credentials, local transcripts or environment values.
export async function implementationIdentity(root: string) {
  const files = [
    "package-lock.json",
    "src/verified-chat.ts",
    "src/completion-events.ts",
    "src/reply-stream.ts",
    "src/stream-failure.ts",
    "src/abortable.ts",
    "src/conversation.ts",
    "evaluation/local-client.ts",
    "evaluation/experiment.ts",
    "evaluation/experiment-gateway.ts",
    "evaluation/run-local.ts",
    "scripts/browser-runtime.mjs",
  ].sort();
  const hash = createHash("sha256");
  for (const file of files)
    hash
      .update(file)
      .update("\0")
      .update(await readFile(resolve(root, file)))
      .update("\0");
  let commit: string | null = null;
  let dirty: boolean | null = null;
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    dirty = !!execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    /* A source export has no commit identity; report that explicitly. */
  }
  return { commit, dirty, adapterAndLockfileSHA256: hash.digest("hex"), files };
}
