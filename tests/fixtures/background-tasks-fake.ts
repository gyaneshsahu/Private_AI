// A fake of the Auto-mode server routes (shared contract of 15 November 2026) for offline tests:
// unit tests put `handle` behind a stubbed fetch, browser tests behind page.route. Since the
// end-to-end wiring test (tests/scheduled-wiring-browser.test.ts) it answers with the real
// server's status codes and refusal texts (server/background-tasks.ts, REFUSALS).
import { nextDue, scheduledTaskSchema, type ScheduledTask } from "../../shared/scheduled-tasks";
import type { BackgroundResult } from "../../src/background-tasks-client";
import { BACKGROUND_CONSENT_VERSION, REFUSALS } from "../../server/background-tasks";

export const FAKE_STATUS = { maxAutoTasks: 3, minIntervalHours: 24, consentVersion: BACKGROUND_CONSENT_VERSION };
const refuse = (refusal: { status: number; error: string }) => ({ status: refusal.status, json: { error: refusal.error } });

export function createBackgroundTasksFake() {
  const tasks = new Map<string, ScheduledTask>();
  const results: BackgroundResult[] = [];
  const acked: string[] = [];
  const requests: { method: string; path: string; body?: unknown; csrf?: string }[] = [];
  const consents: unknown[] = [];
  const attachments = new Map<string, string>();
  function handle(method: string, path: string, body?: unknown, csrf?: string): { status: number; json?: unknown } {
    requests.push({ method, path, body, csrf });
    if (csrf !== "SYNTHETIC") return { status: 403, json: { error: "Request authorization failed." } };
    const id = /^\/api\/background-tasks\/([^/]+)$/.exec(path)?.[1];
    if (method === "GET" && path === "/api/background-tasks")
      return { status: 200, json: { tasks: [...tasks.values()], limits: { maxAutoTasks: 3, minIntervalHours: 24 } } };
    if (method === "POST" && path === "/api/background-tasks") {
      const { task, consent, attachment } = (body ?? {}) as {
        task?: unknown;
        consent?: { version?: string; acceptedAt?: string; sensitive?: boolean };
        attachment?: { text?: string };
      };
      const parsed = scheduledTaskSchema.safeParse(task);
      if (!consent?.acceptedAt) return refuse(REFUSALS.consent);
      if (!parsed.success || parsed.data.mode !== "auto") return refuse(REFUSALS.invalid);
      if (attachment && (typeof attachment.text !== "string" || attachment.text.length > 30_000)) return refuse(REFUSALS.invalid);
      if (consent.version !== FAKE_STATUS.consentVersion) return refuse(REFUSALS.consentChanged);
      if (attachment && !consent.sensitive) return refuse(REFUSALS.sensitive);
      // The server runs the identifier detector; the fake stands in with an email check.
      if (/\S+@\S+\.\w+/.test(`${parsed.data.name} ${parsed.data.instruction} ${attachment?.text ?? ""}`))
        return refuse(REFUSALS.identifiers);
      if (tasks.has(parsed.data.id)) return refuse(REFUSALS.exists);
      if (tasks.size >= 3) return refuse(REFUSALS.full);
      consents.push(consent);
      if (attachment?.text) attachments.set(parsed.data.id, attachment.text);
      const stored = { ...parsed.data, nextDueAt: nextDue(parsed.data.trigger, new Date()).toISOString() };
      tasks.set(stored.id, stored);
      return { status: 200, json: { task: stored } };
    }
    if (method === "PATCH" && id) {
      const old = tasks.get(decodeURIComponent(id));
      if (!old) return refuse(REFUSALS.missing);
      const { attachment, consent, ...patch } = (body ?? {}) as { attachment?: { text: string } | null; consent?: { sensitive?: boolean } };
      if (attachment && !consent?.sensitive) return refuse(REFUSALS.sensitive);
      if (attachment === null) attachments.delete(old.id);
      else if (attachment) attachments.set(old.id, attachment.text);
      const next = { ...old, ...patch };
      tasks.set(next.id, next);
      return { status: 200, json: { task: next } };
    }
    if (method === "DELETE" && id) {
      const key = decodeURIComponent(id);
      // Like the server: 204 also for a task that is already gone.
      tasks.delete(key);
      for (let i = results.length - 1; i >= 0; i--) if (results[i].taskId === key) results.splice(i, 1);
      return { status: 204 };
    }
    if (method === "GET" && path === "/api/background-tasks/results") return { status: 200, json: { results } };
    const ack = /^\/api\/background-tasks\/results\/([^/]+)\/ack$/.exec(path)?.[1];
    if (method === "POST" && ack) {
      const index = results.findIndex((r) => r.id === decodeURIComponent(ack));
      // Like the server: 204 also for a result that is already gone.
      if (index >= 0) {
        acked.push(results[index].id);
        results.splice(index, 1);
      }
      return { status: 204 };
    }
    return { status: 404, json: { error: "Not found." } };
  }
  return { handle, tasks, results, acked, requests, consents, attachments };
}

/** A fetch that answers from the fake, for unit tests. */
export function fakeFetch(fake: ReturnType<typeof createBackgroundTasksFake>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const { status, json } = fake.handle(
      init?.method ?? "GET",
      String(input),
      init?.body ? JSON.parse(String(init.body)) : undefined,
      headers.get("X-PrivateAI-CSRF") ?? undefined,
    );
    return new Response(status === 204 ? null : JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}
