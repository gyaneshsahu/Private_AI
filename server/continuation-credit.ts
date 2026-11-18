// Code execution (docs/code-execution-20261114.md): one answered message may need the model
// again after its code ran on the user's device. Owner decision, 14 November 2026: a paid
// message may make up to two such follow-up requests without using more allowance.
// The body is encrypted, so the relay cannot see whether a follow-up really carries a tool
// result. The bound is therefore by count: a modified browser gets at most CONTINUATIONS extra
// requests per paid one, in the same mode, within CREDIT_MS. Everything else (stop switch,
// spend check, one request at a time, three per instance, size limit) applies to them as to any
// request, and a follow-up without a credit is charged like a new message.
// shortcut: in this process's memory, like the retry credit in server/app.ts, so a restart
// charges a follow-up that was due free; move to the ledger with the other single-server limits.

/** Declared by the browser on a follow-up request; the only accepted value is "tool". */
export const CONTINUATION_HEADER = "x-privateai-continuation";
export const CONTINUATIONS = 2;
/**
 * A started message always finishes (owner, 18 November): every follow-up the browser may make for
 * one message (src/tool-loop.ts MAX_TOOL_ROUNDS) is covered, within the longest message time limit
 * (Thinking, 300 s) plus a margin. Before that rule the follow-ups beyond CONTINUATIONS were charged
 * and could be refused halfway through a calculation.
 */
export const FOLLOW_UPS = 3;
export const CREDIT_MS = 310_000;

export class ContinuationCredits {
  private readonly credits = new Map<string, { mode: string | undefined; left: number; expires: number }>();
  /** Free follow-ups per paid request: CONTINUATIONS, or the weights file's `freeCodeFollowUps` with metering on. */
  constructor(private readonly perPaid = CONTINUATIONS) {}

  /** A paid request was accepted by the provider: its account may follow up in the same mode. */
  grant(accountId: string, mode: string | undefined, now = Date.now()) {
    if (this.credits.size > 10_000)
      for (const [id, credit] of this.credits) if (credit.expires <= now) this.credits.delete(id);
    this.credits.set(accountId, { mode, left: Math.max(this.perPaid, FOLLOW_UPS), expires: now + CREDIT_MS });
  }

  /** Takes one follow-up from the account's credit; false means the request is charged normally. */
  claim(accountId: string, mode: string | undefined, now = Date.now()): boolean {
    const credit = this.credits.get(accountId);
    if (!credit || credit.expires <= now) {
      this.credits.delete(accountId);
      return false;
    }
    if (credit.mode !== mode) return false;
    if (--credit.left <= 0) this.credits.delete(accountId);
    return true;
  }
}
