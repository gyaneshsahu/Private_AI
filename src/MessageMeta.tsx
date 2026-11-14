import type { Message } from "../shared/contracts";
import { CopyStatus, useCopy } from "./CopyConversationButton";
import { Icon } from "./Icon";
import { useLang, type Lang } from "./i18n";
import { savedListText } from "./text/saved-list";

/** Time only for today, date and time otherwise, in the interface language's format. */
export function messageTime(at: string, lang: Lang, now = new Date()): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString(lang, { timeStyle: "short" })
    : date.toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
}

/** For the user's own message: a Copy action and the stored time in small text. */
export function MessageMeta({ message }: { message: Message }) {
  const { lang } = useLang();
  const t = savedListText[lang];
  const [state, copy] = useCopy();
  const time = message.at ? messageTime(message.at, lang) : "";
  return (
    <>
      <button
        disabled={!message.text}
        aria-label={t.copyMessageLabel}
        onClick={() => void copy(message.text)}
      >
        <Icon name="copy" />
        {t.copyMessage}
      </button>
      <CopyStatus state={state} />
      {time && (
        <time className="message-time" dateTime={message.at} title={t.sentAt(time)}>
          {time}
        </time>
      )}
    </>
  );
}
