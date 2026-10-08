# Samsung Galaxy A52 TalkBack check — prepared 8 October 2026

## Five-minute check you can do now

On your Galaxy A52 / Android14, enable TalkBack using the setup below and open https://private-ai-deployment.onrender.com/auth in Chrome. Use synthetic text only. (1) Swipe through heading, fields and buttons; report any unnamed control. (2) Type then erase synthetic-test; verify the keyboard does not make the submit control unreachable. (3) Rotate landscape/portrait and increase text size; report clipping or lost focus. (4) Return PASS/FAIL/BLOCKED for each step with Chrome/TalkBack versions and exact spoken labels. No account registration, model call, real password or private screenshot is needed. This checks public entry only; it does not pass the full workspace/device gate. Full tasks below follow on the exact approved synthetic release.

Device reported by founder: SM-A525F, Android14. Results are **NOT RUN**.
Use Chrome and only synthetic content. Allow20 minutes. Do not send credentials,
passphrases, private files or screen recordings containing notifications.

## 1. Set up and record

Record Chrome version (Chrome menu > Settings > About Chrome), One UI version
(Settings > About phone > Software information), TalkBack version if displayed,
portrait/landscape, font/display size and test date. Do not record device identifiers.
Open Settings > Accessibility > TalkBack and enable it yourself. Review its tutorial.
Swipe right/left with one finger to move focus, double-tap to activate the focused
item, and use two fingers to scroll. If configured, holding both volume keys for
at least3 seconds toggles TalkBack; verify the exit method before the website test.
Samsung menu wording varies by installed version. Sources:
[Samsung TalkBack](https://www.samsung.com/us/support/answer/ANS10002553/),
[Google gestures](https://support.google.com/accessibility/android/answer/6151827?hl=en).

## 2. Public entry — available without opening private-data access

Open https://private-ai-deployment.onrender.com/auth in Chrome. With TalkBack on:

1. Swipe through the page. Record the heading, field names and button names exactly
   as spoken. Every input/button must have a meaningful name and sensible order.
2. Focus each password field: it must be identified as a password field. Do not
   enter or read aloud a real password. No unintended submission during navigation.
3. Open the keyboard in a text field, type `synthetic-test`, then erase it. Check
   the focused field and the submit control remain reachable by swipe and scrolling.
4. Hide the keyboard, rotate to landscape, then portrait. Focus should stay useful;
   no clipped or unreachable controls. Repeat using your preferred larger font size.
5. Do not register an account or guess credentials. If access is paused or you lack
   a dedicated synthetic invitation, mark the workspace steps BLOCKED and stop here.

Current hosted release is40f2e33, not the newer locally tested engineering release.
Record which release was tested. Do not call old-host results proof of newer code.
A founder-operated deployment/access decision and private delivery of synthetic
credentials are prerequisites for authenticated testing; this sheet grants neither.

## 3. Workspace — only after authorized synthetic access is available

Use one dedicated test identity and choose a test-only vault passphrase privately.
No model requests are required for these checks; chat remains privacy-gated.

| ID | Exact task | Expected result |
| --- | --- | --- |
| P1 | Swipe through Conversation, Context, Research and Saved navigation, activating each with double-tap | Clear names, selected location and page heading; no lost focus or trap |
| P2 | In Conversation message field enter `Draft: ask about the blue bicycle workshop.` Do not send. Switch Context then return | Draft preserved; field/editing state announced; keyboard does not hide essential controls |
| P3 | Open the help/privacy information, read it, close it | Meaningful dialog heading; focus enters dialog and returns to trigger; background controls not mixed into dialog reading |
| P4 | In Context use Add documents or screenshots; choose only a prepared `synthetic-invoice.txt` containing `Synthetic invoice: net EUR90, tax EUR18, total EUR108.` | Android picker usable; selected filename and extraction status announced; extracted text readable/editable; no implicit upload |
| P5 | Change EUR90 to EUR91 in extracted text, then navigate away/back | Edit preserved; correct source label read; source selection state understandable |
| P6 | Saved > Vault passphrase > Create or unlock vault, then Save encrypted snapshot | Password field named; success status announced once, without moving focus unexpectedly |
| P7 | Lock and clear workspace; reload; try a wrong test passphrase once, then correct one; open saved snapshot | Error announced and recoverable; original saved draft/source retained; no password recovery promise |
| P8 | Add `Unsaved synthetic change` without saving; invoke Lock and clear workspace, then cancel the warning | Warning readable; cancel keeps work; focus returns logically |
| P9 | Research: prepare `public opening hours for a fictional museum`; inspect disclosure, then cancel. Do not approve external execution | Exact proposed disclosure and cancellation accessible; no live search without supplier eligibility |
| P10 | Repeat P2/P3 in landscape with keyboard open and larger display/font settings | Essential controls reachable, readable, no horizontal clipping or trapped focus |

Live answer announcements, Stop, citations and recovery after an interrupted live
response remain BLOCKED until a separately authorized qualified test path exists.
Do not infer these from an empty chat or a canned fixture. Do not delete real data,
clear browser storage or change retention while testing.

## 4. Send results

Copy this format for each task; no secret values or private screenshots:

`Release: ___; Chrome: ___; One UI: ___; TalkBack: ___; date: ___`

`Task P__: PASS / FAIL / BLOCKED; exact spoken label/status: ___; steps: ___;
expected: ___; observed: ___; workaround needed: ___`

A FAIL includes missing names, unreachable controls, focus traps, unannounced errors,
repeated disruptive announcements, clipped controls or lost synthetic work. BLOCKED
means unavailable access/service, not a usability pass. Restore personal TalkBack,
font and rotation preferences yourself after testing.
