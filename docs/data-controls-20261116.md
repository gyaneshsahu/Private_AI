# Data controls: export my chats, delete all chats (16 November 2026)

Status: component and server route built and tested offline; not wired into the app (src/App.tsx belongs to the lead).

## Export my chats

src/DataControls.tsx builds the file in the browser from the chats the app passes in (already decrypted on the device). No server reads content. Two formats: Markdown (readable, written messages only) and JSON (`format: "cometrow-chats"`, the saved chats as the app holds them). Incognito chats are never exported.

## Delete all chats

A ConfirmDialog first (focus on Cancel), then the `onDeleteAll` prop. Two ways to wire it:

1. Chats only, on every device: delete each Secure chat through the vault (`vault.delete(id)` writes a tombstone; the sync engine sends it, other devices remove the chat). Use `erasesEverything={false}`.
2. Everything in Secure: `DELETE /api/secure/items` (CSRF header, same session and origin checks as the other /api/secure routes, behind `inference.secureStore`). It deletes all items (chats, memories, projects, tasks) and files of the caller's account at once. The key and the change counter stay. There are no tombstones, so another device that is still signed in keeps its local copy until it signs out. After success, call `closeSecure(true, accountId)` then `openSecure(...)` on this device. Use `erasesEverything={true}`: the dialog then says so.

Recommendation: wire 1 for "Delete all chats"; keep 2 for a later "Erase all Secure data".

## Rules kept

Nothing leaves the browser for export. No server search or reading of content. English and German in src/text/data-controls.ts.
