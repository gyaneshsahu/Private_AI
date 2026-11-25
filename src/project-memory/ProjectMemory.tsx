// Memory per project (docs/project-memory-20261126.md): the section on the project page. A
// project's memories are ordinary memories that carry the project's id (src/memory.ts): they go
// with questions in that project's chats and nowhere else.
import { useState } from "react";
import type { Vault } from "../vault";
import { useLang, useText } from "../i18n";
import { addMemory, deleteMemory, MEMORY_LIMITS, type Memory } from "../memory";
import { changeMemories, memoryProblem, submitOnEnter, useMemories } from "../MemoryPanel";
import { memoryText } from "../text/memory";
import { projectMemoryText } from "../text/project-memory";
import "./project-memory.css";

export function ProjectMemory({ vault, projectId }: { /** The vault that holds memories; absent while it is locked or another one holds this project. */ vault?: Vault; projectId: string }) {
  const t = useText(projectMemoryText);
  const { lang } = useLang();
  const mine = useMemories().filter((memory) => memory.projectId === projectId);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const apply = async (change: (list: Memory[]) => Memory[], done: string) => {
    try {
      await changeMemories(vault!, change);
      setStatus(done);
      return true;
    } catch (error) {
      setStatus(memoryText[lang].problem(memoryProblem(error)));
      return false;
    }
  };
  return (
    <section className="project-section project-memory" aria-labelledby={`project-memory-${projectId}`}>
      <h3 id={`project-memory-${projectId}`}>{t.title}</h3>
      <p className="muted">{t.intro}</p>
      {!vault ? (
        <p className="muted">{t.locked}</p>
      ) : (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void apply(addMemory(draft, projectId), t.added).then((ok) => ok && setDraft(""));
            }}
          >
            <label htmlFor={`project-memory-new-${projectId}`}>{t.addLabel}</label>
            <textarea
              id={`project-memory-new-${projectId}`}
              rows={2}
              maxLength={MEMORY_LIMITS.characters}
              placeholder={t.addHint}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={submitOnEnter}
            />
            <button type="submit" disabled={!draft.trim()}>
              {t.add}
            </button>
          </form>
          <p className="project-memory-status" role="status">
            {status}
          </p>
          {mine.length ? (
            <ul aria-label={t.listLabel}>
              {[...mine].reverse().map((memory) => (
                <li key={memory.id}>
                  <span>{memory.text}</span>
                  <button type="button" aria-label={t.deleteLabel(memory.text)} onClick={() => void apply(deleteMemory(memory.id), t.deleted)}>
                    {t.delete}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t.none}</p>
          )}
        </>
      )}
    </section>
  );
}
