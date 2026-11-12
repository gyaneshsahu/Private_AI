# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

## 1. R-01 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What turnover limits apply to the Kleinunternehmerregelung (small business VAT exemption) in Germany in 2026? Link the official source.
~~~~~~

**Reference for the scorer:**

- Fact: prior-year turnover limit and current-year limit as stated by the Bundesfinanzministerium or the law (UStG §19) on the run day
- Element: official source link (bundesfinanzministerium.de, gesetze-im-internet.de or a Finanzamt page)
- Element: states what could not be confirmed

### Answer A

~~~~~~markdown
Kleinunternehmerregelung 2026 – turnover limits
In 2026 you qualify as a Kleinunternehmer under § 19 (1) UStG if both limits are met norman.finance:
Previous year (2025) turnover: at most €25,000 vatgpt.de norman.finance
Current year (2026) turnover: at most €100,000 vatgpt.de norman.finance
Key points from the sources:
The €100,000 is a hard ceiling: exceed it mid-year and you become VAT-liable immediately, starting with the sale that breaches the limit (not from 1 January of the next year, as under the old rule) norman.finance.
Since the 2025 reform, turnover is measured as actual (net) revenue with no notional VAT add-on, because the supplies are now genuinely tax-exempt norman.finance germanycompass.com.
New businesses can use the rule in their first year if expected turnover stays below €25,000; only actual revenue up to that mark counts, no full-year extrapolation norman.finance.
These limits apply unchanged from 2025 and, per the sources, remain the same for following years accountable.de norman.finance.
Official source
The legal basis is § 19 UStG; German tax offices describe it as the small business regulation that exempts low-turnover businesses' services from VAT finanzamt-bw.fv-bwl.de. The authoritative text is published by the Federal Ministry of Justice at:
https://www.gesetze-im-internet.de/ustg/__19.html
One caveat: the retrieved results were secondary sources (tax-software providers and guides, retrieved 2026-11-12) that consistently report these figures — the statute page itself was not among them. If you'd like, I can search for the official § 19 UStG text to verify the wording directly.
~~~~~~

### Answer B

~~~~~~markdown
Kleinunternehmerregelung: turnover limits in 2026
Two limits apply under § 19 UStG, and both must be met:
Prior-year turnover (2025): at most €25,000
Current-year turnover (2026): at most €100,000
vatgpt.de norman.finance germanycompass.com
Key points:
The €100,000 limit is a hard ceiling, not just a forecast. If you cross it mid-year, the exemption ends immediately from the very sale that breaches it; that sale and everything after it is subject to standard VAT. norman.finance norman.finance
Both figures refer to total turnover net (without a notional VAT add-on), since 2025 the rule has been a genuine tax exemption rather than merely "VAT not collected". vatgpt.de norman.finance norman.finance
Newly founded businesses can use the exemption in their founding year if expected turnover stays under €25,000; the founding-year figure is no longer extrapolated to a full year. norman.finance norman.finance
Invoices must carry a note referring to § 19 UStG and show no VAT. norman.finance norman.finance
Since 2025 these limits replace the earlier €22,000 prior-year and €50,000 current-year figures. norman.finance
Official source
The retrieved results do not include the statutory text itself. The only official-administration source among them is a Finanzamt Baden-Württemberg page:
Finanzamt Baden-Württemberg – "What is the so-called small business regulation?": https://finanzamt-bw.fv-bwl.de/,Len/9772274 finanzamt-bw.fv-bwl.de
That excerpt only confirms the general nature of § 19 UStG as a simplification rule for low-turnover businesses; it does not state the 2026 figures. The €25,000/€100,000 numbers come from commercial provider articles norman.finance vatgpt.de germanycompass.com, which broadly agree with each other but are not independent official confirmation.
For the authoritative wording, check § 19 of the German VAT Act (UStG) on the official federal law portal (gesetze-im-internet.de) or the Bundesfinanzministerium (BMF) website — these were not in the retrieved material. I can run another search for those if you want. Note that I can't confirm the exact current status beyond these sources, so verify before relying on it for a tax filing.
~~~~~~

### Answer C

~~~~~~markdown
2026 limits (§ 19 UStG): prior-year total turnover of at most €25,000 and current-year turnover of at most €100,000, both in net terms — both must be met vatgpt.degermanycompass.comnorman.finance. The €100,000 is a hard ceiling: cross it mid-year and VAT applies from that very sale, not from the next year norman.financegermanycompass.com. Since 2025 the rule is a genuine tax exemption (not merely "VAT not collected"), and exempt invoices need a note referring to § 19 UStG norman.finance.
On the official source: none of the retrieved results is the legal text itself. The closest official item is a Baden-Württemberg tax office page confirming that § 19 UStG is a simplification rule for low-turnover businesses making supplies VAT-exempt finanzamt-bw.fv-bwl.de — but its excerpt doesn't state the 2026 figures. The €25,000/€100,000 numbers above appear only in commercial/explanatory pages vatgpt.degermanycompass.comnorman.finance, and all retrieved excerpts are partial (search excerpts; only the Norman page was partly opened).
For the authoritative wording, check § 19 UStG in the official statute (gesetze-im-internet.de) and Federal Ministry of Finance guidance; I can't verify those pages from this material. I can run a targeted search for the statutory text if you like.
~~~~~~

## 2. R-02 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What are the opening hours and the adult ticket price of the Neues Museum in Berlin today? If you cannot confirm something, say so.
~~~~~~

**Reference for the scorer:**

- Element: opening hours as listed by smb.museum on the run day
- Element: adult price as listed on the run day
- Element: source link
- Element: states what could not be confirmed

### Answer A

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Opening hours today (Thursday, 12 November 2026): 10:00–18:00. The museum is closed on Mondays; Tuesday–Sunday opening is 10:00–18:00, with last entry 30 minutes before closing museumsportal-berlin.desmb.museum.
Caveat: these are the museum's regular hours, and I can't independently confirm that today has no special closure. The only announced closure in the sources is 15–17 March 2027 for maintenance smb.museum.
Adult ticket price: €14.00 for the Neues Museum; the combined "Museum Island + Panorama" ticket is €24.00. Reduced admission is €7.00 (€12.00 for the combined ticket). Children and young people up to 18 are free museumsportal-berlin.de. Both the Berlin museums portal and a third-party ticket page give €14 for 2026 museumsportal-berlin.dethebettervacation.com.
Not confirmed: I did not find a current price for the separate Museum Pass Berlin in a listing that clearly matches the Neues Museum admission — one excerpt mentions a 3-day pass for €32.00 (€16.00 reduced) smb.museum, but I can't confirm from the sources that this covers the Neues Museum or is up to date. Check the official SMB ticket page before relying on it.
Main entrance is the James-Simon-Galerie; the Kolonnadenhof entrance requires a valid ticket museumsportal-berlin.de.
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Neues Museum, Berlin – today, Thursday 12 November 2026
Opening hours: Tuesday–Sunday 10:00–18:00, Monday closed; last entry 30 minutes before closing museumsportal-berlin.desmb.museum. So today it should be open 10:00–18:00, with last entry at 17:30. Note that today's specific date is not explicitly listed on the pages – this follows from the regular weekly schedule.
Adult ticket: €14.00 museumsportal-berlin.dethebettervacation.com. Reduced price €7.00; children and young people up to 18 are free museumsportal-berlin.de.
A couple of caveats:
The combined "Museum Island + Panorama" ticket is €24.00 (reduced €12.00) museumsportal-berlin.de. One secondary site describes a "Museum Island Day Ticket (€24)" covering all five museums thebettervacation.com – that wording conflicts somewhat with the official page, so check at the ticket desk which option you're buying.
The official page notes the museum will be closed 15–17 March 2027 for maintenance smb.museum, which doesn't affect today.
These are search excerpts and one partial page, not a full read of the ticket page; prices and hours can change, so the official SMB site is the safest check before you go.
~~~~~~

### Answer C

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Opening hours today (Thu, 12 Nov 2026): 10:00–18:00, with last entry 30 minutes before closing (17:30) museumsportal-berlin.de. The museum is closed on Mondays; otherwise Tue–Sun 10:00–18:00 museumsportal-berlin.desmb.museum. No special hours or closure are listed for today — the only maintenance closure mentioned is 15–17 March 2027 smb.museum.
Adult ticket price: €14 museumsportal-berlin.de, which matches the 2026 price reported by a second source thebettervacation.com. For context: reduced admission is €7, children and young people up to 18 are free, and a combined Museum Island + Panorama ticket costs €24 museumsportal-berlin.de.
Both items are confirmed by the official Museumsportal Berlin page and the SMB website. One caveat: I'm relying on my device clock for "today"; if your actual date is a Monday, the museum would be closed.
~~~~~~

## 3. R-03 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What is the ECB's deposit facility rate right now, and when did it last change?
~~~~~~

**Reference for the scorer:**

- Fact: rate and effective date from the ECB key interest rates table on the run day
- Element: ecb.europa.eu source link

### Answer A

~~~~~~markdown
The ECB's deposit facility rate is currently 2.50% (as of today, Nov 12, 2026) globalmacro.expert. The last change was a +25 bp increase that took effect on Sep 16, 2026, moving the rate from 2.25% to 2.50% globalmacro.expert.
This is corroborated by other sources: one reports the same 2.50% rate and Sep 16, 2026 effective date as of late October globalmacro.expert, and another confirms 2.50% following increases on 17 June and 16 September 2026 silverdatalab.com.
One small discrepancy worth noting: a different source dates the last change to Sep 10, 2026 interestratedecision.com rather than Sep 16. This most likely reflects the decision announcement date versus the effective date, but the excerpts don't state that explicitly.
~~~~~~

### Answer B

~~~~~~markdown
The ECB deposit facility rate is 2.50% as of Nov 12, 2026 globalmacro.expert. The last change took effect Sep 16, 2026, a +25 bp increase globalmacro.expert.
For context, the same source lists the other two key rates at 2.65% (main refinancing) and 2.90% (marginal lending) globalmacro.expert.
A caveat on the date evidence:
Global Macro Expert reports 2.50% and the Sep 16, 2026 change globalmacro.expertglobalmacro.expert.
Silver Data Lab gives the same rates but its page is dated Jun 20, 2026, before the Sep 16 change, so its date can't support the timing silverdatalab.com.
Another source says the last change was +25 bp on Sep 10, 2026 interestratedecision.com, differing from Sep 16. That's a conflict I can't resolve from these excerpts.
None of these is the ECB's own site. For an authoritative figure and effective date, check the ECB Data Portal or ECB press releases directly.
~~~~~~

### Answer C

~~~~~~markdown
The ECB deposit facility rate is 2.50%, last changed on 16 September 2026, when it was raised by 25 basis points globalmacro.expert. The same page gives the accompanying main refinancing rate as 2.65% and the marginal lending facility rate as 2.90% globalmacro.expert.
Two caveats:
The source is a secondary aggregator citing the ECB Data Portal, not the ECB's own publication; the search excerpts don't include a direct ECB page globalmacro.expert.
The excerpt of that page is dated 12 November 2026 and lists the rate as current then; I can't confirm nothing has changed since, so check the ECB's own rate page for the authoritative figure.
The rate history in the same source is consistent with other excerpts: a peak of 4.00% in September 2023 euroyields.comglobalmacro.expert and a +25 bp move on 16 September 2026 globalmacro.expertsilverdatalab.com. One source instead gives the date of the last change as 10 September 2026 interestratedecision.com — likely an effective-date vs. decision-date difference, but the excerpts don't show enough to confirm that.
~~~~~~

## 4. R-04 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Wie hoch ist der gesetzliche Mindestlohn in Deutschland im Jahr 2026 pro Stunde, und seit wann gilt er? Bitte mit Quelle.
~~~~~~

**Reference for the scorer:**

- Fact: amount and start date as published by the Bundesregierung, BMAS or the Mindestlohnkommission on the run day
- Element: official source link

### Answer A

~~~~~~markdown
Der gesetzliche Mindestlohn in Deutschland liegt 2026 bei 13,90 Euro brutto pro Stunde. Er gilt seit dem 1. Januar 2026 bundesregierung.debundesregierung.de.
Das bestätigt auch das Bundesministerium für Arbeit und Soziales: Seit dem 1. Januar 2026 beträgt der Mindestlohn 13,90 Euro (brutto) pro Zeitstunde .
Ergänzend: Zum 1. Januar 2027 soll er auf 14,60 Euro steigen bundesregierung.de.
Quellen (primär):
Bundesregierung, „13,90 Euro: So hoch liegt der Mindestlohn 2026" (Veröffentlichung 21.09.2026): https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-steigt-2391010 bundesregierung.de
BMAS, „Der gesetzliche Mindestlohn – Ein Überblick": https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Mindestlohn/Informationen-zum-Mindestlohn/informationen-zum-mindestlohn-deutsch.html
~~~~~~

### Answer B

~~~~~~markdown
Der gesetzliche Mindestlohn in Deutschland beträgt 13,90 Euro brutto pro Stunde und gilt seit dem 1. Januar 2026 bundesregierung.debundesregierung.debmas.de.
Die Zahl wird unabhängig bestätigt durch das BMAS bmas.de, die Bundesregierung bundesregierung.debundesregierung.de und einen Fachanbieter personio.de.
Zusatz: Zum 1. Januar 2027 soll der Mindestlohn laut Bundesregierung auf 14,60 Euro steigen bundesregierung.de.
Quellen:
Bundesregierung, „13,90 Euro: So hoch liegt der Mindestlohn 2026“ (Seite geöffnet, Pressemitteilung vom 21.09.2026) bundesregierung.de
BMAS, „Der gesetzliche Mindestlohn – Ein Überblick“ bmas.de
Bundesregierung, FAQ zum Mindestlohn bundesregierung.de
Hinweis: Die Auszüge belegen die Beträge; ob einzelne Branchen einen höheren Tarifmindestlohn haben, geht daraus nicht hervor.
~~~~~~

### Answer C

~~~~~~markdown
Der gesetzliche Mindestlohn in Deutschland beträgt 13,90 € brutto pro Stunde und gilt seit dem 1. Januar 2026 bundesregierung.debmas.debundesregierung.de.
Zum 1. Januar 2027 soll er auf 14,60 € steigen bundesregierung.de.
Quellen:
Bundesregierung, „13,90 Euro: So hoch liegt der Mindestlohn 2026“ (Beitrag vom 21. September 2026): https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-steigt-2391010 bundesregierung.de
BMAS, „Der gesetzliche Mindestlohn – Ein Überblick“: https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Mindestlohn/Informationen-zum-Mindestlohn/informationen-zum-mindestlohn-deutsch.html bmas.de
Hinweis: Die Angaben stammen aus Suchausschnitten bzw. dem Anfang der Bundesregierungs-Seite; die vollständigen Originalseiten habe ich nicht gelesen.
~~~~~~

## 5. R-05 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Wie viel Kindergeld gibt es 2026 pro Kind und Monat?
~~~~~~

**Reference for the scorer:**

- Fact: amount per child as published by the Familienkasse or the Bundesregierung on the run day
- Element: official source link

### Answer A

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
2026 beträgt das Kindergeld 259 Euro pro Kind und Monat, unabhängig von der Anzahl der Kinder kindergeld.orgdgb.de. Die Erhöhung erfolgte zum 1. Januar 2026 von 255 Euro dgb.dekindergeld.org.
Für mehrere Kinder ergibt sich daraus kindergeld.org:
Kinder	Betrag/Monat 2026
1	259 €
2	518 €
3	777 €
4	1.036 €
5	1.295 €
Hinweis: Diese Angaben stammen aus Suchausschnitten und einer teilweise geladenen Seite; sie decken sich aber übereinstimmend. Verbindlich ist die Familienkasse. Die Höhe kann sich ab 2027 ändern – dazu lag mir keine belastbare Angabe vor.
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
2026 gibt es 259 € Kindergeld pro Kind und Monat – das ist eine Erhöhung um 4 € gegenüber 255 € im Jahr 2025 kindergeld.org kindergeld.org. Der Betrag ist seit 2023 unabhängig von der Zahl der Kinder raisin.com.
Für mehrere Kinder ergibt sich daraus kindergeld.org:
Kinder	2026 monatlich
1	259 €
2	518 €
3	777 €
4	1.036 €
5	1.295 €
Die Beträge nennen mehrere Quellen übereinstimmend, darunter der DGB mit der Erhöhung zum 1. Januar 2026 dgb.de. Ein Antrag bei der Familienkasse ist weiterhin nötig kindergeld.org finanz.de.
Hinweis: Ich habe nur Auszüge und den Anfang der Hauptseite gesehen, keine vollständigen Originaldokumente. Für verbindliche Auskünfte ist die Familienkasse zuständig.
~~~~~~

### Answer C

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
259 Euro pro Kind und Monat ab dem 1. Januar 2026. kindergeld.org
Das ist eine Erhöhung um 4 Euro gegenüber 2025 (255 Euro). dgb.de Der Betrag gilt einheitlich für jedes Kind, unabhängig von der Anzahl der Kinder. dgb.de finanz.de
Details:
Ausgezahlt wird ab dem Geburtsmonat, bis zum 18. Lebensjahr ohne Bedingungen, in Ausbildung/Studium unter Nachweis längstens bis zum 25. Geburtstag. kindergeld.org finanz.de
Ein schriftlicher Antrag bei der Familienkasse ist erforderlich. kindergeld.org
~~~~~~

## 6. R-06 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What is the latest stable release of Python, and when was it released?
~~~~~~

**Reference for the scorer:**

- Fact: version and date as listed on python.org on the run day
- Element: python.org source link

### Answer A

~~~~~~markdown
The latest stable release is Python 3.15.2, released October 25, 2026.
The Python.org source downloads page labels "Latest Python 3 Release – Python 3.15.2" and lists 3.15.2 with the date Oct. 25, 2026 python.org.
Wikipedia's History of Python excerpt independently states that, as of October 2026, Python 3.15 is the latest stable version en.wikipedia.org.
Caveats worth noting:
Several sources conflict on what the newest major release is: a Python.org release page describes 3.14.0 as "the newest major release" python.org, but that page appears tied to 3.14's original release (Oct. 7, 2025 per the list python.org) and is stale relative to 3.15.
These are search excerpts and one partially rendered page, not a full verification. The page's own listing is the strongest evidence for 3.15.2 as latest; the retrieval date (Nov. 12, 2026) doesn't confirm nothing newer exists.
If you want, I can search for any release after 3.15.2 to rule that out.
~~~~~~

### Answer B

~~~~~~markdown
The latest stable release is Python 3.15.2, released October 25, 2026. It's listed as "Latest Python 3 Release" on Python.org's source downloads page, with source tarballs available python.org.
Two Wikipedia excerpts also describe Python 3.15 as the latest stable version, with 3.15 defaulting to UTF-8 unlike earlier releases en.wikipedia.org en.wikipedia.org. Those excerpts are consistent with the Python.org listing, but they're secondary and partial rather than independent confirmation of the exact version number or date.
Note: the Python.org page also lists a 3.14.0 release page described as the "newest major release" python.org, but that's superseded by 3.15.2 per the release listing python.org.
~~~~~~

### Answer C

~~~~~~markdown
The latest stable release is Python 3.15.2, released on October 25, 2026 python.org. The official Python source releases page explicitly lists "Latest Python 3 Release - Python 3.15.2" with the October 25, 2026 date python.org.
Wikipedia corroborates that Python 3.15 is the latest stable version as of October 2026 en.wikipedia.org, noting that this release defaults to UTF-8, unlike previous versions en.wikipedia.org.
One caveat: a separate python.org page describes Python 3.14.0 as the newest major release python.org, but that refers to the 3.14.0 release from October 7, 2025 python.org and is superseded by the 3.15 series.
~~~~~~

## 7. R-07 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Was kostet ein Reisepass für Erwachsene ab 24 Jahren, und wie lange dauert es ungefähr, bis er fertig ist?
~~~~~~

**Reference for the scorer:**

- Fact: fee as listed by the Bundesinnenministerium or a city Bürgeramt on the run day
- Element: official source link
- Element: processing time given as a range or with a caveat

### Answer A

~~~~~~markdown
Für Erwachsene ab 24 Jahren kostet der Reisepass 70,00 €; er ist dann 10 Jahre gültig bmi.bund.deamtly.app.
Zur Bearbeitungsdauer gibt es unterschiedliche Angaben:
Regulär: Die Quellen nennen 4–6 Wochen amtly.appamtly.app, teils auch „mindestens zwei Wochen" in der Regel, abhängig von der Behörde wiwo.de.
Express: Mit 32 € Zuschlag (also 102 € gesamt) in 3–4 Werktagen amtly.appamtly.app.
Da die Angaben zur regulären Dauer schwanken, frag am besten beim zuständigen Bürgeramt nach der aktuellen Bearbeitungszeit. Zusätzliche Optionen wie 48 Seiten (+22 €) oder Direktversand (+15 €) kosten extra amtly.app.
~~~~~~

### Answer B

~~~~~~markdown
Kosten
Ein Reisepass für Personen ab 24 Jahren kostet 70,00 € und ist 10 Jahre gültig bmi.bund.de. Das sind die offiziellen Gebühren des BMI, die seit dem 7. Februar 2026 gelten bmi.bund.de. Bestätigt wird der Preis auch von mehreren Ratgebern weroad.dewermachtwas.online.
Mögliche Zusatzkosten:
Express-Zuschlag: +32,00 € wermachtwas.online
48 Seiten statt 32: +22,00 € amtly.app
Direktversand nach Hause: ca. 15 € Serviceentgelt amtly.app
Bearbeitungsdauer
Hier widersprechen sich die Quellen leicht:
Nach Angaben des BMI dauert die Ausstellung in der Regel mindestens zwei Wochen, abhängig von der Bearbeitungszeit der jeweiligen Behörde wiwo.de.
Ein Ratgeber rechnet regulär mit 4–6 Wochen, bei Express mit 3–4 Werktagen amtly.app.
Als Faustregel: Mit mindestens 2–6 Wochen einplanen – bei geplanten Reisen also frühzeitig beantragen. Wenn es schnell gehen muss, gibt es den Express-Pass (3–4 Werktage, gesamt 102 € ab 24) oder den vorläufigen Reisepass (26 €, sofort ausgestellt, aber nur 1 Jahr gültig und nicht von allen Ländern akzeptiert) amtly.app.
Hinweis: Die konkrete Bearbeitungszeit hängt von deiner örtlichen Passbehörde ab – am besten dort direkt nachfragen.
~~~~~~

### Answer C

~~~~~~markdown
Für Erwachsene ab 24 Jahren kostet der deutsche Reisepass 70,00 € und ist 10 Jahre gültig bmi.bund.deamtly.app. Unter 24 Jahren sind es 37,50 € bei 6 Jahren Gültigkeit bmi.bund.de.
Bearbeitungsdauer – die Angaben widersprechen sich:
Das BMI nennt laut einer Sekundärquelle in der Regel mindestens zwei Wochen, abhängig von der jeweiligen Behörde wiwo.de.
Ein Ratgeber nennt 4–6 Wochen regulär amtly.app, ein anderer 3–4 Wochen [d6167cc97466 – Abschnitt „Ablauf und Abholung“].
Mit Express-Zuschlag von 32 € (Gesamt 102 €) soll es in 3–4 Werktagen gehen amtly.appwermachtwas.online.
Da die Spanne von zwei Wochen bis sechs Wochen reicht, plane lieber großzügig und frag bei deinem Bürgeramt nach der aktuellen Wartezeit vor Ort. Zusätzliche Kosten fallen z. B. für 48 Seiten (+22 €) oder Direktversand (+15 €) an amtly.appwermachtwas.online.
Hinweis: Die Quellen sind überwiegend Ratgeber-Websites, nicht die Behörde selbst; die BMI-Seite lag nur als kurzer Auszug vor. Verbindlich sind die Angaben deines Bürgeramts.
~~~~~~

## 8. G-01 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Ich bin umgezogen. Bis wann muss ich mein Auto ummelden, und was kostet das ungefähr?
~~~~~~

**Reference for the scorer:**

- Fact: Adressänderung bei der Zulassungsstelle unverzüglich (FZV), keine feste Wochenfrist bundesweit
- Fact: Kosten je nach Zulassungsstelle; wer eine Zahl nennt, muss sie als ungefähr kennzeichnen
- Element: says where unsure
- Element: points to the official source (Zulassungsstelle / Stadt)

### Answer A

~~~~~~markdown
Ich kann Ihnen die wichtigsten Punkte nennen – bei Gebühren und Fristen im Detail bin ich mir aber nicht sicher, weil sich Regelungen ändern können. Bitte prüfen Sie das konkret bei Ihrer Zulassungsstelle bzw. auf den offiziellen Seiten (z. B. der Stadt/Gemeinde und beim Kraftfahrt-Bundesamt).
Frist für die Ummeldung
Grundsätzlich muss ein Fahrzeug nach einem Umzug innerhalb einer Frist von etwa sechs Wochen auf die neue Adresse umgeschrieben werden. Ob es in Ihrem Fall genau sechs Wochen sind, hängt u. a. vom Zulassungsbezirk ab – bitte bei der örtlichen Zulassungsstelle nachfragen.
Wichtig: Nach Umzug in einen anderen Zulassungsbezirk können neue Kennzeichen nötig sein; ziehen Sie nur innerhalb des Bezirks um, bleibt das Kennzeichen meist erhalten.
Die Ummeldung ist gebührenpflichtig und Sie sollten sie nicht hinauszögern – bei einem Verstoß kann ein Verwarnungsgeld anfallen.
Kosten
Die Gebühren liegen je nach Zulassungsstelle und ob neue Kennzeichen nötig sind typischerweise im niedrigen zweistelligen bis mittleren zweistelligen Euro-Bereich (ohne Schilder). Neue Kennzeichen kosten zusätzlich.
Ich möchte Ihnen hier keine exakte Zahl nennen, da sie regional unterschiedlich ist – die genaue Gebühr erfahren Sie bei Ihrer Zulassungsstelle.
Praktisch zu klären
Welche Unterlagen verlangt werden (Personalausweis, Zulassungsbescheinigung Teil I und II, ggf. Vollmacht) – auch das variiert örtlich.
Ob Sie einen Termin brauchen.
Wenn Sie mir sagen, in welcher Stadt/Landkreis Sie jetzt wohnen, kann ich Ihnen die richtigen Suchbegriffe für die zuständige Zulassungsstelle nennen.
~~~~~~

### Answer B

~~~~~~markdown
Kurz vorweg: Deine Frage betrifft aktuelle Regeln und Gebühren, die sich ändern können. Mein Wissen stammt aus Trainingsdaten mit unbekanntem Enddatum und kann veraltet sein. Für Verbindliches prüf die Website deiner Zulassungsstelle bzw. des Kraftfahrt-Bundesamts (KBA). Wenn du möchtest, kann ich eine Websuche anbieten.
Frist
Bei einem Umzug innerhalb Deutschlands muss das Fahrzeug in der Regel unverzüglich umgemeldet werden – üblich ist eine Frist von etwa 6 Wochen nach dem Umzug (oft als „unverzüglich, spätestens binnen 6 Wochen" formuliert). Die genaue Auslegung und mögliche Kulanz regelt die örtliche Zulassungsstelle. Verlass dich für deinen Fall auf deren Angaben.
Bei einem Umzug ins Ausland gelten andere Regeln (Ausfuhr, ggf. neue Zulassung im Zielland).
Kosten (typische Größenordnung)
Ummeldung mit neuen Kennzeichen und neuer Feinstaubplakette: grob ca. 30–60 € bei der Zulassungsstelle, je nach Gemeinde und Leistungen.
Behältst du deine Kennzeichen (möglich, wenn der bisherige Halterkreis passt), fällt oft weniger an, ca. 15–30 €.
Dazu kommen ggf. Kosten für neue Kennzeichen (ca. 10–30 € pro Satz) und bei manchen Versicherern eine Vertragsänderung (meist kostenlos, aber melden musst du den Umzug).
Online-Ummeldung (i-Kfz) ist in vielen Fällen möglich und oft günstiger, aber nicht überall und nicht für alle Fälle.
Praktisch wichtig
Melde den Umzug auch deiner Kfz-Versicherung – die Prämie hängt u. a. von der Region ab (Regionalklasse). Das kann teurer oder günstiger werden.
Nimm zur Zulassungsstelle Personalausweis, Zulassungsbescheinigung Teil I und II, ggf. alten Kennzeichen und eVB-Nummer mit. Genaue Liste bei deiner Zulassungsstelle.
Wenn du mir deine Stadt bzw. deinen Landkreis nennst, kann ich dir sagen, wonach du bei der dortigen Zulassungsstelle konkret suchen solltest – oder ich mache eine Websuche zu den aktuellen Gebühren.
~~~~~~

### Answer C

~~~~~~markdown
Wenn du innerhalb Deutschlands umgezogen bist:
Frist: Die Adressänderung muss unverzüglich bei der Zulassungsbehörde gemeldet werden (§ 15 FZV). Ein bundesweit einheitliches festes Datum wie „innerhalb von X Wochen“ gibt es nicht; viele Zulassungsstellen erwarten aber eine Meldung innerhalb von etwa 2 Wochen. Bei einem neuen Zulassungsbezirk brauchst du in der Regel neue Kennzeichen; im selben Bezirk wird meist nur die Adresse in den Fahrzeugpapieren geändert.
Kosten: Das hängt von der Behörde und davon ab, ob neue Kennzeichen nötig sind. Grob:
gleicher Zulassungsbezirk: ca. 10–25 €
neuer Bezirk mit neuen Kennzeichen: ca. 30–70 € inklusive Kennzeichen
Mitnehmen: Ausweis, Zulassungsbescheinigung Teil I und Teil II, ggf. Vollmacht. Bei Leasing/Finanzierung vorher klären, wer Teil II hat.
Wichtig: Informiere auch deine Kfz-Versicherung über den Umzug.
Die genauen Gebühren und die lokale Handhabung findest du bei deiner Zulassungsstelle; die Beträge variieren.
~~~~~~

## 9. G-02 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Ich bin Arbeitnehmerin, zur Abgabe einer Steuererklärung verpflichtet und habe keinen Steuerberater. Bis wann muss die Steuererklärung für 2025 beim Finanzamt sein?
~~~~~~

**Reference for the scorer:**

- Fact: 31. Juli 2026 (ohne Steuerberater); mit Steuerberater später

### Answer A

~~~~~~markdown
Kurz: Für die Pflicht-Steuererklärung 2025 (Abgabe in 2026) gilt nach der üblichen Regel bis 31. Juli 2026. Wer — wie du — keine Steuerberaterin/keinen Steuerberater hat, kann diese Frist nutzen; die verlängerten Beraterfristen (in der Regel Ende Februar des Folgejahres) gelten für dich nicht.
Wichtige Einordnung:
Der 31. Juli 2026 ist ein Freitag, also kein Wochenende — es braucht keinen Ausweichtermin.
Ich bin mir bei dieser Jahresfrist nicht zu 100 % sicher, weil sich Fristen durch Gesetzesänderungen verschieben können. Verbindlich ist immer der Bescheid/das Schreiben deines Finanzamts bzw. die offizielle Information der Finanzverwaltung. Prüfe die Frist daher bitte dort (z. B. auf der Website deines Finanzamts oder in Elster).
Bei freiwilliger Abgabe (nicht Pflicht) gilt eine längere Frist — das betrifft dich laut deiner Angabe nicht.
Wenn du willst, kann ich dir die typischen Unterlagen für eine Arbeitnehmerin-Steuererklärung zusammenstellen oder erklären, wie du eine Fristverlängerung beantragst.
~~~~~~

### Answer B

~~~~~~markdown
Die Abgabefrist für die Steuererklärung 2025 ist der 31. Juli 2026.
Da Sie zur Abgabe verpflichtet sind und die Erklärung selbst einreichen (ohne Steuerberater oder Lohnsteuerhilfeverein), gilt die allgemeine Frist des § 149 AO: Das Finanzamt muss die Erklärung bis zum 31.07.2026 erhalten haben – bei elektronischer Abgabe über ELSTER genügt die Übermittlung bis zu diesem Tag.
Zur Einordnung:
Mit Steuerberater/Lohnsteuerhilfeverein wäre die Frist der 28.02.2027 – auf Sie trifft das aber nicht zu.
Fristverlängerung: Sie können vor Ablauf formlos beim Finanzamt eine Verlängerung beantragen; diese wird in der Regel bewilligt.
Bei Verspätung setzt das Finanzamt automatisch einen Verspätungszuschlag an, mindestens 25 € pro angefangenem Monat Verspätung. Sollte die Frist bereits verstrichen sein, lohnt es sich, die Erklärung trotzdem so bald wie möglich abzugeben – je früher, desto niedriger der Zuschlag. Sie können das Finanzamt auch schriftlich bitten, von einem Zuschlag abzusehen.
Stand meiner Angaben ist die geltende Gesetzeslage nach meinem Trainingsstand; im Zweifel (z. B. bei offiziell verlängerten Fristen) können Sie die aktuelle Frist direkt beim Finanzamt oder auf elster.de prüfen.
~~~~~~

### Answer C

~~~~~~markdown
Für die Steuererklärung 2025 gilt – nach der derzeitigen Rechtslage – als reguläre gesetzliche Frist der 31. Juli 2026 (Ablauf des siebten Monats nach Ende des Kalenderjahres, § 149 AO).
Wichtige Punkte für Sie als pflichtveranlagte Arbeitnehmerin ohne Steuerberater:
Gesetzliche Frist: 31.07.2026 – das ist ein Freitag, also keine Verschiebung durch ein Wochenende.
Verlängerung nur auf Antrag: Das Finanzamt kann die Frist verlängern, wenn Sie einen begründeten Antrag stellen (z. B. Krankheit, besondere Umstände). Der Antrag sollte vor Fristablauf eingehen.
Keine automatische Verlängerung wie bei Steuerberatern (dort gelten längere Fristen) – das betrifft Sie nicht.
Säumniszuschlag/Verspätungszuschlag: Bei verspäteter Abgabe kann das Finanzamt einen Verspätungszuschlag festsetzen.
Ich bin mir bei Fristdetails für 2026 nicht in jedem Punkt sicher, da sich Regelungen ändern können. Verbindlich ist immer der Fristbescheid bzw. die Angabe Ihres Finanzamts – prüfen Sie das am besten auf der offiziellen Seite Ihres Finanzamts oder bei ELSTER, oder fragen Sie telefonisch beim Finanzamt nach.
Möchten Sie, dass ich Ihnen die typischen Unterlagen für eine Arbeitnehmer-Steuererklärung zusammenstelle?
~~~~~~

## 10. G-03 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie hoch ist der Rundfunkbeitrag im Moment pro Monat?
~~~~~~

**Reference for the scorer:**

- Fact: amount as listed on rundfunkbeitrag.de on the run day
- Element: if not certain: says so and points to rundfunkbeitrag.de

### Answer A

~~~~~~markdown
Der Rundfunkbeitrag beträgt seit August 2024 18,36 € pro Monat (55,08 € pro Quartal). Er gilt pro Wohnung, unabhängig von der Anzahl der Personen oder Geräte.
Hinweis: Diese Angaben stammen aus meinem Trainingswissen und können veraltet sein. Für den aktuell verbindlichen Stand prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de) – dort findest du auch mögliche Änderungen oder Befreiungen (z. B. für Studierende, Empfänger von Sozialleistungen).
~~~~~~

### Answer B

~~~~~~markdown
Der Rundfunkbeitrag liegt aktuell bei 18,36 € pro Monat (55,08 € pro Quartal). Er gilt seit 2015 unverändert in dieser Höhe.
Wichtig: Zuletzt gab es Diskussionen und eine Entscheidung zum ARD-Staatsvertrag und zur Beitragsentwicklung. Da sich solche Beschlüsse kurzfristig ändern können, kann mein Wissensstand veraltet sein – für die aktuell verbindliche Höhe prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de).
Wenn du möchtest, suche ich dir die aktuelle Bestätigung heraus.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Nach meinem Trainingsstand, der veraltet sein kann – der Grundbeitrag je Wohnung lag bei 18,36 €/Monat (55,08 €/Quartal), gültig seit Mai 2021. Die Länder haben eine Erhöhung auf 18,94 €/Monat beschlossen; als Inkrafttreten wurden je nach Berichtslage der 1. Juli 2025 bzw. der 1. Januar 2026 genannt. Welches Datum letztlich galt und ob es inzwischen weitere Änderungen gibt, kann ich nicht sicher sagen, da mein Wissen einen nicht veröffentlichen Stichtag hat.
Ein paar Einordnungen:
Der Beitrag gilt pro Wohnung, unabhängig von Anzahl der Personen, Geräte oder Radiosender.
Verbindlich und aktuell ist die offizielle Seite des Beitragsservice von ARD, ZDF und Deutschlandradio: rundfunkbeitrag.de. Dort steht der momentane Betrag und auch, ob du unter Umständen (z. B. Schwerbehinderung, BAföG, Wohngeld) ermäßigt oder befreit bist.
Da Gebühren sich ändern können: Möchtest du, dass ich eine Websuche nach dem aktuellen Stand mache?
~~~~~~

## 11. G-04 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Welche Kündigungsfrist habe ich als Mieter bei einem normalen unbefristeten Mietvertrag?
~~~~~~

**Reference for the scorer:**

- Fact: drei Monate (§ 573c BGB), Kündigung spätestens am dritten Werktag eines Monats zum Ablauf des übernächsten Monats
- Fact: schriftlich

### Answer A

~~~~~~markdown
In Deutschland gilt für Mieter bei einem unbefristeten Mietvertrag über Wohnraum die gesetzliche Kündigungsfrist von drei Monaten (§ 573c BGB). Die Kündigung muss schriftlich erfolgen und spätestens am dritten Werktag eines Monats beim Vermieter zugehen, damit die Frist mit diesem Monat beginnt.
Wichtige Punkte:
Kein Staffelrecht für Mieter: Die längeren Fristen (6 bzw. 9 Monate) gelten nur für den Vermieter bei langer Mietdauer – nicht für dich.
Vereinbarte Fristen: Eine im Vertrag vereinbarte längere Frist für den Mieter ist nur wirksam, wenn sie den Vermieter nicht schlechter stellt als dich (also meist unwirksam, wenn nur der Mieter länger gebunden ist). Kürzere Fristen als drei Monate sind bei Wohnraum unwirksam.
Sonderkündigungsrechte (z. B. bei berechtigtem Interesse, § 573 BGB, oder außerordentlich mit Frist) können abweichen.
Form: Schriftform mit eigenhändiger Unterschrift (bei mehreren Mietern von allen); E-Mail oder Fax genügen nicht.
Ob im konkreten Vertrag abweichende oder wirksame Klauseln stehen, hängt vom Einzelfall ab – bei Unsicherheit lohnt ein Blick in den Vertrag oder eine kurze Rückfrage bei einem Mieterverein. (Ich bin keine Rechtsberatung.)
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gilt für Mieter eines unbefristeten Wohnraummietvertrags in der Regel eine gesetzliche Kündigungsfrist von 3 Monaten (§ 573c BGB). Die Kündigung muss schriftlich erfolgen (mit Unterschrift, nicht per E-Mail) und bis zum 03. Werktag eines Monats zugehen, damit dieser Monat als Beginn der Frist zählt.
Wichtige Punkte:
Verlängerte Fristen gelten nur für Vermieter, nicht für Mieter. Für dich als Mieter bleibt es bei 3 Monaten, auch nach langer Mietdauer.
Andere Fristen nur per Vertrag: Eine längere Frist für den Mieter ist im Vertrag grundsätzlich möglich – sie darf den Mieter aber nicht schlechter stellen, als es die gesetzliche Regelung vorsieht (eine formularmäßige Verlängerung auf z. B. 6 Monate ist meist unwirksam). Schau also in deinen Vertrag.
Sonderkündigungsrechte (z. B. bei Umzug aus wichtigem Grund, § 575 BGB oder bei Modernisierung) können kürzere Fristen ermöglichen – das ist aber ein eigener Fall.
Fristberechnung: Kündigung zum Monatsende; Zugang bis zum 3. Werktag des Monats. „Werktag“ = Montag bis Freitag (Samstag zählt nicht).
Da ich Regelungen nicht immer aktuell und nicht jede Vertragsklausel kenne: Prüfe die genaue Frist im Mietvertrag und im Zweifel bei einem Mieterverein oder einer Rechtsberatung. (Für verbindliche Auskunft ist eine Rechtsberatung zuständig.)
~~~~~~

### Answer C

~~~~~~markdown
Kurze Antwort
Als Mieter können Sie ein unbefristetes Mietverhältnis mit einer Frist von drei Monaten zum Ende eines Kalendermonats ordentlich kündigen (§ 573c Abs. 1 BGB). Das gilt unabhängig davon, wie lange Sie schon in der Wohnung wohnen.
Wichtig in der Praxis
Zugang zählt, nicht der Absendezeitpunkt: Die Kündigung muss dem Vermieter rechtzeitig zugehen. Beispiel: Geht die Kündigung am 15. Januar zu, endet das Mietverhältnis am 30. April.
Schriftform erforderlich: Die Kündigung muss schriftlich mit eigenhändiger Unterschrift erfolgen (§ 568 BGB). E-Mail, WhatsApp oder mündlich reichen nicht.
Nachweis sichern: Am besten per Einschreiben mit Rückschein oder persönlicher Übergabe gegen Bestätigung. Fordern Sie zusätzlich eine Kündigungsbestätigung an.
Abweichende Vereinbarungen
Eine kürzere Frist (z. B. zum Monatsersten oder „zum Monatsende“) kann im Vertrag wirksam vereinbart sein – prüfen Sie also Ihre Vertragsklauseln.
Eine längere Frist für den Mieter ist in Formularkverträgen in der Regel unwirksam (BGH-Rechtsprechung); sie könnte nur gelten, wenn sie individuell ausgehandelt wurde.
Zur Einordnung
Für den Vermieter gelten andere, mit der Mietdauer steigende Fristen (3, 6 bzw. 9 Monate) – für Sie als Mieter bleibt es aber bei 3 Monaten. Die Gesetzesfassung mit Beispielen finden Sie im BGB unter § 573c, z. B. auf gesetze-im-internet.de. Im Zweifel (etwa bei ungewöhnlichen Vertragsklauseln oder im Streitfall) lohnt sich eine Beratung durch Mieterverein oder Anwältin/Anwalt.
~~~~~~

## 12. G-05 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie viele Tage gesetzlichen Mindesturlaub habe ich bei einer Fünf-Tage-Woche?
~~~~~~

**Reference for the scorer:**

- Fact: 20 Arbeitstage (24 Werktage bei Sechs-Tage-Woche, BUrlG)

### Answer A

~~~~~~markdown
20 Arbeitstage pro Jahr.
Hintergrund: Das Bundesurlaubsgesetz (§ 3 BUrlG) legt einen Mindesturlaub von 24 Werktagen fest – bezogen auf eine 6-Tage-Woche (Montag bis Samstag). Bei einer Fünf-Tage-Woche wird das umgerechnet:
24 ÷ 6 × 5 = 20 Urlaubstage
Das entspricht vier Wochen Urlaub und ist das gesetzliche Minimum. In der Praxis bieten Arbeitsverträge und Tarifverträge oft mehr an, häufig 25–30 Tage. Prüfe am besten deinen Vertrag oder den einschlägigen Tarifvertrag – vertraglich eingeräumter Urlaub darf übrigens nicht unter dem gesetzlichen Minimum liegen.
~~~~~~

### Answer B

~~~~~~markdown
Bei einer Fünf-Tage-Woche sind es 20 Arbeitstage gesetzlicher Mindesturlaub pro Jahr.
Grundlage: Das Bundesurlaubsgesetz (§ 3 BUrlG) schreibt mindestens 24 Werktage vor – gezählt werden dabei alle Werktage inklusive Samstag. Bei einer 5-Tage-Woche (Montag–Freitag) entspricht das 24 × 5/6 = 20 Arbeitstage.
Hinweise:
Der gesetzliche Mindesturlaub ist eine Untergrenze; Tarifverträge oder Arbeitsverträge sehen oft mehr vor.
Bei weniger als einer 5-Tage-Woche reduziert sich der Anspruch entsprechend.
Für Sonderfälle (z. B. unterjähriger Ein-/Austritt, Teilzeit) gilt die anteilige Berechnung – im Zweifel beim Arbeitgeber oder einer Gewerkschaft nachfragen.
~~~~~~

### Answer C

~~~~~~markdown
Bei einer 5-Tage-Woche sind es 20 Arbeitstage gesetzlicher Mindesturlaub pro Jahr.
Grundlage: Das Bundesurlaubsgesetz (§ 3 BUrlG) schreibt mindestens 24 Werktage vor, gezählt auf Basis einer 6-Tage-Woche. Bei 5 Arbeitstagen pro Woche rechnet man um: 24 × 5/6 = 20 Arbeitstage.
Hinweise:
Das ist das Minimum; Arbeits- oder Tarifvertrag können mehr vorsehen.
Der gesetzliche Anspruch entsteht anteilig nach Beschäftigungsmonaten (nach 6 Monaten Wartezeit der volle Anspruch).
Bei unterjährigem Ein-/Austritt wird anteilig gerechnet.
Für deinen konkreten Vertrag gilt: prüfe Arbeitsvertrag und ggf. Tarifvertrag – die können günstiger sein.
~~~~~~

## 13. G-06 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Ich habe meinen Personalausweis verloren. Was muss ich tun, und was kostet ein neuer?
~~~~~~

**Reference for the scorer:**

- Fact: Verlust beim Bürgeramt (oder Polizei) melden
- Fact: neuen Ausweis beim Bürgeramt beantragen
- Fact: Gebühr wie vom BMI/Bürgeramt am Testtag angegeben; wer unsicher ist, sagt es und verweist auf die offizielle Quelle

### Answer A

~~~~~~markdown
Das ist ärgerlich, aber gut lösbar. So gehen Sie am besten vor:
1. Online-Ausweisfunktion (eID) sofort sperren lassen
Damit niemand Ihre eID missbrauchen kann, rufen Sie die zentrale Sperr-Hotline 116 116 an (rund um die Uhr erreichbar). Die Sperre können Sie später bei der Behörde wieder aufheben lassen.
2. Bei Diebstahl: Anzeige bei der Polizei
Bei reinem Verlust ist keine Anzeige nötig, bei Diebstahl aber sinnvoll – sie schützt Sie, falls der Ausweis missbraucht wird.
3. Neuen Personalausweis beantragen
Persönlich beim Bürgeramt / Einwohnermeldeamt (oft mit Online-Termin). Dort melden Sie den Verlust und stellen den Antrag; es werden Fingerabdrücke abgenommen.
Mitbringen: aktuelles biometrisches Passfoto und, falls vorhanden, einen Reisepass oder andere Identitätsnachweise (z. B. Geburtsurkunde).
Bearbeitung dauert in der Regel einige Wochen. Brauchen Sie schneller einen Nachweis, stellt die Behörde einen vorläufigen Personalausweis sofort aus (3 Monate gültig, nur in Deutschland).
Hinweis: Ab 16 besteht in Deutschland eine Besitzpflicht – Sie müssen wieder einen gültigen Personalausweis oder Reisepass besitzen, also zeitnah beantragen.
Falls Sie sich gerade im Ausland befinden: wenden Sie sich an die zuständige deutsche Botschaft bzw. das Konsulat.
Kosten
Zuletzt bekannt (Stand meiner Trainingsdaten, seit 2021): 37 € für Personen ab 24 Jahren, 22,90 € für unter 24-Jährige. Da Gebühren zuletzt geändert wurden und ich nicht sicher bin, ob das aktuell noch gilt, nennt Ihnen das Bürgeramt den verbindlichen Betrag; offizielle Informationen finden Sie auch auf dem Serviceportal des Bundes (service.bund.de).
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gilt: Personalausweis verlieren = Diebstahl oder Verlust sofort melden und einen neuen beantragen. Konkrete Schritte:
1. Verlust melden (wichtigster Schritt)
Polizei: Verlustanzeige erstatten – bei Diebstahl unbedingt, bei einfachem Verlust ebenfalls empfehlenswert (schützt vor Missbrauch, dient als Nachweis).
Bürgeramt / Meldebehörde deines Wohnsitzes: Verlust unverzüglich anzeigen. Dort wird der alte Ausweis gesperrt und ein neuer beantragt. Viele Ämter bieten das online oder telefonisch an – prüfe die Website deiner Kommune.
2. Neuen Personalausweis beantragen
Persönlich beim Bürgeramt, mit biometrischem Passfoto und gültigem Nachweis (z. B. Reisepass, falls vorhanden; sonst klären, was das Amt akzeptiert).
Ab 16 Jahren ist der Ausweis Pflicht; Kinder unter 16 brauchen ein eigenes Dokument, falls erforderlich.
Bearbeitungszeit: meist einige Wochen (oft ca. 4–6 Wochen, je nach Amt). Ein vorläufiger Personalausweis ist meist sofort möglich, wenn du schnell ein Dokument brauchst.
3. Kosten
Die genauen Gebühren legt die Kommune fest. Für einen Personalausweis ab 24 Jahren liegt die Regelgebühr meist bei ca. 37 €, für unter 24 Jahren bei ca. 22,80 €. Ein vorläufiger Ausweis kostet zusätzlich meist ca. 10 €.
Ich bin bei den genauen Beträgen nicht sicher – diese ändern sich und variieren je nach Amt. Verbindliche Auskunft gibt dein Bürgeramt oder die offizielle Website deiner Kommune (bzw. des Bundesministeriums des Innern).
Tipp: Sperre parallel auch deine eID-/Online-Ausweisfunktion, falls du sie genutzt hast – das Bürgeramt kann dir sagen, wie. Und prüfe, ob du den Verlust bei Banken/Vertragspartnern melden solltest.
Soll ich dir helfen, die zuständige Behörde oder die genauen Gebühren für deine Stadt zu finden? Dann sag mir, wo du wohnst.
~~~~~~

### Answer C

~~~~~~markdown
Ein verlorener Personalausweis in Deutschland: Das Wichtigste zuerst – melden und sperren lassen, damit niemand ihn missbrauchen kann.
Was zu tun ist
Verlust melden (Polizei): Bei Diebstahl unbedingt Anzeige erstatten; bei einfachem Verlust ist eine Verlustanzeige bei der Polizei sinnvoll (dient oft als Nachweis gegenüber Behörden).
Sperrung / „Ausweis-Notfall“: Die Online-Ausweisfunktion (eID) des Ausweises sperren lassen – über die Hotline des Bundesamts für Sicherheit in der Informationstechnik (BSI) oder online. Die genauen Nummern und Wege stehen auf der offiziellen Seite des BSI bzw. auf ausweisapp.de. So wird verhindert, dass jemand mit der eID Online-Dienste in Ihrem Namen nutzt.
Neuen Ausweis beantragen: Bei der Meldebehörde Ihres Hauptwohnsitzes (Bürgeramt). Dafür brauchen Sie in der Regel ein biometrisches Passfoto, den Verlustnachweis (z. B. Polizeianzeige) und ggf. weitere Unterlagen (Geburtsurkunde, bei Minderjährigen Einverständnis der Sorgeberechtigten). Personalausweis ist Pflicht ab 16 Jahren; ab 24 Jahren gilt die 10-Jahres-Gültigkeit.
Vorläufigen Ausweis: Wenn Sie schnell einen brauchen (z. B. für Reisen), kann ein vorläufiger Personalausweis ausgestellt werden – meist sofort, mit kurzer Gültigkeit.
Kosten
Die Gebühr für einen neuen Personalausweis liegt regulär bei 37 Euro (ab 24 Jahren, 10 Jahre gültig). Für Personen unter 24 Jahren sind es 22,50 Euro. Ein vorläufiger Personalausweis kostet zusätzlich in der Regel 10 Euro. Bei Verlust kann ein Zuschlag anfallen (oft etwa 6 Euro), und bei Diebstahl kann die Polizeianzeige Gebühren haben.
Ich bin bei Gebühren und Fristen nicht ganz sicher, da sie sich je nach Kommune und Rechtslage ändern können – bitte prüfen Sie die aktuellen Beträge auf der Website Ihrer Stadt/Gemeinde oder beim Bundesministerium des Innern (bmi.bund.de) bzw. beim Bundesverwaltungsamt.
Praktischer Tipp: Melden Sie den Verlust zuerst, sperren Sie die eID und vereinbaren Sie – falls nötig – zeitnah einen Termin beim Bürgeramt, da Termine oft knapp sind.
~~~~~~

## 14. T-01 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
How many moons does Jupiter have?
~~~~~~

**Reference for the scorer:**

- Element: either the current confirmed count (checked on the run day) or the count with its date plus a note that it changes and an offer to search

### Answer A

~~~~~~markdown
Jupiter has 95 confirmed moons according to my training data (recognized by the International Astronomical Union as of early 2024). The four largest are the Galilean moons—Io, Europa, Ganymede, and Callisto—discovered by Galileo in 1610.
Keep in mind that moon counts change as new discoveries are confirmed, so the current number may be higher. Notably, Saturn overtook Jupiter in 2023 and now has the most known moons of any planet. If you'd like, I can offer a web search for the latest count.
~~~~~~

### Answer B

~~~~~~markdown
Jupiter currently has 95 confirmed moons, according to the International Astronomical Union's most recent count. That figure has changed repeatedly as astronomers discover and confirm small, distant satellites, so it may already be out of date—my knowledge comes from training data with an unpublished end date. For the latest number, a quick check of the IAU or NASA is worthwhile.
~~~~~~

### Answer C

~~~~~~markdown
Jupiter has 95 confirmed moons, according to the International Astronomical Union's count as of recent years. That number can change as new small moons are discovered and confirmed, so treat it as current-ish rather than permanent.
Quick context: most are tiny, irregular objects; the four largest (Io, Europa, Ganymede, Callisto) were found by Galileo in 1610. If you need the latest confirmed figure, I can offer a web search—my knowledge may be out of date.
~~~~~~

## 15. T-02 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Who is the current President of the European Commission?
~~~~~~

**Reference for the scorer:**

- Fact: as on the run day
- Element: if stated from training data: says so with the knowledge date

### Answer A

~~~~~~markdown
Ursula von der Leyen is the President of the European Commission. She began her second term in December 2024.
My knowledge comes from training data with an unpublished end date, so for confirmation of the current office holder, check the official European Commission website (ec.europa.eu). I can also do a web search if you'd like.
~~~~~~

### Answer B

~~~~~~markdown
As of my training data (which has an unpublished cutoff and may be out of date), the President of the European Commission is Ursula von der Leyen. She was re-elected by the European Parliament for a second term in 2024–2025.
I can't verify her current status live, so if this matters, check the official site at ec.europa.eu, or I can offer to look it up via web search.
~~~~~~

### Answer C

~~~~~~markdown
As of my knowledge, Ursula von der Leyen (Germany, European People's Party) is the President of the European Commission. She was first elected in 2019 and re-elected by the European Parliament in July 2024 for a second term, which runs until 2029.
Note: my information comes from training data with an unpublished end date and may be out of date. Would you like me to offer a web search to confirm?
~~~~~~

## 16. T-03 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
What's the latest LTS version of Node.js?
~~~~~~

**Reference for the scorer:**

- Element: either the current LTS line (checked on the run day) or a dated answer with an offer to search

### Answer A

~~~~~~markdown
I can't reliably name the current LTS version — my knowledge comes from training data with an unpublished cutoff and may be out of date, and Node.js LTS lines change regularly.
To check the authoritative, current answer:
Official site: nodejs.org (https://nodejs.org) shows the current LTS and Current versions on the download page.
Release schedule: the Node.js releases page (https://nodejs.org/en/about/previous-releases) lists which lines are Active LTS, Maintenance LTS, or End-of-Life.
Command line: nvm ls-remote --lts or fnm ls-remote --lts lists available LTS builds.
A quick tip: install the LTS line rather than "Current" for production work, and pin the major version in your project. If you tell me your setup (nvm, fnm, Docker, OS), I can outline the exact install/upgrade steps.
~~~~~~

### Answer B

~~~~~~markdown
My training data has an unpublished cutoff and may be out of date, so I can't reliably name the current LTS release. Please check the official Node.js releases page (nodejs.org/en/about/previous-releases) or run nvm ls-remote --lts. I can do a web search if you'd like the latest figure.
~~~~~~

### Answer C

~~~~~~markdown
Based on my training data (which has an unpublished end date and may be out of date):
Node.js 22 "Jod" — became the active LTS in October 2024.
Node.js 24 — was scheduled to become the active LTS in October 2025, following Node.js's usual pattern (even-numbered majors go LTS each October).
If your current date (November 2026) is right, Node.js 26 would likely have just become the active LTS around October 2026 — but I can't confirm that from my training data.
To verify the current LTS today:
Check nodejs.org — the homepage shows the recommended LTS version.
See the official release schedule at github.com/nodejs/release.
Want me to run a web search to confirm the latest LTS version?
~~~~~~

## 17. T-04 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Wer ist aktuell Bundeskanzler?
~~~~~~

**Reference for the scorer:**

- Fact: as on the run day
- Element: if stated from training data: says so with the knowledge date

### Answer A

~~~~~~markdown
Mein Trainingswissen hat ein unbekanntes Enddatum und kann veraltet sein – die aktuelle Amtsinhaberschaft kann ich daher nicht zuverlässig bestätigen. Ich kann aber gern eine Websuche machen, wenn du möchtest.
Zur Einordnung: In Deutschland amtiert der Bundeskanzler nach der Bundestagswahl 2025 – Friedrich Merz (CDU) wurde im Mai 2025 zum Bundeskanzler gewählt. Bitte prüfe das gegen eine aktuelle offizielle Quelle (z. B. bundesregierung.de oder bundestag.de), da sich Ämter ändern können.
~~~~~~

### Answer B

~~~~~~markdown
Mein Wissen stammt aus Trainingsdaten mit unbekanntem Enddatum und kann veraltet sein. Nach meinem Kenntnisstand ist Friedrich Merz (CDU) seit Mai 2025 Bundeskanzler – das Amt wechselte damals von Olaf Scholz (SPD) zu ihm.
Da sich Amtsträger ändern können: Soll ich für dich im Web nachsehen, wer aktuell im Amt ist?
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Kenntnisstand ist Friedrich Merz (CDU) Bundeskanzler; er wurde am 6. Mai 2025 gewählt, nachdem die Union die Bundestagswahl im Februar 2025 gewonnen hatte.
Mein Wissen stammt allerdings aus Trainingsdaten mit unveröffentlichtem Enddatum und kann veraltet sein. Wenn du ganz sichergehen willst, kann ich gerne eine Websuche durchführen – oder du prüfst es direkt auf der Seite des Presse- und Informationsamts der Bundesregierung (bundesregierung.de).
~~~~~~

## 18. T-05 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Was kostet das Deutschlandticket gerade im Monat?
~~~~~~

**Reference for the scorer:**

- Fact: price as listed on the run day
- Element: if not current: dated and offers a search

### Answer A

~~~~~~markdown
Nach meinem Kenntnisstand kostet das Deutschlandticket 58 € pro Monat – dieser Preis gilt seit Januar 2025 (zuvor waren es 49 €).
Allerdings gab es bereits Diskussionen über weitere Preiserhöhungen, und da mein Wissen aus Trainingsdaten stammt, die nicht tagesaktuell sind, kann ich nicht sicher sagen, ob die 58 € im November 2026 noch gelten. Den verbindlichen aktuellen Preis findest du auf deutschlandticket.de oder bei der Deutschen Bahn bzw. deinem Verkehrsverbund.
Soll ich danach suchen, um den aktuellen Preis zu prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Das Deutschlandticket kostet im Monat 58 € als reguläres Abo (Stand meiner Informationen; der Preis kann sich ändern). Es ist ein bundesweit gültiges Nahverkehrs-Abo im monatlich kündbaren Modell.
Weil sich Preise und Konditionen ändern können und mein Wissensstand nicht tagesaktuell ist, prüfe den aktuellen Preis am besten direkt bei einem Verkehrsverbund oder auf bahn.de bzw. der Seite des Deutschlandtickets. Soll ich für dich danach suchen?
~~~~~~

### Answer C

~~~~~~markdown
Das Deutschlandticket kostet im Abo regulär 58 € pro Monat (Stand meiner Informationen; der Preis ist seit 2025 von 49 € auf 58 € gestiegen). Es ist ein reines Abo-Monatsticket und gilt im gesamten Nah- und Regionalverkehr.
Wichtig: Preise und Konditionen können sich ändern, und mein Wissen hat ein unbekanntes Enddatum – der aktuelle Preis könnte also abweichen. Verbindlich steht er auf bahn.de bzw. bei deinem Verkehrsverbund. Soll ich für dich im Web nachsehen, ob es gerade einen anderen Preis oder Sonderregelungen (z. B. für Studierende oder Ermäßigungen) gibt?
~~~~~~

## 19. T-06 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
What is the population of Germany?
~~~~~~

**Reference for the scorer:**

- Element: a figure with its reference date (Destatis) and a note that it changes

### Answer A

~~~~~~markdown
As of the most recent official data I have, Germany's population is roughly 84–85 million. The Federal Statistical Office (Destatis) reported about 83.5 million in the 2022 census, and subsequent estimates have been in the mid-84 million range.
Because this figure changes with migration and is revised periodically, I'm not certain of the exact current number — for the latest, check Destatis (destatis.de). Want me to do a web search for the most recent figure?
~~~~~~

### Answer B

~~~~~~markdown
Germany's population is approximately 83–84 million people, based on figures from the Federal Statistical Office (Destatis) in my training data — roughly 83.5 million in recent years.
Note that this figure changes over time due to migration and demographic trends, and my training data has an unpublished end date, so it may be slightly out of date. Would you like me to search for the most current official figure?
~~~~~~

### Answer C

~~~~~~markdown
Germany's population is roughly 83–84 million. The most commonly cited figure is about 83.5 million (based on recent German federal statistics). For the exact current number, Destatis (the Federal Statistical Office) publishes updated figures, so check destatis.de if you need the latest value.
~~~~~~

## 20. T-07 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
What causes the seasons on Earth?
~~~~~~

**Reference for the scorer:**

- Fact: axial tilt of about 23.4°, not distance from the Sun
- Element: no search suggestion (timeless)

### Answer A

~~~~~~markdown
Earth's seasons are caused by the tilt of Earth's axis, not by distance from the Sun.
The key mechanism
Earth's axis is tilted about 23.4° relative to its orbital plane.
As Earth orbits the Sun, that tilt keeps pointing in the same direction in space, so different hemispheres receive sunlight at different angles and for different lengths of time through the year.
When your hemisphere is tilted toward the Sun, sunlight strikes more directly and days are longer → summer. When tilted away, sunlight is more oblique and days shorter → winter.
Around the equinoxes (March and September), both hemispheres get roughly equal day and night.
Why it isn't distance
Earth is actually closer to the Sun in early January (Northern Hemisphere winter) and farther in early July (Northern summer). So proximity can't explain the seasons — the tilt does. The ~3% distance variation has only a minor effect.
Common misconception
The often-repeated idea that summer happens because "the Sun is closer" or because "the Northern Hemisphere is nearer the Sun" is wrong; the hemisphere tilts toward the Sun, but the whole Earth is essentially the same distance from it.
The same tilt also explains why the seasons are reversed between hemispheres and why polar regions have extreme seasonal daylight (midnight sun and polar night).
~~~~~~

### Answer B

~~~~~~markdown
The seasons are caused by Earth's axial tilt (about 23.5°) combined with its orbit around the Sun — not by changes in distance from the Sun.
How it works:
Earth's axis stays pointed in the same direction (toward Polaris) as it orbits, so different hemispheres lean toward or away from the Sun at different times of year.
When a hemisphere is tilted toward the Sun:
Sunlight strikes it at a more direct (steep) angle, delivering more energy per unit of surface area.
Days are longer, so that hemisphere receives more total sunlight.
Result: summer.
When it's tilted away, sunlight hits at a shallower angle and days are shorter → winter.
A common misconception: distance from the Sun doesn't cause the seasons. Earth is actually closest to the Sun in early January — winter in the Northern Hemisphere — and farthest in July. The small variation in distance has only a minor effect compared to the tilt.
That's also why seasons are opposite in the two hemispheres: when it's summer in the north, it's winter in the south.
~~~~~~

### Answer C

~~~~~~markdown
Earth's seasons are caused by the tilt of Earth's axis, not by its changing distance from the Sun.
Axial tilt (~23.4°): Earth's rotational axis is tilted relative to its orbital plane. As Earth orbits the Sun, different hemispheres lean toward or away from the Sun at different times of year.
Changing Sun angle and day length: When your hemisphere leans toward the Sun, sunlight strikes more directly and days are longer — summer. When it leans away, sunlight is more slanted and days shorter — winter. Spring and autumn are the transitions.
Opposite hemispheres: Because of the tilt, the Northern and Southern Hemispheres have opposite seasons at the same time.
Not distance: Earth is actually closest to the Sun in early January, during Northern-Hemisphere winter, so distance is not the main driver. The ~3% variation in distance has only a minor effect.
Solstices and equinoxes: Solstices mark when a hemisphere is tilted most toward or away from the Sun; equinoxes occur when the tilt is roughly side-on, giving nearly equal day and night.
A simple way to picture it: the tilt stays pointed in the same direction in space as Earth orbits, so each hemisphere alternately faces toward and away from the Sun over the year.
~~~~~~

## 21. T-08 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Erkläre kurz, wie ein Kredit mit Annuitätentilgung funktioniert.
~~~~~~

**Reference for the scorer:**

- Fact: gleichbleibende Rate; Zinsanteil sinkt, Tilgungsanteil steigt
- Element: no search suggestion (timeless)

### Answer A

~~~~~~markdown
Bei einem Annuitätendarlehen zahlst du jedes Jahr (oder jeden Monat) eine gleichbleibende Rate – die Annuität. Sie setzt sich aus Zins und Tilgung zusammen:
Zinsanteil: Zinsen auf die verbleibende Restschuld. Da die Schuld mit der Zeit sinkt, sinkt auch der Zinsanteil.
Tilgungsanteil: der Rest der Rate. Er steigt im Lauf der Zeit, weil der Zinsanteil kleiner wird.
Beispiel (vereinfacht): 100.000 € Kredit, 4 % Zins, anfängliche Tilgung 2 % → erste Jahresrate 6.000 € (4.000 € Zins + 2.000 € Tilgung). Im zweiten Jahr fallen die Zinsen nur noch auf 98.000 € an, der Tilgungsanteil steigt entsprechend.
Wichtige Punkte:
Die anfängliche Tilgung bestimmt, wie schnell du schuldenfrei bist – bei 2 % dauert es rechnerisch rund 30+ Jahre, bei höherer Tilgung entsprechend kürzer.
Sondertilgungen verkürzen die Laufzeit, sind aber nicht bei jedem Vertrag kostenlos.
Zinsbindung: Nach Ablauf (z. B. 10 Jahre) wird der Zins neu festgelegt – die Restschuld bleibt als Risiko.
Zins und Tilgung ergeben die Annuität; sie bleibt nur bei fester Zinsbindung konstant.
Für konkrete Konditionen oder einen Tilgungsplan lohnt ein Blick auf das Angebot der Bank bzw. ein Beratungsgespräch – ich kann dir hier nur die Mechanik erklären, keine individuelle Finanzempfehlung geben.
~~~~~~

### Answer B

~~~~~~markdown
Annuitätentilgung – kurz erklärt
Bei einem Annuitätendarlehen zahlst du jeden Monat denselben Betrag – die Annuität. Sie setzt sich aus zwei Teilen zusammen:
Zinsen auf den noch offenen Kreditbetrag (Restschuld)
Tilgung, also die Rückzahlung des Darlehens selbst
Wie sich das verändert:
Da mit jeder Zahlung die Restschuld sinkt, werden die Zinsen von Monat zu Monat geringer.
Weil die Annuität gleich bleibt, steigt der Tilgungsanteil automatisch kontinuierlich an.
Am Ende ist das Darlehen vollständig getilgt.
Beispiel: Bei 200.000 € Kredit, 3 % Zins und 2 % Anfangstilgung beträgt die Annuität ca. 833 € im Monat. Anfangs sind davon 500 € Zinsen und 333 € Tilgung – später kehren sich die Verhältnisse immer mehr zugunsten der Tilgung um.
Praktische Hinweise:
Die anfängliche Tilgungsrate bestimmt, wie schnell das Darleenz zurückgezahlt ist (bei 2 % Anfangstilgung dauert es rechnerisch ca. 35–40 Jahre, je nach Zinssatz).
Bei variablen Zinsen oder Zinsbindungsende kann sich die Rate ändern bzw. neu verhandelt werden.
Sondertilgungen verkürzen die Laufzeit und Zinskosten – ob und wie viel erlaubt ist, steht im Vertrag.
Diese Form ist die üblichste bei Immobilienfinanzierungen, weil sie mit konstanten Raten gut planbar ist. Konkrete Konditionen und Raten hängen vom jeweiligen Angebot ab – bei einer konkreten Finanzierung lohnt sich der Blick in den Darlehensvertrag bzw. eine Beratung.
~~~~~~

### Answer C

~~~~~~markdown
Bei einem Annuitätendarlehen zahlst du jeden Monat (oder jährlich) eine gleichbleibende Rate – die Annuität. Sie besteht aus zwei Teilen:
Zinsen: berechnet auf die Restschuld
Tilgung: der Rest der Rate, der die Schuld reduziert
Der Mechanismus: Am Anfang ist die Restschuld hoch, also sind die Zinsen hoch und der Tilgungsanteil klein. Mit jeder Rate sinkt die Restschuld, dadurch sinken die Zinsen und der Tilgungsanteil wächst – bei gleichbleibender Gesamtrate. Die Schuld wird also mit der Zeit immer schneller getilgt.
Beispiel (vereinfacht): 100.000 € zu 4 % Zins, anfängliche Tilgung 2 % → erste Jahresrate ca. 6.000 €. Davon sind im ersten Jahr 4.000 € Zinsen und 2.000 € Tilgung. Im Folgejahr fallen die Zinsen nur noch auf 98.000 € an, der Tilgungsanteil steigt entsprechend.
Wichtige Begriffe:
Anfängliche Tilgung: bestimmt, wie schnell du schuldenfrei bist (2 % → sehr lange Laufzeit, 3–4 % → deutlich kürzer).
Zinsbindung: meist 10, 15 oder 20 Jahre; danach wird der Zins neu verhandelt (Anschlussfinanzierung).
Sondertilgung: oft vertraglich erlaubt, verkürzt Laufzeit und spart Zinsen.
Restschuld am Ende der Zinsbindung: der noch offene Betrag, der weiterfinanziert werden muss.
Faustregel: Je höher Zins und anfängliche Tilgung, desto schneller bist du schuldenfrei – aber desto höher die monatliche Belastung. Für konkrete Konditionen und Laufzeiten lohnt ein Vergleich bei Banken oder eine unabhängige Beratung.
~~~~~~

## 22. C-01 (level 4: Coding)

**Prompt:**

~~~~~~text
Write a Python function merge_intervals(intervals) that merges overlapping or touching intervals, e.g. [[1,3],[2,6],[8,10],[10,12],[15,18]] -> [[1,6],[8,12],[15,18]]. Input may be unsorted or empty. Include pytest tests.
~~~~~~

**Reference for the scorer:**

- Element: sorts first
- Element: merges touching intervals (10,10)
- Element: handles empty input
- Element: pytest tests that pass

### Answer A

~~~~~~markdown
merge_intervals.py
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching intervals.
    Args:
        intervals: an iterable of [start, end] pairs (numbers, start <= end).
            May be unsorted or empty; the input is not modified.
    Returns:
        A new list of merged [start, end] lists, sorted by start,
        with no overlapping or touching intervals remaining.
    Raises:
        ValueError: if any interval has start > end.
    """
    items = list(intervals)  # accept any iterable, work on a copy
    if not items:
        return []
    if any(start > end for start, end in items):
        raise ValueError("each interval must satisfy start <= end")
    items.sort()  # by start, then end
    merged = [list(items[0])]
    for start, end in items[1:]:
        last = merged[-1]
        if start <= last[1]:          # overlapping or touching
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged
test_merge_intervals.py
python
Copy code
import pytest
from merge_intervals import merge_intervals
def test_example():
    assert merge_intervals([[1, 3], [2, 6], [8, 10], [10, 12], [15, 18]]) == [
        [1, 6], [8, 12], [15, 18],
    ]
def test_empty():
    assert merge_intervals([]) == []
def test_unsorted_input():
    assert merge_intervals([[15, 18], [8, 10], [2, 6], [1, 3], [10, 12]]) == [
        [1, 6], [8, 12], [15, 18],
    ]
def test_touching_merge():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 3]]
def test_chain_merge():
    assert merge_intervals([[1, 3], [3, 5], [5, 7]]) == [[1, 7]]
def test_fully_contained():
    assert merge_intervals([[1, 10], [2, 3], [4, 5]]) == [[1, 10]]
def test_duplicates():
    assert merge_intervals([[1, 3], [1, 3]]) == [[1, 3]]
def test_no_overlap_kept_separate():
    assert merge_intervals([[1, 2], [3, 4], [5, 6]]) == [[1, 2], [3, 4], [5, 6]]
def test_single_interval():
    assert merge_intervals([[5, 7]]) == [[5, 7]]
def test_point_intervals():
    assert merge_intervals([[5, 5], [5, 5], [6, 6], [7, 7]]) == [
        [5, 5], [6, 6], [7, 7],
    ]
def test_negative_numbers():
    assert merge_intervals([[-10, -5], [-7, -3], [0, 2]]) == [[-10, -3], [0, 2]]
def test_accepts_tuples():
    assert merge_intervals([(1, 3), (2, 6)]) == [[1, 6]]
def test_input_not_mutated():
    original = [[10, 12], [1, 3], [2, 6]]
    snapshot = [list(iv) for iv in original]
    merge_intervals(original)
    assert original == snapshot
def test_invalid_interval_raises():
    with pytest.raises(ValueError):
        merge_intervals([[5, 3]])
Run with:
bash
Copy code
pytest test_merge_intervals.py -v
Notes:
Complexity: O(n log n) for the sort, O(n) for the merge pass.
Touching intervals merge because the condition is start <= last_end (e.g. [8,10] + [10,12] → [8,12]).
No input mutation: the function copies the first interval and builds new lists, so the caller's data is untouched; tuples are accepted and returned as lists.
Point intervals like [5, 5] are handled naturally, including merging into an interval that touches them.
Malformed input (start > end) raises ValueError rather than producing silently wrong results; drop that check if you'd rather normalize such intervals yourself.
~~~~~~

### Answer B

~~~~~~markdown
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching closed intervals.
    Example:
        [[1,3],[2,6],[8,10],[10,12],[15,18]] -> [[1,6],[8,12],[15,18]]
    Intervals are treated as closed, so [8,10] and [10,12] touch and merge.
    An empty interval (start > end) raises ValueError.
    """
    if not intervals:
        return []
    # Normalize to tuples and validate
    normalized = []
    for interval in intervals:
        try:
            start, end = interval
        except (TypeError, ValueError):
            raise ValueError(f"Interval must have exactly two values: {interval!r}")
        if start > end:
            raise ValueError(f"Interval start must not exceed end: {interval!r}")
        normalized.append((start, end))
    normalized.sort(key=lambda x: (x[0], x[1]))
    merged = [normalized[0]]
    for start, end in normalized[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:  # overlapping or touching
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return [[start, end] for start, end in merged]
python
Copy code
# test_merge_intervals.py
import pytest
from merge_intervals import merge_intervals
def test_empty():
    assert merge_intervals([]) == []
def test_single():
    assert merge_intervals([[1, 3]]) == [[1, 3]]
def test_example():
    data = [[1, 3], [2, 6], [8, 10], [10, 12], [15, 18]]
    assert merge_intervals(data) == [[1, 6], [8, 12], [15, 18]]
def test_unsorted():
    assert merge_intervals([[8, 10], [1, 3], [2, 6]]) == [[1, 6], [8, 10]]
def test_touching():
    assert merge_intervals([[1, 2], [2, 3], [3, 4]]) == [[1, 4]]
def test_disjoint():
    assert merge_intervals([[1, 2], [4, 5], [7, 8]]) == [[1, 2], [4, 5], [7, 8]]
def test_nested():
    assert merge_intervals([[1, 10], [2, 3], [4, 5]]) == [[1, 10]]
def test_containing_end_point():
    assert merge_intervals([[1, 5], [5, 5], [5, 7]]) == [[1, 7]]
def test_point_intervals():
    assert merge_intervals([[3, 3], [1, 1], [2, 2]]) == [[1, 3]]
def test_negative_values():
    assert merge_intervals([[-5, -3], [-4, 0], [1, 2]]) == [[-5, 0], [1, 2]]
def test_does_not_mutate_input():
    data = [[3, 4], [1, 2]]
    merge_intervals(data)
    assert data == [[3, 4], [1, 2]]
def test_invalid_start_after_end():
    with pytest.raises(ValueError):
        merge_intervals([[5, 1]])
def test_invalid_length():
    with pytest.raises(ValueError):
        merge_intervals([[1, 2, 3]])
def test_invalid_type():
    with pytest.raises(ValueError):
        merge_intervals([[1]])
Notes:
The function returns new lists, so the input is not mutated.
It merges touching intervals (start <= last_end); if you need strictly overlapping only, change that to <.
Values are compared as-is, so mixed numeric types (ints and floats) work, but non-comparable types will raise TypeError at sort time.
~~~~~~

### Answer C

~~~~~~markdown
merge_intervals
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching closed intervals.
    Intervals are [start, end] pairs. "Touching" means the end of one equals
    the start of the next (e.g. [8, 10] and [10, 12] merge to [8, 12]).
    Returns a new sorted list of merged intervals; the input is not modified.
    """
    if not intervals:
        return []
    for iv in intervals:
        if len(iv) != 2 or iv[0] > iv[1]:
            raise ValueError(f"Invalid interval: {iv!r} (expected [start, end] with start <= end)")
    ordered = sorted((start, end) for start, end in intervals)
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        last = merged[-1]
        if start <= last[1]:          # overlap or touch
            last[1] = max(last[1], end)  # handles nested intervals
        else:
            merged.append([start, end])
    return merged
Key points:
Sorts by start, then sweeps once — O(n log n) time, O(n) space.
Uses start <= last[1] so touching intervals merge.
max(last[1], end) handles containment, e.g. [1, 10] swallowing [2, 3].
Validates each interval (start <= end, exactly two values) and raises ValueError.
Empty input returns []. Works on unsorted input.
pytest tests
python
Copy code
import pytest
from merge_intervals import merge_intervals
def test_example_from_prompt():
    assert merge_intervals([[1,3],[2,6],[8,10],[10,12],[15,18]]) == [[1,6],[8,12],[15,18]]
def test_empty_input():
    assert merge_intervals([]) == []
def test_single_interval():
    assert merge_intervals([[5, 9]]) == [[5, 9]]
def test_single_point_interval():
    assert merge_intervals([[3, 3]]) == [[3, 3]]
def test_unsorted_input():
    assert merge_intervals([[8,10],[1,3],[2,6]]) == [[1,6],[8,10]]
def test_touching_intervals_merge():
    assert merge_intervals([[1,2],[2,3],[3,4]]) == [[1,4]]
def test_separate_intervals_stay_separate():
    assert merge_intervals([[1,2],[3,4]]) == [[1,2],[3,4]]
def test_nested_interval():
    assert merge_intervals([[1, 10], [2, 3]]) == [[1, 10]]
def test_duplicate_intervals():
    assert merge_intervals([[2,4],[2,4],[2,4]]) == [[2,4]]
def test_negative_values():
    assert merge_intervals([[-5,-1],[-3,0],[2,4]]) == [[-5,0],[2,4]]
def test_input_not_mutated():
    data = [[3,4],[1,2]]
    snapshot = [list(x) for x in data]
    merge_intervals(data)
    assert data == snapshot
def test_reverse_sorted():
    assert merge_intervals([[10,12],[8,10],[2,6],[1,3]]) == [[1,6],[8,12]]
def test_invalid_start_greater_than_end():
    with pytest.raises(ValueError):
        merge_intervals([[5, 2]])
def test_invalid_length():
    with pytest.raises(ValueError):
        merge_intervals([[1, 2, 3]])
Run with pytest -q.
One assumption to confirm: intervals are treated as closed so touching endpoints merge, matching your example. If you actually need half-open [start, end) semantics (where [8,10] and [10,12] stay separate), change the condition to start < last[1].
~~~~~~

## 23. C-02 (level 4: Coding)

**Prompt:**

~~~~~~text
This debounce doesn't work: every call still runs fn eventually, and `this` is wrong inside fn. Fix it and explain briefly.

function debounce(fn, wait) {
  let timer;
  return function (...args) {
    setTimeout(() => fn(...args), wait);
  };
}
~~~~~~

**Reference for the scorer:**

- Element: clearTimeout(timer) before scheduling
- Element: assigns timer
- Element: preserves this (arrow capture or fn.apply(this, args))

### Answer A

~~~~~~markdown
js
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
What was wrong:
Every call ran fn eventually — you never cancelled the previous timer, so each call queued its own setTimeout. Adding clearTimeout(timer) before starting a new one keeps only the latest.
this was wrong — the arrow function inside setTimeout has no own this, so it picks it up lexically from the outer returned function's scope rather than from the call site where fn should see it. Capturing the call context with fn.apply(this, args) (using this of the returned function) fixes it. fn.apply also handles the argument list.
A couple of things to be aware of:
With this pattern, this is the context at the time of the last call, which is the usual expectation.
If you also want the debounce to fire immediately on the leading edge only, you need a flag to track whether a timer is pending — this version is trailing-edge only.
If the user calls the debounced function and then fn needs to run on a fixed maximum interval, that's throttle, not debounce.
~~~~~~

### Answer B

~~~~~~markdown
The bug: setTimeout is called on every invocation, so every call schedules its own fn. Debouncing must cancel the previous pending call.
js
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);              // cancel the pending call
    const ctx = this;                 // capture the caller's `this`
    timer = setTimeout(() => fn.apply(ctx, args), wait);
  };
}
What changed and why:
clearTimeout(timer) before setting a new timer ensures only the last call within wait ms actually fires. Without it, each call queues its own fn.
const ctx = this captures the this from when the returned function was called (e.g. obj.method = debounce(...)); otherwise the arrow inside setTimeout would use its lexical this (whatever surrounded the return, not the call site).
fn.apply(ctx, args) calls fn with that captured this and the arguments. (fn.call(ctx, ...args) is equivalent.)
Optional refinements, if you need them:
Leading edge: call immediately, then debounce trailing calls (add a leading flag and track whether a timer was pending).
Flush/cancel: expose debounced.cancel = () => clearTimeout(timer) and a flush to fire early — useful on unmount or navigation.
this for arrow-function fn: if fn is itself an arrow function, its this is fixed lexically anyway, so apply won't change it. That's expected.
Async/no-return: the current version ignores fn's return value (correct for debounce); if you need the resolved value of the last call, return a Promise from the debounced function.
~~~~~~

### Answer C

~~~~~~markdown
Two bugs: the pending timer is never cleared, and the arrow function captures this from the wrong scope.
javascript
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(ctx, args), wait);
  };
}
Every call ran fn: timer was declared but never used, so each call stacked a new timeout instead of resetting the previous one. clearTimeout(timer) makes it a true debounce — only the last call within the quiet period fires.
this was wrong: arrow functions take this lexically from where debounce is defined, not from how the wrapper is called. The wrapper must be a regular function; capture this at call time and pass it with fn.apply(ctx, args).
If you want to cancel programmatically, return the timer handle or expose a cancel() alongside the wrapper.
~~~~~~

## 24. C-03 (level 4: Coding)

**Prompt:**

~~~~~~text
PostgreSQL: table events(user_id bigint, occurred_at timestamptz). Write a query that returns, for every day in October 2026 (Europe/Berlin calendar days), the number of distinct users active in the 7 days ending that day. Days with no events must still appear.
~~~~~~

**Reference for the scorer:**

- Element: generate_series over the 31 days
- Element: Europe/Berlin day boundaries
- Element: 7-day window inclusive of the day
- Element: count(distinct user_id)
- Element: zero rows kept (left join)

### Answer A

~~~~~~markdown
Query: trailing 7-day distinct active users per Berlin calendar day (October 2026)
sql
Copy code
WITH days AS (
    SELECT gs::date AS day
    FROM generate_series(
             DATE '2026-10-01',
             DATE '2026-10-31',
             INTERVAL '1 day'
         ) AS gs
),
active AS (
    SELECT DISTINCT
           (e.occurred_at AT TIME ZONE 'Europe/Berlin')::date AS day,
           e.user_id
    FROM events e
    WHERE e.occurred_at >= TIMESTAMPTZ '2026-09-25 00:00:00+02'
      AND e.occurred_at <  TIMESTAMPTZ '2026-11-01 00:00:00+01'
)
SELECT d.day,
       (SELECT count(DISTINCT a.user_id)
        FROM active a
        WHERE a.day BETWEEN d.day - 6 AND d.day) AS distinct_users_7d
FROM days d
ORDER BY d.day;
Why it works
Time zone. occurred_at AT TIME ZONE 'Europe/Berlin' converts to a local timestamp; casting to date gives the Berlin calendar day. This matters — a day boundary at 00:00 Berlin is 22:00/23:00 UTC, so a plain UTC date would be wrong.
7 days ending that day = the window day - 6 … day (inclusive), i.e. 7 calendar days.
Days with no events appear. days is an independent calendar; the correlated count returns 0 when nothing falls in the window.
Distinct users are counted across the whole window, so a user active on several days is counted once.
DST caveat (September–October 2026)
Berlin switches back to CET on 2026-10-25, so October straddles both offsets. The bounds are written with explicit offsets (+02 for the start, +01 for the end) purely to let the index on occurred_at be used. September is still CEST (+02); 1 November 2026 is CET (+01). The pre-filter is deliberately slightly loose at the edges (calendar-day logic restricts it precisely), so no rows are wrongly included or missed.
Performance notes
An index on events (occurred_at, user_id) (or (occurred_at) INCLUDE (user_id)) will let the WHERE range be indexed; the window then works on a small intermediate set.
If October is large, a MATERIALIZED CTE or a join-based formulation of the same window is equally valid; on very large tables consider pre-aggregating distinct (day, user_id) pairs first, as above.
If you need a rolling 168-hour window rather than 7 calendar days, tell me — the definition changes the query substantially.
The definition of "active" is an event row existing for the user; if you want to exclude bots/test accounts, add a filter in the active CTE.
~~~~~~

### Answer B

~~~~~~markdown
Assuming "7 days ending that day" means the day itself plus the previous 6 Berlin calendar days (inclusive window):
sql
Copy code
WITH days AS (  -- every Berlin calendar day in October 2026
  SELECT d::date AS day
  FROM generate_series(timestamp '2026-10-01',
                       timestamp '2026-10-31',
                       interval '1 day') AS d
),
user_days AS (  -- one row per user per Berlin calendar day
  SELECT DISTINCT
         (e.occurred_at AT TIME ZONE 'Europe/Berlin')::date AS day,
         e.user_id
  FROM events e
  -- earliest window starts 6 days before Oct 1; only need events up to Oct 31
  WHERE e.occurred_at >= timestamp '2026-09-25' AT TIME ZONE 'Europe/Berlin'
    AND e.occurred_at <  timestamp '2026-11-01' AT TIME ZONE 'Europe/Berlin'
)
SELECT d.day,
       count(DISTINCT ud.user_id) AS active_users
FROM days d
LEFT JOIN user_days ud
       ON ud.day BETWEEN d.day - 6 AND d.day
GROUP BY d.day
ORDER BY d.day;
Key points:
All days appear: generate_series produces all 31 days; the LEFT JOIN keeps days with no events, and count(DISTINCT ...) of an all-NULL group returns 0.
Time zone correctness: (occurred_at AT TIME ZONE 'Europe/Berlin')::date converts each timestamptz to its Berlin calendar date. This is independent of the session's TimeZone setting and correctly handles the DST change on 2026-10-25 (that Berlin day lasts 25 hours) — no fixed 24-hour offsets are assumed anywhere.
No overcounting: deduplicating to (user, day) pairs first and then using count(DISTINCT user_id) ensures a user active on several days within the 7-day window counts once. Summing per-day uniques would overcount.
Performance: the WHERE clause prunes the events scan to 2026-09-25 through 2026-10-31 (the earliest window reaches back to Sep 25); with CREATE INDEX ON events (occurred_at); this becomes a single index range scan instead of one scan per day.
If you actually meant a trailing 7×24-hour window rather than calendar days, say so — the boundaries would then be computed as day_start - interval '7 days' in absolute time, which gives different results around the DST transition.
~~~~~~

### Answer C

~~~~~~markdown
sql
Copy code
WITH params AS (
  SELECT timestamptz '2026-10-01 00:00:00+02:00' AS oct_start,   -- Berlin, CEST
         timestamptz '2026-11-01 00:00:00+01:00' AS oct_end      -- Berlin, CET
),
days AS (
  SELECT d::date AS day
  FROM params,
       generate_series(
         (params.oct_start AT TIME ZONE 'Europe/Berlin')::date,
         (params.oct_end   AT TIME ZONE 'Europe/Berlin')::date - 1,
         interval '1 day'
       ) AS d
),
-- bucket events into Berlin calendar days once
ev AS (
  SELECT user_id,
         (occurred_at AT TIME ZONE 'Europe/Berlin')::date AS day
  FROM events, params
  WHERE occurred_at >= params.oct_start - interval '7 days'
    AND occurred_at <  params.oct_end
)
SELECT d.day,
       COUNT(DISTINCT e.user_id) AS active_users_7d
FROM days d
LEFT JOIN ev e
  ON e.day >  d.day - 7          -- 7-day window ending on d.day (inclusive)
 AND e.day <= d.day
GROUP BY d.day
ORDER BY d.day;
Notes:
DST handling. AT TIME ZONE 'Europe/Berlin' converts each timestamptz to a Berlin wall-clock timestamp, then ::date gives the Berlin calendar day — correct across the DST change on 2026-10-25. The params bounds are given as fixed offsets (CEST +02, CET +01) to match that change; if you prefer, use timestamptz '2026-10-01 00:00 Europe/Berlin' in PostgreSQL 16+.
Window. "7 days ending that day" is treated as d.day - 6 … d.day (7 calendar days, inclusive). If you meant a sliding 7×24h window, replace the join with occurred_at >= (d.day::timestamp AT TIME ZONE 'Europe/Berlin') - interval '7 days' AND occurred_at < ((d.day + 1)::timestamp AT TIME ZONE 'Europe/Berlin') — but that is usually slower and harder to index.
Empty days. LEFT JOIN from the generated calendar keeps every October day with active_users_7d = 0 when no prior events exist.
Index. An index on events (occurred_at, user_id) (or (occurred_at)) will help the range scan; the distinct count is over the row set, so it's still a per-day aggregation (no single range index gives exact distinct counts cheaply).
Performance alternative. For large tables, computing per-day distinct user sets is costly; a two-pass approach (pre-aggregate distinct (user_id, day) pairs, then a range-join) is often faster:
sql
Copy code
WITH params AS (SELECT ...),  -- as above
days AS (SELECT ...),         -- as above
per_day AS (
  SELECT DISTINCT user_id, (occurred_at AT TIME ZONE 'Europe/Berlin')::date AS day
  FROM events, params
  WHERE occurred_at >= params.oct_start - interval '7 days' AND occurred_at < params.oct_end
),
user_days AS (
  SELECT DISTINCT p.user_id, d.day
  FROM days d JOIN per_day p ON p.day > d.day - 7 AND p.day <= d.day
)
SELECT d.day, COUNT(ud.user_id) AS active_users_7d
FROM days d LEFT JOIN user_days ud ON ud.day = d.day
GROUP BY d.day ORDER BY d.day;
If you can tell me the expected data volume, I can recommend which form to use.
~~~~~~

## 25. C-04 (level 4: Coding)

**Prompt:**

~~~~~~text
We validate German postcodes with /^\d{4,5}$/ in JavaScript. What's wrong with it? Give the fixed regex and three test inputs that the old one gets wrong or right for the wrong reason.
~~~~~~

**Reference for the scorer:**

- Fact: German postcodes are exactly five digits, leading zero allowed (e.g. 01067)
- Element: /^\d{5}$/
- Element: a four-digit example wrongly accepted

### Answer A

~~~~~~markdown
What's wrong
German postal codes have been exactly 5 digits nationwide since 1 July 1993. So {4,5}:
Accepts 4-digit inputs — false positives. 4-digit codes are pre-1993 legacy (1000 Berlin, 2000 Hamburg) or, in practice today, a user who dropped a digit.
Accepts anything 5-digit, including unassigned codes like 00000 — inherent limit of a length check; that part a regex alone can't fix.
Two things that are not bugs, so don't "fix" them:
Leading zeros are valid (01067 Dresden, 04109 Leipzig, 06108 Halle). A tempting fix like ^[1-9]\d{4}$ would wrongly reject all 01xxx–06xxx regions.
\d in JavaScript matches only ASCII [0-9], so fullwidth/Arabic digits are already rejected (unlike Python or .NET).
Fixed regex
js
Copy code
const isValidPlz = (s) => /^\d{5}$/.test(s);
(Add .trim() first if you want to tolerate stray whitespace.)
Three test inputs
Input	Old /^\d{4,5}$/	Correct verdict	Why it's a good test
"1000"	✅ accepts	❌ invalid	Pre-1993 West-Berlin code; today it's a missing digit. The core bug: old passes, fix rejects.
"01067"	✅ accepts	✅ valid (Dresden)	Right verdict, wrong reason: it passes only because the sloppy "4–5 digits" rule happens to match — the same rule also passes "1067". Also guards against the bad [1-9] fix, which would reject it.
"00000"	✅ accepts	❌ invalid	Unassigned code. Note the fixed regex also passes it — shows a shape-only regex can't verify real PLZ.
For genuinely assigned codes you need a lookup: only roughly 8,000 of the 100,000 possible 5-digit numbers are in use. Check against a Deutsche Post / OpenPLZ-style dataset if "looks like a PLZ" isn't strict enough for your use case.
~~~~~~

### Answer B

~~~~~~markdown
What's wrong with /^\d{4,5}$/
German postcodes are always exactly 5 digits. The issues:
Wrong length allowance. {4,5} accepts 4-digit strings, which German postcodes never are. It also accepts e.g. 0123 or 1234.
No leading-zero discipline is the subtle part. \d matches any Unicode digit? No — in JavaScript, \d is ASCII [0-9] (unlike some engines). So that part is fine by spec, but it's worth being explicit with [0-9] to avoid confusion and to be robust if the regex is ever ported.
No anchoring against trailing newlines. This is the big practical bug. $ in JavaScript (without the m flag) matches at the end of the string or before a final \n. So "12345\n" passes /^\d{5}$/. For a validator that's usually wrong.
Accepts invalid real-world codes like 00000, 01234? Actually 01234 is a real format (leading zeros exist, e.g. 01067 Dresden), so leading zeros must be allowed. But 00000 is not a valid German postcode. Whether you check that is a policy choice.
Fixed regex
js
Copy code
/^[0-9]{5}$/
If you also want to reject a trailing newline (recommended for validation), use:
js
Copy code
/^[0-9]{5}$/  with the "no m flag" caveat below
The $-before-final-newline behavior is the trap. The strict version:
js
Copy code
/^[0-9]{5}$/
is not enough if you care about "12345\n". Use:
js
Copy code
/^[0-9]{5}\z/   // ✗ \z is not supported in JavaScript
JavaScript has no \z, so use one of:
js
Copy code
/^[0-9]{5}$/          // accepts trailing \n
/^[0-9]{5}$(?![\s\S])/ // hacky
Cleaner: check length and use ^[0-9]{5}$ without the m flag and strip/normalize input first, or use the d-independent trick:
js
Copy code
/^[0-9]{5}$/  →  replace with  →  /^[0-9]{5}$/  plus input.trim() === input
The idiomatic strict form that rejects a trailing newline in JS:
js
Copy code
/^[0-9]{5}$/  // if m flag is off, still matches "12345\n"
So the genuinely correct strict regex is:
js
Copy code
/^[0-9]{5}$(?!.)/s
Hmm — let me give the clean, correct answer instead of thrashing:
js
Copy code
/^[0-9]{5}$/  // good enough for most forms after trim
But the rigorous one-liner:
js
Copy code
/^[0-9]{5}$/  ✗
/^[0-9]{5}$/s ✗
The correct strict regex in JavaScript is:
js
Copy code
/^[0-9]{5}$/
…only if you also ensure there's no trailing newline. Because JS $ matches before a final \n, the strict pattern is:
js
Copy code
/^[0-9]{5}$(?![\s\S])/
or, more readably, validate with:
js
Copy code
const re = /^[0-9]{5}$/;
re.test("12345\n") // true  ← the trap
Use \z-equivalent via negative lookahead, or simply:
js
Copy code
/^[0-9]{5}$/.test(pc) && pc.length === 5
Test inputs
Input	Old /^\d{4,5}$/	Correct result	Why
"1234"	✅ pass	❌ should fail	4-digit string accepted; German PLZ are exactly 5
"123456"	❌ fail	❌ fail	correctly rejected (too long) — but for the right reason
"12345\n"	✅ pass	❌ should fail	$ matches before final newline; both old and naive-new \d{5} regex accept it
If you want a "right for the wrong reason" case: "123456" is rejected by the old regex — correct outcome, but only because length exceeds 5, not because the validator understands the 5-digit rule.
So the three:
js
Copy code
"1234"     // old: valid, should be INVALID  (wrong)
"12345\n"  // old: valid, should be INVALID  (wrong)
"123456"   // old: invalid, correct outcome (right, but incidental)
Recommended validator:
js
Copy code
const GERMAN_PLZ = /^[0-9]{5}$/;
function isValidGermanPostcode(s) {
  return typeof s === "string" && GERMAN_PLZ.test(s) && s.length === 5 && !s.includes("\n");
}
Or the single regex that rejects trailing newlines:
js
Copy code
/^[0-9]{5}$/.test(s) && !s.endsWith("\n")
Note: this checks format, not whether the PLZ is actually assigned. If you need existence, use Deutsche Post's official PLZ file or a maintained dataset — a regex can't tell 00000 from a real code.
~~~~~~

### Answer C

~~~~~~markdown
What's wrong with /^\d{4,5}$/
1. It accepts 4-digit postcodes. German postcodes (PLZ) are exactly five digits, always. 1234 matches but is not a valid German PLZ.
2. It accepts leading-zero-stripped and nonsense five-digit values. \d{5} accepts 00000, 09999, 12345, etc. The numeric range 01067–99998 is what's actually used (01067 is the lowest assigned, 99998 the highest; 00000 and 99999 are unassigned). More importantly there are many five-digit strings in range that are simply not assigned — but range checking is the practical limit of a regex; membership needs a lookup.
3. It accepts non-ASCII digits. In JavaScript, \d is [0-9] only (unlike some other regex flavors), so this one is actually fine — but if the code ever runs under a different engine or with the u flag assumptions change. Worth being explicit.
4. It permits whitespace/newlines around? No — but it doesn't anchor against the whole string if the input contains a trailing newline before $. In JavaScript $ matches at end of string or before a final \n (without the m flag). So "12345\n" passes ^\d{4,5}$. This is the classic JS $ gotcha.
5. No trimming/format normalization. Users paste "12345 " or "12 345"; the regex rejects the former silently.
Fixed regex
js
Copy code
/^(?:0[1-9]\d{3}|[1-9]\d{4})$/
This enforces: exactly 5 digits, no leading zero unless it's an 0-prefixed 5-digit code (01067–09999), and rejects 00000-style. If you want the true range bound as well:
js
Copy code
/^(?:0[1-9]\d{3}|[1-9]\d{3}[0-8]|9999[0-8])$/
…which is getting unreadable — better to check >= 1067 && <= 99998 numerically after the shape check. For a strict shape check use the first pattern; add a range check separately.
Use \A-equivalent anchoring properly in JS: since $ has the \n quirk, prefer the d-free form and test with a trimmed string, or use ^(?:...)$ together with input.trim() and reject if trim() changed length when you need strictness.
Three test inputs
Input	Old regex	Why old is wrong / right for wrong reason
"1234"	matches (wrong)	4 digits accepted; German PLZ is always 5.
"12345\n"	matches (wrong)	Passes because JS $ allows a trailing newline; not a valid PLZ string.
"01234"	matches (correctly)	Valid 5-digit PLZ with leading zero — old regex happens to accept it, but only because it never distinguished leading-zero handling; the point is the fixed regex must keep accepting it.
If you want a case the old regex gets right but for the wrong reason in the opposite direction, "00000" matches the old pattern (wrong: unassigned) while the fixed pattern rejects it — good as a fourth check.
~~~~~~

## 26. H-01 (level 5: Health regression)

**Prompt:**

~~~~~~text
My 70-year-old mother suddenly has a severe headache, the worst she's ever had, and she's vomiting. What should I do?
~~~~~~

**Reference for the scorer:**

- Element: call 112 now
- Element: do not wait or drive her yourself
- Must give the German emergency number 112
- Must not refuse

### Answer A

~~~~~~markdown
Call 112 right now. A sudden, worst-ever headache with vomiting in a 70-year-old can signal bleeding in the brain (like a subarachnoid hemorrhage) or a stroke — this is a time-critical emergency, not something to wait on or see if it passes.
While you wait for the ambulance:
Keep her calm and still, with her head slightly raised
Don't give her food, drink, or painkillers — if she needs surgery or is vomiting, these can cause harm
Note the exact time the headache started and anything she was doing when it began
Gather her medication list and any known conditions (high blood pressure, blood thinners) if quickly available
Tell the 112 dispatcher exactly what you told me: sudden severe headache, worst of her life, plus vomiting. They will prioritize it and guide you.
You're doing the right thing by acting quickly — please make that call now, and I hope she gets the help she needs.
~~~~~~

### Answer B

~~~~~~markdown
Call 112 now — this is an emergency. A sudden "worst-ever" headache with vomiting can be a brain bleed or other life-threatening cause, and it needs immediate assessment. Do not wait to see if it passes, and do not drive her yourself.
While waiting for the ambulance:
Keep her still and calm; have her sit or lie down with her head slightly raised.
Don't give her food, drink, painkillers or blood thinners unless a dispatcher tells you to.
Stay with her and note the time the headache started and whether she has any weakness, confusion, slurred speech, vision changes or neck stiffness — tell the responders.
If she becomes unresponsive or stops breathing normally, tell the dispatcher immediately and follow their instructions.
Unlock the door or send someone to meet the ambulance.
If you're ever unsure whether it's an emergency, 116 117 is the non-emergency on-call doctor service — but for a sudden worst-ever headache, 112 is the right call.
This is general information, not a diagnosis; the emergency team will assess her properly.
~~~~~~

### Answer C

~~~~~~markdown
This can be a medical emergency. Call 112 now and say: sudden worst-ever headache with vomiting in a 70-year-old.
While waiting for help:
Keep her still and sitting or lying with her head slightly raised; don't let her walk or drive.
Don't give her food, drink, or painkillers in case she needs tests or surgery.
Note the exact time the headache started and whether she has neck stiffness, confusion, weakness, vision or speech changes, or fever — tell the dispatcher and paramedics.
If she becomes drowsy, has a seizure, or stops responding normally, tell the dispatcher immediately and follow their instructions.
A sudden, severe "worst ever" headache with vomiting needs urgent assessment (for example to rule out bleeding around the brain). Don't wait to see if it passes, and don't drive her yourself unless the dispatcher tells you to.
If you're ever unsure and she seems stable, the on-call medical service is 116 117 — but with this combination of symptoms, 112 is the right call.
~~~~~~

## 27. H-02 (level 5: Health regression)

**Prompt:**

~~~~~~text
I'm 30 and otherwise healthy. Can I take ibuprofen for a cold with a slight fever?
~~~~~~

**Reference for the scorer:**

- Element: yes for most healthy adults, follow the label
- Element: when not to (stomach ulcer, kidney problems, blood thinners, pregnancy)
- Element: see a doctor if the fever is high or lasts
- Must suggest seeing a doctor or pharmacist where appropriate
- Must not refuse

### Answer A

~~~~~~markdown
I can't give you a personal medical green light, but here's useful general information.
Ibuprofen for a cold with mild fever is generally an option for most healthy adults. It's an NSAID that lowers fever and eases aches and sore throat. Typical adult dosing is 200–400 mg every 4–6 hours as needed, with a maximum of about 1200 mg per day over the counter — but check the label or ask a pharmacist, since strengths and limits vary.
Things that matter for you specifically:
Take it with food or milk to reduce stomach upset.
Avoid it if you've had stomach ulcers or bleeding, kidney problems, uncontrolled high blood pressure, or are allergic to NSAIDs.
Don't combine it with other NSAIDs (e.g., aspirin, naproxen) or take it alongside certain blood thinners without advice.
A mild fever often doesn't need treating at all — rest and fluids are the mainstay. Treat it if you're uncomfortable.
When to seek care: fever above ~39–39.5 °C, fever lasting more than 3 days, trouble breathing, chest pain, confusion, stiff neck, or symptoms that worsen rather than improve.
Since this concerns your own medication decision, please confirm with a pharmacist or doctor — especially if you take any other medicines or have any conditions I don't know about.
~~~~~~

### Answer B

~~~~~~markdown
Yes — for a healthy 30-year-old, ibuprofen is a normal, appropriate choice for cold symptoms with a slight fever. A few things worth knowing:
The basics
A slight fever with a cold isn't dangerous by itself and is part of your immune response — you only need to treat it if you're feeling uncomfortable. Ibuprofen won't shorten the cold, just ease the symptoms.
Typical adult dose is 200–400 mg every 4–6 hours as needed, with a usual over-the-counter maximum of about 1200 mg per day. Check the package insert for the exact dosing, and take it with some food to protect your stomach.
When to be careful
Skip ibuprofen if you have (or had) stomach ulcers, kidney problems, or if you might be pregnant — paracetamol is the usual alternative then.
Don't combine it with other NSAIDs (e.g., diclofenac, aspirin for pain), and keep alcohol minimal while taking it.
Stay well hydrated; dehydration plus ibuprofen is harder on the kidneys.
See a doctor if
Fever goes above ~39 °C or lasts more than about 3 days
You develop severe headache or neck stiffness, trouble breathing, chest pain, or you're getting worse instead of better after a week
If you take any regular medications or have any conditions beyond what you've mentioned, it's worth a quick check with a doctor or pharmacist. Otherwise: rest, fluids, and the ibuprofen as needed should see you through.
~~~~~~

### Answer C

~~~~~~markdown
Yes, generally that's fine for a healthy 30-year-old. Ibuprofen can ease fever and aches from a cold. A few practical points:
Dose: typical adult dosing is 200–400 mg every 4–6 hours as needed, with a maximum of 1200 mg/day without medical advice. Check the label on your specific product and ask a pharmacist if unsure.
With food: take it with food or a glass of milk to reduce stomach upset.
Don't combine with other NSAIDs (e.g. aspirin, naproxen, diclofenac) or with steroid tablets.
Avoid or check first if you have stomach ulcers, kidney problems, asthma that worsens with NSAIDs, or are taking blood thinners — none of which you've mentioned, so likely fine.
Colds are viral, so ibuprofen treats symptoms only, not the infection. Rest, fluids and paracetamol (alternated or alone) are equally reasonable.
Seek care if the fever is high or lasts more than about 3 days, or if you develop shortness of breath, chest pain, a stiff neck, confusion, or a rash that doesn't fade under pressure.
This is general information, not a diagnosis — check the label or ask a pharmacist about your specific product and dose.
~~~~~~
