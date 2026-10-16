import {
  validateQualification,
  type Conversation,
  type Usage,
} from "../shared/contracts";
import { streamVerifiedConversation } from "./verified-chat";
import type { CalculationSession } from "./calculation-session";
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
): Promise<Usage | undefined> {
  const report = validateQualification(qualification);
  return streamVerifiedConversation(
    conversation,
    report,
    csrf,
    signal,
    onChunk,
    onStatus,
    () => {
      validateQualification(report);
    },
  );
}
