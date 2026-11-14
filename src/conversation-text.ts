// One description of an exported conversation, used by the PDF view (src/pdf-export.tsx) and by
// "Copy conversation as text". Both take headings, notices, source lines and dates from here, so
// the two exports cannot drift apart. Pure: no page, no clipboard, no network.
import type { Message, Source } from "../shared/contracts";
import { completenessWarning } from "./arithmetic/completeness";
import { GERMAN_RULES } from "./german-rules";
import { appText } from "./text/app";
import { arithmeticText } from "./text/arithmetic";
import type { Lang } from "./text/core";
import { deviceText } from "./text/device-features";

export interface ExportContent {
  title: string;
  createdAt: string;
  messages: Message[];
}

/** The app's own notices on a message, as the conversation screen shows them above the text. */
export function messageNotices(message: Message, lang: Lang): string[] {
  const check = message.arithmeticCheck;
  return [
    message.status === "partial" && deviceText[lang].incomplete,
    message.status === "error" && appText[lang].noAnswer,
    check && check.mismatches > 0 && arithmeticText[lang].mismatch,
    check && (check.ambiguous ?? 0) > 0 && arithmeticText[lang].ambiguous,
    !!message.completenessCheck?.missing.length &&
      completenessWarning(message.completenessCheck.missing, lang),
    message.uncheckedFigures && GERMAN_RULES.warning,
    message.noOfficialSource && GERMAN_RULES.noOfficial,
    message.passagesUsed,
    message.keptOnDevice && `${message.keptOnDevice} ${appText[lang].keptNote}`,
    message.failure && appText[lang].failure(message.failure),
  ].filter((note): note is string => !!note);
}

/** "Question", or "Answer" with the mode that answered. */
export function messageHeading(message: Message, lang: Lang): string {
  const t = deviceText[lang];
  return `${message.role === "user" ? t.question : t.answer}${message.answeredBy ? ` · ${message.answeredBy}` : ""}`;
}

/** One line of the source list: title, page and address. Never the source's text. */
export function sourceLine(source: Source): string {
  return `${source.title}${source.page ? `, p. ${source.page}` : ""}${source.url ? `: ${source.url}` : ""}`;
}

export const exportDate = (value: Date, lang: Lang) =>
  value.toLocaleDateString(lang, { dateStyle: "long" });

/**
 * The conversation as Markdown text. Message text is copied exactly as stored, which is what the
 * screen shows: a masked identifier stays masked. Incomplete attempts carry their notice.
 */
export function conversationText(
  { title, createdAt, messages }: ExportContent,
  lang: Lang,
  now = new Date(),
): string {
  const t = deviceText[lang];
  return [
    `# ${title}`,
    t.conversationFrom(exportDate(new Date(createdAt), lang)),
    ...messages.flatMap((message) => [
      `## ${messageHeading(message, lang)}`,
      ...messageNotices(message, lang).map((note) => `> ${note}`),
      message.text.trim(),
      message.sourceSnapshot?.length
        ? `### ${t.sources}\n\n${message.sourceSnapshot.map((source, index) => `${index + 1}. ${sourceLine(source)}`).join("\n")}`
        : "",
    ]),
    "---",
    t.footer(exportDate(now, lang)),
  ]
    .filter(Boolean)
    .join("\n\n");
}
