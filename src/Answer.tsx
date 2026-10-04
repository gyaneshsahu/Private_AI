import type { Source } from "../shared/contracts";

export function Answer({
  text,
  sources,
  open,
}: {
  text: string;
  sources: Source[];
  open: (s: Source) => void;
}) {
  return (
    <div className="message-text">
      {text
        .split(/(\[[a-zA-Z0-9-]{6,36}\]|【[a-zA-Z0-9-]{6,36}】)/g)
        .map((part, index) => {
          const source = sources.find(
            (s) => s.id === part.slice(1, -1) && /^[\[【]/.test(part),
          );
          return source ? (
            <button
              className="citation"
              key={index}
              onClick={() => open(source)}
            >
              {source.title}
              {source.page ? ` · p${source.page}` : ""}
            </button>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
    </div>
  );
}
