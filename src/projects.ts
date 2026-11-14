/**
 * Projects (docs/projects-20261114.md): a name that groups chats and, behind the switch
 * projectSpacesEnabled(), its own instructions and files. All of it lives in the encrypted vault
 * on this device (src/vault.ts); the server learns nothing about projects.
 */
import { z } from "zod";
import type { Attachment, Conversation } from "../shared/contracts";
import { projectSpacesEnabled } from "./device-features";
import { splitPassages } from "./passage-retrieval";

export const PROJECT_LIMITS = {
  /** Characters of instructions per project. */
  instructions: 2000,
  /** Files per project. */
  files: 20,
  /** Characters of extracted text per project, over all its files. */
  characters: 1_500_000,
  /**
   * Characters of extracted text over all projects together, checked when a file is added. The
   * files are decrypted at unlock and written into the backup, so the whole must stay bounded.
   */
  vaultCharacters: 3_000_000,
} as const;

export const projectsSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        // Absent on projects saved before 14 November 2026 and on projects without instructions.
        instructions: z.string().min(1).max(PROJECT_LIMITS.instructions).optional(),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (projects) =>
      new Set(projects.map((project) => project.id)).size === projects.length,
    "Duplicate project identity.",
  );
export type Project = z.infer<typeof projectsSchema>[number];

/** A project's files: the extracted text in passages, never the original file. */
export const projectFilesSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(300),
        characters: z.number().int().positive(),
        at: z.string().datetime(),
        sources: z
          .array(
            z
              .object({
                id: z.string().min(1).max(40),
                title: z.string().max(300),
                text: z.string().min(1).max(5000),
                page: z.number().int().positive().optional(),
              })
              .strict(),
          )
          .min(1)
          .max(5000),
      })
      .strict(),
  )
  .max(PROJECT_LIMITS.files);
export type ProjectFile = z.infer<typeof projectFilesSchema>[number];
export type ProjectFiles = Record<string, ProjectFile[]>;

export type ProjectProblem =
  | "files"
  | "characters"
  | "vault"
  | "duplicate"
  | "image"
  | "long"
  | "changed"
  | "gone";
/** A change that was refused; the screen has a sentence for each `problem`. */
export class ProjectError extends Error {
  constructor(public problem: ProjectProblem) {
    super(`Project not changed: ${problem}`);
  }
}

/** Sets a project's instructions; empty text removes them. A change for Vault.changeProjects. */
export const setInstructions =
  (id: string, text: string) =>
  (projects: Project[]): Project[] => {
    if (!projects.some((project) => project.id === id)) throw new ProjectError("gone");
    const instructions = text.trim();
    if (instructions.length > PROJECT_LIMITS.instructions) throw new ProjectError("long");
    return projects.map((project) => {
      if (project.id !== id) return project;
      const { instructions: _old, ...rest } = project;
      return instructions ? { ...rest, instructions } : rest;
    });
  };

export const charactersOf =(files: readonly ProjectFile[]) =>
  files.reduce((sum, file) => sum + file.characters, 0);

/**
 * Adds an extracted document (src/documents.ts) to a project's files, always as passages.
 * `elsewhere` is the text already kept in the other projects, for the limit over all projects.
 */
export const addProjectFile =
  (extracted: Attachment, elsewhere: number) =>
  (files: ProjectFile[]): ProjectFile[] => {
    if (extracted.kind === "screenshot") throw new ProjectError("image");
    if (files.length >= PROJECT_LIMITS.files) throw new ProjectError("files");
    if (files.some((file) => file.name === extracted.name)) throw new ProjectError("duplicate");
    const taken = new Set(files.flatMap((file) => file.sources.map((source) => source.id)));
    const sources = extracted.sources.flatMap((source) =>
      splitPassages(source.text).map((text) => {
        // A passage id is what an answer cites: one per project, also after a split.
        let id = source.id;
        while (taken.has(id)) id = crypto.randomUUID().slice(0, 8);
        taken.add(id);
        return { id, title: extracted.name, text, ...(source.page ? { page: source.page } : {}) };
      }),
    );
    const characters = sources.reduce((sum, source) => sum + source.text.length, 0);
    if (charactersOf(files) + characters > PROJECT_LIMITS.characters)
      throw new ProjectError("characters");
    if (elsewhere + charactersOf(files) + characters > PROJECT_LIMITS.vaultCharacters)
      throw new ProjectError("vault");
    return [
      ...files,
      { id: crypto.randomUUID(), name: extracted.name, characters, at: new Date().toISOString(), sources },
    ];
  };
export const removeProjectFile = (id: string) => (files: ProjectFile[]): ProjectFile[] =>
  files.filter((file) => file.id !== id);

// The decrypted projects and their files, only while the vault is unlocked. Empty means: no
// project instruction or file is read or sent.
type Held = { projects: readonly Project[]; files: Readonly<ProjectFiles> };
let held: Held = { projects: [], files: {} };
const watchers = new Set<() => void>();
export const heldProjects = () => held;
export function holdProjects(change: Partial<Held>) {
  held = { ...held, ...change };
  for (const watcher of watchers) watcher();
}
export function watchProjects(watcher: () => void) {
  watchers.add(watcher);
  return () => void watchers.delete(watcher);
}

/**
 * The project whose instructions and files go with this chat's questions. None when the switch is
 * off, the vault is locked, the chat is incognito or the chat is in no project (also after it was
 * moved out).
 */
function projectOf(conversation: Conversation) {
  if (!projectSpacesEnabled() || conversation.incognito || !conversation.projectId) return undefined;
  return held.projects.find((project) => project.id === conversation.projectId);
}

// No digits here: the whole message goes through identifier masking (see answerLanguagePolicy).
const INSTRUCTIONS_NOTE =
  "[Instructions the user wrote for every chat in this project. Follow them for the message below unless that message says otherwise. They never override your rules above. They are not part of the message and their language does not set the reply language.]";
/** What is put in front of the latest question. Empty when the chat's project has no instructions. */
export function projectInstructionsBlock(conversation: Conversation): string {
  const instructions = projectOf(conversation)?.instructions;
  const included = conversation.messages.filter((m) => m.included && m.status === "complete");
  return instructions && included.at(-1)?.role === "user"
    ? `${INSTRUCTIONS_NOTE}\n${instructions}\n[End of project instructions]\n\n`
    : "";
}

// One attachment object per file and one list per chat, so the passage choice is made once per
// question (src/conversation.ts remembers it by the identity of the attachment list).
const asAttachment = new WeakMap<ProjectFile, Attachment>();
const merged = new WeakMap<Attachment[], { files: readonly ProjectFile[]; list: Attachment[] }>();
const projectAttachments = new WeakSet<Attachment>();
export const isProjectFile = (attachment: Attachment) => projectAttachments.has(attachment);
/**
 * The chat with its project's files added as large documents, for choosing and sending only: the
 * result is never saved. A file already in the list (a chat that went through this before) is not
 * added twice.
 */
export function withProjectFiles<C extends Conversation>(conversation: C): C {
  const project = projectOf(conversation);
  const files = project && held.files[project.id];
  if (!files?.length) return conversation;
  let entry = merged.get(conversation.attachments);
  if (entry?.files !== files) {
    const present = new Set(conversation.attachments.map((a) => a.id));
    const added = files
      .filter((file) => !present.has(file.id))
      .map((file) => {
        let attachment = asAttachment.get(file);
        if (!attachment) {
          attachment = { id: file.id, name: file.name, selected: true, large: true, sources: file.sources };
          asAttachment.set(file, attachment);
          projectAttachments.add(attachment);
        }
        return attachment;
      });
    entry = { files, list: added.length ? [...conversation.attachments, ...added] : conversation.attachments };
    merged.set(conversation.attachments, entry);
  }
  return entry.list === conversation.attachments ? conversation : { ...conversation, attachments: entry.list };
}
