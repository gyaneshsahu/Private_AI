// Memory across chats: the Settings screen, the "save as a memory" question, the note under an
// answer and the switch for one chat (docs/memory-20261114.md). All of it works on this device.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { Conversation } from "../shared/contracts";
import { ConfirmDialog } from "./ConfirmDialog";
import { memoryEnabled } from "./device-features";
import { containDialogFocus } from "./dialog-focus";
import { useLang } from "./i18n";
import {
  addMemory,
  deleteMemory,
  editMemory,
  forgetAll,
  heldMemories,
  holdMemories,
  MEMORY_LIMITS,
  MemoryError,
  pinMemory,
  tidyMemory,
  watchMemories,
  type Memory,
} from "./memory";
import { forStorage, type Storage } from "./text/mode-copy";
import { memoryText } from "./text/memory";
import type { Vault } from "./vault";

export const useMemories = () => useSyncExternalStore(watchMemories, heldMemories);

/** Reads the memories from the unlocked vault. With the switch off nothing is read. */
export async function loadMemories(vault: Vault) {
  if (memoryEnabled()) holdMemories(await vault.readMemories());
}
/** Holds the memories while the vault is unlocked and drops them when it locks. */
export function useMemoryVault(vault: Vault | null, unlocked: boolean) {
  useEffect(() => {
    if (!unlocked || !vault) return;
    // A vault that locked in between, or an unreadable record: no memory is held or sent.
    loadMemories(vault).catch(() => {});
    return () => holdMemories([]);
  }, [vault, unlocked]);
  return useMemories();
}
/** One change, written to the vault first; the held list follows only when that worked. */
export async function changeMemories(vault: Vault, change: (list: Memory[]) => Memory[]) {
  holdMemories(await vault.writeMemories(change));
}
export const memoryProblem = (error: unknown) =>
  error instanceof MemoryError ? error.problem : "failed";

const submitOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
};

export function MemorySettings({
  vault,
  unlocked,
  storage,
}: {
  vault: Vault | null;
  unlocked: boolean;
  /** Where the memories are kept; decides what the texts promise (src/text/mode-copy.ts). */
  storage?: Storage;
}) {
  const { lang } = useLang();
  const t = forStorage(memoryText[lang], storage);
  const memories = useMemories();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string }>();
  const [asking, setAsking] = useState<string>();
  const [status, setStatus] = useState("");
  const addInput = useRef<HTMLTextAreaElement>(null);
  const edited = useRef<string | undefined>(undefined);
  useEffect(() => {
    // After editing, focus goes back to that memory's Edit button.
    if (!editing && edited.current)
      document.getElementById(`memory-edit-${edited.current}`)?.focus();
    edited.current = editing?.id;
  }, [editing]);
  const apply = async (change: (list: Memory[]) => Memory[], done: string) => {
    if (!vault) return false;
    try {
      await changeMemories(vault, change);
      setStatus(done);
      return true;
    } catch (error) {
      setStatus(t.problem(memoryProblem(error)));
      return false;
    }
  };
  // Always-included first, then the newest first.
  const shown = [...memories]
    .reverse()
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
    .filter((m) => m.text.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="memory-settings">
      <h3>{t.title}</h3>
      <p>{t.intro}</p>
      <p>{t.sentNote}</p>
      <p className="muted">{t.notUsed}</p>
      {!unlocked ? (
        <p className="memory-locked">{t.locked}</p>
      ) : (
        <>
          <form
            className="memory-add"
            onSubmit={(event) => {
              event.preventDefault();
              void apply(addMemory(draft), t.added).then((ok) => ok && setDraft(""));
            }}
          >
            <label htmlFor="memory-new">{t.addLabel}</label>
            <textarea
              id="memory-new"
              ref={addInput}
              rows={2}
              maxLength={MEMORY_LIMITS.characters}
              placeholder={t.addHint}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={submitOnEnter}
            />
            <div className="memory-actions">
              <span className="muted">{t.length(draft.length, MEMORY_LIMITS.characters)}</span>
              <button type="submit" disabled={!draft.trim()}>
                {t.add}
              </button>
            </div>
          </form>
          <p className="memory-status" aria-live="polite">
            {status}
          </p>
          {memories.length > 5 && (
            <>
              <label className="sr-only" htmlFor="memory-search">
                {t.search}
              </label>
              <input
                id="memory-search"
                type="search"
                placeholder={t.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </>
          )}
          {!memories.length ? (
            <p className="muted">{t.none}</p>
          ) : !shown.length ? (
            <p className="muted">{t.noMatch}</p>
          ) : (
            <ul className="memory-list" aria-label={t.listLabel}>
              {shown.map((memory) => (
                <li key={memory.id}>
                  {editing?.id === memory.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void apply(editMemory(memory.id, editing.text), t.changed).then(
                          (ok) => ok && setEditing(undefined),
                        );
                      }}
                    >
                      <label className="sr-only" htmlFor={`memory-text-${memory.id}`}>
                        {t.editLabel}
                      </label>
                      <textarea
                        id={`memory-text-${memory.id}`}
                        rows={3}
                        autoFocus
                        maxLength={MEMORY_LIMITS.characters}
                        value={editing.text}
                        onChange={(event) => setEditing({ id: memory.id, text: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            // Escape ends the edit, not the whole settings dialog.
                            event.preventDefault();
                            setEditing(undefined);
                          } else submitOnEnter(event);
                        }}
                      />
                      <div className="memory-actions">
                        <button type="submit">{t.save}</button>
                        <button type="button" onClick={() => setEditing(undefined)}>
                          {t.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p id={`memory-${memory.id}`}>{memory.text}</p>
                      <div className="memory-actions">
                        <button
                          aria-pressed={!!memory.pinned}
                          aria-describedby={`memory-${memory.id}`}
                          onClick={() =>
                            void apply(
                              pinMemory(memory.id, !memory.pinned),
                              memory.pinned ? t.unpinned : t.pinned,
                            )
                          }
                        >
                          {t.always}
                        </button>
                        <button
                          id={`memory-edit-${memory.id}`}
                          aria-describedby={`memory-${memory.id}`}
                          onClick={() => setEditing({ id: memory.id, text: memory.text })}
                        >
                          {t.edit}
                        </button>
                        <button
                          aria-describedby={`memory-${memory.id}`}
                          onClick={() => setAsking(memory.id)}
                        >
                          {t.delete}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="muted">{t.alwaysHint(MEMORY_LIMITS.pinned)}</p>
          <div className="memory-actions memory-foot">
            <span className="muted">{t.count(memories.length, MEMORY_LIMITS.count)}</span>
            <button
              className="danger-button"
              disabled={!memories.length}
              onClick={() => setAsking("all")}
            >
              {t.forgetAll}
            </button>
          </div>
          {asking && (
            <ConfirmDialog
              title={asking === "all" ? t.forgetAllTitle : t.deleteTitle}
              text={asking === "all" ? t.forgetAllText(memories.length) : t.deleteText}
              confirmLabel={asking === "all" ? t.forgetAll : t.delete}
              cancelLabel={t.cancel}
              fallback={() => addInput.current}
              onClose={(confirmed) => {
                setAsking(undefined);
                if (!confirmed) return;
                if (asking === "all") void apply(forgetAll(), t.forgotten);
                else void apply(deleteMemory(asking), t.deleted);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Asks before a memory is saved, with the exact words, which can be changed first. `canSave` is
 * false while the vault is locked: then it only says so. `canSend` offers to send the typed text
 * as an ordinary message instead. Closes with the words to save, "send", or nothing.
 */
export function RememberDialog({
  text,
  canSave,
  canSend,
  storage,
  onClose,
}: {
  text: string;
  canSave: boolean;
  canSend: boolean;
  storage?: Storage;
  onClose: (result?: { save: string } | "send") => void;
}) {
  const { lang } = useLang();
  const t = forStorage(memoryText[lang], storage);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [words, setWords] = useState(text);
  const length = tidyMemory(words).length;
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger?.isConnected && !trigger.matches(":disabled") && trigger.checkVisibility())
        trigger.focus();
      else document.getElementById("message-input")?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog remember-dialog"
      onKeyDown={containDialogFocus}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave && length && length <= MEMORY_LIMITS.characters) onClose({ save: words });
        }}
      >
        <h2 id={`${id}-title`}>{t.rememberTitle}</h2>
        <p id={`${id}-text`}>{canSave ? t.rememberText : t.rememberLocked}</p>
        {canSave && (
          <>
            <label htmlFor={`${id}-words`}>{t.rememberLabel}</label>
            <textarea
              id={`${id}-words`}
              rows={4}
              value={words}
              onChange={(event) => setWords(event.target.value)}
              onKeyDown={submitOnEnter}
              aria-invalid={length > MEMORY_LIMITS.characters}
            />
            <p className={length > MEMORY_LIMITS.characters ? "warning" : "muted"} aria-live="polite">
              {length > MEMORY_LIMITS.characters
                ? t.problem("long")
                : t.length(length, MEMORY_LIMITS.characters)}
            </p>
          </>
        )}
        <div className="confirm-actions">
          <button type="button" onClick={() => onClose()}>
            {t.cancel}
          </button>
          {canSend && (
            <button type="button" onClick={() => onClose("send")}>
              {t.rememberSend}
            </button>
          )}
          {canSave && (
            <button
              type="submit"
              className="primary"
              disabled={!length || length > MEMORY_LIMITS.characters}
            >
              {t.rememberSave}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

/** Under an answer: which memories went with its question. Only ids are kept with the answer. */
export function MemoryNote({ ids, storage }: { ids: readonly string[]; storage?: Storage }) {
  const { lang } = useLang();
  const t = forStorage(memoryText[lang], storage);
  const memories = useMemories();
  if (!memoryEnabled() || !ids.length) return null;
  return (
    <details className="muted memory-used">
      <summary>{t.used(ids.length)}</summary>
      <ul>
        {ids.map((id) => (
          <li key={id}>{memories.find((m) => m.id === id)?.text ?? t.usedGone}</li>
        ))}
      </ul>
      <p>{t.usedNow}</p>
    </details>
  );
}

/** In the chat menu: memory on or off for this one chat. Not shown where memory is never used. */
export function MemoryChatSwitch({
  conversation,
  unlocked,
  disabled,
  onChange,
}: {
  conversation: Conversation;
  unlocked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  const { lang } = useLang();
  if (!memoryEnabled() || !unlocked || conversation.incognito) return null;
  return (
    <label className="menu-check">
      <input
        type="checkbox"
        checked={!conversation.memoryOff}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {memoryText[lang].chatSwitch}
    </label>
  );
}
