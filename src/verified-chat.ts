import {
  prepareCalculationContinuation,
  consumeCalculationExplanation,
} from "./calculation-continuation";
import { IncompleteReplyError } from "./reply-stream";
import {
  createMaskingSession,
  MASKING_INSTRUCTION,
  type IdentifierKind,
  type MaskingSession,
} from "./identifier-masking";
import {
  calculatorTool,
  consumeCalculatorTurn,
  renderCalculatorTurn,
} from "./calculator-turn";
import { z } from "zod";
import { replayArguments } from "./calculation-replay";
import type { CalculationSession } from "./calculation-session";
import { assistedResponseFormat } from "./assisted-response-format";
import {
  assistedResearchInstruction,
  renderAssistedResearch,
} from "./assisted-research";
import { abortable, withDeadline } from "./abortable";
import {
  type Conversation,
  type Usage,
  type Qualification,
} from "../shared/contracts";
import {
  composeContext,
  selectedSources,
  type AnswerPolicyVariant,
} from "./conversation";
import {
  consumeResearchReply,
  researchContractInstruction,
} from "./research-contract";
import { completionEvents } from "./completion-events";
import { consumeReply } from "./reply-stream";
import {
  checkedResponseInstruction,
  consumeCheckedResponse,
} from "./checked-response";

import {
  compileScopedResearch,
  scopedResearchInstruction,
} from "./scoped-research";

export type VerifiedChatPolicy = Pick<
  Qualification,
  | "origin"
  | "repository"
  | "releaseDigests"
  | "model"
  | "maxInputCharacters"
  | "maxOutputTokens"
  | "pricing"
> & {
  deepSeekThinking?: boolean;
  deepSeekReasoningEffort?: "low";
  gemmaThinking?: boolean;
  glmReasoningEffort?: "low" | "high" | "max";
  gptOssReasoningEffort?: "low" | "medium" | "high";
  answerPolicyVariant?: AnswerPolicyVariant;
  researchEvidenceContract?: boolean;
  checkedResponseContract?: boolean;
  scopedResearchContract?: boolean;
  assistedResearchContract?: boolean;
  assistedStructuredOutput?: boolean;
  optionalCalculator?: boolean;
  calculatorReplay?: boolean;
  calculatorContinuation?: boolean;
};

export function assertVerification(
  doc: {
    securityVerified: boolean;
    releaseDigest: string;
    configRepo: string;
    hpkePublicKey: string;
    enclaveHost: string;
  },
  report: Pick<VerifiedChatPolicy, "origin" | "repository" | "releaseDigests">,
) {
  if (
    !doc.securityVerified ||
    !doc.hpkePublicKey ||
    doc.configRepo !== report.repository ||
    !report.releaseDigests.includes(doc.releaseDigest) ||
    doc.enclaveHost !== new URL(report.origin).hostname
  )
    throw new Error(
      "The verified deployment does not match the reviewed provider configuration. Nothing was sent.",
    );
}
/**
 * Identifiers are masked on this device before encryption and restored in the
 * streamed reply; `onKeptOnDevice` receives the per-kind count once the
 * outbound context is final, so the UI can say what never left the device.
 */
export async function streamVerifiedConversation(
  conversation: Conversation,
  report: VerifiedChatPolicy,
  csrf: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  onStatus: (text: string) => void,
  authorize: () => void,
  onVerified?: (evidence: { host: string; releaseDigest: string }) => void,
  onCheckedDiagnosticDraft?: (raw: string) => void,
  checkedHistory?: ReadonlyMap<string, string>,
  calculationSession?: CalculationSession,
  onModelEvent?: (event: unknown, round?: 1 | 2) => void,
  authorizeContinuation?: (
    signal: AbortSignal,
  ) => Promise<{ approvalId: string }>,
  onKeptOnDevice?: (kept: Partial<Record<IdentifierKind, number>>) => void,
): Promise<Usage | undefined> {
  const masking = createMaskingSession();
  const restored = masking.streamRestore(onChunk);
  try {
    return await streamMaskedConversation(
      masking,
      onKeptOnDevice,
      conversation,
      report,
      csrf,
      signal,
      (text) => restored.push(text),
      onStatus,
      authorize,
      onVerified,
      onCheckedDiagnosticDraft,
      checkedHistory,
      calculationSession,
      onModelEvent,
      authorizeContinuation,
    );
  } finally {
    restored.flush();
  }
}

async function streamMaskedConversation(
  masking: MaskingSession,
  onKeptOnDevice:
    ((kept: Partial<Record<IdentifierKind, number>>) => void) | undefined,
  conversation: Conversation,
  report: VerifiedChatPolicy,
  csrf: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  onStatus: (text: string) => void,
  authorize: () => void,
  onVerified?: (evidence: { host: string; releaseDigest: string }) => void,
  onCheckedDiagnosticDraft?: (raw: string) => void,
  checkedHistory?: ReadonlyMap<string, string>,
  calculationSession?: CalculationSession,
  onModelEvent?: (event: unknown, round?: 1 | 2) => void,
  authorizeContinuation?: (
    signal: AbortSignal,
  ) => Promise<{ approvalId: string }>,
): Promise<Usage | undefined> {
  if (
    report.calculatorContinuation &&
    (!report.optionalCalculator || !authorizeContinuation)
  )
    throw Error(
      "Calculation continuation requires its separate request authorization.",
    );
  if (
    report.calculatorContinuation &&
    report.model === "deepseek-v4-1-flash" &&
    report.deepSeekThinking !== false
  )
    throw Error(
      "Thinking-mode calculation continuation requires a verified reasoning-history protocol.",
    );
  const responseFormat = assistedResponseFormat(report);
  const toolOptions = report.optionalCalculator
    ? {
        tools: [
          report.calculatorReplay
            ? {
                ...calculatorTool,
                function: {
                  ...calculatorTool.function,
                  parameters: z.toJSONSchema(replayArguments),
                  description:
                    calculatorTool.function.description +
                    " For a prior calculation use derivedInputs with an advertised recordId and resultId, not a source quotation or copied rounded value. Historical records describe prior operands, not current corrected facts.",
                },
              }
            : calculatorTool,
        ],
        tool_choice: "auto",
        parallel_tool_calls: false,
      }
    : {};
  if (report.calculatorContinuation && toolOptions.tools) {
    toolOptions.tools = toolOptions.tools.map((tool) => ({
      ...tool,
      function: {
        ...tool.function,
        description: tool.function.description.replace(
          "The application displays the result directly;",
          "After execution the application returns the tool result for one final explanation;",
        ),
      },
    }));
  }
  authorize();
  if (
    report.deepSeekReasoningEffort &&
    (report.model !== "deepseek-v4-1-flash" || report.deepSeekThinking !== true)
  )
    throw Error("DeepSeek reasoning effort requires explicit thinking mode.");
  if (
    report.calculatorReplay &&
    (!report.optionalCalculator || !calculationSession)
  )
    throw Error(
      "Calculation replay requires its isolated session and optional calculator.",
    );
  if (
    [
      report.optionalCalculator,
      report.checkedResponseContract,
      report.researchEvidenceContract,
      report.scopedResearchContract,
      report.assistedResearchContract,
    ].filter(Boolean).length > 1
  )
    throw new Error("Choose one response contract. Nothing was sent.");
  if (
    report.deepSeekThinking !== undefined &&
    report.model !== "deepseek-v4-1-flash"
  )
    throw new Error("Unsupported model-specific inference setting.");
  if (report.gemmaThinking !== undefined && report.model !== "gemma4-31b")
    throw new Error("Unsupported model-specific inference setting.");
  if (report.glmReasoningEffort !== undefined && report.model !== "glm-5-3")
    throw new Error("Unsupported model-specific inference setting.");
  if (
    report.gptOssReasoningEffort !== undefined &&
    report.model !== "gpt-oss-120b"
  )
    throw new Error("Unsupported model-specific inference setting.");
  return withDeadline(signal, 90000, async (signal) => {
    signal.throwIfAborted();
    const messages = composeContext(
      conversation,
      report.maxInputCharacters,
      new Date(),
      report.answerPolicyVariant,
    );
    const evidenceSources = selectedSources(conversation);
    if (report.optionalCalculator) {
      if (report.calculatorReplay)
        messages[0].content +=
          " Browser-owned historical calculation references (execution only, not factual verification): " +
          JSON.stringify(calculationSession!.references(conversation));
      messages[0].content +=
        " Use ordinary source-linked prose for explanations. For derived numerical answers, optionally call calculate once with exact evidence-grounded operands. The browser displays its result directly; do not write a separate calculated total in prose. No tool is required for writing or missing-information questions. Calculator execution does not verify method applicability. User evidence uses one-based indices of included user turns.";
      if (report.calculatorContinuation)
        messages[0].content = messages[0].content.replace(
          "The browser displays its result directly; do not write a separate calculated total in prose.",
          "The browser returns the computed result for one final response. Explain the original question using those results and sources; do not request another tool.",
        );
      if (
        messages.reduce((n, m) => n + m.content.length, 0) +
          JSON.stringify(toolOptions).length >
        report.maxInputCharacters
      )
        throw new Error(
          "Selected context including calculator tools is too large. Nothing was sent.",
        );
    }
    if (
      report.checkedResponseContract ||
      report.scopedResearchContract ||
      report.assistedResearchContract
    ) {
      messages[0].content += ` ${report.assistedResearchContract ? assistedResearchInstruction : report.scopedResearchContract ? scopedResearchInstruction : checkedResponseInstruction}`;
      let userTurn = 0;
      const included = conversation.messages.filter(
        (m) => m.included && m.status === "complete",
      );
      const historyOffset = evidenceSources.length ? 2 : 1;
      for (const [index, original] of included.entries()) {
        const message = messages[historyOffset + index];
        if (original.role === "assistant" && checkedHistory?.has(original.id))
          message.content = checkedHistory.get(original.id)!;
        if (message.role === "user")
          message.content = `[User turn ${++userTurn}; quote the original text below, not this label]\n${message.content}`;
      }
      if (
        messages.reduce((n, m) => n + m.content.length, 0) >
        report.maxInputCharacters
      )
        throw new Error(
          "Selected context including the checked response contract is too large. Nothing was sent.",
        );
    }
    if (report.researchEvidenceContract) {
      if (!evidenceSources.some((source) => source.url))
        throw new Error(
          "The research evidence experiment requires retrieved sources.",
        );
      messages[0].content += ` ${researchContractInstruction}`;
      if (
        messages.reduce((n, message) => n + message.content.length, 0) >
        report.maxInputCharacters
      )
        throw new Error(
          "Selected context including the research contract is too large. Nothing was sent.",
        );
    }
    if (
      report.assistedStructuredOutput &&
      messages.reduce((n, message) => n + message.content.length, 0) +
        JSON.stringify(responseFormat).length >
        report.maxInputCharacters
    )
      throw new Error(
        "Selected context including the response schema is too large. Nothing was sent.",
      );
    onStatus("Loading inference libraries…");
    const [{ Verifier, fetchAttestationBundle }, { Identity, Transport }] =
      await abortable(Promise.all([import("tinfoil"), import("ehbp")]), signal);
    onStatus("Fetching attestation…");
    const bundle = await abortable(
      fetchAttestationBundle({
        enclaveURL: report.origin,
        configRepo: report.repository,
      }),
      signal,
    );
    if (bundle.domain !== new URL(report.origin).hostname)
      throw new Error("Unexpected verification destination. Nothing was sent.");
    onStatus("Verifying the protected destination…");
    const verifier = new Verifier({ configRepo: report.repository });
    await abortable(verifier.verifyBundle(bundle), signal);
    const doc = verifier.getVerificationDocument();
    if (!doc) throw new Error("Verification evidence unavailable.");
    assertVerification(doc, report);
    onVerified?.({ host: doc.enclaveHost, releaseDigest: doc.releaseDigest });
    signal.throwIfAborted();
    onStatus("Preparing encrypted transport…");
    const identity = await abortable(
      Identity.fromPublicKeyHex(doc.hpkePublicKey),
      signal,
    );
    const transport = new Transport(identity, location.host);
    onStatus("Receiving a protected response…");
    authorize();
    signal.throwIfAborted();
    // One fixed encrypted route; optional continuation is separately authorized. The
    // maintained verifier and EHBP SDK still own attestation and cryptography.
    // Parse SSE locally to avoid SDK error paths logging decrypted provider data.
    // Last step before encryption: identifiers leave this device only as placeholders.
    for (const message of messages)
      message.content = masking.mask(message.content);
    if (masking.kept.length) messages[0].content += MASKING_INSTRUCTION;
    onKeptOnDevice?.(masking.summary());
    const requestBody = {
      model: report.model,
      ...(report.gptOssReasoningEffort !== undefined
        ? { reasoning_effort: report.gptOssReasoningEffort }
        : {}),
      messages,
      ...responseFormat,
      ...toolOptions,
      ...(report.deepSeekThinking !== undefined
        ? {
            chat_template_kwargs: {
              thinking: report.deepSeekThinking,
              ...(report.deepSeekReasoningEffort
                ? { reasoning_effort: report.deepSeekReasoningEffort }
                : {}),
            },
          }
        : report.gemmaThinking !== undefined
          ? {
              chat_template_kwargs: {
                enable_thinking: report.gemmaThinking,
              },
            }
          : report.glmReasoningEffort !== undefined
            ? {
                chat_template_kwargs: {
                  reasoning_effort: report.glmReasoningEffort,
                },
              }
            : {}),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: report.maxOutputTokens,
      user_cache_secret: crypto.randomUUID(),
    };
    if (
      report.calculatorContinuation &&
      JSON.stringify({ messages, ...toolOptions }).length >
        report.maxInputCharacters
    )
      throw Error(
        "Selected context including calculator protocol is too large. Nothing was sent.",
      );
    const response = await transport.request(
      `${location.origin}/api/inference/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-PrivateAI-CSRF": csrf,
          "X-Tinfoil-Enclave-Url": report.origin,
          "X-Tinfoil-Model": report.model,
        },
        body: JSON.stringify(requestBody),
        signal,
        credentials: "same-origin",
        redirect: "error",
      },
    );
    async function* observedEvents(input = response, round: 1 | 2 = 1) {
      for await (const event of completionEvents(input, signal)) {
        onModelEvent?.(event, round);
        yield event;
      }
    }
    if (report.optionalCalculator) {
      let validatedProgram: string | undefined;
      const turn = await consumeCalculatorTurn(
        observedEvents(),
        report.pricing,
        signal,
        evidenceSources,
        conversation,
        onCheckedDiagnosticDraft,
        report.calculatorReplay
          ? (raw) => calculationSession!.expand(raw, conversation)
          : undefined,
        (raw) => {
          validatedProgram = raw;
        },
      );
      if (signal.aborted)
        throw new IncompleteReplyError("Calculation stopped.", turn.usage);
      let answer = renderCalculatorTurn(turn);
      let usage = turn.usage;
      if (report.calculatorContinuation && turn.toolCall) {
        // A second inference is explicit, independently permitted, and never a retry.
        let explained;
        try {
          const continuation = prepareCalculationContinuation(
            turn,
            messages,
            report.maxInputCharacters - JSON.stringify(toolOptions).length,
          );
          signal.throwIfAborted();
          const nextBundle = await abortable(
            fetchAttestationBundle({
              enclaveURL: report.origin,
              configRepo: report.repository,
            }),
            signal,
          );
          if (nextBundle.domain !== new URL(report.origin).hostname)
            throw Error("Unexpected verification destination.");
          const nextVerifier = new Verifier({ configRepo: report.repository });
          await abortable(nextVerifier.verifyBundle(nextBundle), signal);
          const nextDoc = nextVerifier.getVerificationDocument();
          if (!nextDoc) throw Error("Verification evidence unavailable.");
          assertVerification(nextDoc, report);
          if (nextDoc.releaseDigest !== doc.releaseDigest)
            throw Error("Deployment changed during calculation.");
          onVerified?.({
            host: nextDoc.enclaveHost,
            releaseDigest: nextDoc.releaseDigest,
          });
          const nextIdentity = await abortable(
            Identity.fromPublicKeyHex(nextDoc.hpkePublicKey),
            signal,
          );
          signal.throwIfAborted();
          authorize();
          const continuationApproval = await abortable(
            authorizeContinuation!(signal),
            signal,
          );
          if (!/^[a-zA-Z0-9_-]{8,80}$/.test(continuationApproval.approvalId))
            throw Error("Invalid continuation approval");
          signal.throwIfAborted();
          onStatus("Explaining the calculated result…");
          const nextTransport = new Transport(nextIdentity, location.host);
          const nextResponse = await nextTransport.request(
            location.origin + "/api/inference/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
                "X-PrivateAI-CSRF": csrf,
                "X-Tinfoil-Enclave-Url": report.origin,
                "X-Tinfoil-Model": report.model,
                "X-PrivateAI-Continuation-Approval":
                  continuationApproval.approvalId,
              },
              body: JSON.stringify({
                ...requestBody,
                ...continuation,
                user_cache_secret: crypto.randomUUID(),
              }),
              signal,
              credentials: "same-origin",
              redirect: "error",
            },
          );
          explained = await consumeCalculationExplanation(
            observedEvents(nextResponse, 2),
            report.pricing,
            signal,
            turn,
          );
        } catch (error) {
          if (error instanceof IncompleteReplyError && error.usage) throw error;
          throw new IncompleteReplyError(
            "Calculation continuation stopped. No automatic retry was made.",
            turn.usage,
          );
        }
        if (signal.aborted)
          throw new IncompleteReplyError(
            "Explanation stopped.",
            explained.usage,
          );
        answer =
          explained.explanation +
          "\n\n" +
          renderCalculatorTurn({ ...turn, text: "" });
        usage = explained.usage;
      }
      if (report.calculatorReplay && validatedProgram)
        calculationSession!.stage(validatedProgram, answer, conversation);
      onChunk(answer);
      return usage;
    }
    if (
      report.checkedResponseContract ||
      report.scopedResearchContract ||
      report.assistedResearchContract
    )
      return consumeCheckedResponse(
        observedEvents(),
        report.pricing,
        signal,
        evidenceSources,
        conversation,
        onChunk,
        onCheckedDiagnosticDraft,
        report.assistedResearchContract
          ? renderAssistedResearch
          : report.scopedResearchContract
            ? compileScopedResearch
            : undefined,
      );
    if (report.researchEvidenceContract)
      return consumeResearchReply(
        observedEvents(),
        report.pricing,
        signal,
        evidenceSources,
        onChunk,
      );
    return consumeReply(observedEvents(), report.pricing, signal, onChunk);
  });
}
