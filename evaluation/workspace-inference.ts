// Loaded only by the isolated workspace evaluation Vite alias, never production.
import type { Conversation, Usage } from "../shared/contracts";
import { validateExperiment, developmentCase } from "./experiment";
import { streamVerifiedConversation } from "../src/verified-chat";
import { classifyEvaluationFailure } from "./reply-failure";
import { replyTiming } from "./reply-timing";
import { isWorkspaceCase } from "./workspace-arm";
import type { CalculationSession } from "../src/calculation-session";
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
  calculationSession?: CalculationSession,
): Promise<Usage | undefined> {
  const state = (window as any).__workspaceEvaluation;
  const permit = validateExperiment(state.permit);
  if (!isWorkspaceCase(permit.developmentCaseId ?? ""))
    throw Error("Workspace permit required");
  const fixture = developmentCase(permit.developmentCaseId, "robustness_case");
  const retainSynthetic =
    fixture.sources.length > 0 || fixture.id.startsWith("selection-");
  const prompt = c.messages.at(-1)?.text;
  if (turn >= fixture.turns.length || prompt !== fixture.turns[turn])
    throw Error("Fixed evaluation turn required");
  const previous = c.messages.filter((m) => m.role === "assistant").at(-1);
  if (previous && lastRaw) history.set(previous.id, lastRaw);
  lastRaw = undefined;
  const timing = replyTiming();
  let answer = "";
  const modelEvents: unknown[] = [];
  const modelRounds: Record<number, unknown[]> = { 1: [], 2: [] };
  let draft: string | undefined;
  let derivedReferenceCount = 0;
  const availableCalculationRecords = permit.policy.calculatorReplay
    ? (calculationSession?.references(c).length ?? 0)
    : 0;
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
        if (permit.policy.calculatorReplay) {
          try {
            const parsed = JSON.parse(raw);
            derivedReferenceCount = Array.isArray(parsed.derivedInputs)
              ? parsed.derivedInputs.length
              : 0;
          } catch {
            derivedReferenceCount = 0;
          }
        }
      },
      history,
      calculationSession,
      retainSynthetic
        ? (event, round = 1) => {
            modelEvents.push(event);
            modelRounds[round].push(event);
          }
        : undefined,
      permit.continuationApproval
        ? async (continuationSignal) => {
            continuationSignal.throwIfAborted();
            const current = validateExperiment(permit);
            return { approvalId: current.continuationApproval!.approvalId };
          }
        : undefined,
    );
    lastRaw = permit.policy.optionalCalculator ? undefined : draft;
    state.results.push({
      completed: true,
      modelEvents: retainSynthetic ? modelEvents : undefined,
      modelRounds:
        retainSynthetic && permit.policy.calculatorContinuation
          ? modelRounds
          : undefined,
      diagnosticDraft:
        permit.policy.optionalCalculator && fixture.sources.length
          ? draft
          : undefined,
      answer,
      usage,
      derivedReferenceCount,
      availableCalculationRecords,
      ...timing.snapshot(),
    });
    return usage;
  } catch (e) {
    state.results.push({
      completed: false,
      modelEvents: retainSynthetic ? modelEvents : undefined,
      modelRounds:
        retainSynthetic && permit.policy.calculatorContinuation
          ? modelRounds
          : undefined,
      derivedReferenceCount,
      availableCalculationRecords,
      // Only authored source fixtures can retain diagnostic content. Public runs
      // remain metadata-only, including malformed or rejected replies.
      diagnosticDraft:
        "sources" in fixture &&
        Array.isArray(fixture.sources) &&
        retainSynthetic
          ? draft
          : undefined,
      answer,
      ...classifyEvaluationFailure(e),
      failure: e instanceof Error ? e.name : "Error",
      ...timing.snapshot(),
    });
    throw e;
  }
}
