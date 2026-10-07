import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import type { Experiment } from "./experiment";

export function configurationIdentity(
  codeHash: string,
  policy: Experiment["policy"],
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        codeHash,
        model: policy.model,
        ...(policy.gemmaThinking !== undefined
          ? { gemmaThinking: policy.gemmaThinking }
          : {}),
        ...(policy.glmReasoningEffort !== undefined
          ? { glmReasoningEffort: policy.glmReasoningEffort }
          : {}),
        origin: policy.origin,
        repository: policy.repository,
        releaseDigests: [...policy.releaseDigests].sort(),
        maxInputCharacters: policy.maxInputCharacters,
        maxOutputTokens: policy.maxOutputTokens,
        inputPerMillion: policy.pricing.inputPerMillion,
        outputPerMillion: policy.pricing.outputPerMillion,
        currency: policy.pricing.currency,
      }),
    )
    .digest("hex");
}

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
    "evaluation/reserved-assessment.ts",
    "evaluation/cases/heldout.json",
    "evaluation/cases/development.json",
    "evaluation/cases/robustness-development.json",
    "evaluation/cases/repair-transfer.json",
    "evaluation/cases/attribution-transfer.json",
    "evaluation/cases/writing-transfer.json",
    "evaluation/cases/safety-development.json",
    "evaluation/cases/policy-transfer.json",
    "evaluation/frozen-manifest.json",
    "evaluation/experiment-gateway.ts",
    "evaluation/run-local.ts",
    "evaluation/review-result.ts",
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
