// One message in the conversation (docs/chat-feature-gaps-20261114.md, packages C and D): the
// user's own text as plain text and collapsed when long, edit and send in place, retry with its
// cost in the label, and the report entry. Sending itself stays in App: this file only calls back.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AnswerMode, Conversation, Message, Source } from "../shared/contracts";
import { completenessWarning } from "./arithmetic/completeness";
import { CodeRuns } from "./CodeRuns";
import { isSendKey, MESSAGE_LIMIT, touchDevice } from "./composer-keys";
import { GERMAN_RULES } from "./german-rules";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
import { shouldCollapse } from "./message-collapse";
import { MessageMeta } from "./MessageMeta";
import { PdfExportButton } from "./PdfExportButton";
import { ReadAloudButton } from "./ReadAloudButton";
import { sourceHistoryStatus } from "./source-history";
import { appText } from "./text/app";
import { arithmeticText } from "./text/arithmetic";
import { composerText } from "./text/composer";
import { imageText } from "./text/images";
import { messageText } from "./text/message";

const Answer = lazy(() => import("./Answer").then((module) => ({ default: module.Answer })));

// Which long messages the user opened. Memory only: never saved, gone on reload.
const expandedIds = new Set<string>();

/**
 * The user's own words exactly as typed: plain text, so "#", "*", "1." or "[word]" change nothing
 * and nothing in it is a link or a control. A long text is cut by height with a fade, not by
 * characters. The cut text stays in the page and is NOT hidden from assistive technology: a
 * screen reader reads all of it, and the button after it only changes what is visible. Because
 * the text holds nothing focusable, the focus can never land on something hidden.
 */
export function UserText({ message, onResize }: { message: Message; onResize?: () => void }) {
  const t = messageText[useLang().lang];
  const text = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [expanded, setExpanded] = useState(() => expandedIds.has(message.id));
  // Before the first paint, so a long message never shows in full and then jumps shut.
  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
      setLong((was) => shouldCollapse(el.scrollHeight, line, was));
    };
    measure();
    // Another width means other line breaks: measure again.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [message.text]);
  const id = `user-text-${message.id}`;
  return (
    <>
      <div
        ref={text}
        id={id}
        className={`message-text user-text${long && !expanded ? " collapsed" : ""}`}
      >
        {message.text}
      </div>
      {long && (
        <button
          type="button"
          className="show-more"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={(event) => {
            const next = !expanded;
            if (next) expandedIds.add(message.id);
            else expandedIds.delete(message.id);
            setExpanded(next);
            onResize?.();
            // Closing a tall message: keep it on screen instead of leaving the view far below it.
            const article = event.currentTarget.closest("article");
            if (!next)
              requestAnimationFrame(() =>
                article?.scrollIntoView({ block: "nearest", behavior: "instant" }),
              );
          }}
        >
          {expanded ? t.showLess : t.showMore}
        </button>
      )}
    </>
  );
}

/** Retry on the newest message: what one press uses, and the call that sends through App. */
export type RetryAction = {
  /** Units for the mode a press would use now; undefined when no report says. */
  cost?: number;
  /** Set when "Answer again with Thinking" applies: the Thinking mode's units. */
  thinkingCost?: number;
  run: (mode?: AnswerMode) => void;
};

export function ChatMessage({
  message,
  index,
  conversation,
  sourceHistory,
  busy,
  ready,
  openSource,
  copied,
  onCopy,
  editing,
  onEdit,
  onEditSend,
  editCost,
  retry,
  onReport,
  onResize,
}: {
  message: Message;
  index: number;
  conversation: Conversation;
  sourceHistory: ReadonlyMap<string, Source>;
  busy: boolean;
  ready: boolean;
  openSource: (source: Source) => void;
  copied: boolean;
  onCopy: () => void;
  editing: boolean;
  onEdit: (open: boolean) => void;
  /** Creates the branch and sends through the one send path. */
  onEditSend: (text: string) => void;
  editCost: (text: string) => number | undefined;
  /** Only on the newest message. */
  retry?: RetryAction;
  onReport: () => void;
  onResize: () => void;
}) {
  const { lang } = useLang();
  const t = appText[lang];
  const mt = messageText[lang];
  const user = message.role === "user";
  const [draft, setDraft] = useState(message.text);
  const editBox = useRef<HTMLTextAreaElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) {
      setDraft(message.text);
      const box = editBox.current;
      box?.focus();
      box?.setSelectionRange(box.value.length, box.value.length);
    } else if (wasEditing.current)
      // Cancelled: back to the button that opened the box.
      document.getElementById(`edit-message-${message.id}`)?.focus();
    wasEditing.current = editing;
    // message.text cannot change while its box is open.
  }, [editing, message.id]);
  // Read again on every render: the mode choice may change while the box is open.
  const draftCost = editing ? editCost(draft) : undefined;
  const blocked = busy || !ready || !draft.trim();
  const withCost = (label: string, cost?: number) =>
    cost === undefined ? label : `${label} (${mt.uses(cost)})`;
  const incomplete = message.status !== "complete" || !message.text;
  const retryButtons = retry && (
    <>
      <button
        disabled={busy || !ready}
        title={ready ? undefined : t.retryGated}
        onClick={() => retry.run()}
      >
        {withCost(user ? t.answerThis : t.retryLast, retry.cost)}
      </button>
      {/* One tap to the deeper mode after a Fast answer: user-chosen, labelled, same provider. */}
      {retry.thinkingCost !== undefined && (
        <button disabled={busy || !ready} onClick={() => retry.run("thinking")}>
          {withCost(t.answerThinking, retry.thinkingCost)}
        </button>
      )}
    </>
  );
  return (
    <article
      className={`message ${message.role}`}
      aria-label={t.messageLabel(user, index + 1)}
    >
      <div className="message-heading">
        <strong>{user ? t.you : "CometRow"}</strong>
        {message.status !== "complete" && (
          <span>{message.status === "partial" ? t.incompleteExcluded : t.noAnswer}</span>
        )}
      </div>
      {message.answeredBy && <p className="muted answered-by">{message.answeredBy}</p>}
      <CodeRuns message={message} />
      {message.arithmeticCheck && message.arithmeticCheck.mismatches > 0 && (
        <p className="warning arithmetic-check" role="alert">
          {arithmeticText[lang].mismatch}
        </p>
      )}
      {message.arithmeticCheck && (message.arithmeticCheck.ambiguous ?? 0) > 0 && (
        <p className="warning arithmetic-check" role="alert">
          {arithmeticText[lang].ambiguous}
        </p>
      )}
      {!!message.completenessCheck?.missing.length && (
        <p className="warning arithmetic-check" role="alert">
          {completenessWarning(message.completenessCheck.missing)}
        </p>
      )}
      {message.uncheckedFigures && (
        <p className="warning arithmetic-check" role="alert">
          {GERMAN_RULES.warning}
        </p>
      )}
      {message.noOfficialSource && (
        <p className="warning arithmetic-check" role="alert">
          {GERMAN_RULES.noOfficial}
        </p>
      )}
      {message.passagesUsed && <p className="muted passages-used">{message.passagesUsed}</p>}
      {message.keptOnDevice && (
        <p className="muted kept-on-device">
          {message.keptOnDevice} {t.keptNote}
        </p>
      )}
      {message.failure && <p className="muted">{t.failure(message.failure)}</p>}
      {message.image && <p className="muted image-not-kept">{imageText[lang].notKept}</p>}
      {user && editing ? (
        <form
          className="message-edit"
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked) onEditSend(draft);
          }}
        >
          <label htmlFor="edited-message">{t.editedMessage}</label>
          <textarea
            ref={editBox}
            id="edited-message"
            rows={3}
            maxLength={MESSAGE_LIMIT}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onEdit(false);
              } else if (isSendKey(event.nativeEvent, touchDevice())) {
                // As in the message box: plain Enter sends where the button could, never a line.
                event.preventDefault();
                if (!blocked) event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <p className="muted">{mt.editNote}</p>
          <div className="message-actions">
            <button type="submit" className="primary" disabled={blocked}>
              {withCost(mt.sendEdit, draftCost)}
            </button>
            <button type="button" onClick={() => onEdit(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      ) : user ? (
        <UserText message={message} onResize={onResize} />
      ) : (
        <Suspense fallback={<div className="message-text">{message.text}</div>}>
          <Answer
            text={message.text}
            complete={message.status === "complete"}
            sources={message.sourceSnapshot ?? []}
            open={openSource}
          />
        </Suspense>
      )}
      {sourceHistoryStatus(message, sourceHistory) === "changed" && (
        <details className="source-history-note">
          <summary>{t.sourcesChanged}</summary>
          <p>{t.sourcesChangedText}</p>
        </details>
      )}
      {!!message.text && sourceHistoryStatus(message, sourceHistory) === "unrecorded" && (
        <details className="source-history-note">
          <summary>{t.sourcesUnrecorded}</summary>
          <p>{t.sourcesUnrecordedText}</p>
        </details>
      )}
      {!(user && editing) && (
        <div className="message-actions">
          {user && (
            <button
              disabled={busy}
              aria-label={t.editIntoBranch}
              id={`edit-message-${message.id}`}
              onClick={() => onEdit(true)}
            >
              <Icon name="edit" />
              {t.edit}
            </button>
          )}
          {user && retryButtons}
          {user && <MessageMeta message={message} />}
          {!user && (
            <>
              <button disabled={incomplete} onClick={onCopy}>
                <Icon name="copy" />
                {copied ? composerText[lang].copied : t.copyAnswer}
              </button>
              <ReadAloudButton id={message.id} disabled={incomplete} />
              <PdfExportButton conversation={conversation} answer={index} disabled={incomplete} />
            </>
          )}
          {!user && retryButtons}
          {!user && (
            <button aria-label={mt.reportLabel} onClick={onReport}>
              {mt.report}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
