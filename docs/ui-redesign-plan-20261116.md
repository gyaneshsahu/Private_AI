# UI redesign plan (started 16 November 2026)

Owner's brief, 16 November: the app looks cheap; the UI is where CometRow must stand out. Target: clean, calm, professional, on the level of ChatGPT, Claude and Gemini, with its own look. Reference pictures: `docs/ui-reference/` (owner's folder, not committed). Rules as always: no behaviour, privacy, legal-text or consent change without telling the owner; English and German; contrast, focus and keyboard; 375, 768 and 1280 px; tests green; no deploy; files staged by name; small commits.

**Status (17 November):** the look is chosen and step 1 (design system) is merged. Step 2 (chat screen and composer) is next.

Why the old look passed: the screen tours checked failed steps, overflow, untranslated labels and requests leaving the machine. Nobody judged how a screen looks. From now on every step ends with the agent opening the screenshots and comparing them with the references before the owner sees them.

## Final look, chosen by the owner on 17 November 2026

- **Colours:** light theme from option C (cool white, dark navy text, one blue accent that is also the main button); dark theme from option A (neutral graphite, white main button, pale blue for links). Values: `evaluation/ui-redesign/palettes.json` (entry F) and the token block at the top of `src/chat-design.css`.
- **Background:** an even, faded cosmic wash behind the whole workspace, never the sidebar (`--glow`); light is one smooth wash, dark is a faint glow. No glow or light line on the message box.
- **Sign-in and account pages:** a blended multi-colour cosmic glow that drifts slowly (`--cosmos`); full in light mode, faded in dark mode.
- **Live voice:** a round colour orb with slowly swirling colour (in the mock; not yet in the app). The planet and the flowing lines were tried and dropped.
- **Motion:** plain CSS, transform and opacity only, off under reduced motion. No motion library is installed; Framer Motion would need the owner to add it to `package.json`.
- **Applied to the app so far (step 1, merged):** tokens, one font, no purple or gradients, small Copy button, workspace wash, sign-in glow. **Not yet applied:** everything about layout from the mock (start screen, composer, "+" menu, phone sheet, answer cards and chart, settings, login layout, live voice orb, comet logo). That is step 2 onward in section 5.
- Mock and live preview: `evaluation/ui-redesign/mock.html`; `node evaluation/ui-redesign/render.mjs` writes the sheets to `.local/ui-redesign/final/`.

## 1. What makes the reference products feel professional (notes)

- **Almost no colour.** White or near-black base, greys for everything, one accent that appears in two or three places (send button, links, focus ring). CometRow today: purple on buttons, menu text, icons, outlines and gradients.
- **One font family, few sizes.** Body 15 to 16 px, small 12 to 13 px, one heading size per level; weight 400 to 650. CometRow today: sans, a serif italic in the greeting, uppercase letter-spaced eyebrow, monospace in several stacks.
- **Flat, quiet controls.** Icon buttons have no border and no background until hover. Rows are 36 px high with a 9 px radius. CometRow today: every control is a bordered white box with a shadow.
- **One composer.** A rounded box (radius 24) with the text on top and one row below: "+" on the left; mode, microphone and send on the right. Empty box shows the microphone, typed text shows a round send button. CometRow today: a large `select`, a wide "Send" button that is always there, and a context line inside the box.
- **Start screen:** one short greeting, the composer in the middle, two or three quiet suggestion chips. No eyebrow, no sub-text, no cards.
- **Answers:** plain text on the page, no bubble; the user's message is a soft bubble on the right. Code blocks have a thin header with the language on the left and a small "Copy" on the right. Tables are lines only.
- **Menus:** a white panel, radius 14, rows with a dark icon and a dark label, an optional grey hint on the same line.
- **Text on screen is rare.** One line under the composer at most. Explanations live in Help or behind an info icon.
- **Motion:** 120 to 200 ms, ease-out, opacity and a few pixels of movement. Nothing bounces.
- **Phone:** top bar with menu, title and new chat; the composer sits on the bottom edge with the safe area respected; touch targets of 44 px.

## 2. Design system (the spec every screen is rebuilt on)

Tokens live at the top of `src/chat-design.css` (light on `.chat-design`, dark on `.chat-design[data-theme="dark"]`). The current eleven tokens are replaced by these; no other colour may appear in the style files afterwards, except error red and the syntax colours listed here.

| Token | Use |
| --- | --- |
| `--bg` | page |
| `--sidebar` | sidebar and drawers |
| `--surface` | composer, menus, dialogs, cards |
| `--hover` | hover and selected rows, quiet buttons when pressed |
| `--ink` | text |
| `--ink2` | secondary text, icons |
| `--ink3` | placeholders, hints, captions (still 4.5:1 on its background) |
| `--line` | hairlines, 1 px |
| `--accent` | links, focus ring, selected marks, chart colour |
| `--primary`, `--primary-ink` | the one filled button per screen (send, continue) |
| `--bubble` | the user's message |
| `--code` | code blocks and inline code |
| `--danger` | errors and destructive actions |
| `--glow` | start screen only (option C); `none` otherwise |

Values for the three candidate palettes: `evaluation/ui-redesign/palettes.json`. Every pair used for text passes 4.5:1 and the primary button 3:1 against its surface, in both themes (`node evaluation/ui-redesign/render.mjs` prints the check).

- **Type:** one family, the system UI stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`); code in `ui-monospace, "SF Mono", Consolas, monospace`. Sizes: 12, 13, 14, 15.5 (body), 16 (input), 19 (h2 in answers), 22 (h1 in answers and page titles), 30 (greeting). Weights 400, 500, 620. Line height 1.7 for answers, 1.4 for controls. No serif, no italics for decoration, no uppercase labels. Open decision: a bundled font file (for example Inter) would make all devices look the same; it needs the owner's yes because it adds a file to download.
- **Spacing:** 4, 8, 12, 16, 20, 24, 32, 48.
- **Radii:** 7 (small buttons), 9 (rows, icon buttons), 12 (code blocks, cards), 14 (menus, dialogs), 24 (composer), 999 (chips, round send).
- **Shadows:** two only. Composer and menus: `0 1px 2px #0000000a, 0 8px 28px -12px #00000024`. Dialogs: the same, twice as deep. No shadow on buttons.
- **Icons:** the app's own inline SVG, 24 px grid, stroke 1.6, round caps, drawn at 18 px (16 px in action rows). No icon library (no new package). Icons are never blurred, scaled by transform or below 3:1.
- **Controls:** icon button 36 px (44 px touch area on phones), no border, hover `--hover`. Text button: same, with a label. Filled button: `--primary`, one per screen. Input: `--surface`, 1 px `--line`, radius 12, focus ring 2 px `--accent`.
- **Motion tokens:** `--fast: 120ms`, `--base: 180ms`, `--slow: 260ms`, easing `cubic-bezier(.2,.8,.2,1)`. Used for hover, press, menus (fade and 4 px rise), sidebar slide, new message (fade and 6 px rise), theme change (colours only). All switched off under `prefers-reduced-motion`.

The mock that shows this system on three screens: `evaluation/ui-redesign/mock.html`.

## 3. The owner's twelve points and what happens to each

| # | Point | Decision |
| --- | --- | --- |
| 1 | Everything purple | New tokens, palette chosen by the owner; all hard-coded purples and gradients removed. |
| 2 | Greeting stays behind the messages | Bug. The start screen is removed from the page as soon as the chat has one message. Step 2. |
| 3 | Composer | As in section 1: microphone when empty, send when typed; mode becomes a small text control; "+" menu rebuilt with dark icons and one line per entry. Step 2. |
| 4 | Phone chat | Designed first at 375 px: bottom-docked composer, safe areas, 44 px targets, keyboard does not cover the box. Step 4. |
| 5 | Too much text | Every explanatory sentence on a screen is listed, then cut to a short label, moved to Help or shown once as a first-use hint. The list goes to the owner before anything legal-looking is cut. Step 6. |
| 6 | Sensitive-data notices | Inventory first, each marked "legally required" or "our own caution". Required consent stays, once, one sentence, at the moment it matters. Changing the health-consent wording bumps its version and asks every user again, so that is an owner decision (decisions doc item 20). Step 6. |
| 7 | Answer rendering, huge Copy button, overlaps | Markdown styles as in the mock; small Copy in the code header; every overlap found in the tour screenshots fixed. Step 3. |
| 8 | Fonts | One family, one scale (section 2). Step 1. |
| 9 | Blurred or low-contrast elements | Icons redrawn on one grid at fixed sizes; opacity and filters removed. Step 1 and 2. |
| 10 | Motion | Motion tokens (section 2). Step 1 defines them, each screen step uses them. |
| 11 | Login | Logo, form, one line with terms and privacy links. Step 5. |
| 12 | Rich answers | See section 4. |

## 4. Rich answers: what is safe now and what needs a decision

The app's content rule today allows pictures only from the app itself (`img-src 'self' blob: data:`), and that is a privacy feature: an answer cannot make the browser call another site.

- **Safe now, no new cost:** better tables; code blocks; a chart card drawn in the browser from numbers in the answer or from a code run (bars, lines; SVG, no library); cards for the sources of a web search (title, site name, link) from data the app already has; pictures the user attached or that a code run produced.
- **Needs the owner's decision (privacy and cost):** pictures from the web and video thumbnails. The browser may not load them from other sites, so the server would have to fetch and pass them on. That is a new outgoing request path, a new cost and a new line in the privacy texts. Proposal: start with text-only link cards (title, site, a play mark for video links); decide on thumbnails later.
- **Never:** an embedded player from another site.

How the model produces a chart: it writes a small fenced block (for example a `chart` block with labels and values); the app draws it. If the block is malformed it is shown as a normal table. This costs a few output tokens only when used.

## 5. Order of work, and who may touch what

One branch for the redesign (`ui-redesign`), merged into `codex/development-handoff` only when the full tests and the screen tour pass and the agent has looked at the screenshots. Screenshots of each step: `.local/ui-redesign/step-N/`.

1. **Design system** (one agent, alone): tokens, type, radii, shadows, motion tokens, base controls, icon grid; removes hard-coded colours, the serif and the gradients. No layout change. Nobody else edits `src/chat-design.css` or `src/styles.css` until this is merged.
2. Then in parallel, each in its own files and its own section of the style files:
   - **Chat screen and composer:** start screen, greeting bug, composer, "+" menu, mode control, sidebar.
   - **Answer rendering:** markdown, code blocks, tables, action row, citations, chart card and source cards.
   - **Login, account and settings.**
   - **Upload flows:** file, photo, camera, picture question; the text inventory of points 5 and 6.
   - **Phone pass** runs after the chat screen, on the same files.
3. **Secure Max screens, errors, empty and loading states.**
4. **Integrator** (always the main agent): merges, opens every screenshot, runs unit tests, end-to-end tests and the tour, updates tests that depend on removed text, removes replaced styles.

To avoid collisions the style file is split after step 1 into one file per area (`src/styles/tokens.css`, `base.css`, `chat.css`, `answer.css`, `account.css`, `upload.css`), so parallel agents never edit the same file.

## 6. Open decisions for the owner

1. Palette: A, B or C (`.local/ui-redesign/step-1/option-A.png`, `-B`, `-C`).
2. A bundled font file, or the device's own system font (default: system font).
3. New greeting text. The mock uses "What's on your mind?"; today it is "Make room for what's on your mind." with an eyebrow and two more lines (default: the short one, German to match).
4. Web pictures and video thumbnails through the server (default: not now, text link cards).
5. Which notices may be shortened (list comes in step 6).
6. Whether the app must match the website's colours (the website is the owner's separate work).
