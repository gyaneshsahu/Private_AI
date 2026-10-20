import { Icon } from "./Icon";
import { useEffect, useState, type ReactNode } from "react";

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
  useEffect(() => setNotice(""), [text]);
  return (
    <div className="code-block">
      <div className="code-block-toolbar">
        <span>{language || "Code"}</span>
        <button
          disabled={!complete || !text}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setNotice("Code copied. Review before running it.");
            } catch {
              setNotice(
                "Copy unavailable. Select the code and copy it manually.",
              );
            }
          }}
        >
          <Icon name="copy" />
          Copy code
        </button>
      </div>
      <pre tabIndex={0} aria-label={`${language || "Plain text"} code block`}>
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
