# Deep research: privacy wording draft (14 November 2026)

Status: **draft for the owner. Not binding. The legal texts (`shared/privacy-*.ts`) were not changed.** Needed only if deep research is switched on.

What is new compared with today's search wording: one request to the secure model proposes the search texts; several approved texts are searched in one go; our server opens up to 6 result pages instead of 1.

## English

**Deep research.** If you start a deep research, your question is first sent to the secure model, which proposes up to 4 search texts. Recognised personal details are removed from these texts on your device. You see every text, can change or remove it, and nothing is searched until you approve. The approved texts are sent to Brave Search through our server. Our server then opens up to 6 of the result pages and reads their text. Those websites see our server's address, not yours. Parts of those pages, chosen on your device, are sent to the secure model together with your question to write the answer. No further search is made without asking you again. We do not store the question, the search texts, the pages or the answer on our servers. We keep only a count of your requests and searches for the limits.

## Deutsch

**Tiefenrecherche.** Wenn Sie eine Tiefenrecherche starten, wird Ihre Frage zuerst an das sichere Modell gesendet, das bis zu 4 Suchtexte vorschlägt. Erkannte persönliche Angaben werden auf Ihrem Gerät aus diesen Texten entfernt. Sie sehen jeden Text, können ihn ändern oder entfernen, und es wird nichts gesucht, bevor Sie zustimmen. Die freigegebenen Texte werden über unseren Server an Brave Search gesendet. Unser Server öffnet danach bis zu 6 der Ergebnisseiten und liest ihren Text. Diese Websites sehen die Adresse unseres Servers, nicht Ihre. Teile dieser Seiten, die auf Ihrem Gerät ausgewählt werden, gehen zusammen mit Ihrer Frage an das sichere Modell, das die Antwort schreibt. Ohne erneute Nachfrage wird nicht weiter gesucht. Wir speichern weder die Frage noch die Suchtexte, die Seiten oder die Antwort auf unseren Servern. Wir führen nur eine Zählung Ihrer Anfragen und Suchen für die Grenzen.

## To check before use

- "We keep only a count": the run and search counts are in the server's memory, per account, for 24 hours. The allowance units are in the usage ledger, as for every request.
- The interface text of the approval step (`src/text/deep-research.ts`, `approveNote`) says the same in short form. Keep the two in step.
