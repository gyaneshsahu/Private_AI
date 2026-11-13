// The adaptive attestation queue on a fake clock: paced start, halving on 429, Retry-After,
// slow growth up to the ceiling, bounded waiting with "busy". Synthetic only.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ATTEST_LIMITS, createAttestQueue } from "../server/providers/privatemode-attest-queue";

const reply = (statusCode = 200, headers: Record<string, string> = {}) => ({
  statusCode,
  headers,
  body: { dump: async () => {} },
});
type Reply = ReturnType<typeof reply>;
const never = new AbortController().signal;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

/** Records when each call reaches upstream (ms since start). */
function upstream(answer: (n: number) => Reply = () => reply()) {
  const start = Date.now();
  const sentAt: number[] = [];
  const send = async () => {
    sentAt.push(Date.now() - start);
    return answer(sentAt.length);
  };
  return { sentAt, send };
}

it("the numbers follow the measurements: start and burst below the 9 calls that passed, wait about 20 s", () => {
  expect(ATTEST_LIMITS.startPerMinute).toBeLessThan(9);
  expect(ATTEST_LIMITS.burst).toBeLessThan(9);
  expect(ATTEST_LIMITS.floorPerMinute).toBeGreaterThan(0);
  expect(ATTEST_LIMITS.ceilingPerMinute).toBeGreaterThan(20);
  expect(ATTEST_LIMITS.maxWaitMs).toBe(20_000);
});

it("sends a burst of 6 calls at once, then paces at 6 calls a minute", async () => {
  const queue = createAttestQueue({ ...ATTEST_LIMITS, maxWaitMs: 25_000 });
  const { sentAt, send } = upstream();
  const results = Array.from({ length: 8 }, () => queue.run(send, never));
  await vi.advanceTimersByTimeAsync(21_000);
  await Promise.all(results);
  expect(sentAt.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]);
  // One call every 60 000 / 6 = 10 000 ms afterwards.
  expect(sentAt[6]).toBeGreaterThanOrEqual(10_000);
  expect(sentAt[6]).toBeLessThan(10_050);
  expect(sentAt[7]).toBeGreaterThanOrEqual(20_000);
  expect(sentAt[7]).toBeLessThan(20_050);
  expect(queue.stats()).toMatchObject({ sent: 8, waited: 2, limited429: 0, busy: 0 });
});

it("halves the rate on a 429, pauses, never passes the 429 on, halves once per burst, and ends a call at its 20 s", async () => {
  const limits = { ...ATTEST_LIMITS, pauseAfter429Ms: 6_000 };
  const queue = createAttestQueue(limits);
  // The first three calls are refused upstream, as by Privatemode's per-organisation limit.
  const { sentAt, send } = upstream((n) => reply(n <= 3 ? 429 : 200));
  const results = [queue.run(send, never), queue.run(send, never), queue.run(send, never)];
  await vi.advanceTimersByTimeAsync(0);
  expect(queue.stats()).toMatchObject({ limited429: 3, perMinute: 3, lastPauseMs: 6_000 });
  await vi.advanceTimersByTimeAsync(5_999);
  expect(sentAt).toHaveLength(3);
  // After the pause one call goes, then one per 60 000 / 3 = 20 000 ms.
  await vi.advanceTimersByTimeAsync(30_000);
  const outcomes = await Promise.all(results);
  expect((outcomes[0] as Reply).statusCode).toBe(200);
  // The second would go at 26 000 ms and the third later, both after their 20 s.
  expect(outcomes.slice(1)).toEqual(["busy", "busy"]);
  expect(sentAt).toEqual([0, 0, 0, 6_000]);
  expect(queue.stats()).toMatchObject({ sent: 4, limited429: 3, busy: 2 });
});

it("honours Retry-After in seconds and as a date", async () => {
  for (const header of ["9", "Fri, 13 Nov 2026 11:00:09 GMT"]) {
    vi.setSystemTime(new Date("2026-11-13T11:00:00Z"));
    const queue = createAttestQueue();
    const { sentAt, send } = upstream((n) => (n === 1 ? reply(429, { "retry-after": header }) : reply()));
    const result = queue.run(send, never);
    await vi.advanceTimersByTimeAsync(8_999);
    expect(sentAt, header).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sentAt, header).toEqual([0, 9_000]);
    expect(((await result) as Reply).statusCode).toBe(200);
    expect(queue.stats().lastPauseMs).toBe(9_000);
  }
});

it("without Retry-After pauses for Privatemode's usual 60 s", async () => {
  const queue = createAttestQueue();
  const { sentAt, send } = upstream((n) => reply(n === 1 ? 429 : 200));
  const first = queue.run(send, never);
  await vi.advanceTimersByTimeAsync(ATTEST_LIMITS.maxWaitMs + 1);
  expect(await first).toBe("busy");
  expect(queue.stats().lastPauseMs).toBe(60_000);
  // Meanwhile new calls are refused at once instead of waiting out a pause longer than 20 s.
  expect(await queue.run(send, never)).toBe("busy");
  expect(sentAt).toHaveLength(1);
});

it("grows by one call a minute after 10 successes in a row, never beyond the ceiling, and never below the floor", async () => {
  const limits = { ...ATTEST_LIMITS, ceilingPerMinute: 10, burst: 1000, pauseAfter429Ms: 6_000 };
  const queue = createAttestQueue(limits);
  const { send } = upstream();
  for (let i = 0; i < 9; i++) await queue.run(send, never);
  expect(queue.stats().perMinute).toBe(6);
  await queue.run(send, never);
  expect(queue.stats().perMinute).toBe(7);
  for (let i = 0; i < 100; i++) await queue.run(send, never);
  expect(queue.stats().perMinute).toBe(10);
  // Repeated 429s, one per pause, halve down to the floor and no further.
  const refusing = upstream(() => reply(429));
  for (let i = 0; i < 6; i++) {
    void queue.run(refusing.send, never);
    await vi.advanceTimersByTimeAsync(ATTEST_LIMITS.maxWaitMs + 1);
  }
  expect(queue.stats().perMinute).toBe(ATTEST_LIMITS.floorPerMinute);
});

it("a call that cannot be sent in time gets busy at once; the others are sent within the wait", async () => {
  const queue = createAttestQueue();
  const { sentAt, send } = upstream();
  const results = Array.from({ length: 10 }, () => queue.run(send, never));
  // 6 at once, then one per 10 000 ms: call 7 fits in 20 s; 8 to 10 never would.
  await vi.advanceTimersByTimeAsync(0);
  expect(queue.stats().busy).toBe(3);
  await vi.advanceTimersByTimeAsync(21_000);
  const outcomes = await Promise.all(results);
  expect(outcomes.map((o) => (o === "busy" ? "busy" : "sent"))).toEqual([
    ...Array(7).fill("sent"),
    ...Array(3).fill("busy"),
  ]);
  expect(sentAt).toHaveLength(7);
  expect(Math.max(...sentAt)).toBeLessThan(20_000);
});

it("a client that leaves while waiting is removed without being sent", async () => {
  const queue = createAttestQueue({ ...ATTEST_LIMITS, burst: 1 });
  const { sentAt, send } = upstream();
  await queue.run(send, never);
  const leave = new AbortController();
  const waiting = queue.run(send, leave.signal);
  leave.abort(new Error("left"));
  await expect(waiting).rejects.toThrow("left");
  await vi.advanceTimersByTimeAsync(20_000);
  expect(sentAt).toHaveLength(1);
});
