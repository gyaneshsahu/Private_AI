# CometRow privacy statement — 22 October 2026

Generated from `shared/privacy-copy.ts`; the app shows exactly this text and a test keeps this file identical to it. Change the source file together with the behaviour it describes, then regenerate with `node --import tsx scripts/privacy-copy.ts`.

## What stays on your device

Before anything is sent, CometRow looks for ID numbers, bank account and card numbers, tax and insurance numbers, passport or ID card numbers next to their label, phone numbers, email addresses and dates of birth next to their label. It replaces each one with a stand-in like {{IBAN-1}} and keeps the real value on your device. It can miss some of these, most often in photos and scans, and it never replaces health details. The answer comes back with the real values put back in, and a note under the answer tells you what was kept. Names, addresses and other facts written in your own words are not recognised; treat them as part of the sealed question below. An incognito chat is never saved on this device, and disappearing messages are deleted from this device after the time you choose; neither changes what the secure server or our records hold.

## What is sealed and sent

The rest of your question, your selected files and the earlier messages you included are locked in your browser so that only one secure server can open them. The company that runs the server says it is a sealed computer with a protected graphics processor; your browser does not check the graphics processor. Before each request your browser checks that it is talking to an approved sealed release; that check is partial today: it cannot tell whether the approval was later withdrawn or how old the evidence is, and the company has given no date for a fuller browser check. Our own systems pass the locked package along and cannot open it.

## What we can see

We can see that your account asked something, when, how many times, which model answered, and afterwards how long the question and answer were and what they cost at published rates. We cannot read what you asked in chat or what was answered. Web searches and pages you approve are different: they pass through our server in readable form. There is no anonymous mode: every request comes from a signed-in account, incognito chats included, so we always know which account asked. We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.

## What the secure server keeps

The company that runs the secure server states that it does not keep your question or answer after the reply is sent and does not use them to train any AI. It keeps a short-term working memory inside the sealed server that can hold parts of recent questions until it clears on its own, usually within minutes, sometimes hours; there is no button that empties it, no promised maximum time, and the company has said it does not plan to add one. It keeps records such as time, model and token counts, without content; the company states it keeps these for 90 days, longer for accounting records.

## Spending and limits

Your plan allows a set number of requests, and only one request runs at a time per account. Spending limits on the secure server are soft: a request that is already running finishes and is billed even if a limit is reached while it runs.

## When you search the web

A web search only happens when you approve the exact search text shown to you. Recognised identifiers are removed from that text on your device first, and you are warned if it may still contain a name or other personal detail. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is kept in your saved history on this device; a reopened conversation says it came from a live search and offers to search again for current sources, which needs your approval again.

## What we cannot promise yet

Private chat is switched on only after our checks of the secure server pass, or after we accept a known gap in writing for a limited release; the connection notice then names each accepted gap. Your browser, your device and anyone who can read your screen can see your conversations. If you lose your password, nobody can recover your saved history. There is no anonymous mode: we know which account asked, but cannot read what it asked in chat. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.
