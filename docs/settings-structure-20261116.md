# Settings structure and first load (16 November 2026, agent B9)

Findings SS-05, SS-15 and SS-13 (`.local/findings-settings-shell.md`); target in `docs/launch-readiness-final.md` section 3. No switch: this reorganises existing behaviour.

## Settings

One modal, tabs on the left, full screen under 600 px. It opens only from the account menu (the conversation "..." menu no longer has it). Each tab has a real heading.

- General / Allgemein: theme (its label stays "Appearance"), language. The DE/EN switch left the app header at every width; the account page and sign-in page keep theirs.
- Personalization / Personalisierung: memory (only while memory is on).
- Data controls / Datenverwaltung: where chats are saved (one sentence per mode, plus the Secure Max line when offered), the privacy summary for the mode, Archived chats (while a chat list is open; switches the sidebar to Archived), Export my chats and Delete all chats (Secure), "History & data controls" (the device or Secure Max vault controls in Saved), Download account data (account page), health and sensitive details, "No advertising. No training on your data."
- Security / Sicherheit: Sign-in methods and Active sessions (account page sections), Sign out. The local-vault passphrase note shows only without Secure.
- Secure Max (lock icon, only when offered): Open CometRow in Secure Max, Devices and sync, Reset. Without Secure but with sync the tab keeps the name "Devices and sync".
- Account / Konto: e-mail, plan and usage, Delete account (account page section).

Help (account menu) now also holds Trial scope and safety and Your privacy boundaries; with Getting started, Privacy policy and Imprint they open over Help, never over Settings. Anything in Settings that leaves it (Saved, Archived chats, the account page, Sign out) closes Settings first. The content mounts on first opening and stays mounted, so a sync set-up in progress (a recovery key on screen) survives closing.

Account page links go to `/account#account-access`, `#account-sessions`, `#account-export`, `#account-delete`; the page moves the focus to that heading once it has rendered. Leaving the app asks first when there are unsaved changes, as "Manage account" does.

Other changes: in Secure the sidebar says "Loading your chats…" while the store opens, and "could not be loaded" if it fails (never "Unlock your local vault" or "Temporary session"); the plan page's vault note follows the mode; the Secure Max set-up heading is "Set up Secure Max" / "Secure Max einrichten"; the German skip link is "Zum Nachrichtenfeld springen"; the picture-declined note points to "Settings, Data controls".

## First load (SS-13)

Measured with `npx vite build` (Vite's own sizes; gzip as Vite prints it). First-load JS is the entry chunk plus the chunks it imports statically.

| | Entry chunk | First-load JS (entry + static imports) |
|---|---|---|
| Before (after the Settings change, same base) | 1,242.36 kB / 396.01 kB gzip | 1,266.25 kB / 402.73 kB gzip (3 files) |
| After | 869.43 kB / 273.72 kB gzip | 1,124.08 kB / 363.75 kB gzip (19 files) |

The lead's earlier figure (1,209.76 kB / 389.65 kB gzip) was measured on an older base. The first-load totals use gzip level 9, so they differ slightly from Vite's per-chunk gzip.

Loaded on demand through `lazyNamed` (src/LoadBoundary.tsx: `retryLazy`, `importFresh`, a LoadBoundary and Suspense; offline, a part never fetched shows the retry line): the Settings body, plan and usage, the Scheduled screen (moved to src/ScheduledScreen.tsx), the project screen (its hooks moved to src/project-hooks.ts), canvas, deep research (mounted when Research is first opened, then kept), live voice, the picture question and its note, photo capture, keyboard shortcuts, the device vault unlock, sync set-up and the sync screens. The Memory screen moved to src/MemorySettings.tsx and loads with Settings. The idle prefetch in src/main.tsx also fetches the Settings body.

Not split: the arithmetic checks and decimal.js (called inside the send path's state update, and imported by the message list and saved-chat code; not a clean change), all texts in both languages (about 267 kB of the entry), react-dom (207 kB), the sync engine and vault logic the app calls directly.

## Not changed (owner or legal)

- `shared/health-consent.ts` (draft consent, versioned) still says "Settings, Privacy & data" / "Einstellungen, Datenschutz & Daten". Proposed: "Settings, Data controls" / "Einstellungen, Datenverwaltung", with a version bump.
- Custom instructions, passkeys in Security, billing in Account: not built.

## Tests

`tests/settings-structure-ui.test.ts` (375, 768, 1280 px, English and German; Secure loading wording), `tests/account-pages-ui.test.ts` (section links), and the updated memory, health consent, Secure store, sync, i18n and composer UI tests. Playwright specs that open Settings from the conversation menu or the guides from Settings need the changes listed in the agent report.
