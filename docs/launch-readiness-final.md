# Launch readiness, final run (16 November 2026)

Status: work in progress. This file is the one list of what the launch-readiness run found and what is built. It is updated as fixes land. The owner's goal: only manual testing (real devices, hosted checks, legal, billing) left.

Method: ChatGPT is the reference (`.local/chatgpt-reference.md`, logged-out look plus recall). A local audit harness (`evaluation/audit-harness.ts`) toured every screen with every switch on and with every switch off, in English and German, at 375, 768 and 1280 px, with faked AI answers and no request beyond localhost (954 screenshots). Three read-only audits followed: chat core (CC), features (FE), settings, shell, accessibility and performance (SS). Duplicates are merged below under one ID.

Classes: **now** = built in this run; **later** = after launch, with reason; **skip** = not built, with reason; **owner** = needs an owner decision first.

## 1. Two groups that matter for the launch decision

**A. Affects production today (all switches off):** CSP blocked the math fonts; offline first send blanked the app; dead "Coming later" controls; token and dollar line under every chat; technical error texts; bare 404 and "Invalid request" for server failures; layout overflow on phone and tablet; sidebar sorting by creation date; outdated "evaluation" and "provider qualification" texts.

**B. Blocks switching Secure on (inference.secureStore):** FE-01 web search results thrown away by autosave; FE-02 first Secure Max unlock without sync and recovery key; FE-12 a file attached but not sent is stored as a chat; SS-01/SS-02/FE-04 texts that are false in Secure ("we never can", "only on this device"); SS-03/FE-03 no export and no delete-all for Secure content; SS-04 account deletion leaves Secure content until a manual purge.

## 2. Gap list

| ID | Finding | Class | Reason / note |
|---|---|---|---|
| H-1 | KaTeX fonts blocked by the CSP on every answer (data: fonts) | now | Fonts kept as files; CSP stays strict. Done (b2f18d3). |
| H-2 | Offline first send blanks the whole app | now | Retry boundary plus idle prefetch. Done (adec504). |
| H-3 | E-mail links showed "(mailto:…)" after the address | now | Done (d6a9cd7). |
| CC-01 | Streaming answer labelled "Incomplete", greyed actions, no sign of work | now | |
| CC-02 = FE-09 | Pasted or dropped picture goes to the text reader and fails | now | Same consent and send path as "+". |
| CC-03 = FE-15 | Dead "Coming later" controls in production | now | No half-working UI. |
| CC-04 | Token and dollar line shown to users | now | Development builds only. |
| CC-05 | Answer actions: 7 text buttons, about 330 px on phones | now | Icon row, Retry menu with cost text, More menu. |
| CC-06 | Technical error text in the chat, reason hidden | now | One plain sentence per failure kind, Retry beside it. |
| CC-07 | No in-place Rename and no Delete in the sidebar chat menu | now | Share link: skip (privacy rule). |
| CC-08 | Chats sorted by creation date, not last use | now | |
| CC-09 | No "< 2/2 >" version switcher per message | later | Branches are per conversation; data-model change. |
| CC-10 | Branch labels English in German | now | |
| CC-11 | 20-branch limit blocks Retry; no branch delete | later | Rare. |
| CC-12 = FE-11 | "1 messages · 1 files", label wraps on phones | now | |
| CC-13 | Two Stop buttons while streaming | now | |
| CC-14 | Partial answer cannot be copied | now | |
| CC-15 | Help says there is no automatic retry, there is one | now | |
| CC-16 | Title cut mid-word at 60 characters | now | AI titles: skip (a second paid request). |
| CC-17 | Mode picker without descriptions; Retry uses picker mode | later | |
| CC-18, CC-19, SS-19 | Phone header title wraps; targets under 44 px | now | |
| CC-20, CC-21 | "+" and header menus: styles, keyboard, pointless item | now | |
| CC-22 | Report a problem leaves the chat | later | |
| CC-23 | Copy code feedback; no syntax colours | now / later | Colours later (bundle size). |
| CC-24 | New chat during an answer stops it silently | now | Asks first. |
| CC-25 | Edit box does not grow | now | |
| CC-26 = SS-12 = FE-05 | Notices and "chat unavailable" off screen on phones | now | |
| CC-27 | Chat search titles only, no Ctrl+K dialog | later | Stays local. |
| CC-28..30 | Send name "Send ↑", starter-card arrows, logo "P" | now | |
| CC-31 | Coarse date groups | later | |
| SS-01 | "…and we never can" in Settings while Secure is on | now | Wording for the owner's legal read. |
| SS-02 = FE-04 | About 25 texts false in Secure (device-only) | now | Per-mode texts; draft for legal read. |
| SS-03 = FE-03 | No export and no delete-all for Secure content | now | Export built in the browser; GDPR Art. 15/20 confirmation by the lawyer. |
| SS-04 | Account deletion keeps Secure content; German users type English phrase | now / owner | Purge behind its own switch, off; retention period is the owner's. |
| SS-05, SS-15 | Settings: "Account & security" has no security; duplicates | now | Structure below. |
| SS-06 | Passkey sign-in and "sign out other sessions" lab-only | now | |
| SS-07, SS-09 | "Chat not available" and "provider qualification" texts shown always; developer text | now | |
| SS-08 | Help has no support contact; test-phase wording | now / owner | Support address needed. |
| SS-10 | Production 404 and 500 bare; no favicon | now | |
| SS-11 | Every server error answered as 400 "Invalid request." | now | |
| SS-13 | First-load JS 1.21 MB raw / 390 KB gzip | now | Lazy-load rarely used screens; measured before and after. |
| SS-14 | Session expiry redirects silently | now | |
| SS-16, FE-14 | Native confirm boxes | now | App's own dialog. |
| SS-17 | Tablet portrait: sidebar open, German composer spills | now | |
| SS-18, FE-13 | No account-wide custom instructions; no global memory switch | later | |
| SS-20 | /account heading sizes | now | |
| SS-21..23 | Favicon, `?developmentTools` for anyone, no skip link | now | |
| FE-01 | Search results thrown away in Secure and Secure Max | now | Blocks Secure. |
| FE-02 | First Secure Max unlock without sync and recovery key | now | Follows the owner's 15 and 16 Nov decisions; behind the existing switches. |
| FE-06 | Every web search counts toward the 5-file cap | now | |
| FE-07 | Search and deep research leave the chat | now | Existing in-composer approval card. |
| FE-08 | Projects: files and instructions hidden behind "···" | now | |
| FE-10 | Drops on the Conversation files page swallowed | now | |
| FE-12 | Attaching a file without sending stores a chat | now | |
| FE-17 | No alert when a scheduled task is due | later | Owner: Web Push later, no e-mail. |
| FE-18..20 | Mixed incognito names; stale footer; menu polish | now | |
| K-1 | Keyboard shortcuts (ChatGPT set) and shortcut help | now | |
| S-1 | "/" slash menu | skip | ChatGPT has none for normal users; "+" covers it. |
| S-2 | Shared links, thumbs stored on the server, automatic memory, AI titles, training toggle | skip | Privacy rules and cost rules. We never train: said in one sentence. |

## 3. Settings: target structure

Modal with tabs on the left, full screen on phones.
- General / Allgemein: theme, language.
- Personalization / Personalisierung: memory (custom instructions later).
- Data controls / Datenverwaltung: where your chats are saved, archived chats, export my chats, delete all chats, download account data, health and sensitive details.
- Security / Sicherheit: sign-in methods, passkeys, active sessions, sign out of other devices, sign out.
- Secure Max (when available): Open CometRow in Secure Max, devices and sync, reset.
- Account / Konto: e-mail, plan and usage, billing (when paid plans exist), delete account.
- Help moves to the account menu (getting started, report a problem, contact, privacy policy, terms, imprint).

## 4. Built and working, partly built, missing (filled at the end of the run)

## 5. Known risks (filled at the end of the run)

## 6. What only the owner can do (filled at the end of the run)
