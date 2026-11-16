// Data controls (docs/data-controls-20261116.md): "Export my chats" builds the file in this browser
// from the chats the app already holds (no server reads content), and "Delete all chats" asks first,
// then calls the app. Standalone: src/App.tsx passes the chats and the delete action.
import { useRef, useState } from "react";
import type { Conversation } from "../shared/contracts";
import { ConfirmDialog } from "./ConfirmDialog";
import { useText } from "./i18n";
import { dataControlsText } from "./text/data-controls";

type Labels = { you: string; untitled: string };

/** Saved chats only: incognito chats are never saved, so they are never exported. */
const saved = (conversations: Conversation[]) => conversations.filter((c) => !c.incognito);

/** Readable export: one section per chat, oldest first, the written messages only. */
export function chatsMarkdown(conversations: Conversation[], t: Labels, exportedAt = new Date()): string {
  const chats = saved(conversations).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const parts = [`# CometRow chats`, ``, `Exported ${exportedAt.toISOString()}`];
  for (const chat of chats) {
    parts.push(``, `## ${chat.title.trim() || t.untitled}`, ``, `_${chat.createdAt}_`);
    for (const message of chat.messages)
      if (message.text.trim()) parts.push(``, `**${message.role === "user" ? t.you : "CometRow"}:**`, ``, message.text.trim());
  }
  return parts.join("\n") + "\n";
}

/** Complete export: the saved chats as the app holds them. */
export function chatsJson(conversations: Conversation[], exportedAt = new Date()): string {
  return JSON.stringify({ format: "cometrow-chats", version: 1, exportedAt: exportedAt.toISOString(), conversations: saved(conversations) }, null, 2);
}

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataControls({
  conversations,
  onDeleteAll,
  erasesEverything = false,
  busy = false,
}: {
  /** The saved chats the app holds, already decrypted on this device. */
  conversations: Conversation[];
  /** Deletes the chats; a rejection shows "did not finish". */
  onDeleteAll: () => Promise<void>;
  /** True when the action is DELETE /api/secure/items (memories, projects, files and tasks go too). */
  erasesEverything?: boolean;
  busy?: boolean;
}) {
  const t = useText(dataControlsText);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const deleteButton = useRef<HTMLButtonElement>(null);
  const count = saved(conversations).length;
  const exportAs = (kind: "md" | "json") => {
    if (!count) return setMessage(t.nothingToExport);
    const day = new Date().toISOString().slice(0, 10);
    if (kind === "md") download(chatsMarkdown(conversations, t), `cometrow-chats-${day}.md`, "text/markdown;charset=utf-8");
    else download(chatsJson(conversations), `cometrow-chats-${day}.json`, "application/json");
    setMessage(t.exported(count));
  };
  return (
    <section className="data-controls" aria-labelledby="data-controls-heading">
      <h3 id="data-controls-heading">{t.heading}</h3>
      <h4>{t.exportHeading}</h4>
      <p>{t.exportBody}</p>
      <div className="data-controls-actions">
        <button type="button" disabled={busy || deleting} onClick={() => exportAs("md")}>
          {t.exportMarkdown}
        </button>
        <button type="button" disabled={busy || deleting} onClick={() => exportAs("json")}>
          {t.exportJson}
        </button>
      </div>
      <h4>{t.deleteHeading}</h4>
      <p>{t.deleteBody}</p>
      <div className="data-controls-actions">
        <button
          ref={deleteButton}
          type="button"
          className="danger-button"
          // Not disabled while deleting or by an empty list, so focus stays here afterwards.
          aria-disabled={busy || deleting || undefined}
          onClick={() => {
            if (busy || deleting) return;
            setMessage(count ? "" : t.nothingToDelete);
            if (count) setConfirming(true);
          }}
        >
          {t.deleteButton}
        </button>
      </div>
      <p className="data-controls-message" aria-live="polite">
        {deleting ? t.deleting : message}
      </p>
      {confirming && (
        <ConfirmDialog
          title={t.confirmTitle}
          text={erasesEverything ? t.confirmEverything : t.confirmChats}
          confirmLabel={t.confirm}
          cancelLabel={t.cancel}
          fallback={() => deleteButton.current}
          onClose={(confirmed) => {
            setConfirming(false);
            if (!confirmed) return;
            setDeleting(true);
            onDeleteAll().then(
              () => setMessage(t.deleted),
              () => setMessage(t.failed),
            ).finally(() => setDeleting(false));
          }}
        />
      )}
    </section>
  );
}
