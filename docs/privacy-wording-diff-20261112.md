# Privacy statement wording: proposed corrections for owner approval — 12 November 2026

Branch `privacy-wording-20261112`, not merged. Source: `docs/copy-audit-20261112.md`, Table 2, rows P1 to P5. Every sentence below is in the approved statement `shared/privacy-copy.ts`; the website copy `docs/privacy-copy-20261022.md` and the in-app policy `docs/privacy-policy-20261022.md` were regenerated from it with `node --import tsx scripts/privacy-copy.ts`. Nothing else in the statement changed. Rows P6 to P11 are not touched.

## P1: settings panel summary (`PRIVACY_SUMMARY`, Settings, Privacy & data)

**Before:** "ID, bank and contact details stay on your device; everything else is sealed so only one checked secure server can read it, and we never can."

**After:** "Recognised ID numbers, bank details, phone numbers and email addresses are replaced on your device before sending; some can be missed, and names, addresses and health details are not replaced. The rest is sealed so only the secure server can open it, and your browser checks that server only in part. We cannot read your chat messages or answers, but web searches and pages you approve pass through our server in readable form."

**Why:** masking is pattern-based and misses some (97.8% typed German, 87.3% scans), names, addresses and health details are never replaced, the browser check is partial, and approved search text and page addresses are readable on our server.

## P2: "What we can see"

**Before:** "We never see what you asked or what was answered."

**After:** "We cannot read what you asked in chat or what was answered. Web searches and pages you approve are different: they pass through our server in readable form."

**Why:** approved search text goes from our server to the search provider (Brave, USA), and approved page addresses are fetched by our server (`server/research.ts`), both in readable form.

**Before:** "There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we only ever know that your account asked, never what."

**After:** "There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we always know which account asked."

**Why:** "never what" is false for approved searches; the sentence before now says what we cannot read.

## P3: "What we cannot promise yet"

**Before:** "Private chat is switched on only after our checks of the secure server pass."

**After:** "Private chat is switched on only after our checks of the secure server pass, or after we accept a known gap in writing for a limited release; the connection notice then names each accepted gap."

**Why:** a check may be "accepted-by-owner" with a dated written reason instead of passed (`shared/contracts.ts`), and the connection notice lists each accepted check (`verificationSummary`).

**Before:** "There is no anonymous mode: we know which account asked, never what was asked."

**After:** "There is no anonymous mode: we know which account asked, but cannot read what it asked in chat."

**Why:** same as P2; approved searches are readable on our server.

## P4: "What is sealed and sent"

**Before:** "The server is a sealed computer with a protected graphics processor."

**After:** "The company that runs the server says it is a sealed computer with a protected graphics processor; your browser does not check the graphics processor."

**Why:** the graphics-processor chain is the supplier's statement (Tinfoil docs: GPU workloads run in NVIDIA confidential-computing enclaves), not checked by us; the browser verifier checks AMD SEV-SNP only, not TDX or the GPU. Row added to `docs/provider-promises-20261112.md`.

## P5: "What stays on your device" (new sentence)

**Before:** (none; follows "It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device.")

**After:** "It can miss some of these, most often in photos and scans, and it never replaces health details."

**Why:** recognition misses some (97.8% typed German, 87.3% scans), and health details are never masked; the answer note already says so (`src/App.tsx`), the statement did not.

## Other files on the branch

- `tests/privacy-copy.test.ts`: the required phrase "we never see what you asked" is replaced by the new wording; "we never can", "never see what you asked", "never what" and "checked secure server" are now forbidden.
- `docs/provider-promises-20261112.md`: one row for the attributed graphics-processor claim.

## Not changed, for the owner to note

- The brief for this change said the browser check does not cover "the hardware itself". The supplier's JS SDK docs say the browser verifier does check the AMD SEV-SNP hardware report (not TDX, not the GPU). So the wording says only that the browser does not check the graphics processor; audit row P7 ("and it does not check the hardware itself") was not applied because it may be false.
- The "When you search the web" section still mentions only search text, not page addresses our server fetches (audit P9 is a separate row).
