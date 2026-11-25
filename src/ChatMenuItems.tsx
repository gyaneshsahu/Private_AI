// What can be done with one saved chat, as menu items (docs/projects-ux-20261125.md): Rename, Pin,
// Add to project (with "New project…"), Remove from its project, Archive, Delete. The same items
// serve the "⋯" of a chat in the sidebar, of a chat inside a project, and of the open chat's header.
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationTitle } from "./conversation-library";
import { Icon } from "./Icon";
import { useText } from "./i18n";
import type { Project } from "./projects";
import { chatMenuText } from "./text/chat-menu";
import "./chat-menu.css";

export type Organize = (c: Conversation, change: Pick<Conversation, "pinned" | "archived" | "projectId" | "title">) => void;

export function ChatMenuItems(props: {
  chat: Conversation;
  projects: readonly Project[];
  busy: boolean;
  /** Closes the menu these items sit in. */
  close(): void;
  onOrganize: Organize;
  /** Starts renaming (in place, or in a dialog); the item is shown only when given. */
  onRename?(): void;
  /** Creates a project and resolves its id; "New project…" is shown only when given. */
  onCreateProject?(name: string): Promise<string | undefined>;
  /** Asks before deleting; the item is shown only when given. */
  onDelete?(): void;
  /** Rename and Delete open their dialog from inside the menu, so the menu must stay open until it closes. */
  dialogsInside?: boolean;
}) {
  const t = useText(chatMenuText);
  const { chat, projects, busy } = props;
  const [choosing, setChoosing] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const current = projects.find((p) => p.id === chat.projectId);
  // The menu floats inside a scrolling list: whenever it opens or grows (the project list), all of it is scrolled into view.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const show = () => element.checkVisibility() && (element.closest(".chat-menu-popover") ?? element).scrollIntoView({ block: "nearest" });
    const watch = new ResizeObserver(show);
    watch.observe(element);
    return () => watch.disconnect();
  }, []);
  const act = (change: Partial<Pick<Conversation, "pinned" | "archived" | "projectId">>) => {
    props.onOrganize(chat, { title: chat.title, ...change });
    props.close();
  };
  return (
    <div ref={root} className="chat-menu-items" role="group" aria-label={conversationTitle(chat)}>
      {props.onRename && (
        <button
          type="button"
          data-keep-menu={props.dialogsInside ? "" : undefined}
          disabled={busy}
          onClick={() => {
            if (!props.dialogsInside) props.close();
            props.onRename!();
          }}
        >
          <Icon name="edit" />
          {t.rename}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => act({ pinned: !chat.pinned })}>
        <Icon name="pin" />
        {chat.pinned ? t.unpin : t.pin}
      </button>
      {/* Offered when there is somewhere to move to: another project, or the chance to make one. */}
      {(projects.some((p) => p.id !== chat.projectId) || props.onCreateProject) && (
        <button type="button" data-keep-menu className="chat-menu-more" aria-expanded={choosing} disabled={busy} onClick={() => setChoosing(!choosing)}>
          <Icon name="folder" />
          {current ? t.moveToProject : t.addToProject}
          {/* Drawn, not spoken: generated content would become part of the button's name. */}
          <span className="chat-menu-chevron" aria-hidden="true" />
        </button>
      )}
      {choosing && (
        <div className="chat-menu-projects">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === chat.projectId}
              aria-label={p.id === chat.projectId ? `${p.name} · ${t.inThisProject}` : p.name}
              disabled={busy || p.id === chat.projectId}
              onClick={() => act({ projectId: p.id })}
            >
              <Icon name={p.id === chat.projectId ? "check" : "folder"} />
              <span>{p.name}</span>
            </button>
          ))}
          {!projects.length && !props.onCreateProject && <p>{t.noProjects}</p>}
          {props.onCreateProject &&
            (naming ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const id = await props.onCreateProject!(name.trim());
                  if (id) act({ projectId: id });
                }}
              >
                <input autoFocus aria-label={t.projectName} placeholder={t.projectName} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
                <div>
                  <button type="submit" data-keep-menu className="primary" disabled={busy || !name.trim()}>
                    {t.create}
                  </button>
                  <button type="button" data-keep-menu onClick={() => setNaming(false)}>
                    {t.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" data-keep-menu disabled={busy} onClick={() => setNaming(true)}>
                <Icon name="plus" />
                <span>{t.newProject}</span>
              </button>
            ))}
        </div>
      )}
      {current && (
        <button type="button" disabled={busy} onClick={() => act({ projectId: undefined })}>
          <Icon name="close" />
          {t.removeFrom(current.name)}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => act({ archived: !chat.archived })}>
        <Icon name="archive" />
        {chat.archived ? t.restore : t.archive}
      </button>
      {props.onDelete && (
        <button
          type="button"
          className="chat-menu-danger"
          data-keep-menu={props.dialogsInside ? "" : undefined}
          disabled={busy}
          onClick={() => {
            if (!props.dialogsInside) props.close();
            props.onDelete!();
          }}
        >
          <Icon name="trash" />
          {t.delete}
        </button>
      )}
    </div>
  );
}
