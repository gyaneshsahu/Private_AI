import {
  validateQualification,
  policyForTier,
  type AnswerMode,
  type Conversation,
  type Usage,
} from "../shared/contracts";
import { streamVerifiedConversation } from "./verified-chat";
import type { CalculationSession } from "./calculation-session";
import type { IdentifierKind } from "./identifier-masking";
export { assertVerification } from "./verified-chat";

// The product path always requires complete qualification. Isolated synthetic
// experiments use their own entrypoint; they cannot make this function ready.
export async function streamReply(
  conversation: Conversation,
  qualification: unknown,
  csrf: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  onStatus: (text: string) => void,
  _calculationSession?: CalculationSession,
  onKeptOnDevice?: (kept: Partial<Record<IdentifierKind, number>>) => void,
  modelChoice: "primary" | "backup" = "primary",
  mode?: AnswerMode,
  /** This account's prompt-cache salt from /api/status; the Privatemode adapter requires it. */
  cacheSalt?: string,
): Promise<Usage | undefined> {
  const report = validateQualification(qualification);
  if (mode && !report.modes) throw Error("No answer modes are qualified.");
  // The backup is the same qualified deployment with a different catalog name; each
  // model gets only its own reviewed settings and the mode's own output limit.
  const policy = {
    ...policyForTier(report, mode, modelChoice),
    answerMode: mode,
    ...(cacheSalt ? { cacheSalt } : {}),
  };
  return streamVerifiedConversation(
    conversation,
    policy,
    csrf,
    signal,
    onChunk,
    onStatus,
    () => {
      validateQualification(report);
    },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    onKeptOnDevice,
  );
}
