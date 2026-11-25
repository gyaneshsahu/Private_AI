# Projects and the chat menu (25 November 2026)

**Why:** the owner's note of 25 November: organising chats and projects did not feel professional. Moving a chat into a project, taking it out, starting a chat inside a project and the per-chat menu should work as in ChatGPT and Claude.

**Status:** built on the branch `feat/projects-ux` (on top of `fix/before-owner-test`). No new switch: it changes how existing screens look and work wherever Projects is on. Nothing deployed.

## What was there before (looked at on 25 November, with screenshots)

- A chat's "⋯" in the sidebar existed, with Rename, Pin, Archive, Delete. But it opened as a block pushed into the list, moving a chat to a project was a plain drop-down box inside it, there was no way to make a project from there, and nothing said "remove from this project".
- The open chat's own "⋯" (top right) could not organise the chat at all. Its entry "Rename, save & manage history" led to another page.
- Renaming the chat that is open did not change the title on screen until the chat was opened again.
- The project screen was a narrow dialog: instructions, then files, then the chats at the very bottom.
- A project's own "⋯" could not start a chat in the project.

## What it is now

**One chat menu, the same in three places** (a chat in the sidebar, a chat inside a project, the open chat's "⋯"):

| Entry | When | What it does |
| --- | --- | --- |
| Rename | always | In the sidebar and in a project: the row becomes a field (Enter saves, Esc cancels). In the open chat's menu: a small dialog with the name selected |
| Pin / Unpin | always | |
| Add to project | the chat is in no project | Opens the list of projects in place, with **New project…** at the end: type a name, Create, and the chat is in it |
| Move to another project | the chat is in a project and there is somewhere else to go | The same list; the current project is ticked |
| Remove from *project name* | the chat is in a project | Takes it out; the chat stays |
| Archive / Restore chat | always | |
| Delete | always | Asks first; red |

- The menu is a floating list under the "⋯", not a block in the list. The "⋯" shows on hover or keyboard focus on a computer and is always there on a phone. Escape closes it and returns to the "⋯". A menu that was closed opens fresh.
- **Under a chat's title, the project's name is a button** that opens the project.
- **The project screen** is a wide sheet (full screen on phones). The chats come first, each with the same "⋯". On a computer the chats are on the left and instructions and files on the right.
- **A project's own "⋯"** in the sidebar: New chat in this project, Open project, Rename, Delete.
- **Fixed on the way:** renaming the open chat now changes its title at once.

## Decisions taken

1. **The project list opens inside the menu** (an indented list) instead of flying out to the side as in ChatGPT. A fly-out needs room to the right, which a phone and a narrow sidebar do not have; one design for every screen size.
2. **"Manage history" left the chat row's menu.** It opened the Saved page, which is not about that one chat. It is still in the open chat's menu, now called "Manage saved history".
3. **The project screen stays a sheet over the chat**, not a page of its own as in ChatGPT and Claude. Everything a page would show is on it. A page needs a new main view in the app's layout, which touches every other screen; worth doing with the next larger redesign, not in an exam week.
4. **Secure and Secure Max stay apart:** a chat can only move to a project kept in the same place, as before. The menu lists only those projects.
5. **Incognito chats and chats not saved yet** have no organise entries (there is nothing saved to organise).

## Not built, with what it would take

- **Memory per project.** Today memory belongs to the account (or to Secure Max) and is used in every chat. A project already has its own instructions and files, which cover most of what "project memory" does in ChatGPT. Real per-project memory needs: a project field on each memory, a rule for which memories a project chat may use (only its own, or its own plus the general ones), the Memory screen filtered by project, and the same in sync. About two to three days with tests. An owner decision first: should a project chat still see the general memories?
- **Drag a chat onto a project.** Nice on a computer, no use on a phone; the menu does the same job.
- **Project chats listed under the project in the sidebar** (an opened folder). Today a click on the project shows its chats in the list below and opens the project.
- **Share a project.** Sharing is a later track.

## Tests

- `tests/chat-menu-ui.test.ts` (12): the three menus, New project from the menu, Remove from project, Rename in the dialog, the project name as a button, the project screen's order, Delete with its question, New chat from the project's menu. At 375 and 1,280 pixels, English and German.
- Updated for the new menu: `tests/projects-ui.test.ts`, `tests/saved-list-ui.test.ts`.

## Not verified

- A real phone (touch on the "⋯", the on-screen keyboard over "New project…").
- A very long project list (the list scrolls inside the menu after about five projects; not looked at with fifty).
