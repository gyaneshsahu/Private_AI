import {
  calculatorTool,
  consumeCalculatorTurn,
  renderCalculatorTurn,
} from "./calculator-turn";
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
): Promise<Usage | undefined> {
  const responseFormat = assistedResponseFormat(report);
  const toolOptions = report.optionalCalculator
    ? {
        tools: [calculatorTool],
        tool_choice: "auto",
        parallel_tool_calls: false,
      }
    : {};
  authorize();
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
      messages[0].content +=
        " Use ordinary source-linked prose for explanations. For derived numerical answers, optionally call calculate once with exact evidence-grounded operands. The browser displays its result directly; do not write a separate calculated total in prose. No tool is required for writing or missing-information questions. Calculator execution does not verify method applicability. User evidence uses one-based indices of included user turns.";
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
    // One fixed local route, one encrypted request, no automatic retries. The
    // maintained verifier and EHBP SDK still own attestation and cryptography.
    // Parse SSE locally to avoid SDK error paths logging decrypted provider data.
    const response = await transport.request(
      `${location.origin}/api/inference/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "X-PrivateAI-CSRF": csrf,
          "X-Tinfoil-Enclave-Url": report.origin,
        },
        body: JSON.stringify({
          model: report.model,
          ...(report.gptOssReasoningEffort !== undefined
            ? { reasoning_effort: report.gptOssReasoningEffort }
            : {}),
          messages,
          ...responseFormat,
          ...toolOptions,
          ...(report.deepSeekThinking !== undefined
            ? { chat_template_kwargs: { thinking: report.deepSeekThinking } }
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
        }),
        signal,
        credentials: "same-origin",
        redirect: "error",
      },
    );
    if (report.optionalCalculator) {
      const turn = await consumeCalculatorTurn(
        completionEvents(response, signal),
        report.pricing,
        signal,
        evidenceSources,
        conversation,
      );
      signal.throwIfAborted();
      onChunk(renderCalculatorTurn(turn));
      return turn.usage;
    }
    if (
      report.checkedResponseContract ||
      report.scopedResearchContract ||
      report.assistedResearchContract
    )
      return consumeCheckedResponse(
        completionEvents(response, signal),
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
        completionEvents(response, signal),
        report.pricing,
        signal,
        evidenceSources,
        onChunk,
      );
    return consumeReply(
      completionEvents(response, signal),
      report.pricing,
      signal,
      onChunk,
    );
  });
}
