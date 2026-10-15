// Offline UI fixture only. Never selected by the live harness or production.
import type { Conversation } from "../shared/contracts";
export async function streamReply(
  c: Conversation,
  _q: unknown,
  _csrf: string,
  _signal: AbortSignal,
  onChunk: (s: string) => void,
) {
  const answer = `SYNTHETIC UI TEST reply [${c.attachments[0].sources[0].id}]`;
  onChunk(answer);
  const usage = { input: 0, output: 0, total: 0, estimatedUSD: 0 };
  (window as any).__workspaceEvaluation.results.push({
    completed: true,
    answer,
    usage,
    firstVisibleTextMs: 0,
    elapsedMs: 0,
  });
  return usage;
}
