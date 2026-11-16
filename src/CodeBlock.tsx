import { Icon } from "./Icon";
import { useEffect, useState, type ReactNode } from "react";
import { useText } from "./i18n";
import { codeBlockText } from "./text/conversation-ui";
import { composerText } from "./text/composer";

export function CodeBlock({
  text,
  language,
  complete,
  children,
}: {
  text: string;
  language: string;
  complete: boolean;
  children: ReactNode;
}) {
  const [notice, setNotice] = useState<"" | "copied" | "failed">("");
  const t = useText(codeBlockText);
  const copiedLabel = useText(composerText).copied;
  useEffect(() => setNotice(""), [text]);
  // "Copied" on the button for 2 seconds; a failure stays until the next try.
  useEffect(() => {
    if (notice !== "copied") return;
    const timer = setTimeout(() => setNotice(""), 2000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <div className="code-block">
      <div className="code-block-toolbar">
        <span>{language || t.code}</span>
        <button
          disabled={!complete || !text}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setNotice("copied");
            } catch {
              setNotice("failed");
            }
          }}
        >
          <Icon name={notice === "copied" ? "check" : "copy"} />
          {notice === "copied" ? copiedLabel : t.copy}
        </button>
      </div>
      <pre tabIndex={0} aria-label={t.blockLabel(language)}>
        {children}
      </pre>
      {/* The one announcement: hidden on success (the button says it), shown on failure. */}
      {notice && (
        <p role="status" className={notice === "copied" ? "sr-only" : "muted"}>
          {notice === "copied" ? t.copied : t.copyFailed}
        </p>
      )}
    </div>
  );
}
