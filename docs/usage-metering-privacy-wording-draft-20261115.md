# Privacy wording draft for usage metering (15 November 2026)

DRAFT for the owner. The binding texts (`shared/privacy-policy.ts`) are not changed. Needed before `inference.metering` is switched on in production, because our request records then hold more than the policy says today (`docs/usage-metering-20261115.md`, section 3).

## What changes

Today the policy lists our own request records as: which account asked, when, how many times, which model (and, in the older Tinfoil text, the published cost). With metering on, each record also holds the feature, the requests it counted, the size of the encrypted message and answer, how long the answer took, and the token counts the browser reads from the answer. These are numbers about the request, never its text.

## Proposed sentence (replaces "Our own request records: …")

**English:** Our own request records: which account asked, when, for which feature (for example a Fast message, a picture question or a web search), how many requests it counted, which model, the size of the encrypted message and answer, how long the answer took, and the token counts your browser reads from the answer and sends us. These are numbers only, never the text of a question or an answer. You can see them on your usage page; we keep them for 90 days and then delete them.

**Deutsch:** Unsere eigenen Anfrageaufzeichnungen: welches Konto gefragt hat, wann, für welche Funktion (zum Beispiel eine Nachricht in „Schnell“, eine Frage zu einem Bild oder eine Websuche), wie viele Anfragen gezählt wurden, welches Modell, die Größe der verschlüsselten Nachricht und Antwort, wie lange die Antwort dauerte, und die Tokenzahlen, die Ihr Browser aus der Antwort liest und uns schickt. Das sind nur Zahlen, nie der Text einer Frage oder Antwort. Sie sehen sie auf Ihrer Nutzungsseite; wir bewahren sie 90 Tage auf und löschen sie dann.

## Short line on the usage page (already in the app, `src/text/usage-meter.ts`)

- English: "Tokens are the size of a question and its answer as the AI service counts them. Your browser reads them from the encrypted answer and tells our server the numbers only, never the text."
- Deutsch: "Tokens sind die Größe einer Frage und ihrer Antwort, wie der KI-Dienst sie zählt. Ihr Browser liest sie aus der verschlüsselten Antwort und teilt unserem Server nur die Zahlen mit, nie den Text."

## Owner decision

Option A (recommended): per-request records for 90 days, with the sentence above. Options B (7 days, then totals without the account) and C (no token reports) are described in the design note.
