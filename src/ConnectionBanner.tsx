// Two status lines: the banner while the browser reports no connection, and one screen-reader
// announcement when an answer is finished. The banner speaks about this device only; whether the
// server is reachable is not known here.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Message } from "../shared/contracts";
import { useText } from "./i18n";
import { connectionText } from "./text/connection";

function subscribe(changed: () => void) {
  window.addEventListener("online", changed);
  window.addEventListener("offline", changed);
  return () => {
    window.removeEventListener("online", changed);
    window.removeEventListener("offline", changed);
  };
}

export function ConnectionBanner() {
  const t = useText(connectionText);
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div role="status" className="notice offline-banner">
      {t.offline}
    </div>
  );
}

/**
 * Says "Answer complete" once, when the answer that was seen streaming becomes complete. Streamed
 * chunks are not announced, and neither is a finished answer in a conversation that was opened.
 */
export function AnswerAnnouncement({ last }: { last?: Pick<Message, "id" | "role" | "status"> }) {
  const t = useText(connectionText);
  const streaming = useRef<string | undefined>(undefined);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (last?.role === "assistant" && last.status === "partial") streaming.current = last.id;
    setDone(
      last?.role === "assistant" && last.status === "complete" && streaming.current === last.id,
    );
  }, [last?.id, last?.role, last?.status]);
  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only answer-announcement">
      {done ? t.answerComplete : ""}
    </p>
  );
}
