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

A web search happens only when you choose “Search the web” in the + menu for a message, search a text yourself on the Research page, have switched on automatic search, or start a deep research. Recognised identifiers are removed from each search text on your device first; names and other details written in your own words are not removed. After a search, the exact text that was searched is shown to you. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. For a question about rules, fees or deadlines, our server may also ask the search provider to rank official sites first, by sending a fixed list of those sites; nothing from you is added. Our server also opens the top result page, preferring an official site, and reads its text; a deep research opens several pages this way. That site sees our server's address, not yours. If the page address contains a recognised personal detail, the page is opened without the part that holds it, or not at all. The page text is used only for answers in that conversation and is never saved. Automatic search covers questions that look time-sensitive or are about rules, fees or deadlines; if you switch on only “Always search for rules, fees and deadlines”, just those questions are searched. These settings are off until you switch them on and are kept only on this device. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is saved with the chat; a reopened conversation says it came from a live search and offers to search again for current sources.

## What we cannot promise yet

Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. Your saved chats come back when you sign in again on any device. In Secure Max, if you lose every device and your recovery key, nobody can recover those chats, not even CometRow. There is no anonymous mode: we know which account asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.
