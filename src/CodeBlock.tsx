import { Icon } from "./Icon";
import { useEffect, useState, type ReactNode } from "react";
import { useText } from "./i18n";
import { codeBlockText } from "./text/conversation-ui";

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
  const [notice, setNotice] = useState("");
  const t = useText(codeBlockText);
  useEffect(() => setNotice(""), [text]);
  return (
    <div className="code-block">
      <div className="code-block-toolbar">
        <span>{language || t.code}</span>
        <button
          disabled={!complete || !text}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setNotice(t.copied);
            } catch {
              setNotice(t.copyFailed);
            }
          }}
        >
          <Icon name="copy" />
          {t.copy}
        </button>
      </div>
      <pre tabIndex={0} aria-label={t.blockLabel(language)}>
        {children}
      </pre>
      {notice && (
        <p role="status" className="muted">
          {notice}
        </p>
      )}
    </div>
  );
}
