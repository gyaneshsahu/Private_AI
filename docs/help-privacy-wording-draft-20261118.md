# Help, "Your privacy boundaries": new wording for Secure mode (draft, 18 November 2026)

**Status:** draft by the agent, for the owner to review. **Nothing in the app is changed yet.** After the owner's yes, the agent puts it in the app (`shared/privacy-copy.ts`, English and German). The lawyer reads it later with the other texts.

**Why:** the Help page text was written when chats lived only on the device. With Secure on (the default for the live test), three parts of it are false or out of date. The rule from 16 November is that "we cannot read it" is said only about Secure Max (`docs/secure-copy-draft-20261116.md`).

**Website:** `shared/privacy-copy.ts` notes that the website copies this text word for word. If cometrow.com shows it, the website needs the same change. The agent does not touch the website.

---

## 1. Section "What we can see" (the sentence you found)

**Today (false in Secure):**
> … We never see what you asked or what was answered. … We keep no copy of your conversations; saved history lives only on your device, locked with a password we do not have.

Two more problems in the same section:
- "We never see what you asked" is true for a message on its way to the AI, but not for chats saved in Secure.
- The Privatemode version says token counts "reach our systems locked". With usage metering on (it is on for the live test), the browser reports token counts so the usage page can show them.

**Proposed (English):**
> We can see that your account asked something, when, how many times, which model answered and how many tokens it used, for your usage page. On its way to the AI your message is sealed, and our systems pass it along without being able to open it. What you save is different. Your saved chats are stored with your account, encrypted while stored, so they are on all your devices after sign-in. CometRow holds the key to them, so our systems can technically open them; they are never used to train AI or for advertising. Chats in Secure Max are locked on your device with a key only you hold, and we cannot open them. Incognito chats are not saved anywhere. There is no anonymous mode: every request comes from a signed-in account.

**Proposed (German, formal "Sie"):**
> Wir sehen, dass Ihr Konto etwas gefragt hat, wann, wie oft, welches Modell geantwortet hat und wie viele Tokens dabei verbraucht wurden, für Ihre Nutzungsübersicht. Auf dem Weg zur KI ist Ihre Nachricht versiegelt; unsere Systeme leiten sie weiter, ohne sie öffnen zu können. Für Gespeichertes gilt etwas anderes. Ihre gespeicherten Chats werden verschlüsselt in Ihrem Konto gespeichert und sind nach der Anmeldung auf allen Ihren Geräten verfügbar. CometRow verwahrt den Schlüssel dazu, daher können unsere Systeme sie technisch öffnen; sie werden nie zum Trainieren von KI oder für Werbung genutzt. Chats in Secure Max werden auf Ihrem Gerät mit einem Schlüssel verschlossen, den nur Sie haben; wir können sie nicht öffnen. Inkognito-Chats werden nirgends gespeichert. Einen anonymen Modus gibt es nicht: Jede Anfrage kommt von einem angemeldeten Konto.

**Shorter option (English):**
> We see that your account asked, when, which model answered and how many tokens it used. Messages are sealed on their way to the AI. Saved chats are stored with your account, encrypted, and CometRow holds the key, so we can technically open them; we never use them for training or advertising. Secure Max chats use a key only you hold, and we cannot open them. Incognito chats are not saved.

## 2. Section "What we cannot promise yet", one sentence

**Today (false in Secure):**
> If you lose your password, nobody can recover your saved history.

**Proposed (English):**
> Your saved chats come back when you sign in again on any device. In Secure Max, if you lose every device and your recovery key, nobody can recover those chats, not even CometRow.

**Proposed (German):**
> Ihre gespeicherten Chats sind wieder da, wenn Sie sich auf einem beliebigen Gerät erneut anmelden. In Secure Max gilt: Wenn Sie alle Geräte und Ihren Wiederherstellungsschlüssel verlieren, kann niemand diese Chats wiederherstellen, auch CometRow nicht.

## 3. Section "When you search the web" (out of date since 18 November)

This section still describes the search approval that was removed on 18 November ("only happens when you approve the exact search text shown to you"). It also says the answer "is kept in your saved history on this device".

**Proposed start (English):**
> A web search happens when you choose "Search the web" for a message, or when you have switched on automatic search.

**Proposed end (English):**
> The written answer built on them is saved with the chat.

Once you agree with sections 1 and 2, the agent will rewrite this section in full in both languages, checked against what the app does today, and send it to you the same way.

## What to tell the agent

For example: "1 long", "1 short", or your own changes; "2 yes"; "3 go ahead".
