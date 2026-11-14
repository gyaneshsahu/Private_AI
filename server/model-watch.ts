// Daily check of Privatemode's model list (docs/model-deprecation-runbook.md). Edgeless gives
// about two weeks' deprecation notice without a guarantee, and an old model ID can route to a
// successor during that window (owner-reported, 13 November 2026). So the server reads the
// list once a day and logs an alert when a model of the report is gone, is marked deprecated,
// or its listed properties differ from the recorded baseline. One GET with the organisation's
// key: no user data, no prompt, no tokens. Nothing is switched automatically.
import { readFileSync } from "node:fs";
import { request } from "undici";
import { watchedModels, type Qualification } from "../shared/contracts";
import { serviceDispatcher } from "./network";
import { MODEL_ALERT } from "./providers/inference-relay";

const RUNBOOK = "See docs/model-deprecation-runbook.md.";
/** Written by `scripts/privatemode-models-check.ts --record`; in server/ because the image ships no docs/. */
export const BASELINE_FILE = new URL("./privatemode-models-baseline.json", import.meta.url);

type Entry = Record<string, unknown>;
export interface ModelBaseline {
  recordedAt: string | null;
  models: Record<string, Entry>;
}

// shortcut: only these two keys are treated as recomputed per request (as vLLM-style servers do);
// if the first live record shows other keys changing between two calls, add them here.
const VOLATILE = new Set(["created", "permission"]);

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );

/** The entries of an OpenAI-style model list, by ID. Throws on any other shape. */
export function listedModels(list: unknown): Map<string, Entry> {
  const data = (list as { data?: unknown } | undefined)?.data;
  if (!Array.isArray(data)) throw Error("unexpected model list shape");
  return new Map(
    data
      .filter((m): m is Entry => !!m && typeof m === "object" && typeof m.id === "string")
      .map((m) => [m.id as string, m]),
  );
}

/** One sentence per finding for the watched models; empty when all are listed and unchanged. */
export function modelAlerts(list: unknown, watched: Iterable<string>, baseline: ModelBaseline): string[] {
  const listed = listedModels(list);
  const alerts: string[] = [];
  for (const id of watched) {
    const now = listed.get(id);
    if (!now) {
      alerts.push(`${id} is no longer in Privatemode's model list. Requests for it will fail.`);
      continue;
    }
    // Top-level fields only: a deprecation-like key that is set, or any text that says "deprecated".
    const marked = Object.entries(now)
      .filter(
        ([key, v]) =>
          (/deprecat|sunset|retire/i.test(key) && v !== false && v != null && v !== "") ||
          (typeof v === "string" && /deprecat/i.test(v)),
      )
      .map(([key]) => key);
    if (marked.length) alerts.push(`${id} is marked deprecated in Privatemode's model list (${marked.join(", ")}).`);
    const before = baseline.models[id];
    if (!before) {
      alerts.push(
        `no baseline is recorded for ${id}, so a change of its listed properties cannot be detected. Run scripts/privatemode-models-check.ts --record.`,
      );
      continue;
    }
    const changed = [...new Set([...Object.keys(before), ...Object.keys(now)])]
      .filter((key) => !VOLATILE.has(key) && stable(before[key]) !== stable(now[key]))
      .sort();
    if (changed.length)
      alerts.push(
        `${id} changed in Privatemode's model list since the baseline of ${baseline.recordedAt} (${changed.join(", ")}). The ID may now serve another model.`,
      );
  }
  return alerts;
}

/** One check: alerts, or one line saying all is unchanged. A check that could not run is itself an alert. */
export async function runModelCheck(
  fetchList: () => Promise<unknown>,
  watched: readonly string[],
  baseline: () => ModelBaseline,
  log: (line: string) => void,
): Promise<void> {
  try {
    const recorded = baseline();
    const alerts = modelAlerts(await fetchList(), watched, recorded);
    if (alerts.length) for (const alert of alerts) log(`${MODEL_ALERT} ${alert} ${RUNBOOK}`);
    else log(`CometRow model check: ${watched.join(", ")} listed and unchanged since the baseline of ${recorded.recordedAt}.`);
  } catch (error) {
    // The reason is a status or a transport error name; request headers are never part of it.
    log(
      `${MODEL_ALERT} the daily model list check failed (${error instanceof Error ? error.message : "unknown reason"}). The models were not checked. ${RUNBOOK}`,
    );
  }
}

/** Plain HTTPS GET /v1/models with the key. The SDK documents the reply as unencrypted; not yet confirmed live (runbook). */
export function privatemodeModelList(origin: string, apiKey: string) {
  return async (): Promise<unknown> => {
    const reply = await request(new URL("/v1/models", origin), {
      dispatcher: serviceDispatcher,
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (reply.statusCode !== 200) {
      await reply.body.dump().catch(() => {});
      throw Error(`HTTP ${reply.statusCode}`);
    }
    return reply.body.json();
  };
}

export const recordedBaseline = (): ModelBaseline => JSON.parse(readFileSync(BASELINE_FILE, "utf8"));

/** Checks now and every 24 hours while the report names Privatemode; returns the stop function. */
export function scheduleModelCheck(
  qualification: unknown,
  apiKey: string,
  log: (line: string) => void,
  fetchList?: () => Promise<unknown>,
  baseline: () => ModelBaseline = recordedBaseline,
): () => void {
  const q = qualification as Qualification | undefined;
  if (q?.provider !== "privatemode") return () => {};
  let watched: string[];
  try {
    watched = [...watchedModels(q)];
    fetchList ??= privatemodeModelList(q.origin, apiKey);
  } catch {
    log(`${MODEL_ALERT} the daily model list check cannot start: the report's models or origin are unreadable. ${RUNBOOK}`);
    return () => {};
  }
  const run = () => void runModelCheck(fetchList!, watched, baseline, log);
  run();
  const timer = setInterval(run, 86_400_000);
  timer.unref();
  return () => clearInterval(timer);
}
