/**
 * Stage 3 of sync: project files as encrypted blobs (docs/vault-sync-20261115.md, "Stage 3:
 * project files"). The manifest below travels INSIDE the encrypted "projects" item; the server sees
 * only blob ids, sizes and times. This module holds the shapes and the view the project screen reads.
 */
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { projectsSchema, type Project } from "../projects";

/** One synced project file. `type` names the blob format: today the extracted text with its passages. */
export const fileEntrySchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    name: z.string().min(1).max(300),
    characters: z.number().int().positive(),
    at: z.string().datetime(),
    /** Bytes of the blob's plaintext; the ciphertext is 28 bytes more. */
    size: z.number().int().positive(),
    type: z.literal("extracted-text-v1"),
    blobId: z.string().uuid(),
    /** SHA-256 of the plaintext, base64. */
    hash: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  })
  .strict();
export type FileEntry = z.infer<typeof fileEntrySchema>;

/**
 * The "projects" item's data: the project list and the file manifest. The plain array is the
 * Stage 1 shape, read as a list without files (Stage 1 never ran in production; see the doc).
 */
export interface ProjectsData {
  projects: Project[];
  files: FileEntry[];
}
export const projectsDataSchema = z.union([
  projectsSchema.transform((projects): ProjectsData => ({ projects, files: [] })),
  z
    .object({
      projects: projectsSchema,
      files: z
        .array(fileEntrySchema)
        .max(2000)
        .refine((files) => new Set(files.map((f) => f.id)).size === files.length, "Duplicate file identity."),
    })
    .strict(),
]);

/** This device's own record, sealed in its sync database: what it knows of the manifest and what it still has to delete. */
export interface FileRecord {
  /** `here`: the file is in this device's vault (added here or downloaded). Otherwise "Not downloaded yet". */
  entries: (FileEntry & { here: boolean })[];
  /** Blob ids whose deletion on the server is still owed (retried at every sync). */
  deletes: string[];
}
export const fileRecordSchema = z
  .object({
    entries: z.array(fileEntrySchema.extend({ here: z.boolean() }).strict()),
    deletes: z.array(z.string().uuid()),
  })
  .strict();

export type FileState =
  | { state: "waiting" }
  | { state: "uploading" }
  | { state: "too-large" }
  | { state: "quota" }
  | { state: "downloading"; progress: number }
  | { state: "error"; reason: "offline" | "gone" | "damaged" | "server" | "full" };
export interface FilesView {
  /** Project files sync on this deployment (inference.vaultSync.blobs) and this device takes part. */
  enabled: boolean;
  quota?: { count: number; usedBytes: number; limitBytes: number; maxFileBytes: number };
  /** Files listed by another device and not downloaded here yet. */
  remote: FileEntry[];
  /** By file id: uploads waiting or refused, downloads running or failed. Absent: synced. */
  states: Record<string, FileState>;
}
export const FILES_OFF: FilesView = { enabled: false, remote: [], states: {} };

/** "ok", or why a download failed (the project screen says it). */
export type DownloadResult = "ok" | Extract<FileState, { state: "error" }>["reason"];

// The engine that serves the project screen (src/sync/engine.ts binds itself while attached). Kept
// here, not in src/sync/index.ts, so the project screen does not depend on the whole sync API.
interface FileActions {
  downloadFile(fileId: string): Promise<DownloadResult>;
  removeRemoteFile(fileId: string): Promise<void>;
  ensureProjectFiles(projectId: string): Promise<boolean>;
}
let actions: FileActions | undefined;
export const bindFileActions = (next?: FileActions) => void (actions = next);
/** Downloads a file another device listed (the project screen's Download button). */
export const downloadProjectFile = (fileId: string): Promise<DownloadResult> => actions?.downloadFile(fileId) ?? Promise.resolve("gone");
/** Removes a file another device listed and this device never downloaded; its blob goes after the next sync. */
export const removeSyncedProjectFile = (fileId: string) => actions?.removeRemoteFile(fileId) ?? Promise.resolve();
/**
 * Before a question in a project chat: downloads the project's files not downloaded here yet.
 * True when every file is here (at once without file sync); false: the question would go without some.
 */
export const ensureProjectFiles = (projectId: string) => actions?.ensureProjectFiles(projectId) ?? Promise.resolve(true);

let view = FILES_OFF;
const listeners = new Set<() => void>();
export function publishFiles(next: FilesView) {
  view = next;
  listeners.forEach((l) => l());
}
export function useSyncFiles(): FilesView {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => view,
  );
}
