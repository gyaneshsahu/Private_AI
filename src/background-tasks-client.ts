/**
 * The browser's side of Auto mode ("Background task", docs/background-tasks-20261115.md): typed
 * calls to the server routes of the shared contract of 15 November 2026. Only called while
 * /api/status has `backgroundTasks`; with the server's switch off nothing here runs. Every answer
 * is checked before use: the server is trusted with the task, not with the shape of its replies.
 */
import { z } from "zod";
import { scheduledTaskSchema, type ScheduledTask } from "../shared/scheduled-tasks";
import { uiLang } from "./text/core";
import { serverMessage } from "./server-messages";

export interface BackgroundConsent {
  version: string;
  acceptedAt: string;
  /** The extra consent for CV or health content was given. */
  sensitive: boolean;
}
/** One document's extracted text, identifiers masked on the device; at most 30,000 characters. */
export interface BackgroundAttachment {
  text: string;
}
export const ATTACHMENT_LIMIT = 30_000;
export type BackgroundPatch = Partial<
  Pick<ScheduledTask, "name" | "instruction" | "trigger" | "paused" | "answerMode" | "useSearch" | "searchText" | "notify">
> & {
  /** A new document (needs `consent`), or null to remove the stored one. */
  attachment?: BackgroundAttachment | null;
  consent?: BackgroundConsent;
};
/**
 * The fixed codes a skipped or failed run carries (docs/background-tasks-20261115.md, section 6),
 * and `no_new_results` on a done run that found nothing new. The interface translates them.
 */
export const BACKGROUND_REASONS = [
  "service_paused",
  "service_unavailable",
  "allowance_exhausted",
  "paused_allowance",
  "daily_limit",
  "service_limit",
  "daily_runs",
  "deployment_changed",
  "search_failed",
  "search_unavailable",
  "search_daily_limit",
  "no_new_results",
  "provider_refused",
  "provider_unavailable",
  "model_not_found",
  "timeout",
  "failed_unreadable",
] as const;
export type BackgroundReason = (typeof BACKGROUND_REASONS)[number];
export const backgroundResultSchema = z.object({
  // The saved conversation takes this id (src/background-results.ts); the server makes UUIDs.
  id: z.uuid(),
  taskId: z.string().min(1).max(100),
  ranAt: z.string().datetime(),
  status: z.enum(["done", "failed", "skipped"]),
  text: z.string().max(200_000).optional(),
  reason: z.string().max(500).optional(),
  usage: z.object({ promptTokens: z.number(), completionTokens: z.number() }).optional(),
});
export type BackgroundResult = z.infer<typeof backgroundResultSchema>;
const listSchema = z.object({
  tasks: z.array(scheduledTaskSchema),
  limits: z.object({ maxAutoTasks: z.number().int(), minIntervalHours: z.number() }),
});
const taskReply = z.object({ task: scheduledTaskSchema });
const resultsReply = z.object({ results: z.array(backgroundResultSchema) });

/** A refusal or failure, with the server's text in the interface language and the HTTP status. */
export class BackgroundTasksError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call(csrf: string, method: string, path: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: { "X-PrivateAI-CSRF": csrf, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  if (response.status === 204) return undefined;
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (data as { error?: unknown } | undefined)?.error;
    throw new BackgroundTasksError(
      typeof error === "string" ? serverMessage(error, uiLang()) : `HTTP ${response.status}`,
      response.status,
    );
  }
  return data;
}
const at = (id: string) => `/api/background-tasks/${encodeURIComponent(id)}`;

export const listBackgroundTasks = async (csrf: string, signal?: AbortSignal) =>
  listSchema.parse(await call(csrf, "GET", "/api/background-tasks", undefined, signal));
/** The server sets nextDueAt; the returned task is what the vault keeps. */
export const createBackgroundTask = async (
  csrf: string,
  task: ScheduledTask,
  consent: BackgroundConsent,
  attachment?: BackgroundAttachment,
) =>
  taskReply.parse(await call(csrf, "POST", "/api/background-tasks", { task, consent, ...(attachment ? { attachment } : {}) }))
    .task;
export const updateBackgroundTask = async (csrf: string, id: string, patch: BackgroundPatch) =>
  taskReply.parse(await call(csrf, "PATCH", at(id), patch)).task;
/** Deletes the server copy and every stored result of it. */
export const deleteBackgroundTask = async (csrf: string, id: string) => {
  await call(csrf, "DELETE", at(id));
};
export const listBackgroundResults = async (csrf: string, signal?: AbortSignal) =>
  resultsReply.parse(await call(csrf, "GET", "/api/background-tasks/results", undefined, signal)).results;
/** The result is saved in the vault: the server deletes it at once. */
export const ackBackgroundResult = async (csrf: string, id: string) => {
  await call(csrf, "POST", `/api/background-tasks/results/${encodeURIComponent(id)}/ack`);
};
