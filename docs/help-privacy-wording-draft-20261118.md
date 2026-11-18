# Privacy statement for Secure mode: applied wording, for the legal read (18 November 2026)

**Status:** the owner chose the wording on 18 November, and it is **applied in the app**: `shared/privacy-copy.ts`, the Privatemode sections, English and German. The lawyer reads it later with the other texts. German is binding once approved.

**Where it shows:**
- In the app, Help > "Your privacy boundaries" and Help > "Privacy policy". Both show the Privacy Policy, which contains these three sections.
- The website copy `docs/privacy-copy-privatemode-20261112.md` (regenerated). If cometrow.com shows this text, the website needs the same change; the agent does not touch the website.

**Why:**
- The old statement was written when chats lived only on the device. In Secure (the default) three sections were false or out of date.
- Until today the policy page patched single sentences (`STATEMENT_FIXES` in `shared/privacy-policy.ts`). These three sections are now written for Secure and shown as they are.
- The rule from 16 November stays: "we cannot open them" is said only about Secure Max.

**Owner's choices:**
- Section 1: the long version, split into four short lines.
- The promise is narrowed to "we never use your saved chats to train AI or for advertising". The image provider and the open Privatemode statement mean nothing wider can be promised.
- Section 2: yes.
- Section 3: rewritten, because the search approval step was removed on 18 November.

**For the lawyer:**
- Is "our systems can technically open them" clear enough under GDPR Art. 13?
- Is "We never use your saved chats to train AI or for advertising" a promise CometRow can keep, given the image provider's terms? Image prompts are not saved chats, but the user may not see the difference.
- The search section names Brave's 90 days ("may keep"); Brave's transfer basis is still "to confirm".

---

## 1. What we can see / Was wir sehen können

**English (four lines):**
> We can see that your account asked something, when, how many times, which model answered and how many tokens it used, for your usage page. There is no anonymous mode: every request comes from a signed-in account.
> On its way to the AI your message is sealed, and our systems pass it along without being able to open it.
> What you save is different: your saved chats are stored with your account, encrypted while stored, so they are on all your devices after sign-in. CometRow holds the key to them, so our systems can technically open them. We never use your saved chats to train AI or for advertising.
> Chats in Secure Max are locked on your device with a key only you hold, and we cannot open them. Incognito chats are not saved anywhere.

**Deutsch (vier Zeilen):**
> Wir sehen, dass Ihr Konto etwas gefragt hat, wann, wie oft, welches Modell geantwortet hat und wie viele Tokens dabei verbraucht wurden, für Ihre Nutzungsübersicht. Einen anonymen Modus gibt es nicht: Jede Anfrage kommt von einem angemeldeten Konto.
> Auf dem Weg zur KI ist Ihre Nachricht versiegelt; unsere Systeme leiten sie weiter, ohne sie öffnen zu können.
> Für Gespeichertes gilt etwas anderes: Ihre gespeicherten Chats werden verschlüsselt in Ihrem Konto gespeichert und sind nach der Anmeldung auf allen Ihren Geräten verfügbar. CometRow verwahrt den Schlüssel dazu, daher können unsere Systeme sie technisch öffnen. Wir nutzen Ihre gespeicherten Chats nie zum Trainieren von KI oder für Werbung.
> Chats in Secure Max werden auf Ihrem Gerät mit einem Schlüssel verschlossen, den nur Sie haben; wir können sie nicht öffnen. Inkognito-Chats werden nirgends gespeichert.

## 2. What we cannot promise yet / Was wir noch nicht versprechen können

Only the third and fourth sentences changed: "If you lose your password…" and "…never what was asked".

**English:**
> Private chat is switched on only after our checks of the secure server pass. Your browser, your device and anyone who can read your screen can see your conversations. Your saved chats come back when you sign in again on any device. In Secure Max, if you lose every device and your recovery key, nobody can recover those chats, not even CometRow. There is no anonymous mode: we know which account asked. A broken or malicious update to this app could read content before it is sealed, which is why updates are published with their exact version.

**Deutsch:**
> Der private Chat wird erst eingeschaltet, nachdem unsere Prüfungen des sicheren Servers bestanden sind. Ihr Browser, Ihr Gerät und alle, die Ihren Bildschirm lesen können, können Ihre Unterhaltungen sehen. Ihre gespeicherten Chats sind wieder da, wenn Sie sich auf einem beliebigen Gerät erneut anmelden. In Secure Max gilt: Wenn Sie alle Geräte und Ihren Wiederherstellungsschlüssel verlieren, kann niemand diese Chats wiederherstellen, auch CometRow nicht. Es gibt keinen anonymen Modus: Wir wissen, welches Konto gefragt hat. Ein fehlerhaftes oder bösartiges Update dieser App könnte Inhalte lesen, bevor sie versiegelt werden; deshalb werden Updates mit ihrer genauen Version veröffentlicht.

## 3. When you search the web / Wenn Sie im Web suchen

Checked against the app on 18 November:
- the "+" menu search;
- the Research page;
- the two automatic settings, kept in this browser only;
- deep research;
- identifiers masked on the device before every search text;
- the "Searched the web for: …" line;
- search results stripped when a chat is saved.

**English:**
> A web search happens only when you choose “Search the web” in the + menu for a message, search a text yourself on the Research page, have switched on automatic search, or start a deep research. Recognised identifiers are removed from each search text on your device first; names and other details written in your own words are not removed. After a search, the exact text that was searched is shown to you. That text is sent from our server to the search provider, which can read it and may keep it for up to 90 days; your own address is not sent. For a question about rules, fees or deadlines, our server may also ask the search provider to rank official sites first, by sending a fixed list of those sites; nothing from you is added. Our server also opens the top result page, preferring an official site, and reads its text; a deep research opens several pages this way. That site sees our server's address, not yours. If the page address contains a recognised personal detail, the page is opened without the part that holds it, or not at all. The page text is used only for answers in that conversation and is never saved. Automatic search covers questions that look time-sensitive or are about rules, fees or deadlines; if you switch on only “Always search for rules, fees and deadlines”, just those questions are searched. These settings are off until you switch them on and are kept only on this device. Search results and their links are shown only during the conversation and are never saved. The written answer built on them is saved with the chat; a reopened conversation says it came from a live search and offers to search again for current sources.

**Deutsch:**
> Eine Websuche findet nur statt, wenn Sie für eine Nachricht im +-Menü „Im Web suchen“ wählen, auf der Seite „Recherche“ selbst einen Text suchen, die automatische Suche eingeschaltet haben oder eine Tiefenrecherche starten. Erkannte Kennungen werden zuerst auf Ihrem Gerät aus jedem Suchtext entfernt; Namen und andere Angaben in Ihren eigenen Worten werden nicht entfernt. Nach einer Suche wird Ihnen der genau gesuchte Text angezeigt. Dieser Text wird von unserem Server an den Suchanbieter gesendet, der ihn lesen und bis zu 90 Tage aufbewahren kann; Ihre eigene Adresse wird nicht gesendet. Bei einer Frage zu Regeln, Gebühren oder Fristen kann unser Server den Suchanbieter außerdem bitten, offizielle Websites zuerst einzuordnen, indem er eine feste Liste dieser Websites sendet; nichts von Ihnen wird hinzugefügt. Unser Server öffnet außerdem die oberste Ergebnisseite, bevorzugt eine offizielle Website, und liest ihren Text; eine Tiefenrecherche öffnet auf diese Weise mehrere Seiten. Diese Website sieht die Adresse unseres Servers, nicht Ihre. Wenn die Seitenadresse eine erkannte persönliche Angabe enthält, wird die Seite ohne den Teil geöffnet, der sie enthält, oder gar nicht. Der Seitentext wird nur für Antworten in dieser Unterhaltung verwendet und nie gespeichert. Die automatische Suche gilt für Fragen, die zeitabhängig wirken oder Regeln, Gebühren oder Fristen betreffen; wenn Sie nur „Bei Regeln, Gebühren und Fristen immer suchen“ einschalten, werden nur diese Fragen gesucht. Diese Einstellungen sind ausgeschaltet, bis Sie sie einschalten, und werden nur auf diesem Gerät gespeichert. Suchergebnisse und ihre Links werden nur während der Unterhaltung angezeigt und nie gespeichert. Die darauf aufgebaute schriftliche Antwort wird mit dem Chat gespeichert; eine wieder geöffnete Unterhaltung sagt, dass sie aus einer Live-Suche stammt, und bietet an, für aktuelle Quellen erneut zu suchen.

---

**Not changed:**
- The approved Tinfoil statement, the backup provider's text (the policy still patches its sentences).
- The other sections: device, sealed, provider, limits.
- The page date and version. A new version date waits for the legal read, because only the owner has accepted so far.
