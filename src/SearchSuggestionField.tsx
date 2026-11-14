// The editable search text in the suggestion box (docs/when-to-search-20261112.md, "Search
// text"). The field shows what the user typed; `sent` is that text after masking on the device
// (editedSearchText). When the two differ, the exact text that will be sent is shown beneath.
import { useEffect, useRef } from "react";
import { WHEN_TO_SEARCH } from "./when-to-search";

export function SearchSuggestionField(props: {
  /** id of the visible "Search the web for:" text, which labels the field. */
  labelledBy: string;
  text: string;
  sent: string;
  problem?: "short" | "long";
  onChange: (text: string) => void;
  /** Enter does what the search button does; it never sends the chat message. */
  onEnter: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  // Grows with the text so the whole search text stays visible at phone width.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.text]);
  return (
    <>
      <textarea
        ref={field}
        rows={1}
        aria-labelledby={props.labelledBy}
        aria-describedby="search-text-sent"
        aria-invalid={!!props.problem}
        // The server limit; masking can still lengthen the text, which `problem` reports.
        maxLength={400}
        enterKeyHint="search"
        autoCapitalize="off"
        value={props.text}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          props.onEnter();
        }}
      />
      <div id="search-text-sent" role="status">
        {props.problem ? (
          <p className="warning">
            {props.problem === "long" ? WHEN_TO_SEARCH.tooLong : WHEN_TO_SEARCH.tooShort}
          </p>
        ) : (
          props.sent !== props.text.trim() && (
            <>
              <p className="muted">{WHEN_TO_SEARCH.willBeSent}</p>
              <pre>{props.sent}</pre>
            </>
          )
        )}
      </div>
    </>
  );
}
