// One message in the conversation (docs/chat-feature-gaps-20261114.md, packages C and D): the
// user's own text as plain text and collapsed when long, edit and send in place, retry with its
// cost in the label, and the report entry. Sending itself stays in App: this file only calls back.
import { CreatedImageCard } from "./CreateImage";
import { shareText } from "./text/share";
import { imageCreationText } from "./text/image-creation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AnswerMode, Conversation, Message, Source } from "../shared/contracts";
import { completenessWarning } from "./arithmetic/completeness";
import { CodeRuns } from "./CodeRuns";
import { fitHeight, isSendKey, MESSAGE_LIMIT, touchDevice } from "./composer-keys";
import { GERMAN_RULES } from "./german-rules";
import { WHEN_TO_SEARCH } from "./when-to-search";
import { Icon } from "./Icon";
import { importFresh, LoadBoundary, retryLazy } from "./LoadBoundary";
import { useLang } from "./i18n";
import { shouldCollapse } from "./message-collapse";
import { MessageMeta } from "./MessageMeta";
import { MemoryNote } from "./MemoryPanel";
import { MenuButton, type MenuItem } from "./MenuButton";
import { messageActionsText } from "./text/message-actions";
import { memoryText } from "./text/memory";
import { canvasText } from "./text/canvas";
import { projectText } from "./text/projects";
import { projectSpacesEnabled } from "./device-features";
import { PdfExportButton } from "./PdfExportButton";
import { ReadAloudButton } from "./ReadAloudButton";
import { sourceHistoryStatus } from "./source-history";
import { appText } from "./text/app";
import { chatCoreText } from "./text/chat-core";
import { arithmeticText } from "./text/arithmetic";
import { composerText } from "./text/composer";
import { imageText } from "./text/images";
import { messageText } from "./text/message";
import { sidePanelsText } from "./text/side-panels";
import type { Storage } from "./text/mode-copy";

// Once loaded, the renderer is used directly: a lazy component suspends on its first render even
// when its module is already loaded, and its placeholder shows raw Markdown and source codes.
let answerModule: typeof import("./Answer") | undefined;
const loadAnswer = () => importFresh(() => import("./Answer")).then((module) => (answerModule = module));
const LazyAnswer = retryLazy(() => loadAnswer().then((module) => ({ default: module.Answer })));
/** Loads the answer renderer before an answer is first shown (deep research writes it while the conversation is hidden). */
export const preloadAnswer = () => void loadAnswer().catch(() => {});

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
  onRemember,
  onCanvas,
  onCreateImage,
  onRegenerateImage,
  onImagePrivacy,
  onEditImage,
  onShare,
  onShareImage,
  onOpenImagePanel,
  onOpenBoard,
  onResize,
  streaming,
  storage,
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
  /** Memory across chats: offered on the user's own message when memory is on (absent otherwise). */
  onRemember?: () => void;
  /** Canvas: offered on a completed answer when the canvas is on (absent otherwise). */
  onCanvas?: () => void;
  /** Image creation: offered on a short completed answer when it is on (absent otherwise). */
  onCreateImage?: () => void;
  /** A created image's Regenerate and its small info icon (absent when image creation is off). */
  onRegenerateImage?: (prompt: string) => void;
  onImagePrivacy?: () => void;
  /** Opens this message's image full screen for editing; absent where image editing is off. */
  onEditImage?: () => void;
  /** Opens the Share dialog for this answer. */
  onShare?: () => void;
  onShareImage?: () => void;
  onOpenImagePanel?: () => void;
  /** The whiteboard card on a question that had the board with it (absent when the whiteboard is off). */
  onOpenBoard?: () => void;
  onReport: () => void;
  onResize: () => void;
  /** This answer is still arriving: no status label and no actions; dots until its first text. */
  streaming?: boolean;
  /** Where this chat is kept: what the memory note may promise (src/text/mode-copy.ts). */
  storage?: Storage;
}) {
  const { lang } = useLang();
  const t = appText[lang];
  const mt = messageText[lang];
  const ma = messageActionsText[lang];
  const sp = sidePanelsText[lang];
  const Answer = answerModule?.Answer ?? LazyAnswer;
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
  // The edit box grows with its text, as the message box does.
  useLayoutEffect(() => {
    if (editing) fitHeight(editBox.current);
  }, [editing, draft]);
  // Read again on every render: the mode choice may change while the box is open.
  const draftCost = editing ? editCost(draft) : undefined;
  const blocked = busy || !ready || !draft.trim();
  const withCost = (label: string, cost?: number) =>
    cost === undefined ? label : `${label} (${mt.uses(cost)})`;
  const incomplete = message.status !== "complete" || !message.text;
  // One Retry button with a small menu; each item shows what a press uses before it is pressed.
  const retryItems: MenuItem[] = retry
    ? [
        { label: withCost(user ? t.answerThis : t.retryLast, retry.cost), onSelect: () => retry.run() },
        // One tap to the deeper mode after a Fast answer: user-chosen, labelled, same provider.
        ...(retry.thinkingCost === undefined
          ? []
          : [{ label: withCost(t.answerThinking, retry.thinkingCost), onSelect: () => retry.run("thinking") }]),
      ]
    : [];
  const retryMenu = retry && (
    <MenuButton
      label={ma.retry}
      title={ready ? undefined : t.retryGated}
      icon="retry"
      disabled={busy || !ready}
      items={retryItems}
    />
  );
  return (
    <article
      className={`message ${message.role}`}
      data-message-id={message.id}
      aria-label={t.messageLabel(user, index + 1)}
    >
      <div className="message-heading">
        <strong>{user ? t.you : "CometRow"}</strong>
        {message.status !== "complete" && !streaming && (
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
      {message.memoriesUsed && <MemoryNote ids={message.memoriesUsed} storage={storage} />}
      {message.projectInstructionsSent && projectSpacesEnabled() && (
        <p className="muted project-used">{projectText[lang].instructionsSent}</p>
      )}
      {message.keptOnDevice && (
        <p className="muted kept-on-device">
          {message.keptOnDevice} {t.keptNote}
        </p>
      )}
      {message.failure && (
        <div className="failure-note">
          <p>{t.failure(message.failure)}</p>
          <details>
            <summary>{chatCoreText[lang].failureMore}</summary>
            <p>{chatCoreText[lang].failureExplanation}</p>
          </details>
        </div>
      )}
      {/* A whiteboard question shows its card instead: the board itself is kept. */}
      {message.image && !message.board && <p className="muted image-not-kept">{imageText[lang].notKept}</p>}
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
          <div className="message-edit-actions">
            <button type="submit" className="primary" disabled={blocked}>
              {withCost(mt.sendEdit, draftCost)}
            </button>
            <button type="button" onClick={() => onEdit(false)}>
              {t.cancel}
            </button>
          </div>
        </form>
      ) : user ? (
        <>
          <UserText message={message} onResize={onResize} />
          {message.board && onOpenBoard && (
            <button type="button" className="board-card" onClick={onOpenBoard} aria-label={sp.cardOpen}>
              <Icon name="whiteboard" />
              <span>{sp.card}</span>
            </button>
          )}
        </>
      ) : streaming && !message.text ? (
        // Before the first text: moving dots for the eye, a sentence for screen readers.
        <div className="message-text message-waiting">
          <span className="typing-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">{ma.writing}</span>
        </div>
      ) : (
        message.createdImage ? (
          <CreatedImageCard
            image={message.createdImage}
            onRegenerate={onRegenerateImage}
            onPrivacy={onImagePrivacy}
            onEdit={onEditImage}
            onShare={onShareImage}
            onOpenPanel={onOpenImagePanel}
          />
        ) : (
        <LoadBoundary placeholder={<div className="message-text">{message.text}</div>}>
          <Suspense fallback={<div className="message-text">{message.text}</div>}>
            <Answer
              text={message.text}
              complete={message.status === "complete"}
              sources={message.sourceSnapshot ?? []}
              open={openSource}
            />
          </Suspense>
        </LoadBoundary>
        )
      )}
      {!user && message.searchedFor && (
        <SearchedWeb
          query={message.searchedFor}
          sources={(message.sourceSnapshot ?? []).filter((source) => !message.searchedSources || message.searchedSources.includes(source.id))}
        />
      )}
      {sourceHistoryStatus(message, sourceHistory) === "changed" && (
        <details className="source-history-note">
          <summary>{t.sourcesChanged}</summary>
          <p>{t.sourcesChangedText}</p>
        </details>
      )}
      {!!message.text && !message.createdImage && sourceHistoryStatus(message, sourceHistory) === "unrecorded" && (
        <details className="source-history-note">
          <summary>{t.sourcesUnrecorded}</summary>
          <p>{t.sourcesUnrecordedText}</p>
        </details>
      )}
      {!(user && editing) && !streaming && !message.createdImage && (
        <div className="message-actions compact-actions">
          {user && (
            <button
              className="icon-action"
              disabled={busy}
              aria-label={t.editIntoBranch}
              title={t.editIntoBranch}
              id={`edit-message-${message.id}`}
              onClick={() => onEdit(true)}
            >
              <Icon name="edit" />
            </button>
          )}
          {user && onRemember && (
            <button
              className="icon-action"
              disabled={busy}
              aria-label={memoryText[lang].rememberThis}
              title={memoryText[lang].rememberThis}
              onClick={onRemember}
            >
              <Icon name="pin" />
            </button>
          )}
          {user && retryMenu}
          {user && <MessageMeta message={message} />}
          {!user && (
            <>
              {/* A partial answer with text can be copied too: the copy says what it is. */}
              <button
                className="icon-action"
                disabled={!message.text}
                aria-label={copied ? composerText[lang].copied : t.copyAnswer}
                title={copied ? composerText[lang].copied : t.copyAnswer}
                onClick={onCopy}
              >
                <Icon name={copied ? "check" : "copy"} />
              </button>
              {onShare && !message.createdImage && (
                <button className="icon-action" disabled={incomplete || !message.text} aria-label={shareText[lang].share} title={shareText[lang].share} onClick={onShare}>
                  <Icon name="share" />
                </button>
              )}
              <ReadAloudButton id={message.id} disabled={incomplete} />
              <PdfExportButton conversation={conversation} answer={index} disabled={incomplete} />
              {onCreateImage && !message.createdImage && (
                <button
                  className="icon-action"
                  disabled={incomplete}
                  aria-label={imageCreationText[lang].onAnswer}
                  title={imageCreationText[lang].onAnswer}
                  onClick={onCreateImage}
                >
                  <Icon name="sparkle" />
                </button>
              )}
              {onCanvas && (
                <button
                  className="icon-action"
                  disabled={incomplete}
                  aria-label={canvasText[lang].open}
                  title={canvasText[lang].open}
                  onClick={onCanvas}
                >
                  <Icon name="edit" />
                </button>
              )}
              {retryMenu}
              <MenuButton
                label={ma.moreActions}
                icon="more"
                items={[{ label: mt.report, ariaLabel: mt.reportLabel, onSelect: onReport }]}
              />
            </>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Under an answer after an automatic search (owner, 19 November): the short line "Searched the web";
 * opened, the exact text that was searched and the web sources. A saved chat keeps the text, not the results.
 */
function SearchedWeb({ query, sources }: { query: string; sources: Source[] }) {
  useLang();
  const web = sources.filter((source) => source.url);
  return (
    <details className="source-history-note searched-web">
      <summary>
        <Icon name="globe" />
        {WHEN_TO_SEARCH.searchedWeb}
      </summary>
      <p>{WHEN_TO_SEARCH.searchedFor(query)}</p>
      {web.length ? (
        <ol>
          {web.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title || new URL(source.url!).hostname}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p>{WHEN_TO_SEARCH.sourcesNotKept}</p>
      )}
    </details>
  );
}
