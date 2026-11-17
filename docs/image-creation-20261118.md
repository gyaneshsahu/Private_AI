# Image creation (18 November 2026)

Owner's brief, 18 November: "Create image" behind a switch, off by default, in the new design. Only the user's description goes to the image provider (never chat history, never uploaded photos, no editing of user photos). The result shows in the chat with Download and Regenerate. Provider behind an interface; prices and model names as versioned configuration; key only on the server. Own daily allowance per plan; metered with the measured cost; clear messages when used up or refused. Provider moderation plus our own refusals (real people, minors). Generated images are stored with the conversation in the encrypted vault, never kept on the server beyond the request. No popup, no tag: the one first-start notice and the privacy page cover it (owner's correction of the same day). Tests with the provider mocked; no live call until the owner approves a key and a small spend.

Status (18 November): **built behind the switch and tested with the provider mocked** (`tests/image-creation.test.ts`: refusals, the route, the ledger, the Black Forest Labs adapter against a fake API, saving in the vault; `tests/redesign-ui.test.ts`: the "+" menu entry, dialog, refusal, card with Download and Regenerate, the answer button, at 375 and 1,280 px). Off by default. No provider account, no key, no live call.

## Provider choice

The owner allowed changing his first suggestion (FLUX by Black Forest Labs) if something fits better. What was checked on 18 November (public pages; to be confirmed in the contract):

| | Black Forest Labs API (FLUX) | Microsoft Foundry, FLUX.2 [pro], EU Data Zone | Google Vertex AI, Imagen 4 in an EU region |
| --- | --- | --- | --- |
| Company / place | Black Forest Labs, Freiburg (Germany); EU endpoint `api.eu.bfl.ai` | Microsoft; EU Data Zone deployments (e.g. Sweden Central, West Europe) | Google Cloud; EU regions (availability per model to confirm) |
| Training on our prompts and images | **Allowed by the standard terms**: the EU API Service Terms, section 2(b), grant BFL a perpetual licence to use Inputs and Outputs "to train and improve" its models; no opt-out in the API terms (the general website terms mention an opt-out by email). Enterprise terms reportedly differ | Microsoft's standard enterprise terms for Foundry models are not to use customer data for training (to confirm for this partner model) | Google Cloud's standard terms are not to use customer data for training (to confirm in the generative AI data-governance page) |
| DPA | not on the public API pages; reportedly on request (enterprise) | Microsoft Products and Services DPA (standard) | Google Cloud Data Processing Addendum (standard) |
| Retention | outputs through a time-limited URL; inputs not stated | to confirm | to confirm |
| Price per image (1 MP), public figures, to confirm | FLUX.2 [klein]: about USD 0.015; FLUX.2 [pro]: about USD 0.03 | FLUX.2 [pro]: about USD 0.03 for the first megapixel, EU Data Zone at a premium of 9 to 20 % | Imagen 4 Fast about USD 0.02; Standard about USD 0.04 |
| Moderation | provider filter (`safety_tolerance`) | Azure content safety | Google safety filters |
| Provenance | the usage policy forbids removing C2PA credentials or watermarks | C2PA on Azure image models (to confirm for FLUX) | SynthID watermark on Imagen |

**Recommendation:** start live with a provider whose standard contract excludes training and gives a standard DPA: **Microsoft Foundry FLUX.2 [pro] in the EU Data Zone** (the same FLUX quality the owner chose, under Microsoft's terms) or **Google Vertex Imagen 4 Fast in an EU region** (cheapest). Use Black Forest Labs directly only after BFL confirms in writing: no training on inputs and outputs, zero or short retention, processing in the EU, a DPA. The code has a provider interface; the first adapter is Black Forest Labs (as the owner asked) and a second adapter is a small piece of work (about half a day each).

## What is built

- **Switch:** the environment switch `PRIVATEAI_IMAGE_CREATION=1` plus `IMAGE_API_KEY` (and optionally `IMAGE_MODEL`, default `flux-2-klein`, and `IMAGE_DAILY`, default 3); absent = off. The browser shows "Create image" only when `/api/status` has `imageCreation`.
- **Provider interface** (`server/image-creation.ts`): `generate(prompt, signal) -> { bytes, type, model }`. Adapters: `bfl` (FLUX API, EU endpoint by default, submit and poll) and `mock` (tests). Prices per image are in the versioned price list in `shared/usage-weights.json` (version 2, `perImage` per model); the ledger's cost comes from there.
- **Route** `POST /api/images/create` (signed-in users, same request checks as chat): it receives only `{ prompt }` (at most 1,000 characters). It refuses before any provider call when the prompt is about a real, named person (a list of patterns plus a check for "photo of <Name Surname>"-style requests) or involves minors in any sexual or harmful way, and then applies the provider's moderation. It never stores the prompt or the image; the image is passed to the browser as data and the server keeps nothing.
- **Masking:** the browser applies CometRow's identifier masking to the description before sending. If it found personal details (an email, a phone number, an IBAN...), they are replaced by placeholders and a quiet line under the result says so. There is no popup.
- **Allowance:** own daily limit, one number for now (`IMAGE_DAILY`, default 3); limits per plan (proposal: free 3, Plus 10, Pro 30 a day) need the plan to be known at this route, a small follow-up once plans are live. Metered in the usage ledger as feature `image-create`, one record per attempt that reached the provider, priced from the price list. Clear messages: daily limit reached; spend cap or provider limit reached; prompt refused.
- **In the chat:** "Create image" in the "+" menu and a small "Create image" button under suitable answers (an answer that describes something visual and is short). The user types a description; the result appears as an image card in the conversation with Download and Regenerate. It is saved with the conversation in the encrypted vault like other content. The image keeps any provenance metadata the provider adds (the bytes are not re-encoded).
- **Notices:** none in the feature. A small neutral info icon next to the result opens the privacy page. The first-start notice names image creation as a partner feature when the switch is on.

## Cost

Per image at 1 megapixel (list prices, to confirm): USD 0.015 (FLUX.2 [klein]) to USD 0.03 (FLUX.2 [pro]); Imagen 4 Fast USD 0.02. With the proposed daily limits, the worst case per active user a month is 3 x 30 = 90 images (free, about EUR 1.25 to 2.50) and 30 x 30 = 900 (Pro, about EUR 12.50 to 25). Real use is expected far lower; the ledger records the measured cost of each image.

## Safety and the law (for the lawyer)

- Our refusals: real, named people; anything involving minors in a sexual, violent or harmful way; plus the provider's moderation. Refusals show one calm sentence and cost nothing.
- Acceptable-use draft: add "Do not use image creation to depict real people without their consent, to create sexual content involving anyone under 18 or any non-consensual intimate imagery, or to deceive."
- **EU AI Act, Article 50(2):** providers of systems that generate synthetic images must mark outputs in a machine-readable way; deployers of deepfakes must disclose. Question for the lawyer: does keeping the provider's C2PA or watermark satisfy our duty, or must CometRow add its own mark or a visible label?
- Privacy page: image creation must be listed as a partner feature (provider name, what is sent: only the description; where; retention; no training as contracted).

## What the owner must do before any live call

1. Choose the provider (recommendation above).
2. Open the account, accept its terms, sign the DPA, and get written confirmation of: no training on inputs and outputs; retention of prompts and images (ideally none beyond the request); processing location (EU); subprocessors; moderation and provenance behaviour.
3. Create an API key and store it in Windows Credential Manager (`IMAGE_API_KEY`), and in Render's secret files for the hosted app.
4. Approve a small test spend (proposal: up to EUR 2, about 60 to 100 images).
5. Ask the lawyer the AI Act labelling question and approve the privacy page and acceptable-use additions.

## Effort

Built today behind the switch with a mocked provider (about 1 day). Remaining: a second provider adapter (0.5 day each), the live test once a key exists (0.5 day), polishing the card and the "suitable answer" rule after real use (0.5 day).
