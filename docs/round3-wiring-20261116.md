# Round 3 wiring, 16 November 2026 (agent B8)

What the App.tsx owner wired in round 3, and why. Built and tested offline in Chromium at 375, 768 and 1280 px, in English and German. Nothing verified on real phones, Safari, Firefox or hosted.

## Keyboard shortcuts and Help

- The shortcuts of `docs/keyboard-shortcuts-20261116.md` work in the app. New chat keeps the section the user is in.
- "Keyboard shortcuts" is in the account menu and on the Help page. Help also links Getting started, the privacy policy and the imprint, shown in the app's document viewer.
- The sidebar's "Delete project" can delete the project's chats too (the project screen's choice).

## First use of Secure Max (FE-02)

Before: the first "Unlock Secure Max" opened a passphrase form that made a vault on this device only. There was no server copy and no recovery key until the user found "Turn on sync" in Settings. The explanation promised both.

Now: when this device has no vault yet (`Vault.mode()` is "none") and sync is not on here, the first unlock opens the existing sync set-up (device name, Remember this device, the recovery key shown once, its last group typed back). After it the section is unlocked and the focus is in it. Cancel goes back to the normal section and creates nothing.

Unchanged: an existing passphrase vault keeps its form; a device of an account that already has sync gets the approval screen; builds without Secure Max (no `inference.secureStore`, or sync without files) behave as before. Sync without Secure still sets up a passphrase vault first, as before.

## Search the web from the chat (FE-07)

Built here on 16 November: "+" > "Search the web" armed the next Send, which opened an in-chat approval card. Removed on 19 November 2026 (`docs/owner-decisions.md`): search is automatic, so there is no "+" item, no card and no approval. Identifiers are still masked on the device first.

## Smaller items

- Skip link (SS-23): "Skip to message box" / "Zum Eingabefeld springen" is the first thing Tab reaches. It shows on focus and goes to the message box from any tab.
- Footer (FE-19): "No advertising. No training on your data." / "Keine Werbung. Kein Training mit Ihren Daten." in every mode. The old evaluation lines are gone.
- An incognito chat's caption says "Incognito chat · Not saved" / "Inkognito-Chat · Nicht gespeichert". "Temporary chat" stays for a chat that is not saved because the vault is locked or Secure has not loaded: a different state. "Temporary research" is a different thing too and stays.
- Sidebar in Secure: "Search chats", "Saved to your account" (no "this device"), "No chats here yet.", and the incognito button's tooltip "Never saved". The memory note under an answer follows the chat's mode.
- The account page with Secure on: the intro and the account data export say that saved chats are kept with the account. Signing out a session and removing a sign-in method ask in the app's dialog. Removing a canvas does too.

## Not done

- `vaultNote_secure` on the usage page (`src/AccountUsagePage.tsx`): the file was outside this round's edit list. Wiring: an optional `storage` prop, `{storage === "secure" ? modeCopyText[lang].vaultNote_secure : t.vaultNote}`, and App passes `storage={secureOn ? "secure" : "local"}` to both `AccountUsage` uses.
- The set-up heading reads "Turn on sync" also when it sets up Secure Max. A Secure Max heading is a copy decision.
