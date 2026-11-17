# Privacy page: which features use which partner (DRAFT for the legal read, 17 November 2026)

Owner's correction, 17 November: one general notice at first start; everything else goes into the privacy policy and the Help page, written clearly; the privacy page must list honestly which features use a partner; nothing untrue ("everything is sealed", "nothing leaves your device") unless it is exactly true for that feature.

This is a draft section to add to the privacy policy (`shared/privacy-policy.ts`, EN and DE) after the lawyer has read it. **Not yet in the app.** The first-start notice (`docs/notices-inventory-20261117.md`) points here.

## Draft text (EN)

### How your data is processed, feature by feature

Most of CometRow runs on sealed, encrypted processing in the EU: your message is encrypted on your device and can be read only inside a checked secure server (confidential computing) operated for us by Privatemode (Edgeless Systems GmbH, Germany). Before a message leaves your device, email addresses, phone numbers, bank details and similar identifiers are replaced by placeholders, and the real values are put back on your device.

| Feature | Who processes it | What is sent | Kept by the partner |
| --- | --- | --- | --- |
| Chat, Thinking and Fast answers, files you attach as text, memories used in a question, projects' instructions | Privatemode, sealed processing in the EU | your masked message and the context you selected | short-term working memory, cleared within minutes to hours; time and token counts for up to 90 days |
| Ask about a picture | Privatemode, sealed, the Fast model | the picture (location and other hidden data removed on your device, areas you covered stay black) with your question, once | as chat; the picture is not stored by CometRow |
| Dictation and voice conversation | Privatemode, sealed, a speech model in the EU | the recording of what you say; numbers you say aloud are part of the recording (masking works on the text only) | as chat; CometRow keeps no recording |
| Photo to text, code runs, search within your chats, read aloud | your device only | nothing | nothing |
| Web search and deep research | Brave Search (Brave Software, partner) | only the search text you approved, with identifiers removed | under Brave's policy |
| Image creation (only when switched on) | {provider}, partner, {region} | only the description you typed, with identifiers masked; never your chats or photos | {retention as contracted}; not used for training, as contracted |
| Saved chats, files and memories (Secure, the default) | CometRow on Render (EU), encrypted; CometRow holds the key | your saved content, encrypted | until you delete it |
| Saved chats in Secure Max | CometRow on Render (EU), encrypted with a key only you hold | encrypted content we cannot read | until you delete it |
| Sign-in | CometRow; Google if you choose "Continue with Google"; email codes through {email provider} when switched on | your email address | under each provider's policy |

### What "sealed" means and what it does not
"Sealed" applies to the Privatemode rows above. Partner features (web search, image creation) are not sealed: the partner sees what is sent, which is why CometRow sends only the approved search text or the typed description, never your chats.

### Incognito and disappearing messages
They change what is kept on your device. They do not change what the secure server keeps for a short time or the request records we hold (time, model, counts).

## Draft text (DE)

To be translated after the English version is approved (the German legal texts follow `docs/legal-texts-de-20261113.md`).

## For the lawyer

1. Is this table plus the first-start notice enough information at the time of collection (GDPR Art. 13), or does any feature need a line in context (we think not: the browser asks for camera and microphone itself)?
2. Partners as processors: DPAs with Privatemode (in place), Brave (to check), the image provider (to sign), the email provider (when switched on).
3. Image creation: AI Act Art. 50 labelling of generated images (see `docs/image-creation-20261117.md`).
4. Wording of "sealed": precise enough, or add "confidential computing" in brackets?
