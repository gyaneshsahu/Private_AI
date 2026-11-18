// The one calm message when a start finds the allowance used up (owner, 18 November 2026): the relay's
// 429 { code: "limit", resetsAt } becomes "Limit reached. It resets at X." with no unit counts.
import { expect, it } from "vitest";
import { completionEvents } from "../src/completion-events";
import { limitAtStart, limitReached, limitSentence, resetTime } from "../src/limit-message";
import { IncompleteReplyError } from "../src/reply-stream";
import { StreamProtocolError } from "../src/stream-failure";

const drain = async (response: Response) => {
  for await (const _ of completionEvents(response, new AbortController().signal)) void _;
};

it("reads only our relay's JSON limit refusal; any other 429 stays a plain rate limit", async () => {
  const at = "2026-11-19T14:05:00.000Z";
  const limit = new Response(JSON.stringify({ error: "Limit reached.", code: "limit", resetsAt: at }), {
    status: 429,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  const error = await drain(limit).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(StreamProtocolError);
  expect(error).toMatchObject({ code: "HTTP_LIMIT_REACHED", resetsAt: at });
  // A busy refusal from the relay, and a body that is not JSON, are not limit refusals.
  const busy = new Response(JSON.stringify({ error: "Three requests are already running." }), {
    status: 429,
    headers: { "content-type": "application/json" },
  });
  expect(await drain(busy).catch((e: unknown) => e)).toMatchObject({ code: "HTTP_RATE_LIMITED" });
  expect(await drain(new Response("PRIVATE", { status: 429 })).catch((e: unknown) => e)).toMatchObject({ code: "HTTP_RATE_LIMITED" });
  // A reset time that is not a date is dropped, never shown.
  const odd = new Response(JSON.stringify({ code: "limit", resetsAt: "soon" }), { status: 429, headers: { "content-type": "application/json" } });
  expect((await drain(odd).catch((e: unknown) => e)) as StreamProtocolError).toMatchObject({ code: "HTTP_LIMIT_REACHED", resetsAt: undefined });
});

it("the sentence: clock time today, date and time on another day, in English and German, never a unit count", () => {
  const now = new Date(2026, 10, 19, 9, 0);
  expect(resetTime(new Date(2026, 10, 19, 14, 5).toISOString(), "en", now)).toBe("14:05");
  expect(resetTime(new Date(2026, 10, 20, 8, 30).toISOString(), "en", now)).toBe("20 Nov, 08:30");
  expect(resetTime(new Date(2026, 10, 20, 8, 30).toISOString(), "de", now)).toMatch(/^20\. Nov\.?, 08:30$/);
  expect(limitSentence(undefined, "en")).toBe("Limit reached.");
  expect(limitSentence(undefined, "de")).toBe("Limit erreicht.");
  const error = new IncompleteReplyError("x", undefined, { code: "HTTP_LIMIT_REACHED", events: 0, usageEvents: 0, textCharacters: 0, finish: "NONE" });
  expect(limitReached(error, "en")).toBe("Limit reached.");
  expect(limitReached(new Error("other"), "en")).toBeUndefined();
  // Before a start: only when the period shows nothing left.
  const allowance = (remaining: number) => ({
    state: remaining ? ("active" as const) : ("exhausted" as const),
    limit: 50, used: 50 - remaining, remaining, pending: 0, uncertain: 0,
    resetsAt: new Date(Date.now() + 3600_000).toISOString(),
    meteredRequests: 0, promptTokens: 0, completionTokens: 0, unmeteredRequests: 0,
  });
  expect(limitAtStart(allowance(1), "en")).toBeUndefined();
  expect(limitAtStart(allowance(0), "en")).toMatch(/^Limit reached\. It resets at \d\d:\d\d\.$|^Limit reached\. It resets at \d+ \w+, \d\d:\d\d\.$/);
  expect(limitAtStart({ state: "unavailable" }, "en")).toBeUndefined();
  expect(limitAtStart(undefined, "en")).toBeUndefined();
});
