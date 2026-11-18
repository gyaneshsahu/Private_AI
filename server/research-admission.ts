// Deep research at the relay (docs/deep-research-20261114.md). The research itself runs in the
// browser; the relay only admits a run's two model requests and counts its searches.
// The chat body is encrypted, so the relay cannot see what a request is for. The browser declares
// it with `x-privateai-kind: research-plan` and `research-answer`. The whole run is charged at its
// plan request (owner, 18 November: a run starts straight away and is charged once, at the start);
// the answer belongs to that counted run through its ticket and is never refused for allowance.
// What a modified browser can and cannot do: a research request is never larger than an ordinary
// message (same body bound, same models, same output limit), so leaving the declaration out gets
// nothing bigger than chat at the chat price. It can assemble its own research from ordinary
// messages and ordinary approved searches, and then pays the ordinary prices, inside the same
// daily allowance, spend guard and daily search cap. The weight prices the bundle for the honest
// app; the hard bounds are those caps, which apply to every request whatever it declares.
import type { IncomingHttpHeaders } from "node:http";
import { RESEARCH_KINDS, type ResearchStep } from "../shared/deep-research";
import { IMAGE_KIND_HEADER } from "../shared/images";

export interface ResearchSettings {
  /** Allowance units one whole run costs (2 to 20). */
  cost: number;
  /** Runs per account in any 24 hours. */
  dailyRuns: number;
  /** Searches per account in any 24 hours, ordinary approved searches included. */
  dailySearches: number;
  /** "Premium only" without billing: when set, only these accounts get deep research. */
  allowedEmails?: string[];
}

/** Whether this account may use deep research on this deployment. */
export const researchAllowed = (settings: ResearchSettings | undefined, email: unknown): settings is ResearchSettings =>
  !!settings &&
  (!settings.allowedEmails ||
    (typeof email === "string" && settings.allowedEmails.some((allowed) => allowed.toLowerCase() === email.toLowerCase())));

export type ResearchDeclaration =
  | { step: undefined }
  | { step: ResearchStep; cost: number; total: number }
  | { refused: "off" };

/** What the request declares. Any other value of the header is left to the image check. */
export function declaredResearch(
  headers: IncomingHttpHeaders,
  settings: ResearchSettings | undefined,
  email: unknown,
): ResearchDeclaration {
  const kind = headers[IMAGE_KIND_HEADER];
  const step = (Object.keys(RESEARCH_KINDS) as ResearchStep[]).find((name) => RESEARCH_KINDS[name] === kind);
  if (!step) return { step: undefined };
  if (!researchAllowed(settings, email)) return { refused: "off" };
  return { step, cost: step === "plan" ? settings.cost : 0, total: settings.cost };
}

/** Far longer than a run's 8 minutes of searching and reading, so a slow run still gets its answer. */
export const TICKET_MS = 30 * 60_000;

/**
 * One answer request per accepted plan request: an answer without a plan is refused, so the
 * answer's weight cannot be skipped by declaring only the cheaper half, and the daily run count
 * (taken with the plan) covers every answer.
 * shortcut: in this process's memory, like the image count, so a restart forgets an open run (its
 * answer is then refused; the plan's units stay counted); move to the ledger with the other
 * single-server limits.
 */
export class ResearchTickets {
  private readonly open = new Map<string, { expires: number; searches: number }>();
  /** Opens a run; `searches` are the run's searches, taken from the day when it started. */
  grant(who: string, now = Date.now(), searches = 0) {
    if (this.open.size > 5000) for (const [key, run] of this.open) if (run.expires <= now) this.open.delete(key);
    this.open.set(who, { expires: now + TICKET_MS, searches });
  }
  /** Uses one of the open run's searches (already counted toward the day); false when none is left. */
  useSearch(who: string, now = Date.now()): boolean {
    const run = this.open.get(who);
    if (!run || run.expires <= now || run.searches < 1) return false;
    run.searches--;
    return true;
  }
  /** A search the provider failed goes back to the run. */
  returnSearch(who: string) {
    const run = this.open.get(who);
    if (run) run.searches++;
  }
  /** Closes the run for its answer; returns false when no run is open, else the searches it left unused. */
  claim(who: string, now = Date.now()): false | { unusedSearches: number } {
    const run = this.open.get(who);
    this.open.delete(who);
    return !!run && run.expires > now && { unusedSearches: run.searches };
  }
}
