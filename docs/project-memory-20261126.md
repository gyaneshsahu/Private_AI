# Memory per project (26 November 2026)

**Status:** built on the branch `feat/project-memory` (on top of `feat/projects-ux`). Behind a switch, off by default. Nothing deployed.

**Your request (26 November):** memory per project, like ChatGPT projects, as its own module behind an off-switch. Project memories stay inside that project.

## What it is

- **Every project has its own memory.** It is a section "Project memory" on the project's page: a field to add one, the list, Delete on each.
- **"Remember that …" in a chat of the project** saves into that project's memory. The line after saving says so: "Saved in the project “Hamburg”. It is used only there."
- **Where a project memory is used:** with questions in that project's chats, chosen by the same matching as general memories. The answer lists it under "Memory used", as before.
- **Where it is never used:** in chats outside the project, in another project, in incognito chats, in chats with memory switched off.
- **General memories** (Settings, Personalization) work as before and are also used inside projects.
- **Settings does not list project memories.** It says they are on the project's page. "Forget all" in Settings forgets the general ones only.
- **Deleting a project deletes its memories.** Moving a chat out of a project leaves the memories with the project.

## Decisions taken

1. **General memories still apply inside a project.** ChatGPT has a "project-only" setting that keeps them out; I did not build that second switch. Say if you want it.
2. **A project memory is an ordinary memory with the project's id on it.** No new store and no new sync: it is saved, encrypted and synced exactly like the others, and it counts towards the same limits (200 memories in all, 8 sent with one question).
3. **The same words can be saved in two projects,** not twice in one.
4. **No "always include" (pin) for project memories on the project page** in this version: fewer buttons, and the matching finds them.
5. **A project kept in Secure Max while you work in Secure** (or the other way round) shows "Project memory is available once your saved chats are open": memories live in one store at a time, as today.

## One thing to know before switching it on and off

A saved memory list that contains project memories can be read by any build that contains this branch, **also with the switch off** (then the project memories are simply not used). **A build without this branch cannot read such a list** and would show no memories at all until a build with it runs again. So once you have used it, do not go back to a build from before this branch.

## Switch

Render environment variable `VITE_PROJECT_MEMORY` = `1`, then redeploy. It needs `VITE_PROJECTS` and `VITE_MEMORY` as well.

## Tests

- `tests/project-memory.test.ts` (6): used in its own project and nowhere else; with the switch off, used nowhere; a pinned one does not reach other chats; the same words in two projects; "Forget all" and deleting a project; the saved format.
- `tests/project-memory-ui.test.ts` (4): a real browser at 375 and 1,280 pixels, English and German, light and dark: add a memory on the project page; the project's chat uses it and lists it under the answer; the same question in a chat outside the project does not.
- Not covered by a browser test: saving by "Remember that …" in a project chat, and the note in Settings. Both are in your owner tests (section 46).
