// Loaded only by the isolated workspace evaluation Vite alias, never production.
import type { Conversation, Usage } from "../shared/contracts";
import { validateExperiment, developmentCase } from "./experiment";
import { streamVerifiedConversation } from "../src/verified-chat";
import { classifyEvaluationFailure } from "./reply-failure";
import { replyTiming } from "./reply-timing";
const history = new Map<string, string>();
let lastRaw: string | undefined;
let turn = 0;
export async function streamReply(
  c: Conversation,
  _q: unknown,
  csrf: string,
  signal: AbortSignal,
  onChunk: (s: string) => void,
  onStatus: (s: string) => void,
): Promise<Usage | undefined> {
  const state = (window as any).__workspaceEvaluation;
  const permit = validateExperiment(state.permit);
  if (!permit.developmentCaseId?.startsWith("workspace-"))
    throw Error("Workspace permit required");
  const fixture = developmentCase(permit.developmentCaseId, "robustness_case");
  const prompt = c.messages.at(-1)?.text;
  if (turn >= fixture.turns.length || prompt !== fixture.turns[turn])
    throw Error("Fixed evaluation turn required");
  const previous = c.messages.filter((m) => m.role === "assistant").at(-1);
  if (previous && lastRaw) history.set(previous.id, lastRaw);
  lastRaw = undefined;
  const timing = replyTiming();
  let answer = "";
  let draft: string | undefined;
  turn++;
  try {
    const usage = await streamVerifiedConversation(
      c,
      permit.policy,
      csrf,
      AbortSignal.any([signal, AbortSignal.timeout(95000)]),
      (chunk) => {
        timing.chunk(chunk);
        answer += chunk;
        onChunk(chunk);
      },
      onStatus,
      () => {
        validateExperiment(permit);
      },
      undefined,
      (raw) => {
        draft = raw;
      },
      history,
    );
    lastRaw = draft;
    state.results.push({
      completed: true,
      answer,
      usage,
      ...timing.snapshot(),
    });
    return usage;
  } catch (e) {
    state.results.push({
      completed: false,
      answer,
      ...classifyEvaluationFailure(e),
      failure: e instanceof Error ? e.name : "Error",
      ...timing.snapshot(),
    });
    throw e;
  }
}
