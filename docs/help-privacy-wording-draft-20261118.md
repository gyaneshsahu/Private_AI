# Privacy statement for Secure mode and automatic search: applied wording, for the legal read (18 and 19 November 2026)

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
- Section 3: rewritten again on 19 November. Search is automatic (`docs/owner-decisions.md`, top block): approval before search is removed, identifiers are masked first, and one setting switches it off. Short lines, no jargon.

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

## 3. When you search the web / Wenn Sie im Web suchen (19 November: automatic)

The same text for both providers (Privatemode and the Tinfoil backup), shown on the Help and Privacy pages. It was checked against the app on 19 November:
- the app searches by itself when a question needs current information, including when the user asks in words ("search the web for…");
- identifiers are masked on the device before the search text leaves it;
- the "Searched the web" line under the answer opens to the searched text and the sources;
- the "Look things up online" switch in Settings, General is on by default and kept only on the device;
- search results are stripped when a chat is saved.

**English (seven short lines):**
> CometRow looks things up online by itself when a question needs current information, for example news, prices, opening hours, or German rules, fees and deadlines.
> Before the search, email addresses, phone numbers, bank and ID numbers are removed from the search text on your device. Names and other details in your own words are not removed.
> Our server sends the search text to the search provider, Brave, which can read it and may keep it for up to 90 days. Your own internet address is not sent.
> Our server may also open the top result page to read it; that website sees our server's address, not yours. Deep research opens several pages this way. If a page address contains a recognised personal detail, the page is opened without that part, or not at all. The page text is used only for that answer and is not saved.
> Under the answer, "Searched the web" shows the exact text that was searched and the sources.
> Search results are not kept with a saved chat; the written answer is.
> You can switch this off in Settings, General, "Look things up online". It is on until you switch it off, and the choice is kept only on this device.

**Deutsch (sieben kurze Zeilen):**
> CometRow schlägt von selbst online nach, wenn eine Frage aktuelle Informationen braucht, zum Beispiel Nachrichten, Preise, Öffnungszeiten oder deutsche Regeln, Gebühren und Fristen.
> Vor der Suche werden E-Mail-Adressen, Telefonnummern, Bank- und Ausweisnummern auf Ihrem Gerät aus dem Suchtext entfernt. Namen und andere Angaben in Ihren eigenen Worten werden nicht entfernt.
> Unser Server sendet den Suchtext an den Suchanbieter Brave, der ihn lesen und bis zu 90 Tage aufbewahren kann. Ihre eigene Internetadresse wird nicht gesendet.
> Unser Server kann außerdem die Seite des obersten Treffers öffnen, um sie zu lesen; diese Website sieht die Adresse unseres Servers, nicht Ihre. Eine Tiefenrecherche öffnet so mehrere Seiten. Enthält eine Seitenadresse eine erkannte persönliche Angabe, wird die Seite ohne diesen Teil geöffnet oder gar nicht. Der Seitentext wird nur für diese Antwort verwendet und nicht gespeichert.
> Unter der Antwort zeigt „Im Web gesucht" den genau gesuchten Text und die Quellen.
> Suchergebnisse werden mit einem gespeicherten Chat nicht aufbewahrt; die geschriebene Antwort schon.
> Sie können das unter Einstellungen, Allgemein, „Online nachschlagen" ausschalten. Es ist eingeschaltet, bis Sie es ausschalten, und die Wahl wird nur auf diesem Gerät gespeichert.

**Also changed for the search decision (19 November, both languages):**
- **Policy line "Web search and research":** "the search text CometRow makes when a question needs current information, after identifiers were removed on your device…" (was "only the search text you approved").
- **Data export text:** "a search text passes through it on the way to the search provider" (was "search text you approve").
- **Background task text:** "if it searches the web, its search text… that text was set when the task was created, with personal details removed" (was "if you approved one").

**For the lawyer, on search:**
- Is automatic search with an opt-out switch, on by default, acceptable under the GDPR, given masking first and the transfer to Brave in the USA? The previous design asked before each search.
- Brave's transfer basis is still "to confirm".

---

**Not changed:**
- The approved Tinfoil statement, the backup provider's text (the policy still patches its sentences).
- The other sections: device, sealed, provider, limits.
- The page date and version. A new version date waits for the legal read, because only the owner has accepted so far.
