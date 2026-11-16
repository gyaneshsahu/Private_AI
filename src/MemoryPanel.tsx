// Memory across chats: the "save as a memory" question, the note under an answer and the switch
// for one chat (docs/memory-20261114.md); the Settings screen is src/MemorySettings.tsx.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { Conversation } from "../shared/contracts";
import { memoryEnabled } from "./device-features";
import { containDialogFocus } from "./dialog-focus";
import { useLang } from "./i18n";
import { heldMemories, holdMemories, MEMORY_LIMITS, MemoryError, tidyMemory, watchMemories, type Memory } from "./memory";
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

export const submitOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
};

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
