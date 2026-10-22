// Provider-neutral web search contract. The research routes in server/app.ts
// consume an approved query through this interface; the supplier (today Brave,
// configured by its API key) is an adapter. A second supplier is another
// adapter chosen by configuration; the approval flow and the temporary-session
// rules do not change.
import type { Source } from "../../shared/contracts";
import { searchWeb } from "../research";

export interface SearchProvider {
  readonly id: "brave";
  /** Shown to the user in the approval dialog as the recipient of the query. */
  readonly recipientLabel: string;
  search(query: string, signal?: AbortSignal): Promise<Source[]>;
}

export function braveSearchProvider(
  key: string,
  mode: "web" | "llm-context" = "web",
): SearchProvider {
  return {
    id: "brave",
    recipientLabel: "Brave Search API",
    search: (query, signal) => searchWeb(query, key, signal, mode),
  };
}
