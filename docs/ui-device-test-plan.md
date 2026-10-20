# Conversation-first UI and device review

## Structural revision — 20 October, owner rejected first design

Owner assessment is a design rejection, not approval to propagate. Retain readable answers and neutral/charcoal themes; revise navigation, history, composer and information hierarchy. Muted violet replaces terracotta. Brand monogram remains a placeholder pending identity approval. Representative journey is local/synthetic; unavailable private inference remains explicit.

### Functional UI map (checked against current repository)

| Area | Existing working implementation | Representative placement / remaining status |
| --- | --- | --- |
| History | ConversationLibrary, findConversations; encrypted Vault snapshots, search across titles/messages/drafts/files/branches | Search + saved conversations directly in sidebar; locked-state explanation. No title/search index persisted outside vault. Save remains explicit; no cloud sync. |
| Rename/delete | Saved screen title editing and explicit encrypted save; snapshot deletion | Conversation actions opens existing manager. Pin/archive are **needs implementation**, not synonymous with branch archives; no fake pinned group. |
| Navigation | Existing App tabs and account/support routes | Collapsible desktop sidebar; native modal mobile drawer with Escape/focus containment; account/help at bottom. Context/files/research from conversation tools. |
| Conversation | Markdown/code/tables/citations, edit creates preserved branch, manual retry, stop, partial excluded | Compact Edit/Copy; included-context dialog replaces repeated checkboxes. Sources-change explanations expandable. |
| Composer | Draft, file input, import results, selected context measurement | Sticky expandable composer with tools, selected context count and send/stop. Errors preserve draft; retries remain explicit and gated. |
| Documents/sources | Local import/extraction/correction/selection; captured-source dialog | Tools opens existing files page; citations open original source dialog. Source changes remain visible and are not silently substituted. |
| Settings/privacy | Vault/passphrase/backup controls, privacy explanations | Appearance in Settings, stored locally as non-sensitive preference; System responds to OS. Context/limits available on demand; privacy gate summary always visible. |
| Accounts/usage/help | AccountUsage, SupportPanel and dedicated auth/account routes | Existing controls reachable; production providers and commercial activation remain gated. Dedicated routes await design approval before restyle. |
| Research | Explicit query/URL approval, temporary search answers, source review | Existing Research page from tools. No automatic retrieval, saving, cache/export changes or new supplier rights assumed. |

### Scope decisions proposed for launch review

Projects: deferred from this representative UI; not implemented. Proposed organization-only collections must never imply automatic model context. Custom instructions: not a launch commitment until storage, scope and injection tests are specified. Scheduling and cross-conversation memory: proposed deferral; no background execution, plaintext access or indefinite memory claim. Voice/general vision/image creation/editing: keep existing ROADMAP M4 assessment and dependencies; no fake buttons. Deep research/autonomous browsing: proposed deferral; current explicit retrieval remains. Public sharing: separate owner privacy/product decision, preview/revocation required before implementation. Marketplace/profiles/streaks/pets/account switching/site builders/design integrations: not in launch proposal absent a concrete need. These are recorded proposals, not new owner-approved removals from the product goal. Provisional DeepSeek-low is a development default; no Auto routing claim.

### Review and device evidence

Capture desktop light/dark with sidebar open/collapsed; mobile drawer open/closed; tools, sources and incomplete reply. Exercise search/reopen → attach synthetic document → inspect original sources → edit/cancel/branch → explicit retry unavailable while gated → account/settings → theme reload. Verify composer remains in viewport during actual transcript scroll and reduced-height simulation. Real Galaxy A52 keyboard/TalkBack remains unverified; previous auth-only pass is not inherited. Broader styling rollout remains blocked on owner visual approval. Completed capture/QA evidence and limitations are recorded in READINESS under “Representative chat structure revised”; gallery `.local/ui-structure-20261020/index.html`.


## Superseded first visual candidate — 20 October, not approved

Implemented reference-led chat appearance in src/chat-design.css and App: warm neutrals, charcoal dark theme, terracotta controls, restrained CSS clay monogram, light/dark/system session theme, conversation title/count and Jump to latest. Existing brand identity retained; no ChatGPT logo or fake voice feature. No external font/CDN/analytics or theme persistence. Shared tokens are scoped to the workspace; dedicated account/sign-in routes have not been restyled. Full product propagation awaits owner design approval.

Actual built-browser screenshots reviewed in light/dark at1440px and390px: `.local/ui-review-20261020/index.html`. Corrected early lazy-render capture, inherited serif headings, low-contrast banner colour, source-dialog colour, narrow table wrapping and captures during theme transitions. Final table/code remain horizontally scrollable inside their regions, not the page. Layout uses current navigation and Saved history; mobile drawer/recent-chat sidebar and syntax colouring remain design follow-ups, not falsely implemented.

Validation: build/typecheck pass;13distinct built-browser tests across visual chat, branches, attachments, drafts, encrypted history and account navigation pass. Final representative test additionally covers30messages, reduced-height keyboard simulation,200%root text, source open/Escape, disabled incomplete Copy/Send, system theme changes and focus return.21existing reply-stream/cancellation, async race and citation regressions pass. Synthetic restored messages are fixtures, not new model outputs. Real Galaxy A52 keyboard/TalkBack, visual streaming on a qualified live service and full product visual consistency remain unverified. Privacy/quality/launch gates unchanged, no paid requests or deployment.

Next: owner approves or revises the representative design, then apply reviewed components/tokens throughout product and verify affected workflows. No approval inferred from screenshots being supplied.


## Focused visual batch — 20 October

AUDIT_STARTED / AWAITING_OWNER_REFERENCE: owner will attach screenshots next message. Do not finalize visual changes before that reference arrives.

Current audit: styles.css hard-codes light colours; no dark palette/theme selector exists. Inter is named but not bundled, so system fallback may render. Chat, account preview and production accounts need shared semantic colour/typography tokens.

Planned scope: chat-first conversation layout and history; reachable mobile composer; source/document panels; sign-in and gated/locked/error/privacy states; light/dark/system themes, restrained clay accents, working icons, hover/focus transitions and reduced motion. Preserve exact evidence, source-change warnings, incomplete-answer labeling, keyboard focus and accessible names. No fake microphone/voice controls or provider activation. No new font CDN or tracking.

Deliverable after reference review: the same synthetic workflow at desktop and390px in both themes, including long answers, history, composer, sources/documents and sign-in/privacy states. Verify contrast, overflow, keyboard focus and reduced motion. Actual Galaxy A52/TalkBack remains separate human evidence.


## Next Galaxy A52 / TalkBack session (prepared; not yet run)

Use the updated candidate only when an operator provides a reachable reviewed test build. The current hosted auth page is not evidence for these workspace changes. Use synthetic text only. Earlier auth-page checks remain passed; this full workspace session remains BLOCKED pending access.

1. With TalkBack and keyboard open, type a synthetic draft, attach a small synthetic text file, review/correct it and return to Conversation. Confirm the draft survives and controls remain reachable.
2. On an operator-prepared synthetic conversation, navigate the named message articles. Open “Edit into a new branch”: focus must enter Edited message. Cancel: focus must return to the initiating Edit button. Create a branch: focus must return to Message PrivateAI; original conversation remains available.
3. Rotate and enable larger text/reduced motion. Repeat editing, inspect a long answer/table and open/close a source. Report clipping, focus loss or disruptive scrolling. Incomplete fixture answers must remain labelled incomplete, with Copy disabled.
4. Save an encrypted synthetic snapshot, lock, unlock and reopen. Confirm draft/document changes; sign out. Never use a real password as the test vault passphrase.

Report PASS/FAIL/BLOCKED per step, Android/Chrome/TalkBack versions and concise reproduction. Desktop mobile emulation does not substitute for this session. Inference and real safety quality remain separate tests; Send stays gated.


7 October 2026. Visual redesign awaits the founder's brief/reference images.
Working direction: chat is the main experience; documents and research attach to
the conversation; privacy status is clear and detailed controls appear when needed.
Use PrivateAI's own identity, readable answers and uncluttered desktop/mobile layouts.
No new navigation or visual style is finalized by this plan.

## Galaxy A52 / TalkBack: next short workspace check

Auth-page controls, keyboard-open reachability and rotation/larger text already passed human review. Do not repeat those checks. On the next owner-authorized synthetic workspace release, record release SHA, Chrome version and TalkBack version, then spend about five minutes on these remaining tasks:

1. With TalkBack, navigate Conversation, Context, Research and Saved; each selected tab and button must have a useful name and focus must remain visible.
2. Type an unsent fictional question with the keyboard open; switch tabs and return. The draft must survive and Send must remain reachable. Do not send private data.
3. Import `Synthetic invoice: net EUR 90, tax EUR 18, total EUR 108.` as a text file. Open/close its source dialog. TalkBack focus must stay inside the dialog and return to its triggering control on close.
4. Prepare a public search query, review the disclosure, then cancel. Verify no search is sent and the query remains editable. On an explicitly enabled temporary-search release, inspect a source link and verify saving remains unavailable after removing the source. User-initiated Copy answer is allowed.
5. In a separate non-research synthetic conversation, save with a test-only passphrase, lock, reload, try one wrong passphrase, then unlock. Never report the passphrase. Confirm the original text and source are recovered.

Report PASS/FAIL/BLOCKED for each number, with one reproduction sentence for a failure. Current production inference remains gated; mark unavailable tasks BLOCKED. Actual answer streaming/Stop/citation announcements must be checked on the chosen permitted release later. No new invitation, hosting change, private-data permission or retention activation is implied by this plan.

## Prepared synthetic review

Use a fresh browser profile and synthetic files only. Hosted access is currently
paused; operator-issued synthetic invitations and controlled resume are prerequisites
for an authenticated hosted session. Do not reuse revoked lifecycle-test accounts.
The hosted entry is `https://private-ai-deployment.onrender.com/auth`.

Run each task on Windows Chrome or Edge and at least one actual phone (record OS,
browser/version, viewport, release SHA and outcome). Desktop mobile emulation is
useful engineering evidence, not a substitute for a phone's keyboard/file picker.

| Task | Synthetic material and expected result | Evidence boundary |
| --- | --- | --- |
| Enter and navigate | Sign in with an individual synthetic invitation; find chat, history and document/research controls using keyboard or touch | Existing hosted access tests passed; human discoverability remains untested |
| Draft and revise | Type a fictional landlord message, revise an unsent draft, switch conversation and return | Exercise actual draft controls; production inference remains blocked by Q1 |
| Document workspace | Import a locally created text file: “Synthetic invoice: net EUR 90, tax EUR 18, total EUR 108.” Inspect/edit extracted text and remove attachment | Use PDF/screenshot variants only when prepared from this same synthetic text; no personal files |
| Save and recover | Save an encrypted snapshot, lock, reload, try a wrong passphrase, unlock, verify draft/source, then test the unsaved-change warning | User chooses a test-only passphrase; never record it. Registry recovery cannot recover this vault |
| Read an answer | Inspect long text, table and citation in the existing local browser fixtures; keyboard focus and horizontal overflow remain usable | Fixtures must be labelled; they do not establish live answer quality or hosted inference |
| Research consent | Prepare a synthetic public query, inspect exact proposed disclosure, cancel and verify draft survives | Live public retrieval is allowed only on the explicitly enabled temporary-search evaluation; never present fixtures as live or persist search-derived history |
| Account boundary | Use two synthetic identities; sign out/in and verify the other's encrypted workspace is not exposed; check old tab after revocation | Operator-assisted task, not a request for users to share passwords |
| Phone ergonomics | Compose with the keyboard open, attach synthetic file, inspect source/citation, close dialogs and rotate | No hidden Send button, trapped focus, clipped controls or unreadable answer text |

First human session: 10–15 minutes on the draft/document/save tasks. Mark unavailable
tasks BLOCKED rather than simulate a passing hosted result. Finish real live chat,
research and interruption tasks on the qualified release later, before invitations.
Capture task-level pass/fail, confusing labels and reproduction steps; screenshots
must contain only synthetic content. Avoid recording credentials, account identifiers
or background browser tabs. User observation and safety review are distinct evidence.

## Brief requested before visual implementation

Provide reference images plus what to keep or avoid; preferred light/dark treatment,
colors and density; desired chat/history navigation on desktop and phone; placement
of attachments/research; and the actual phones/browsers available for testing.
Describe the main first-use flow and any must-have controls. Explicitly distinguish
new capabilities from presentation changes so design does not silently expand scope.
