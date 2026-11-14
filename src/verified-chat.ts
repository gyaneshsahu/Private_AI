import { textFor } from "./text/core";
import { chatErrorText } from "./text/chat-errors";
import {
  prepareCalculationContinuation,
  consumeCalculationExplanation,
} from "./calculation-continuation";
import { IncompleteReplyError } from "./reply-stream";
import {
  createMaskingSession,
  maskAttachmentSources,
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
  MODEL_SETTINGS,
  replyLimits,
  type AnswerMode,
  type Conversation,
  type Usage,
  type Qualification,
} from "../shared/contracts";
import {
  composeContext,
  IMAGE_GONE_NOTE,
  selectedSources,
  withChosenPassages,
  type AnswerPolicyVariant,
} from "./conversation";
import {
  consumeResearchReply,
  researchContractInstruction,
} from "./research-contract";
import { completionEvents } from "./completion-events";
import { STILL_THINKING_AFTER_MS, stillThinkingStatus } from "./answer-modes";
import {
  defaultInferenceProvider,
  inferenceClientFor,
} from "./providers/inference-client";
// Registers both adapters; the report's `provider` picks one. The Privatemode SDK itself is a
// dynamic import inside its adapter, so the Tinfoil path never loads it.
import "./providers/tinfoil-client";
import "./providers/privatemode-client";
export { assertVerification } from "./providers/tinfoil-client";
import { consumeReply } from "./reply-stream";
import {
  CODE_REQUEST_OPTIONS,
  CONTINUATION_HEADER,
  withCodeTool,
  type CodeResult,
  type CodeRun,
} from "./code-tool";
import { runToolLoop } from "./tool-loop";
import { codeText } from "./text/code";

/** What the code tool needs from the caller: how to run code, and where the runs go. */
export type CodeRuntime = {
  run: (code: string, signal: AbortSignal) => Promise<CodeResult>;
  onRuns: (runs: CodeRun[], unavailable: boolean) => void;
};
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
  /** Confidential-inference supplier; the qualification report names it. Defaults to the only adapter built today. */
  provider?: Qualification["provider"];
  deepSeekThinking?: boolean;
  deepSeekReasoningEffort?: "low";
  gemmaThinking?: boolean;
  glmReasoningEffort?: "low" | "high" | "max";
  gptOssReasoningEffort?: "low" | "medium" | "high";
  /** This account's prompt-cache salt (Privatemode); from /api/status. */
  cacheSalt?: string;
  /** Declared to the relay so it admits this mode's models, limit and allowance cost. */
  answerMode?: AnswerMode;
  /**
   * A picture for the latest question, as a JPEG data URL. Sent once, in this request only, and
   * declared to the relay as an image request. Never part of the conversation.
   */
  image?: string;
  answerPolicyVariant?: AnswerPolicyVariant;
  researchEvidenceContract?: boolean;
  checkedResponseContract?: boolean;
  scopedResearchContract?: boolean;
  assistedResearchContract?: boolean;
  assistedStructuredOutput?: boolean;
  optionalCalculator?: boolean;
  calculatorReplay?: boolean;
  calculatorContinuation?: boolean;
  /** Offer the `python` tool and run its calls on this device (src/code-tool.ts, src/tool-loop.ts). */
  codeTool?: boolean;
};

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
  codeRuntime?: CodeRuntime,
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
      codeRuntime,
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
  codeRuntime?: CodeRuntime,
): Promise<Usage | undefined> {
  if (report.codeTool && !codeRuntime) throw Error("The code tool requires its runtime.");
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
      report.codeTool,
    ].filter(Boolean).length > 1
  )
    throw new Error(textFor(chatErrorText).oneContract);
  if (
    report.image !== undefined &&
    (!report.image.startsWith("data:image/jpeg;base64,") ||
      report.optionalCalculator ||
      report.checkedResponseContract ||
      report.researchEvidenceContract ||
      report.scopedResearchContract ||
      report.assistedResearchContract)
  )
    throw Error("A picture is sent as a JPEG with a plain question only.");
  for (const [setting, owners] of Object.entries(MODEL_SETTINGS))
    if (
      report[setting as keyof typeof MODEL_SETTINGS] !== undefined &&
      !owners.includes(report.model)
    )
      throw new Error("Unsupported model-specific inference setting.");
  const limits = replyLimits(report.answerMode);
  let waiting: ReturnType<typeof setTimeout> | undefined;
  const reply = withDeadline(signal, limits, async (signal, started) => {
    signal.throwIfAborted();
    let stillThinking = false;
    // First answer text (or a tool call): the first-text limit and the waiting status end.
    const answerStarted = () => {
      started();
      clearTimeout(waiting);
      if (stillThinking) onStatus(textFor(chatErrorText).receiving);
      stillThinking = false;
    };
    const messages = composeContext(
      // A large document: its chosen passages only, and only those are masked and sent.
      maskAttachmentSources(withChosenPassages(conversation), masking),
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
          textFor(chatErrorText).tooLargeCalculator,
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
          textFor(chatErrorText).tooLargeChecked,
        );
    }
    if (report.researchEvidenceContract) {
      if (!evidenceSources.some((source) => source.url))
        throw new Error(
          textFor(chatErrorText).needsSources,
        );
      messages[0].content += ` ${researchContractInstruction}`;
      if (
        messages.reduce((n, message) => n + message.content.length, 0) >
        report.maxInputCharacters
      )
        throw new Error(
          textFor(chatErrorText).tooLargeResearch,
        );
    }
    if (
      report.assistedStructuredOutput &&
      messages.reduce((n, message) => n + message.content.length, 0) +
        JSON.stringify(responseFormat).length >
        report.maxInputCharacters
    )
      throw new Error(
        textFor(chatErrorText).tooLargeSchema,
      );
    const adapter = inferenceClientFor(
      report.provider ?? defaultInferenceProvider,
    );
    const policy = {
      ...report,
      provider: report.provider ?? defaultInferenceProvider,
      csrf,
    } as const;
    const routeHeaders = {
      ...adapter.requestHeaders(policy),
      ...(report.answerMode ? { "X-PrivateAI-Mode": report.answerMode } : {}),
      // The relay cannot see the encrypted body: this buys the larger size bound at the image price.
      ...(report.image ? { "X-PrivateAI-Kind": "image" } : {}),
    };
    const destination = await adapter.verify(policy, signal, onStatus);
    onVerified?.(destination.evidence);
    signal.throwIfAborted();
    onStatus(textFor(chatErrorText).preparingTransport);
    const transport = await destination.transport();
    onStatus(textFor(chatErrorText).receiving);
    waiting = setTimeout(() => {
      stillThinking = true;
      onStatus(stillThinkingStatus(report.answerMode));
    }, STILL_THINKING_AFTER_MS);
    authorize();
    signal.throwIfAborted();
    // One fixed encrypted route; optional continuation is separately authorized. The
    // maintained verifier and EHBP SDK still own attestation and cryptography.
    // Parse SSE locally to avoid SDK error paths logging decrypted provider data.
    // Last step before encryption: identifiers leave this device only as placeholders.
    // The policy's helpline numbers are public (PUBLIC_NUMBERS), so every message is masked whole.
    for (const message of messages) message.content = masking.mask(message.content);
    if (masking.kept.length) messages[0].content += MASKING_INSTRUCTION;
    if (report.image)
      messages[0].content +=
        " The latest message has a picture. Black boxes in it are parts the user covered on purpose: do not guess what is under them. Text read from a picture can be wrong; say so when it is unclear.";
    onKeptOnDevice?.(masking.summary());
    // Code execution: the tool instruction, and earlier answers' code and output as tool messages.
    const wire = report.codeTool
      ? withCodeTool(messages, conversation, masking.mask, report.maxInputCharacters, textFor(codeText).tooLarge)
      : messages;
    // The picture rides on the latest question only, as one image part beside its (masked) text.
    // Masking works on text: nothing inside the picture is masked here.
    const asked = report.image ? wire.map((m) => m.role).lastIndexOf("user") : -1;
    const requestBody = {
      model: report.model,
      messages: wire.map((message, index) =>
        index === asked && typeof message.content === "string"
          ? {
              role: message.role,
              content: [
                { type: "text", text: message.content.replace(IMAGE_GONE_NOTE, "") },
                { type: "image_url", image_url: { url: report.image } },
              ],
            }
          : message,
      ),
      ...responseFormat,
      ...toolOptions,
      ...(report.codeTool ? CODE_REQUEST_OPTIONS : {}),
      ...adapter.modelOptions(policy),
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: report.maxOutputTokens,
      ...adapter.cacheOptions(policy),
    };
    if (
      report.calculatorContinuation &&
      JSON.stringify({ messages, ...toolOptions }).length >
        report.maxInputCharacters
    )
      throw Error(
        textFor(chatErrorText).tooLargeProtocol,
      );
    const response = await transport.request(
      `${location.origin}/api/inference/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-PrivateAI-CSRF": csrf,
          ...routeHeaders,
        },
        body: JSON.stringify(requestBody),
        signal,
        credentials: "same-origin",
        redirect: "error",
      },
    );
    async function* observedEvents(input = response, round: 1 | 2 = 1) {
      for await (const event of completionEvents(input, signal)) {
        const delta = event.choices?.[0]?.delta;
        if (delta?.content || delta?.refusal || delta?.tool_calls?.length)
          answerStarted();
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
        throw new IncompleteReplyError(textFor(chatErrorText).calculationStopped, turn.usage);
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
          const nextDestination = await adapter.verify(
            policy,
            signal,
            () => {},
          );
          if (
            nextDestination.evidence.releaseDigest !==
            destination.evidence.releaseDigest
          )
            throw Error(textFor(chatErrorText).deploymentChangedCalculation);
          onVerified?.(nextDestination.evidence);
          signal.throwIfAborted();
          authorize();
          const continuationApproval = await abortable(
            authorizeContinuation!(signal),
            signal,
          );
          if (!/^[a-zA-Z0-9_-]{8,80}$/.test(continuationApproval.approvalId))
            throw Error("Invalid continuation approval");
          signal.throwIfAborted();
          onStatus(textFor(chatErrorText).explaining);
          const nextTransport = await nextDestination.transport();
          const nextResponse = await nextTransport.request(
            location.origin + "/api/inference/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
                "X-PrivateAI-CSRF": csrf,
                ...routeHeaders,
                "X-PrivateAI-Continuation-Approval":
                  continuationApproval.approvalId,
              },
              body: JSON.stringify({
                ...requestBody,
                ...continuation,
                ...adapter.cacheOptions(policy),
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
            textFor(chatErrorText).continuationStopped,
            turn.usage,
          );
        }
        if (signal.aborted)
          throw new IncompleteReplyError(
            textFor(chatErrorText).explanationStopped,
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
    if (report.codeTool)
      return runToolLoop({
        first: observedEvents(),
        messages: wire,
        // Each follow-up is its own request to the verified destination, declared to the relay.
        next: async (next) => {
          signal.throwIfAborted();
          const again = await adapter.verify(policy, signal, () => {});
          if (again.evidence.releaseDigest !== destination.evidence.releaseDigest)
            throw Error(textFor(chatErrorText).deploymentChangedCalculation);
          authorize();
          onStatus(textFor(chatErrorText).receiving);
          const followUp = await (await again.transport()).request(
            `${location.origin}/api/inference/v1/chat/completions`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
                "X-PrivateAI-CSRF": csrf,
                ...routeHeaders,
                [CONTINUATION_HEADER]: "tool",
              },
              body: JSON.stringify({ ...requestBody, messages: next }),
              signal,
              credentials: "same-origin",
              redirect: "error",
            },
          );
          return observedEvents(followUp, 2);
        },
        run: codeRuntime!.run,
        pricing: report.pricing,
        signal,
        maxCharacters: report.maxInputCharacters,
        onChunk,
        onStatus,
        onRuns: codeRuntime!.onRuns,
        mask: masking.mask,
        restore: masking.restore,
      });
    return consumeReply(observedEvents(), report.pricing, signal, onChunk);
  });
  return reply.finally(() => clearTimeout(waiting));
}
