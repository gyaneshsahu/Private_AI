// The open chat's own "⋯" menu gets the same items as a chat in the sidebar (docs/projects-ux-20261125.md):
// Rename, Pin, Add to project, Remove from its project, Archive, Delete. Shown once the chat is saved.
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { ChatMenuItems, type Organize } from "./ChatMenuItems";
import { ConfirmDialog } from "./ConfirmDialog";
import { conversationTitle } from "./conversation-library";
import { useText } from "./i18n";
import type { Project } from "./projects";
import { chatMenuText } from "./text/chat-menu";
import { savedListText } from "./text/saved-list";

const closeMenu = () => document.querySelector(".conversation-menu")?.removeAttribute("open");
const menuButton = () => document.querySelector<HTMLElement>(".conversation-menu > summary");

export function ChatHeaderOrganize(props: {
  chat: Conversation;
  projects: readonly Project[];
  busy: boolean;
  onOrganize: Organize;
  onCreateProject?(name: string): Promise<string | undefined>;
  onDelete?(chat: Conversation): void;
}) {
  const t = useText(chatMenuText);
  const groups = useText(savedListText);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  // The question dialog starts on Cancel (right for a deletion); for a rename the field is the place to be.
  useEffect(() => {
    if (renaming) requestAnimationFrame(() => field.current?.select());
  }, [renaming]);
  const save = () => {
    const title = name.trim();
    setRenaming(false);
    closeMenu();
    if (title && title !== conversationTitle(props.chat)) props.onOrganize(props.chat, { title });
  };
  return (
    <>
      <ChatMenuItems
        chat={props.chat}
        projects={props.projects}
        busy={props.busy}
        close={closeMenu}
        dialogsInside
        onOrganize={props.onOrganize}
        onRename={() => {
          setName(conversationTitle(props.chat));
          setRenaming(true);
        }}
        onCreateProject={props.onCreateProject}
        onDelete={props.onDelete ? () => setDeleting(true) : undefined}
      />
      {renaming && (
        <ConfirmDialog
          title={t.renameTitle}
          text=""
          confirmLabel={t.save}
          cancelLabel={t.cancel}
          confirmDisabled={!name.trim()}
          fallback={menuButton}
          onClose={(confirmed) => (confirmed ? save() : (setRenaming(false), closeMenu()))}
        >
          <input
            ref={field}
            className="chat-rename-field"
            aria-label={t.renameLabel}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !name.trim()) return;
              event.preventDefault();
              save();
            }}
          />
        </ConfirmDialog>
      )}
      {deleting && props.onDelete && (
        <ConfirmDialog
          title={groups.deleteTitle}
          text={groups.deleteText(conversationTitle(props.chat))}
          confirmLabel={groups.deleteConfirm}
          cancelLabel={t.cancel}
          fallback={() => document.getElementById("message-input")}
          onClose={(confirmed) => {
            setDeleting(false);
            closeMenu();
            if (confirmed) props.onDelete!(props.chat);
          }}
        />
      )}
    </>
  );
}
