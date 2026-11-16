import { useId, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useLang } from "./i18n";
import { projectText } from "./text/projects";

/**
 * "Delete project?" with the choice to keep or delete its chats (offered only when it has chats).
 * Used by the project screen and by the sidebar's project menu (src/WorkspaceNavigation.tsx).
 */
export function ProjectDeleteDialog({
  name,
  text,
  chats,
  fallback,
  onClose,
}: {
  name: string;
  text: string;
  /** How many chats the project has; 0 hides the choice. */
  chats: number;
  fallback?: () => HTMLElement | null;
  onClose: (confirmed: boolean, deleteChats: boolean) => void;
}) {
  const { lang } = useLang();
  const t = projectText[lang];
  const id = useId();
  const [deleteChats, setDeleteChats] = useState(false);
  return (
    <ConfirmDialog
      title={t.deleteTitle(name)}
      text={text}
      confirmLabel={t.delete}
      cancelLabel={t.cancel}
      fallback={fallback}
      onClose={(confirmed) => onClose(confirmed, chats > 0 && deleteChats)}
    >
      {chats > 0 && (
        <fieldset className="project-delete-choice">
          <legend className="sr-only">{t.chats}</legend>
          <label>
            <input type="radio" name={`${id}-chats`} checked={!deleteChats} onChange={() => setDeleteChats(false)} />
            {t.keepChats}
          </label>
          <label>
            <input type="radio" name={`${id}-chats`} checked={deleteChats} onChange={() => setDeleteChats(true)} />
            {t.deleteChats(chats)}
          </label>
        </fieldset>
      )}
    </ConfirmDialog>
  );
}
