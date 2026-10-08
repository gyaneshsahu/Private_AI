# Conversation-first UI and device review

7 October 2026. Visual redesign awaits the founder's brief/reference images.
Working direction: chat is the main experience; documents and research attach to
the conversation; privacy status is clear and detailed controls appear when needed.
Use PrivateAI's own identity, readable answers and uncluttered desktop/mobile layouts.
No new navigation or visual style is finalized by this plan.

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
| Research consent | Prepare a synthetic public query, inspect exact proposed disclosure, cancel and verify draft survives | Until service rights/access are resolved, do not execute a live search or present fixture results as live |
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
