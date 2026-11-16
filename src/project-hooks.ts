// The app's held project list and files (docs/projects-20261114.md), moved out of
// src/ProjectPanel.tsx so the project screen loads only when opened (SS-13).
import { useEffect, useSyncExternalStore } from "react";
import { projectSpacesEnabled } from "./device-features";
import { heldProjects, holdProjects, watchProjects, type Project } from "./projects";
import type { Vault } from "./vault";

/**
 * Holds the app's project list for src/conversation.ts (instructions go with questions from what
 * is held). The app empties its list on lock, sign-out and account switch, so nothing stays held.
 */
export const useHeldProjects = () => useSyncExternalStore(watchProjects, heldProjects);
export function useProjectVault(projects: readonly Project[], vault: Vault | null, unlocked: boolean) {
  useEffect(() => {
    // Files of a project that is gone are dropped from the page too.
    const files = heldProjects().files;
    holdProjects({
      projects,
      files: Object.fromEntries(projects.flatMap((p) => (files[p.id] ? [[p.id, files[p.id]]] : []))),
    });
  }, [projects]);
  useEffect(() => {
    if (!unlocked || !vault || !projectSpacesEnabled()) return;
    // A vault that locked in between, or an unreadable record: no project file is held or sent.
    vault.readProjectFiles().then((files) => holdProjects({ files }), () => {});
    return () => holdProjects({ files: {} });
  }, [vault, unlocked]);
}
