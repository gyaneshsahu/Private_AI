# Upload screens: proposed shorter texts (18 November 2026)

For the owner's decision. Nothing here is changed in the app yet. Point 5 of the UI brief asks for short labels instead of explanations; point 6 asks that legally required notices stay, shown once, in one short sentence, at the moment they matter.

Kinds:

- **Required:** a consent or a transparency notice the law expects (GDPR Art. 9 consent for health and other special data; Art. 13 information before processing). It stays. Only its wording can get shorter, after the legal read (decisions doc, T-155 and item 20). Changing the health consent wording bumps its version, so every user is asked again.
- **Our caution:** a reassurance or explanation we added ourselves. It can be cut or moved to Help without the legal read.
- **Instruction:** tells the user how to use the screen. Shorter is fine.

German versions follow once the English ones are approved.

## Photo to text (`src/text/photo.ts`, `photoUiText`)

| Key | Today | Proposal | Kind |
| --- | --- | --- | --- |
| `intro` | Reads printed text from a photo on this device, exactly like an attached PNG screenshot. Handwriting, objects and scenes are not understood. Nothing is uploaded. | Reads printed text. Stays on this device. | Our caution |
| `cameraHint` | Asks for camera permission only now. Rear camera preferred on phones. | (none) | Our caution |
| `chooseHint` | PNG or JPEG from this device, up to 10 MB. | PNG or JPEG, up to 10 MB | Instruction |
| `cameraNote` | The camera stays on only while this preview is open. Nothing is kept until you press Take photo. | (none; the preview itself shows the camera is on) | Our caution |

## Ask about a picture (`src/text/images.ts`, `imageText`)

| Key | Today (shortened here) | Proposal | Kind |
| --- | --- | --- | --- |
| `noteTitle` + `note1` to `note4` (first use only) | Four paragraphs: sent encrypted once to the protected model in the EU; hidden file data removed and the picture made smaller; you can cover parts, suggestions can miss things; not stored anywhere, gone after the answer. | One screen, three short lines: "Sent once, encrypted, to our protected AI in the EU." · "Location and other hidden data are removed first." · "Not stored. Gone after the answer." Link: "More in Privacy". | Required (Art. 13 transparency) |
| `pickIntro` | Take a photo or choose a picture from this device. You can turn and crop it here. In the next step you can cover parts of it before anything is sent. | Crop it, then cover anything private. | Instruction |
| `pickExtraction` | Only this cropped picture is used. Hidden data in the file, such as location, device and time, is not kept. Nothing has been sent yet. | Nothing sent yet. | Our caution (already said once in the first-use note) |
| `healthTitle` + `healthText` | Does this picture show health or other sensitive details? For example a medical letter, a prescription, a lab result, a skin or body photo, or something about religion, sexual life or ethnic origin. CometRow cannot tell what a picture shows, so it asks you. | "Does this picture show health or other sensitive details?" with one line: "For example a medical letter or a skin photo." | Required (Art. 9 consent); wording change needs the legal read and a version bump |
| `healthDeclined` | The picture was not attached, because you did not allow health or other sensitive details. Nothing was sent. You can change your choice in Settings, Data controls. | Not attached: sensitive details are off. Change in Settings. | Required (explains the refusal); short wording needs the legal read |
| `redactIntro` | Drag on the picture to draw a black box over anything private. The boxes become part of the picture: what is under them is not sent. | Drag to cover anything private. | Instruction |

## Live voice (`src/text/live-voice.ts`)

| Key | Today | Proposal | Kind |
| --- | --- | --- | --- |
| `what` | Turn by turn: you speak, CometRow turns it into text, sends it, reads the answer aloud, then listens again. One side speaks at a time. This is not a real-time voice model: to interrupt the answer, tap Interrupt and speak. | Speak, then listen. Tap Interrupt to cut in. | Instruction |
| `note` | Your recording goes encrypted to the protected speech model in the EU and is dropped once it is text. Numbers you say aloud, such as a bank or ID number, are part of the recording: masking works on the text only. The text is masked as usual before it goes to the chat. | Your voice is sent encrypted, turned into text in the EU and then dropped. Numbers you say are in the recording. | Required (Art. 13 transparency; the masking limit is a real risk to tell) |
| `cost` | Each turn uses about 2 units (Fast: speech to text plus the answer). A session stops after 15 turns or 15 minutes. | About 2 units a turn · up to 15 turns | Our caution |

## What the agent does now, without waiting

- Restyles these screens (spacing, type, buttons) with the texts unchanged.
- Shows the "Our caution" texts smaller and grey, so the screens read lighter until the decision.

## Decision asked

Approve the proposals per row (all, none, or name the rows). Rows marked Required wait for the legal read whatever you choose.
