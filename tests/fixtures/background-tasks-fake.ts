// A fake of the Auto-mode server routes (shared contract of 15 November 2026) for offline tests:
// unit tests put `handle` behind a stubbed fetch, browser tests behind page.route. It follows the
// contract, not Agent A's server; the real server is checked by its own tests.
import { nextDue, scheduledTaskSchema, type ScheduledTask } from "../../shared/scheduled-tasks";
import type { BackgroundResult } from "../../src/background-tasks-client";

export const FAKE_STATUS = { maxAutoTasks: 3, minIntervalHours: 24, consentVersion: "2026-11-15-draft" };

export function createBackgroundTasksFake() {
  const tasks = new Map<string, ScheduledTask>();
  const results: BackgroundResult[] = [];
  const acked: string[] = [];
  const requests: { method: string; path: string; body?: unknown; csrf?: string }[] = [];
  const consents: unknown[] = [];
  const attachments = new Map<string, string>();
  function handle(method: string, path: string, body?: unknown, csrf?: string): { status: number; json?: unknown } {
    requests.push({ method, path, body, csrf });
    if (csrf !== "SYNTHETIC") return { status: 403, json: { error: "Missing or invalid request token." } };
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
      if (!parsed.success || parsed.data.mode !== "auto") return { status: 400, json: { error: "Invalid background task." } };
      if (consent?.version !== FAKE_STATUS.consentVersion || !consent.acceptedAt)
        return { status: 400, json: { error: "Consent to background tasks is required." } };
      if (attachment && (!consent.sensitive || typeof attachment.text !== "string" || attachment.text.length > 30_000))
        return { status: 400, json: { error: "A task with a document needs the extra consent." } };
      // Agent A's server runs the identifier detector; the fake stands in with an email check.
      if (/\S+@\S+\.\w+/.test(`${parsed.data.name} ${parsed.data.instruction} ${attachment?.text ?? ""}`))
        return { status: 400, json: { error: "Remove identifiers such as email addresses first." } };
      if (tasks.size >= 3) return { status: 409, json: { error: "This account already has 3 background tasks." } };
      consents.push(consent);
      if (attachment?.text) attachments.set(parsed.data.id, attachment.text);
      const stored = { ...parsed.data, nextDueAt: nextDue(parsed.data.trigger, new Date()).toISOString() };
      tasks.set(stored.id, stored);
      return { status: 200, json: { task: stored } };
    }
    if (method === "PATCH" && id) {
      const old = tasks.get(decodeURIComponent(id));
      if (!old) return { status: 404, json: { error: "Background task not found." } };
      const { attachment, consent, ...patch } = (body ?? {}) as { attachment?: { text: string } | null; consent?: { sensitive?: boolean } };
      if (attachment && !consent?.sensitive) return { status: 400, json: { error: "A task with a document needs the extra consent." } };
      if (attachment === null) attachments.delete(old.id);
      else if (attachment) attachments.set(old.id, attachment.text);
      const next = { ...old, ...patch };
      tasks.set(next.id, next);
      return { status: 200, json: { task: next } };
    }
    if (method === "DELETE" && id) {
      const key = decodeURIComponent(id);
      if (!tasks.delete(key)) return { status: 404, json: { error: "Background task not found." } };
      for (let i = results.length - 1; i >= 0; i--) if (results[i].taskId === key) results.splice(i, 1);
      return { status: 204 };
    }
    if (method === "GET" && path === "/api/background-tasks/results") return { status: 200, json: { results } };
    const ack = /^\/api\/background-tasks\/results\/([^/]+)\/ack$/.exec(path)?.[1];
    if (method === "POST" && ack) {
      const index = results.findIndex((r) => r.id === decodeURIComponent(ack));
      if (index < 0) return { status: 404, json: { error: "Result not found." } };
      acked.push(results[index].id);
      results.splice(index, 1);
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
