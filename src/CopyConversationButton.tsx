import { useEffect, useState, type MouseEvent } from "react";
import type { Conversation } from "../shared/contracts";
import { conversationText } from "./conversation-text";
import { Icon } from "./Icon";
import { useLang } from "./i18n";
import { savedListText } from "./text/saved-list";

/**
 * Copies text to the clipboard and keeps the result for a line beside the control.
 * "copied" clears after a few seconds. "failed" stays until the next try.
 */
export function useCopy() {
  const [state, setState] = useState<"" | "copied" | "failed">("");
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState(""), 4000);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = async (text: string) => {
    try {
      // No clipboard in an insecure context: the call throws and ends below.
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  };
  return [state, copy] as const;
}

/** The line beside a copy control. Always in the page, so screen readers hear the change. */
export function CopyStatus({ state }: { state: "" | "copied" | "failed" }) {
  const t = savedListText[useLang().lang];
  return (
    <span role="status" className="copy-status">
      {state === "copied" ? t.copied : state === "failed" ? t.copyFailed : ""}
    </span>
  );
}

/** "Copy conversation as text" for the conversation menu. Built on the device; nothing is sent. */
export function CopyConversationButton({
  conversation,
  disabled,
}: {
  conversation: Conversation;
  disabled: boolean;
}) {
  const { lang } = useLang();
  const [state, copy] = useCopy();
  return (
    <>
      <button
        disabled={disabled}
        onClick={(event: MouseEvent) => {
          // The app closes an open menu on any button click. Keep it open so the result is seen.
          event.stopPropagation();
          void copy(conversationText(conversation, lang));
        }}
      >
        <Icon name="copy" />
        {savedListText[lang].copyConversation}
      </button>
      <CopyStatus state={state} />
    </>
  );
}
