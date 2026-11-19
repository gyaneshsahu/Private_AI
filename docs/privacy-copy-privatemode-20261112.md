# CometRow privacy statement when Privatemode is the provider — DRAFT, needs owner approval (D17), 12 November 2026

Generated from `privacyCopy("privatemode")` in `shared/privacy-copy.ts`; a test keeps this file identical to it. Sections not listed in `docs/privacy-wording-privatemode-20261112.md` are the approved text, unchanged. Regenerate with `node --import tsx scripts/privacy-copy.ts`.

## What stays on your device

Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, tax and insurance numbers, passport or ID card numbers next to their label, phone numbers, email addresses and dates of birth next to their label. It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device. The answer comes back with the real values put back in, and a note under the answer tells you what was kept. Names, addresses and other facts written in your own words are not recognised; treat them as part of the sealed question below. An incognito chat is never saved on this device, and disappearing messages are deleted from this device after the time you choose; neither changes what the secure server or our records hold.

## What is sealed and sent

The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The server is a sealed computer with a protected graphics processor. When you start chatting and again at least every 10 minutes, your browser checks the sealed computer against a release we approved; that check is partial: it does not cover the graphics processor, which the company states it checks on its own side before your question can be opened, and we have not yet confirmed whether the browser check notices an approval that was later withdrawn. Our own systems pass the locked package along and cannot open it.

## What we can see

We can see that your account asked something, when, how many times, which model answered and how many tokens it used, for your usage page. There is no anonymous mode: every request comes from a signed-in account.
On its way to the AI your message is sealed, and our systems pass it along without being able to open it.
What you save is different: your saved chats are stored with your account, encrypted while stored, so they are on all your devices after sign-in. CometRow holds the key to them, so our systems can technically open them. We never use your saved chats to train AI or for advertising.
Chats in Secure Max are locked on your device with a key only you hold, and we cannot open them. Incognito chats are not saved anywhere.

## What the secure server keeps

The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions; each account's memory is kept apart with its own secret, so another account cannot reuse it or tell what it holds. There is no button that empties it and no promised maximum time. It keeps records such as time and token counts, without content; the company states it keeps these for up to 90 days, and keeps token counts per key permanently for billing. We use one key for all accounts, so those permanent counts are not linked to your account.

## Spending and limits

Your plan allows a set number of requests, and only one request runs at a time per account. We also set limits on our key at the secure server; the company states that it enforces them there, so new requests are refused once a limit is reached.

## When you search the web

CometRow looks things up online by itself when a question needs current information, for example news, prices, opening hours, or German rules, fees and deadlines.
Before the search, email addresses, phone numbers, bank and ID numbers are removed from the search text on your device. Names and other details in your own words are not removed.
Our server sends the search text to the search provider, Brave, which can read it and may keep it for up to 90 days. Your own internet address is not sent.
Our server may also open the top result page to read it; that website sees our server's address, not yours. Deep research opens several pages this way. If a page address contains a recognised personal detail, the page is opened without that part, or not at all. The page text is used only for that answer and is not saved.
Under the answer, “Searched the web” shows the exact text that was searched and the sources.
Search results are not kept with a saved chat; the written answer is.
You can switch this off in Settings, General, “Look things up online”. It is on until you switch it off, and the choice is kept only on this device.

## What we cannot promise yet

Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. Your saved chats come back when you sign in again on any device. In Secure Max, if you lose every device and your recovery key, nobody can recover those chats, not even CometRow. There is no anonymous mode: we know which account asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.
