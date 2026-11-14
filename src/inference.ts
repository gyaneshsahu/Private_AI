import {
  validateQualification,
  policyForTier,
  type AnswerMode,
  type Conversation,
  type Usage,
} from "../shared/contracts";
import { streamVerifiedConversation, type CodeRuntime } from "./verified-chat";
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
  /** A picture for the latest question (JPEG data URL): sent once, with this request only. */
  image?: string,
  /** Code execution on this device; only the tested primary models get the tool. */
  code?: CodeRuntime,
): Promise<Usage | undefined> {
  const report = validateQualification(qualification);
  if (mode && !report.modes) throw Error("No answer modes are qualified.");
  // Only the report's vision model reads pictures: the Fast mode, never its backup.
  if (
    image &&
    (!report.vision || modelChoice !== "primary" || mode !== (report.modes ? "fast" : undefined))
  )
    throw Error("A picture can only be sent to the qualified vision model.");
  // The backup is the same qualified deployment with a different catalog name; each
  // model gets only its own reviewed settings and the mode's own output limit.
  const policy = {
    ...policyForTier(report, mode, modelChoice),
    answerMode: mode,
    ...(cacheSalt ? { cacheSalt } : {}),
    ...(image ? { image } : {}),
    ...(code && modelChoice === "primary" ? { codeTool: true } : {}),
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
    code && modelChoice === "primary" ? code : undefined,
  );
}
