// Feedback in the owner's dashboard (docs/feedback-20261125.md): newest first, each entry with its
// sender, category, rating, text, an attached screenshot to open, and Delete (asked first).
import { useEffect, useState } from "react";
import type { FeedbackEntry } from "../../shared/feedback";
import { ConfirmDialog } from "../ConfirmDialog";
import { Icon } from "../Icon";
import { useLang, useText } from "../i18n";
import { feedbackText } from "../text/feedback";
import "./feedback.css";

export function FeedbackList({ csrf }: { csrf: string }) {
  const t = useText(feedbackText);
  const { lang } = useLang();
  const [entries, setEntries] = useState<FeedbackEntry[] | "failed">();
  const [deleting, setDeleting] = useState<FeedbackEntry>();
  useEffect(() => {
    let live = true;
    fetch("/api/owner/feedback", { credentials: "same-origin" })
      .then((response) => (response.ok ? (response.json() as Promise<{ entries: FeedbackEntry[] }>) : Promise.reject()))
      .then(
        (body) => live && setEntries(body.entries),
        () => live && setEntries("failed"),
      );
    return () => {
      live = false;
    };
  }, []);
  const when = (iso: string) => new Date(iso).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className="feedback-list" aria-labelledby="feedback-list-heading">
      <h3 id="feedback-list-heading">{t.listHeading}</h3>
      {entries === undefined ? (
        <p className="muted">{t.listLoading}</p>
      ) : entries === "failed" ? (
        <p role="status">{t.listFailed}</p>
      ) : !entries.length ? (
        <p className="muted">{t.listEmpty}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <p className="feedback-meta">
                <strong>{t[entry.category]}</strong>
                {entry.rating && <span>{t.rated(entry.rating)}</span>}
                <span>{t.from(entry.from, when(entry.createdAt))}</span>
              </p>
              <p className="feedback-body">{entry.text}</p>
              <p className="muted">{t.window(entry.lang, entry.width, entry.height)}</p>
              <p className="feedback-row-actions">
                {entry.hasScreenshot && (
                  <a href={`/api/owner/feedback/${entry.id}/screenshot`} target="_blank" rel="noreferrer">
                    <Icon name="image" />
                    {t.openScreenshot}
                  </a>
                )}
                <button type="button" aria-label={`${t.delete}: ${t.from(entry.from, when(entry.createdAt))}`} onClick={() => setDeleting(entry)}>
                  <Icon name="trash" />
                  {t.delete}
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <ConfirmDialog
          title={t.deleteTitle}
          text={t.deleteText}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          fallback={() => document.getElementById("feedback-list-heading")}
          onClose={async (confirmed) => {
            const entry = deleting;
            setDeleting(undefined);
            if (!confirmed) return;
            const response = await fetch(`/api/owner/feedback/${entry.id}`, { method: "DELETE", headers: { "X-PrivateAI-CSRF": csrf } }).catch(() => undefined);
            if (response && (response.status === 204 || response.status === 404)) setEntries((now) => (Array.isArray(now) ? now.filter((e) => e.id !== entry.id) : now));
          }}
        />
      )}
    </section>
  );
}
