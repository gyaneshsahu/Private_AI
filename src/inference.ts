import {
  validateQualification,
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
  modelChoice: "primary" | "fallback" = "primary",
): Promise<Usage | undefined> {
  const report = validateQualification(qualification);
  if (modelChoice === "fallback" && !report.fallbackModel)
    throw Error("No fallback model is qualified.");
  // The fallback is the same qualified deployment with a different catalog
  // name; model-specific reasoning toggles belong to the usual model only.
  const policy =
    modelChoice === "fallback"
      ? { ...report, model: report.fallbackModel! }
      : report;
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
