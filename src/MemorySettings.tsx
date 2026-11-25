// The Memory screen in Settings (docs/memory-20261114.md), moved out of src/MemoryPanel.tsx so it
// loads with Settings only (SS-13). The question, the note under an answer and the chat switch stay there.
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useLang } from "./i18n";
import { addMemory, deleteMemory, editMemory, forgetAll, MEMORY_LIMITS, pinMemory, type Memory } from "./memory";
import { projectMemoryText } from "./text/project-memory";
import { forStorage, type Storage } from "./text/mode-copy";
import { memoryText } from "./text/memory";
import type { Vault } from "./vault";
import { useMemories, changeMemories, memoryProblem, submitOnEnter } from "./MemoryPanel";

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
  // A project's memories are on that project's page (docs/project-memory-20261126.md).
  const everything = useMemories();
  const memories = everything.filter((m) => !m.projectId);
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
      {everything.length > memories.length && <p className="muted">{projectMemoryText[lang].inSettings}</p>}
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
