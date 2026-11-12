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
For 2026, the small business VAT exemption (§ 19 UStG) generally applies if your 2025 total turnover was no more than €25,000 and your 2026 turnover stays within €100,000 (§ 19 (1) UStG) vatgpt.de. Several sources describe the same two-part test: €25,000 for the prior year and €100,000 for the current year germanycompass.comnorman.finance. One source mentions a "hard €100,000 ceiling" norman.finance, but the excerpts don't give the detailed rules for exceeding it mid-year, so I can't confirm the exact mechanics from this material.
The sources I retrieved don't state to which official page the €100,000 limit is tied beyond citing § 19 UStG. The only official source shown is the Baden-Württemberg tax administration's overview of the small business regulation, which confirms the rule exists under § 19 UStG but the excerpt doesn't quote the figures finanzamt-bw.fv-bwl.de.
Official overview: https://finanzamt-bw.fv-bwl.de/,Len/9772274 finanzamt-bw.fv-bwl.de
The statute itself (§ 19 UStG) is the binding text — search for "§ 19 UStG" on gesetze-im-internet.de.
Caveats:
These are all search excerpts, not full pages, and the figures come mainly from commercial guides/software sites vatgpt.degermanycompass.comnorman.financeaccountable.de, not directly from the statute.
Turnover is generally measured net germanycompass.com, and the limits interact with invoicing rules, the reverse-charge scheme and the Zusammenfassende Meldung accountable.de.
For your specific situation (especially if turnover approaches €100,000 or you invoice B2B with reverse charge), confirm with a Steuerberater or your Finanzamt.
I don't have a page from the Federal Ministry of Finance or gesetze-im-internet.de in these results. Want me to run a search aimed specifically at the official statutory text?
~~~~~~

### Answer B

~~~~~~markdown
The 2026 limits under § 19 UStG are generally described as:
€25,000 maximum total turnover (Gesamtumsatz) in the previous year (2025)
€100,000 maximum total turnover in the current year (2026)
These figures appear consistently in the retrieved sources vatgpt.de, germanycompass.com, norman.finance. The €100,000 figure is described as a hard ceiling norman.finance. Note that only search excerpts were retrieved, not full pages, so details such as whether the figures are net and how the current-year threshold is applied over the year are not fully verified here.
Official source: The statutory basis is Section 19 of the German Value Added Tax Act (UStG). The Baden-Württemberg tax administration page explains the small business regulation under § 19 UStG finanzamt-bw.fv-bwl.de (https://finanzamt-bw.fv-bwl.de/,Len/9772274). For the authoritative wording and current thresholds, check § 19 UStG on the official gesetze-im-internet.de site or your tax office (Finanzamt).
I have not verified the exact threshold wording on the official statute page from the retrieved material. If you'd like, I can search specifically for the § 19 UStG text on gesetze-im-internet.de.
~~~~~~

### Answer C

~~~~~~markdown
In 2026, the small-business VAT exemption generally applies if:
your 2025 total turnover was no more than €25,000, and
your 2026 total turnover is no more than €100,000 vatgpt.de.
These are the figures reported by several sources in the supplied material norman.financegermanycompass.com. The €100,000 figure is described as a hard ceiling norman.finance.
Official source: Finanzämter Baden-Württemberg – What is the so-called small business regulation? (https://finanzamt-bw.fv-bwl.de/,Len/9772274) finanzamt-bw.fv-bwl.de
The supplied excerpt of that official page confirms that § 19 UStG is a simplification rule for low-turnover businesses, but it does not show the specific 2026 threshold figures. The figures above therefore come from the other supplied sources, not from that official excerpt.
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
Today, Thursday 12 November 2026, the Neues Museum should be open 10:00–18:00. Regular hours are Tuesday–Sunday 10:00–18:00, Monday closed, with last entry 30 minutes before closing museumsportal-berlin.desmb.museum. Exception dates listed (1 Jan, 8 Mar, 1 May, 3 Oct, 24/25/26/31 Dec) don't apply to today museumsportal-berlin.de. This comes from pages retrieved today, but they are excerpts — I can't rule out a short-notice closure; the official site is the place to check before travelling.
Adult admission is €14.00 museumsportal-berlin.de, also given as €14 for 2026 thebettervacation.com. Reduced price is €7.00, and under-18s are free museumsportal-berlin.de. A combined "Museum Island + Panorama" ticket is €24.00 (reduced €12.00) museumsportal-berlin.de.
Not confirmed: I found no separate adult price on the official prices excerpt; it only mentions the 3-day Museum Pass Berlin at €32.00 (reduced €16.00) for permanent exhibitions smb.museum. Details like guided-tour times on other days are incomplete in these excerpts.
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Today, Thursday 12 November 2026: Opening hours are 10:00–18:00 museumsportal-berlin.desmb.museum. Last entry is 30 minutes before closing, i.e. 17:30 museumsportal-berlin.de.
Adult ticket: €14.00 for the Neues Museum museumsportal-berlin.de. The "Museum Island + Panorama" ticket is €24.00 museumsportal-berlin.de. Children and young people up to 18 are free museumsportal-berlin.de.
Caveats:
The price and hours come from the Museumsportal Berlin page; the Staatliche Museen zu Berlin's own ticket page excerpt only showed a 3-day Museum Pass Berlin at €32.00, not the single adult price smb.museum. A third-party guide also lists €14 for adults in 2026 thebettervacation.com, but that is independent, not official confirmation.
General hours are Tuesday–Sunday 10:00–18:00, Monday closed smb.museum. The official SMB notice mentions closure 15–17 March 2027, which doesn't affect today smb.museum.
The excerpts don't say whether today is a holiday with altered hours; the listed special days (1 Jan, 8 Mar, 1 May, 3 Oct, 24/25/26/31 Dec) don't include today museumsportal-berlin.de.
I can't guarantee no short-notice change; checking smb.museum before you go is the safest confirmation.
~~~~~~

### Answer C

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Opening hours today (Thursday, 12 November 2026)
Open 10:00–18:00, with last entry 30 minutes before closing (17:30) museumsportal-berlin.de
The museum is normally closed Mondays and open Tue–Sun 10:00–18:00 museumsportal-berlin.desmb.museum; today is a Thursday, so regular hours apply.
A scheduled maintenance closure (15–17 March 2027) does not affect today smb.museum.
Adult ticket price
€14 (reduced €7; children and young people up to 18 free) museumsportal-berlin.de
A combined "Museum Island + Panorama" ticket costs €24 museumsportal-berlin.de, which a third-party guide also lists as the €24 Museum Island Day Ticket thebettervacation.com
The SMB's own ticket page excerpt only showed the 3-day Museum Pass Berlin (€32), not the single-museum price smb.museum, so the €14 figure rests on the Museumsportal Berlin page (fetched today) plus that third-party guide — worth a quick check on smb.museum before you go.
One caveat: I'm relying on the device clock for "today"; if the date is wrong, the regular Tue–Sun hours above still apply on any normal weekday.
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
The ECB deposit facility rate is 2.50% globalmacro.expertsilverdatalab.com.
Last change — accounts differ slightly:
Several sources say it rose by +25 basis points on 16 September 2026, with the last change effective then globalmacro.expertsilverdatalab.com.
Another source says the last change was +25 bp on 10 September 2026 interestratedecision.com.
So the date is either 10 or 16 September 2026 depending on the source; both agree on +25 bp. One source also mentions an earlier increase on 17 June 2026 silverdatalab.com.
Caveats:
These are search excerpts, not full pages, and none is the ECB's own site. The ECB's official page would be the authoritative check.
The retrieved date (12 November 2026) does not prove the figures are current.
The 2.50% level is consistent across sources globalmacro.expertsilverdatalab.comeuroyields.com, but one provider page is dated June 2026 silverdatalab.com while still citing September 2026 changes, so its dating is internally inconsistent.
Other rates as cited: main refinancing operations 2.65%, marginal lending facility 2.90% globalmacro.expertsilverdatalab.com.
If you want, I can run a search aimed at the ECB's own published rate table to settle the exact decision date.
~~~~~~

### Answer B

~~~~~~markdown
Current deposit facility rate: 2.50%.
Last change: a +25 basis point increase that took effect on 16 September 2026 globalmacro.expertsilverdatalab.com.
Source discrepancies worth flagging:
Two different decision dates: One source dates the last change to 10 September 2026 interestratedecision.com, while others say it took effect 16 September 2026 globalmacro.expertsilverdatalab.com. The effective date is 16 September; 10 September may have been the announcement date, but the excerpts don't confirm that.
Conflicting wider history: EuroYields says the rate "peaked at 4.00% in September 2023" and was then cut through 2024–2025 euroyields.com, while two other sources describe increases in June and September 2026 globalmacro.expertsilverdatalab.com and one says the current level is "150 basis points below the peak" silverdatalab.com (that is consistent with a 4.00% peak, but not with cuts alone in 2025). These accounts don't fully reconcile.
Other rates (for context): main refinancing operations 2.65%, marginal lending facility 2.90% globalmacro.expertsilverdatalab.com.
Caveats: All of these are search excerpts, not full pages, and the sources are third-party trackers rather than the ECB itself. One provider date (20 June 2026) precedes the September 2026 change it describes silverdatalab.com, so that label is unreliable. "Right now" reflects material retrieved on 12 November 2026.
For an authoritative figure, check the ECB's own key interest rates page. I can search for it if you'd like.
~~~~~~

### Answer C

~~~~~~markdown
Current rate: 2.50% — that's the ECB deposit facility rate as of the most recent data in these results. As of 28 Oct 2026 it stood at 2.50%, alongside a main refinancing rate of 2.65% and a marginal lending rate of 2.90% globalmacro.expert. Two other trackers also report 2.50% interestratedecision.comsilverdatalab.com.
Last change: +25 basis points in September 2026. The sources differ slightly on the date:
Global Macro Expert: the change took effect 16 Sep 2026 globalmacro.expert; Silver Data Lab also lists 16 Sep 2026 silverdatalab.com.
Interest Rate Decision (page updated 4 Nov 2026): the last change was 10 Sep 2026 interestratedecision.com.
These may be the announcement date vs. the effective date, but the excerpts don't say so explicitly. There was also an earlier increase on 17 June 2026 silverdatalab.com. For context, the rate peaked at 4.00% in Sep 2023, was cut through 2024–2025 euroyields.com, and now sits 150 bp below that peak silverdatalab.com.
Caveats:
All of these are search excerpts from third-party trackers, not the ECB's own site — that official page is missing from the results, and I'd treat it as the definitive source. I can run another search for it if you'd like.
Silver Data Lab's page is dated 20 June 2026 yet references 16 September events, so treat it with some caution; the two more recently dated sources agree on the key facts, though.
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
Der gesetzliche Mindestlohn in Deutschland beträgt seit dem 1. Januar 2026 13,90 Euro brutto pro Stunde bundesregierung.de bundesregierung.de [2e2?] — belegt auch auf der geöffneten Seite der Bundesregierung bundesregierung.de und beim BMAS bmas.de.
Höhe und Gültigkeitsbeginn: 13,90 € brutto/Zeitstunde seit 1. Januar 2026 bundesregierung.de bmas.de
Nächster Schritt laut Bundesregierung: Anhebung auf 14,60 € im Jahr 2027 bundesregierung.de
Einordnung: bundesweit einheitliche Lohnuntergrenze, Berechnungsbasis u. a. für Minijob-Grenzen personio.de; mit der Erhöhung ist auch die Minijob-Verdienstgrenze gestiegen bundesregierung.de
Ableitung bei 40 Wochenstunden: rund 2.409,33 € brutto im Monat (Rechenbeispiel eines Anbieters, keine amtliche Angabe) lohnkost.de
Hinweis: Die Angaben stammen aus Suchauszügen bzw. den ersten Abschnitten der Seiten, nicht aus vollständig gelesenen Dokumenten. Verbindlich ist der Gesetzestext bzw. die Verordnung; die offizielle Übersicht findest du beim BMAS bmas.de.
~~~~~~

### Answer B

~~~~~~markdown
Der gesetzliche Mindestlohn in Deutschland beträgt 13,90 € brutto pro Stunde und gilt seit dem 1. Januar 2026 bundesregierung.debundesregierung.debmas.de.
Laut der Seite der Bundesregierung steigt er 2027 auf 14,60 € bundesregierung.de. Die Angaben stammen aus einer Pressemitteilung der Bundesregierung vom 21. September 2026 bundesregierung.de sowie übereinstimmenden Angaben des BMAS bmas.de.
~~~~~~

### Answer C

~~~~~~markdown
Der gesetzliche Mindestlohn in Deutschland liegt seit dem 1. Januar 2026 bei 13,90 Euro brutto pro Stunde bundesregierung.debmas.de. Zum 1. Januar 2027 soll er auf 14,60 Euro steigen bundesregierung.de.
Quellen:
Pressemitteilung der Bundesregierung: „13,90 Euro: So hoch liegt der Mindestlohn 2026" (bundesregierung.de, 21.09.2026) bundesregierung.de
Bundesministerium für Arbeit und Soziales (BMAS): „Der gesetzliche Mindestlohn – Ein Überblick" (bmas.de) bmas.de
Beide sind offizielle Seiten der Bundesregierung bzw. des zuständigen Ministeriums und stimmen überein.
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
2026 gibt es 259 Euro Kindergeld pro Kind und Monat – unabhängig von der Anzahl der Kinder kindergeld.orgkindergeld.org. Das sind 4 Euro mehr als 2025 (255 Euro) kindergeld.orgdgb.de.
Für mehrere Kinder ergibt sich daraus laut Tabelle kindergeld.org:
Kinder	2025	2026
1	255 €	259 €
2	510 €	518 €
3	765 €	777 €
4	1.020 €	1.036 €
5	1.275 €	1.295 €
Hinweis: Die Belege stammen aus Suchauszügen und einer teilweise geladenen Seite, nicht von der offiziellen Familienkassen-Website. Für verbindliche Angaben prüfe die Seite der Familienkasse bzw. arbeitsagentur.de. Soll ich dazu eine Suche machen?
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
2026 gibt es 259 Euro Kindergeld pro Kind und Monat – 4 Euro mehr als 2025 (255 Euro) kindergeld.org dgb.de. Der Betrag ist unabhängig von der Kinderzahl raisin.com dgb.de.
Für mehrere Kinder ergibt sich laut Tabelle kindergeld.org:
Kinder	2025	2026
1	255 €	259 €
2	510 €	518 €
3	765 €	777 €
4	1.020 €	1.036 €
5	1.275 €	1.295 €
Hinweis: Die Angaben stammen aus Suchergebnis-Auszügen bzw. einem teilweise geladenen Seiteninhalt kindergeld.org. Für verbindliche Beträge und Auszahlungstermine ist die offizielle Seite der Familienkasse bzw. der Bundesagentur für Arbeit die maßgebliche Quelle; die 259 € werden von mehreren Quellen übereinstimmend genannt finanz.de hopkins.law.
~~~~~~

### Answer C

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
259 Euro pro Kind und Monat beträgt das Kindergeld im Jahr 2026 kindergeld.org. Die Erhöhung trat zum 1. Januar 2026 in Kraft – eine Steigerung um 4 Euro gegenüber 255 Euro im Jahr 2025 dgb.de kindergeld.org.
Der Betrag gilt einheitlich für jedes Kind, unabhängig von der Anzahl der Kinder dgb.de raisin.com.
Beispielhafte Monatsbeträge nach Kinderzahl kindergeld.org:
Kinder	Kindergeld 2026/Monat
1	259 €
2	518 €
3	777 €
4	1.036 €
Verbindliche Auskünfte erteilt die Familienkasse.
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
The latest stable Python 3 release is Python 3.15.2, released October 25, 2026 python.org.
Supporting details:
Python.org's source downloads page lists "Latest Python 3 Release – Python 3.15.2" and shows 3.15.2 dated Oct. 25, 2026 python.org.
Wikipedia's Python article says "Python 3.15 [is] the latest stable release" as of October 2026 en.wikipedia.org.
Note: the excerpts only show the most recent entries; I didn't see full release notes for 3.15.2, so I can't say what it changed. If you want the changelog or download links, I can search for those.
~~~~~~

### Answer B

~~~~~~markdown
The latest stable Python release is Python 3.15.2, dated October 25, 2026 python.org. The official source page lists it as "Latest Python 3 Release – Python 3.15.2" python.org.
This is consistent with Wikipedia, which describes Python 3.15 as the latest stable version as of October 2026 en.wikipedia.org.
Note: these excerpts come from a retrieval on 2026-11-12; newer releases after that date wouldn't be reflected here.
~~~~~~

### Answer C

~~~~~~markdown
Python 3.15.2, released on October 25, 2026, is the latest stable release according to the official Python Source Releases page python.org. This is corroborated by the Wikipedia articles on Python and its history, which both state Python 3.15 is the latest stable version as of October 2026 en.wikipedia.org en.wikipedia.org.
For reference, the same page lists the most recent point releases across other maintained branches, all also dated Oct. 25, 2026: Python 3.11.18, 3.12.16, 3.13.18, and 3.14.10 python.org.
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
Kosten: Für Personen ab 24 Jahren kostet der Reisepass 70,00 €; er ist dann 10 Jahre gültig. Unter 24 Jahren sind es 37,50 € bei 6 Jahren Gültigkeit bmi.bund.de. Diese Beträge gelten laut BMI ab 7. Februar 2026 bmi.bund.de. Auch die anderen Quellen nennen 70 € ab 24 Jahren amtly.app wermachtwas.online weroad.de.
Dauer – die Angaben gehen auseinander:
Das BMI gibt laut einem Bericht in der Regel mindestens zwei Wochen an, abhängig von der Bearbeitungszeit der jeweiligen Behörde wiwo.de.
Ein Ratgeber-Blog nennt 4–6 Wochen regulär, mit Express-Zuschlag von 32 € in 3–4 Werktagen amtly.app.
Die „mindestens zwei Wochen" sind eine Untergrenze, keine Zusage; die 4–6 Wochen sind eine Erfahrungsangabe ohne amtliche Bestätigung. Für einen konkreten Termin ist die Bearbeitungszeit Ihres Bürgeramts maßgeblich. Laut einem Anbieter kommen Extras wie Expressbearbeitung, 48 Seiten oder Fotoaufnahme zusätzlich dazu weroad.de; die genauen Zusatzgebühren stehen auf der BMI-Seite bmi.bund.de.
Hinweis: Die Suchergebnisse waren nur Auszüge, keine vollständigen Seiten. Falls Sie die genauen Zusatzgebühren oder Bedingungen für den Express-Pass brauchen, kann ich gezielt danach suchen.
~~~~~~

### Answer B

~~~~~~markdown
Kosten: Für Personen ab 24 Jahren kostet der deutsche Reisepass 70,00 € und ist 10 Jahre gültig bmi.bund.de. Dieser Preis gilt laut BMI ab 7. Februar 2026 bmi.bund.de; mehrere aktuelle Ratgeber nennen denselben Betrag amtly.appwermachtwas.onlineweroad.de.
Dauer: Hier widersprechen sich die Quellen:
Das BMI gibt laut einem Bericht mindestens zwei Wochen an, abhängig von der Behörde wiwo.de.
Ein Ratgeber nennt regulär 4–6 Wochen amtly.app.
Mit Express-Zuschlag von 32 € soll er in 3–4 Werktagen fertig sein amtly.app; auch ein weiterer Ratgeber nennt die 32 € wermachtwas.online.
Die tatsächliche Bearbeitungszeit hängt also stark vom örtlichen Bürgeramt ab – am besten dort direkt nachfragen. Ob ein Express-Antrag in Ihrer Stadt möglich ist und wie lange es aktuell dauert, steht in diesen Auszügen nicht.
Hinweis: Die Angaben stammen aus Suchausschnitten, nicht aus vollständig gelesenen Seiten.
~~~~~~

### Answer C

~~~~~~markdown
Kosten
Ein Reisepass für Personen ab 24 Jahren kostet 70,00 Euro und ist 10 Jahre gültig bmi.bund.de. Dieselbe Angabe finden sich auch in mehreren Ratgebern amtly.appwermachtwas.onlineweroad.de.
Zusatzleistungen (mit Aufpreis):
Expressbearbeitung: +32,00 Euro wermachtwas.onlineamtly.app
48-Seiten-Pass für Vielreisende: +22,00 Euro wermachtwas.online
Bearbeitungsdauer
Hier weichen die Angaben voneinander ab:
Nach Angaben des BMI dauert es in der Regel mindestens zwei Wochen von der Beantragung bis zur Ausstellung, abhängig von der jeweiligen Behörde wiwo.de.
Ein anderer Ratgeber nennt regulär 4–6 Wochen amtly.app.
Die tatsächliche Dauer hängt also stark von der Auslastung Ihres Bürgeramts bzw. der zuständigen Behörde ab. Wer es eilig hat, kann mit dem Express-Zuschlag von 32 Euro mit einer Fertigstellung in etwa 3–4 Werktagen rechnen amtly.app.
Hinweis: Alle genannten Kosten gelten laut BMI ab dem 7. Februar 2026 bmi.bund.de.
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
Kurz: Die genaue Frist solltest du bei deiner Zulassungsstelle bzw. im Internetauftritt deiner Stadt prüfen – ich bin mir bei der konkreten Zahl für 2026 nicht sicher genug, um sie dir zu nennen. Häufig genannt wird aber: unverzüglich, spätestens innerhalb von etwa 6 Wochen nach dem Umzug (oft „Ummeldung innerhalb von 6 Wochen“). Bei einem Umzug innerhalb desselben Zulassungsbezirks ändert sich oft nur die Adresse in den Papieren – das ist meist günstiger und teils formloser.
Kosten (typische Größenordnung, je nach Kommune):
Adressänderung / Ummeldung am selben Ort: grob 10–20 €
Ummeldung mit neuem Kennzeichen (Umzug in anderen Bezirk): grob 25–40 €
Dazu kommen ggf. neue Kennzeichen (Prägen, ca. 10–20 €) und bei Bedarf Feinstaubplakette (ca. 5–10 €).
Praktisch: Termin bei der Zulassungsstelle, Personalausweis, Zulassungsbescheinigung Teil I (und II), ggf. alte Kennzeichen. Bei Versicherung und Kfz-Steuer (Zoll) die neue Adresse melden – die Steuer läuft meist automatisch über die Zulassung.
Wenn du mir sagst, ob du innerhalb oder außerhalb deines bisherigen Zulassungsbezirks gezogen bist, kann ich es genauer eingrenzen.
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt
Frist: Nach einem Umzug musst du die neue Halteradresse deines Autos in der Regel binnen einer Woche der Zulassungsstelle melden (Fahrzeug-Zulassungsverordnung). Die Frist läuft ab dem Einzug – wenn du schon umgezogen bist, also am besten zeitnah einen Termin buchen. Ich bin mir nicht ganz sicher, ob diese Frist aktuell unverändert gilt; verbindlich ist, was deine Zulassungsstelle sagt.
Kosten: Den exakten Betrag kann ich nicht verlässlich nennen. Die Gebühren sind zwar bundeseinheitlich geregelt, hängen aber vom Aufwand ab. Als grobe, häufig genannte Größenordnung: ca. 10–30 € – weniger, wenn nur die Papiere berichtigt werden, mehr, wenn neue Kennzeichen oder Stempelplaketten dazukommen. Bitte prüfe den aktuellen Betrag auf der Website deiner Zulassungsstelle; manche (privat betriebene) Stellen verlangen zusätzlich kleine Servicepauschalen.
Gut zu wissen
Zuständig ist die Zulassungsstelle deines neuen Wohnorts. Bist du im selben Zulassungsbezirk geblieben, reicht meist eine einfache Adressberichtigung. Viele Bundesländer bieten die Ummeldung inzwischen auch online an („i‑Kfz“).
Kennzeichen behalten: Dein bisheriges Kennzeichen darfst du in der Regel weiterführen, auch wenn der neue Bezirk ein anderes Kürzel hat. Neue Schilder sind optional und kosten extra.
Unterlagen (typisch):
Zulassungsbescheinigung Teil I (Fahrzeugschein) und Teil II (Fahrzeugbrief)
Personalausweis oder Reisepass, ggf. aktuelle Meldebescheinigung
IBAN / SEPA-Lastschriftmandat für die Kfz-Steuer
Kennzeichen, falls neue Plaketten oder Schilder fällig werden
Nicht vergessen
Einwohnermeldeamt: Anmeldung des neuen Wohnsitzes binnen zwei Wochen (falls noch nicht geschehen).
Kfz-Versicherung über den Umzug informieren – je nach Region kann sich der Beitrag ändern.
Mein Wissensstand stammt aus Trainingsdaten und kann veraltet sein; die verbindlichen Zahlen und Fristen stehen auf der Website deiner Zulassungsstelle. Wenn du mir sagst, ob du im selben Zulassungsbezirk geblieben bist, kann ich dir sagen, welche Variante (Berichtigung oder Ummeldung) bei dir zutrifft.
~~~~~~

### Answer C

~~~~~~markdown
Ich kann Ihnen die Grundlagen nennen, aber die genauen Fristen und Gebühren hängen vom Einzelfall ab – bitte prüfen Sie die Angaben bei Ihrer Zulassungsbehörde.
Frist
Wenn Sie innerhalb Deutschlands umziehen und das Auto beim Umzug schon auf Sie zugelassen war: In der Regel müssen Sie die neue Adresse unverzüglich in den Fahrzeugpapieren ändern lassen. Oft wird ein Zeitraum von wenigen Wochen bzw. „unverzüglich“ genannt – ich bin mir bei der genauen Zahl nicht sicher. Verbindlich ist die Auskunft Ihrer örtlichen Zulassungsstelle.
Wenn Sie aus dem Ausland nach Deutschland ziehen: Fahrzeuge müssen meist innerhalb einer bestimmten Frist (häufig einige Monate) umgemeldet werden, sonst drohen Steuer- und Zulassungsprobleme. Auch hier: bei der Zulassungsstelle erfragen.
Kosten (grobe Orientierung)
Bei einem reinen Adresswechsel ohne Halter-/Kennzeichenwechsel liegen die Gebühren typischerweise im Bereich von etwa 10–30 € (oft um 15–25 €), je nach Behörde. Kommen neue Kennzeichen, Feinstaubplakette oder andere Änderungen dazu, wird es mehr (dann eher 30–60 € oder darüber). Das sind Schätzwerte aus meinem Trainingswissen – Gebühren sind örtlich unterschiedlich und können sich geändert haben.
Praktisch wichtig
Halten Sie die Frist gegenüber Ihrer Zulassungsstelle ein, sonst kann es Bußgeld geben.
Für die Änderung brauchen Sie meist: Personalausweis, Zulassungsbescheinigung Teil I und II, ggf. neue Adresse, und das Kennzeichen (je nach Verfahren).
Bei parallelem Umzug der Kfz-Versicherung die neue Adresse melden – das kann den Beitrag ändern.
Für die Kfz-Steuer ist der Halterwechsel/Adresswechsel ebenfalls relevant.
Wenn Sie mir Ihr Bundesland/die Stadt nennen, kann ich Ihnen allgemein sagen, wo Sie die aktuellen Gebühren verbindlich nachsehen. Ihre genauen Symptome, ein Antrag oder eine Frist bei Ihrer Behörde sollten Sie im Zweifel direkt dort oder bei einem Fachmenschen klären – ich gebe nur allgemeine Orientierung, keine verbindliche Rechts- oder Behördenauskunft.
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
Die Abgabefrist für die Einkommensteuererklärung 2025 kann ich Ihnen nicht mit Sicherheit nennen – hier bin ich unsicher und möchte keine Zahl raten. Meine Kenntnisse stammen aus Trainingsdaten mit unbekanntem Stand und können veraltet sein.
Was ich mit Vorsicht sagen kann: Für Pflicht-Erklärungen ohne Steuerberater galt in den letzten Jahren eine verlängerte Frist bis Ende Juli des Folgejahres (zuletzt meist der 31. Juli). Ob das für 2025 genauso gilt, hängt von der aktuellen Regelung ab – bitte prüfen Sie das.
Verlässliche Quellen:
§ 149 AO (Gesetzestext, z. B. auf gesetze-im-internet.de) – regelt die allgemeine Frist
Ihr Finanzamt – telefonisch oder über das ELSTER-Postfach; oft gibt es einen Bescheid oder eine Fristmitteilung
ELSTER (elster.de) – Hinweise zur Abgabe und ggf. Fristverlängerung
Praktische Punkte:
Bei Abgabe über ELSTER zählt der Zeitpunkt der Übermittlung.
Wenn Sie die Frist nicht halten können: rechtzeitig (vor Fristablauf) beim Finanzamt eine Fristverlängerung beantragen – kurz begründen.
Verspätete Abgabe kann einen Verspätungszuschlag auslösen (§ 152 AO).
Möchten Sie, dass ich Ihnen die konkreten Fristen für die Vorjahre zusammenstelle, damit Sie das Muster erkennen? Für die verbindliche Auskunft bleibt das Finanzamt die richtige Stelle.
~~~~~~

### Answer B

~~~~~~markdown
Für die verpflichtende Steuererklärung 2025 (also die Erklärung, die du 2026 abgibst) gilt regulär:
Gesetzliche Abgabefrist: 31. Juli 2026 – ohne Steuerberater oder Lohnsteuerhilfeverein.
Verspätungszuschlag: Wird die Frist versäumt, kann das Finanzamt einen Verspätungszuschlag festsetzen (§ 152 AO). Seit 2019 ist er bei Pflicht-Erklärungen grundsätzlich zwingend.
Wichtig – bitte prüfen: In den letzten Jahren hat das BMF die Frist für Pflicht-Erklärungen mehrfach per Schreiben verlängert (zuletzt wegen der Umstellung auf elektronische Übermittlung). Ob es eine solche Verlängerung auch für 2026 gibt, kann ich mit meinem Wissensstand nicht sicher sagen. Ich bin mir hier ausdrücklich nicht sicher und möchte dir keine veraltete Zahl nennen.
Verlässliche Quellen für den aktuellen Stand:
BMF-Schreiben zu den Steuererklärungsfristen (bundesfinanzministerium.de)
Dein Finanzamt oder ELSTER (elster.de)
Praktischer Hinweis: Solltest du die Frist absehen können zu verpassen, ist ein Fristverlängerungsantrag beim Finanzamt oft möglich – kurz und begründet, am besten vor Fristablauf.
Wenn du magst, kann ich dir helfen, die für dich relevanten Unterlagen (z. B. Anlage N, Belege, Fristen) übersichtlich zusammenzustellen – sag einfach, was du an Einkünften hast.
~~~~~~

### Answer C

~~~~~~markdown
Kurzantwort: der 31. Juli 2026.
Ohne Steuerberater gilt für verpflichtend Abzugebende die allgemeine Frist nach § 149 Abs. 2 AO: Ablauf des siebten Monats nach Jahresende – für die Erklärung 2025 also 31.07.2026 (ein Freitag). Die Erklärung muss dem Finanzamt an diesem Tag bis 23:59 Uhr vorliegen; abgegeben wird bei der Einkommensteuer ohnehin elektronisch über ELSTER/„Mein ELster“.
Ergänzend:
Fristverlängerung: Auf Antrag beim Finanzamt möglich (§ 109 AO) – sinnvollerweise vor Ablauf der Frist stellen; nachträglich meist nur mit wichtigen Gründen.
Bei Verspätung: Es kann ein Verspätungszuschlag anfallen (mindestens 25 € je angefangenem Monat).
Ausnahme: Hat dir das Finanzamt eine andere Frist mitgeteilt (z. B. im Schreiben zur Erklärungspflicht), geht diese vor.
Zwei Hinweise:
In den vergangenen Jahren gab es zeitweise gesetzliche Fristverlängerungen (z. B. wegen Corona). Mein Wissensstand kann veraltet sein; für 2025 kenne ich keine solche allgemeine Verlängerung. Im Zweifel kurz beim Finanzamt oder auf bmf.de/elster.de prüfen.
Laut meiner Geräteuhr wäre der 31.07.2026 bereits verstrichen (angezeigt: November 2026; die Uhr kann aber falsch sein). Falls du die Erklärung noch nicht abgegeben hast und die Frist tatsächlich vorbei ist: reiche sie so schnell wie möglich nach – je früher, desto kleiner der mögliche Verspätungszuschlag.
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
Der Rundfunkbeitrag betrug nach meinem letzten gesicherten Kenntnisstand 18,36 € pro Monat (55,08 € je Quartal) – pro Wohnung, unabhängig von der Anzahl der Bewohner oder Geräte. Dieser Wert gilt seit 2021.
Es gab allerdings Diskussionen über eine Erhöhung; ob und wann eine Änderung beschlossen wurde, kann ich nicht prüfen, da mein Wissen aus Trainingsdaten mit einem nicht veröffentlichten Enddatum stammt und daher veraltet sein kann.
Verbindliche aktuelle Höhe: bitte direkt auf der offiziellen Seite rundfunkbeitrag.de (https://www.rundfunkbeitrag.de) nachsehen. Möchtest du, dass ich mit einer Websuche prüfe, ob der Beitrag inzwischen erhöht wurde?
~~~~~~

### Answer B

~~~~~~markdown
Der Rundfunkbeitrag in Deutschland beträgt derzeit 18,36 € pro Monat pro Wohnung (das entspricht 55,08 € pro Quartal).
Hinweise:
Mein Wissen kann veraltet sein; der Beitrag wird von den Ländern festgelegt und kann sich ändern. Verbindlich ist die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de).
Für bestimmte Personen gibt es Ermäßigungen oder Befreiungen (z. B. bei bestimmten Sozialleistungen); die Voraussetzungen stehen ebenfalls beim Beitragsservice.
~~~~~~

### Answer C

~~~~~~markdown
Der Rundfunkbeitrag in Deutschland beträgt derzeit 18,36 € pro Monat je Wohnung (Stand meines Wissens; der Betrag ist seit 2021 unverändert).
Wichtig: Meine Informationen können veraltet sein, und die Höhe wird regelmäßig politisch und rechtlich diskutiert. Für den aktuell verbindlichen Betrag prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de) – dort steht der gültige Satz und auch, wer befreit werden kann.
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
Kündigungsfrist als Mieter: 3 Monate zum Monatsende
Bei einem unbefristeten Wohnraummietvertrag gilt für Sie als Mieter eine gesetzliche Frist von drei Monaten zum Ende eines Kalendermonats (§ 573c Abs. 2 BGB).
Wichtig zu wissen:
Unabhängig von der Mietdauer: Anders als beim Vermieter (dessen Frist mit der Dauer auf 6 oder 9 Monate wächst) bleibt Ihre Frist als Mieter immer drei Monate – egal, wie lange Sie schon dort wohnen.
Verträge können sie nicht verlängern: Eine zum Nachteil des Mieters abweichende Vereinbarung (z. B. „Kündigungsfrist Mieter: 6 Monate") ist unwirksam. Auch wenn im Vertrag länger steht, gilt für Sie gesetzlich die Drei-Monats-Frist.
Zugang zählt: Die Frist beginnt mit dem Zugang der Kündigung beim Vermieter. Beispiel: Geht die Kündigung bis 30.09. zu, endet das Mietverhältnis am 31.12.
Form: Die Kündigung muss in Textform erfolgen; nach der Mietrechtsreform 2025 soll dafür z. B. eine E-Mail genügen (zuvor galt Schriftform mit eigenhändiger Unterschrift). Senden Sie möglichst früh und nachweisbar (z. B. Einwurf-Einschreiben), falls der Zugang strittig wird.
Ausnahmen: Für gewerblich genutzte Räume, möblierte Zimmer beim Vermieter, Wohnheime oder Arbeitnehmerwohnraum können andere Regeln gelten.
Dies ist allgemeine Information, keine Rechtsberatung – bei einem konkreten Streitfall hilft Ihnen ein Mieterverein oder Anwalt weiter.
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gilt für Mieter bei einem unbefristeten Wohnraummietvertrag in der Regel eine gesetzliche Kündigungsfrist von 3 Monaten (§ 573c BGB). Die Kündigung muss schriftlich erfolgen und spätestens am dritten Werktag eines Monats zugehen, damit die Frist ab diesem Monat läuft.
Wichtige Punkte:
Keine Verlängerung zulasten des Mieters: Eine längere Frist im Vertrag gilt nur, wenn sie auch für den Vermieter gilt – für Mieter bleibt es bei maximal 3 Monaten.
Kürzere Fristen im Vertrag sind zulässig (z. B. „bis zum 15. eines Monats zum Monatsende“).
Sonderfälle: Bei möblierten Zimmern zur Untermiete kann eine kürzere Frist gelten; bei Gewerbemiete gelten andere Regeln.
Form: Schriftlich mit eigenhändiger Unterschrift (E-Mail/Text reicht nicht), am besten mit Nachweis des Zugangs.
Bin ich mir bei Details unsicher? Bei individuellen Vertragsklauseln oder Fristberechnung lohnt ein Blick in den Mietvertrag und ggf. eine kurze Rückfrage bei einer Mieterberatung oder einem Anwalt. Die genaue Fristberechnung hängt vom Zugangsdatum ab – das solltest du im Zweifel prüfen lassen.
~~~~~~

### Answer C

~~~~~~markdown
In Deutschland gilt für Mieter bei einem unbefristeten Wohnraummietvertrag die gesetzliche Kündigungsfrist von drei Monaten (§ 573c BGB). Die Kündigung muss spätestens am dritten Werktag eines Monats beim Vermieter zugehen, damit die Frist mit dem Monat beginnt – die Kündigung wirkt dann zum Ende des übernächsten Monats.
Beispiel: Geht die Kündigung am 3. März zu, endet das Mietverhältnis am 31. Mai.
Wichtige Punkte:
Die Frist gilt nur für Wohnraum; bei Geschäftsräumen oder möblierten Zimmern können andere Regeln gelten.
Eine Schriftform ist erforderlich – die Kündigung muss schriftlich mit eigenhändiger Unterschrift (bei mehreren Mietern von allen) erfolgen. E-Mail oder Fax reicht nicht.
Vertragliche Verlängerungen der Mieterfrist sind grundsätzlich unwirksam, wenn sie zulasten des Mieters gehen; individuelle Abweichungen sollte man im Vertrag prüfen.
Ein befristeter Mietvertrag oder ein Kündigungsverzicht ändert die Lage.
Ich bin keine Rechtsberatung – bei Zweifeln lohnt ein Blick in den Mietvertrag oder eine kurze Nachfrage beim Mieterverein.
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
Bei einer Fünf-Tage-Woche sind es in Deutschland mindestens 20 Urlaubstage pro Kalenderjahr.
Das ergibt sich aus dem Bundesurlaubsgesetz: Der gesetzliche Mindesturlaub beträgt 24 Werktage (§ 3 BUrlG). „Werktage" meint dabei Montag bis Samstag, also 6 Tage pro Woche. Bei einer 5-Tage-Woche rechnet man um: 24 × 5 ÷ 6 = 20 Tage.
Wichtig:
Das ist nur das gesetzliche Minimum. Viele Tarif- oder Arbeitsverträge sehen mehr vor – im Vertrag nachsehen lohnt sich.
Bei weniger als 5 Arbeitstagen pro Woche verringert sich der Anspruch entsprechend (z. B. 4-Tage-Woche: 16 Tage).
Bei unterjährigem Ein-/Austritt entsteht der Anspruch anteilig (Zwölftelung).
Sonderregeln können je nach Vertrag oder Tarif gelten; im Zweifel Personalabteilung, Betriebsrat oder eine Rechtsberatung fragen.
~~~~~~

### Answer B

~~~~~~markdown
Bei einer Fünf-Tage-Woche sind es 20 Arbeitstage gesetzlicher Mindesturlaub pro Jahr.
Grundlage: § 3 BUndesurlaubsgesetz (BUrlG) – mindestens 24 Werktage, wobei der Samstag als Werktag mitzählt. Bei 5 Arbeitstagen pro Woche: 24 × 5/6 = 20 Arbeitstage.
Wichtig:
Das ist das Minimum; Arbeits- oder Tarifvertrag können mehr vorsehen.
Für unter 6 Monate Betriebszugehörigkeit gilt der volle Anspruch erst nach der Wartezeit (§ 4 BUrlG), davor anteilig.
Bei Teilzeit oder unregelmäßigen Arbeitstagen gelten andere Umrechnungen.
Ob in Ihrem Fall mehr gilt, steht in Ihrem Arbeitsvertrag bzw. Tarifvertrag – das kann ich ohne diese Angaben nicht sagen.
~~~~~~

### Answer C

~~~~~~markdown
20 Arbeitstage bei einer Fünf-Tage-Woche.
Hintergrund: Das Bundesurlaubsgesetz (§ 3 BUrlG) sieht einen Mindesturlaub von 24 Werktagen pro Urlaubsjahr vor – bezogen auf eine Sechs-Tage-Woche (Montag bis Samstag). Bei einer kürzeren Arbeitszeit wird anteilig umgerechnet:
24 ÷ 6 × 5 = 20 Urlaubstage
Zusätzlich zu beachten:
Tarifvertrag oder Arbeitsvertrag sehen oft mehr vor (häufig 25–30 Tage) – dann gilt die günstigere Regelung.
Der Anspruch entsteht in voller Höhe nach sechs Monaten Betriebszugehörigkeit (§ 4 BUrlG), wobei der Urlaub schon früher anteilig genommen werden kann.
Für die konkreten Details lohnt ein Blick in deinen Arbeits- oder Tarifvertrag.
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
Wichtig zuerst: Wenn der Ausweis weg ist, gilt er als verloren – auch wenn er vielleicht nur verlegt wurde. Du solltest ihn also sperren lassen, damit niemand damit Unsinn machen kann.
Was du tun musst
Verlust melden und sperren lassen – bei der Polizei oder beim Bürgeramt deiner Gemeinde. Viele Städte bieten das auch online an (Suchbegriff: „Personalausweis sperren online“ auf der Seite deiner Stadt). Für die Sicherheitssperre gibt es ein bundesweites Angebot, über das du den Ausweis sofort ungültig machen lassen kannst.
Neuen Ausweis beantragen – persönlich im Bürgeramt deines Hauptwohnsitzes, mit Termin. Nötig sind meist ein biometrisches Passfoto und ein gültiges Ausweisdokument (z. B. Reisepass) – wenn auch das fehlt, klär das beim Termin, die Ämter haben dafür Wege.
Polizeiliche Verlustanzeige – sinnvoll, falls der Ausweis für Betrug missbraucht wird oder du ihn z. B. für Versicherungen brauchst.
Bei Diebstahl: Anzeige bei der Polizei erstatten. Bei Identitätsdiebstahl-Verdacht (unbekannte Verträge, Mahnungen) zusätzlich Bank und ggf. Auskunfteien informieren.
Kosten
Ein Personalausweis kostet in Deutschland in der Regel 37 Euro für Personen ab 24 Jahren. Für Personen unter 24 Jahren sind es meist 22,50 Euro. Dazu können Gebühren für das Passfoto und ggf. eine Verlustanzeige kommen. Die genauen Sätze legt deine Kommune fest – ich bin mir bei aktuellen Beträgen nicht sicher, bitte prüf sie auf der Seite deines Bürgeramts.
Wichtig zur Frist: Der alte Ausweis wird mit der Sperrung ungültig. Ein neuer Ausweis dauert meist etwa zwei bis sechs Wochen; ein vorläufiger Ausweis (meist ca. 10 Euro) ist oft sofort möglich, wenn du schnell ein Dokument brauchst.
Sag mir gern, in welcher Stadt du bist – dann kann ich dir sagen, wonach du auf deren Seite suchen solltest (Online-Sperrung, Termin, Gebühren).
~~~~~~

### Answer B

~~~~~~markdown
Wichtig zuerst: Melde den Verlust schnell – das schützt dich, falls jemand den Ausweis missbraucht.
1. Verlust melden
Polizei (Diebstahl/Verlustanzeige): Wenn der Ausweis gestohlen wurde oder du nicht ausschließen kannst, dass er in falsche Hände gerät, erstatte Anzeige bei der Polizei. Das ist bei Diebstahl sinnvoll, bei reinem Verlust oft optional – frag im Bürgeramt nach, ob sie eine Verlustanzeige verlangen.
Bürgeramt / Einwohnermeldeamt: Dort meldest du den Verlust und beantragst einen neuen Ausweis. Viele Ämter verlangen eine schriftliche Verlustanzeige oder ein Formular.
Sperrung: Den Personalausweis selbst kann man nicht wie eine Karte „sperren“. Missbrauch lässt sich aber erschweren, indem du den Verlust dokumentierst – die Polizei- bzw. Verlustanzeige ist dein Nachweis.
2. Neuen Personalausweis beantragen
Persönlich im Bürgeramt deines Hauptwohnsitzes, mit Termin (oft online buchbar).
Nötig: biometrisches Passfoto, ggf. alte Dokumente/Geburtsurkunde, Verlustanzeige.
Gültigkeit: ab 24 Jahren 10 Jahre, unter 24 Jahren 6 Jahre.
Dauer: meist einige Wochen; für die Übergangszeit gibt es oft einen vorläufigen Personalausweis (sofort, meist gültig bis zu 3 Monate).
3. Kosten
Die genauen Gebühren legt die jeweilige Kommune fest. Als Orientierung (ohne Gewähr, bitte beim Bürgeramt prüfen):
Personalausweis ab 24 Jahren: ca. 37 €
unter 24 Jahren: ca. 22,80 €
vorläufiger Personalausweis: ca. 10 €
Da ich bei aktuellen Gebühren nicht sicher bin, verlass dich auf die Angaben deines Bürgeramts – die genauen Beträge stehen meist auf deren Website.
4. Wichtig bei Diebstahl
Wenn zusätzlich Bankkarten, SIM-Karte oder Dokumente weg sind: Bank/Kartenanbieter und Mobilfunkanbieter informieren, damit Karten gesperrt werden. Das ist oft dringlicher als der Ausweis selbst.
Wenn du möchtest, sag mir dein Bundesland oder deine Stadt – dann kann ich dir gezielter sagen, worauf du dort achten solltest (die konkreten Beträge und Formulare prüfe ich aber nicht online).
~~~~~~

### Answer C

~~~~~~markdown
Was Sie sofort tun sollten
Verlust anzeigen: Melden Sie den Verlust so bald wie möglich beim Bürgeramt/Einwohnermeldeamt – bei Diebstahl zusätzlich bei der Polizei. Das ist wichtig gegen Missbrauch.
Online-Ausweisfunktion sperren: Falls Sie die eID-Funktion genutzt haben, sperren Sie sie notfalls selbst über die AusweisApp (Notfall-Sperrfunktion). Das ersetzt aber nicht die Verlustanzeige beim Amt.
Optional: beim Fundbüro und bei der Polizei nachfragen – verlorene Ausweise werden oft abgegeben.
Neuen Ausweis beantragen
Persönlich im Bürgeramt (Termin meist online buchbar), in der Regel am Wohnort.
Mitbringen: aktuelles Biometriefoto, ggf. Reisepass oder Führerschein zur Identitätsfeststellung. Vor Ort werden Fingerabdrücke abgenommen.
Die Fertigung dauert meist einige Wochen; zugestellt wird an die gemeldete Adresse – achten Sie auf Namen an Briefkasten und Klingelschild, sonst geht der Ausweis zurück.
Wenn es eilig ist: Es gibt einen vorläufigen Personalausweis (schnell ausgestellt, 3 Monate gültig, gilt nur in Deutschland). Für Auslandsreisen bräuchten Sie stattdessen einen (vorläufigen) Reisepass.
Kosten
Zuletzt betrug die Gebühr 28,10 € ab 24 Jahren bzw. 22,80 € für unter 24-Jährige (der vorläufige PA kostet weniger). Ich bin nicht sicher, ob diese Sätze 2026 noch aktuell sind – die verbindliche Gebühr nennt Ihnen Ihr Bürgeramt bzw. finden Sie unter verwaltung.bund.de. Mein Wissensstand stammt aus Trainingsdaten und kann veraltet sein; die o. g. Seite oder das Amt hat die aktuellen Zahlen.
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
Jupiter currently has 97 confirmed moons, according to the International Astronomical Union's most recent catalog. This has changed several times in recent years as new small irregular moons are confirmed, so the count may rise again.
The four largest — Io, Europa, Ganymede and Callisto — were discovered by Galileo in 1610. Most of the rest are small, irregular satellites, many only a few kilometers across.
My knowledge has a cutoff that may be out of date for the very latest confirmations; if you need the current official number, the IAU Minor Planet Center publishes the authoritative list, and I can search the web for you.
~~~~~~

### Answer B

~~~~~~markdown
Jupiter currently has 97 confirmed moons, according to the International Astronomical Union's most recent catalog.
A few notes:
The count has grown a lot in recent years as astronomers discover small, faint irregular satellites—mostly in 2023, when dozens of new ones were confirmed.
The number changes as new moons are found and confirmed, and as existing objects are reclassified. Very small moons can also be lost or re-observed later.
My knowledge may be out of date on the exact current figure; if you need the latest official number, the IAU Minor Planet Center publishes the definitive list.
Want the breakdown by group (Galilean, prograde irregular, retrograde irregular) or a web search for the latest count?
~~~~~~

### Answer C

~~~~~~markdown
Jupiter has 95 confirmed moons as of my training data (last confirmed count from 2023), making it the planet with the second-most moons after Saturn.
A few notable points:
The four largest are the Galilean moons: Io, Europa, Ganymede, and Callisto — visible with binoculars or a small telescope.
Ganymede is the largest moon in the solar system, even bigger than Mercury.
Most of Jupiter's moons are small, irregular bodies only a few kilometers across.
Since new moons are discovered regularly and counts are officially confirmed by the IAU over time, the number may have changed since my knowledge was last updated — a quick web search would give the latest count.
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
As of my training data, Ursula von der Leyen (Germany, European People's Party) is the President of the European Commission. She first took office in December 2019 and was re-elected by the European Parliament in July 2024, with her second term beginning on 1 December 2024.
Note: my knowledge comes from training data with an unpublished end date and may be out of date. To confirm the current officeholder, check a live source such as the European Commission's official website (https://commission.europa.eu).
~~~~~~

### Answer B

~~~~~~markdown
Ursula von der Leyen is the President of the European Commission. Her current term runs to 2029, following her re-election by the European Parliament in July 2024.
My knowledge comes from training data with an unpublished end date, so I can't fully verify this is still current as of today — if you'd like, I can suggest checking the official European Commission website (ec.europa.eu) for confirmation.
~~~~~~

### Answer C

~~~~~~markdown
Ursula von der Leyen is the President of the European Commission. My knowledge comes from training data with an unpublished end date and may be out of date—her current status depends on recent EU appointments, so I'd suggest confirming via the official European Commission website.
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
I'm not able to confirm the current LTS version — my knowledge has a training cutoff and Node.js releases change over time, so anything I state could be out of date. I also don't have web access in this session.
To check the authoritative source quickly:
nodejs.org — the homepage shows the current LTS and Current versions, and the "Releases" page lists the schedule.
github.com/nodejs/Release — the official release schedule, including which major lines are in Active LTS or Maintenance LTS.
Node's LTS lines are even-numbered majors, each in Active LTS for roughly a year after entering LTS, then Maintenance LTS; odd-numbered majors never become LTS.
If you tell me which Node version you're currently on or what you're deploying to, I can help you reason about upgrade considerations in general terms.
~~~~~~

### Answer B

~~~~~~markdown
I don't have reliable current information on the latest Node.js LTS version—my knowledge has an unpublished cutoff date, and Node.js releases change on a regular schedule, so I can't say which version is current without checking.
Node's odd-numbered releases (e.g., 21, 23) are non-LTS and short-lived; even-numbered releases (e.g., 20, 22, 24) become LTS. To confirm the current LTS:
Check the official site: nodejs.org (the download page lists the current LTS)
Or the release schedule: github.com/nodejs/Release
If you'd like, I can describe how the LTS schedule works or help you upgrade an existing project once you tell me the version you're on.
~~~~~~

### Answer C

~~~~~~markdown
That depends on the current date, and Node.js releases change on a predictable schedule that I can't verify in real time — my knowledge comes from training data with an unpublished end date.
What I can tell you from the established release pattern (even-numbered versions become LTS each October):
Node.js 22 ("Jod") entered LTS in October 2024 — the latest LTS I can confidently confirm.
Node.js 24 was scheduled to become LTS in October 2025.
Node.js 26 would follow in October 2026.
Since today is November 2026, Node.js 26 may have just become the current LTS, but I can't verify whether that release actually shipped on schedule.
To check the current status: see the official release list at nodejs.org (https://nodejs.org/en/about/previous-releases) or the release schedule at github.com/nodejs/release (https://github.com/nodejs/release). Running node --version shows what's installed locally, and tools like nvm or fnm let you switch versions easily.
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
Mein Wissen stammt aus Trainingsdaten mit unbekanntem Stichtag und kann veraltet sein – ich kann das also nicht mit Sicherheit sagen. Nach meinem letzten Stand war Friedrich Merz (CDU) Bundeskanzler; er wurde im Mai 2025 gewählt.
Ob das noch aktuell ist, prüfst du am besten direkt bei der Bundesregierung (bundesregierung.de) oder beim Bundestag. Soll ich für dich danach suchen?
~~~~~~

### Answer B

~~~~~~markdown
Mein Wissen stammt aus Trainingsdaten mit einem nicht veröffentlichten Enddatum und kann veraltet sein – die aktuelle Amtsinhaberschaft kann ich daher nicht zuverlässig bestätigen. Nach meinem Kenntnisstand war Friedrich Merz (CDU) seit Mai 2025 Bundeskanzler; ob das zum heutigen Datum noch gilt, kann ich nicht prüfen. Für die aktuelle Angabe bitte bundesregierung.de oder bundestag.de prüfen – oder ich suche es online, wenn Sie möchten.
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Wissensstand ist Friedrich Merz (CDU) seit dem 6. Mai 2025 Bundeskanzler, nach der Bundestagswahl im Februar 2025 (Koalition aus CDU/CSU und SPD).
Da sich Ämter ändern können und ich keine aktuellen Quellen abrufen kann, empfehle ich, den aktuellen Stand z. B. auf bundesregierung.de oder in aktuellen Nachrichten zu prüfen.
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
Das Deutschlandticket kostet im Abonnement regulär 58 € pro Monat (Stand meines Wissens; der Preis war zuletzt 2025 angehoben worden und kann sich zum Jahreswechsel ändern). Es gilt bundesweit im Nah- und Regionalverkehr, nicht im Fernverkehr (ICE/IC).
Da sich Preise und Regelungen ändern können und mein Wissen möglicherweise nicht aktuell ist: Den tagesaktuellen Preis finden Sie auf bahn.de oder bei Ihrem Verkehrsverbund. Mancherorts gibt es zudem vergünstigte Varianten (z. B. für Studierende oder Senioren).
~~~~~~

### Answer B

~~~~~~markdown
Das Deutschlandticket kostet im Abo derzeit regulär 58 € pro Monat (Stand meiner Wissensbasis). Der Preis ist seit 2025 von 49 € auf 58 € gestiegen; für 2026 sind weitere Erhöhungen im Gespräch bzw. beschlossen worden – da bin ich mir nicht sicher.
Wichtig:
Es gilt als Abo, monatlich kündbar.
Ermäßigungen gibt es z. B. für Studierende (Semesterticket-Varianten, oft günstiger) und teils für Auszubildende.
Jobticket/Deutschlandticket Job ist oft rabattiert, wenn der Arbeitgeber einen Zuschuss zahlt.
Weil sich Preise ändern können und meine Angaben möglicherweise veraltet sind, prüfe den aktuellen Preis am besten direkt bei einem Verkehrsverbund oder auf bahn.de bzw. deutschlandticket.de. Soll ich dir die aktuellen Konditionen per Websuche heraussuchen?
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Stand kostet das Deutschlandticket 58 € pro Monat – dieser Preis gilt seit dem 1. Januar 2025 (zuvor 49 €).
Ein wichtiger Hinweis: Mein Wissen stammt aus Trainingsdaten mit unspezifischem Stichtag. Für 2026 gab es Diskussionen über eine mögliche weitere Preiserhöhung – ob und auf welchen Betrag die umgesetzt wurde, kann ich nicht sicher bestätigen.
Den verbindlichen, aktuellen Preis findest du auf der offiziellen Seite deutschlandticket.de oder bei deinem örtlichen Verkehrsverbund bzw. unter bahn.de.
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
Germany's population is roughly 84–85 million. Destatis (the Federal Statistical Office) most recently put it at about 83.5 million at the end of 2023, and the Wiesbaden-based figures have hovered in the low 80s to mid-80s in recent years.
Because this changes with births, deaths and net migration, and my knowledge has a cutoff I can't verify, treat it as approximate. For a current official figure, check destatis.de ("Bevölkerungsstand").
~~~~~~

### Answer B

~~~~~~markdown
Germany's population is approximately 84 million people (around 83–84.7 million based on recent estimates from 2022–2024, with growth driven largely by immigration).
For the most current official figure, you can check the Federal Statistical Office of Germany (Destatis) at destatis.de (https://www.destatis.de), as population numbers change continuously and my training data may not reflect the latest count.
~~~~~~

### Answer C

~~~~~~markdown
Germany's population is about 84–85 million. Destatis put it at roughly 84.7 million at the end of 2024, so figures vary slightly by source and date.
For a current, citable number, check the official Destatis page (destatis.de).
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
Earth's seasons are caused by the tilt of Earth's axis, not by changes in our distance from the Sun.
The key mechanism
Earth's axis is tilted about 23.4° from perpendicular to its orbital plane.
As Earth orbits the Sun, the tilt stays pointed in roughly the same direction in space (toward Polaris). So different hemispheres lean toward the Sun at different times of year.
When your hemisphere leans toward the Sun, sunlight strikes more directly and days are longer → summer. When it leans away, sunlight is more oblique and days are shorter → winter.
Why distance isn't the cause
Earth's orbit is slightly elliptical, so we're a bit closer to the Sun in early January and farther in early July—but the Northern Hemisphere has winter in January, which shows distance can't explain the pattern. The ~3% variation in distance is also small compared to the tilt's effect.
Consequences
The hemispheres have opposite seasons (summer in the north while it's winter in the south).
Near the equator the effect is small, so seasons there are mild and driven more by rainfall patterns.
Polar regions get the extremes: continuous daylight in summer and darkness in winter.
Equinoxes (around March and September) occur when the tilt is neither toward nor away from the Sun, so day and night are nearly equal everywhere; solstices (around June and December) mark the maximum lean.
If you'd like, I can explain why the solstices aren't usually the hottest/coldest days, or how the tilt itself stays stable.
~~~~~~

### Answer B

~~~~~~markdown
The seasons are caused by Earth's axial tilt (about 23.5°) combined with its yearly orbit around the Sun — not by changes in distance from the Sun, which is a common misconception. (Earth is actually closest to the Sun in early January, during the Northern Hemisphere's winter.)
How it works:
Because Earth's axis stays pointed in the same direction as it orbits, each hemisphere leans toward the Sun for part of the year and away for the other part.
When a hemisphere is tilted toward the Sun, sunlight strikes it more directly (more energy per area) and days are longer → summer.
When tilted away, sunlight arrives at a lower angle and days are shorter → winter.
This is why the Northern and Southern Hemispheres experience opposite seasons at the same time.
The solstices (around June 21 and December 21) mark the peak of each tilt, and the equinoxes (around March 20 and September 22–23) are when neither hemisphere is tilted toward the Sun, giving roughly equal day and night everywhere.
~~~~~~

### Answer C

~~~~~~markdown
Earth's seasons come mainly from the tilt of Earth's axis, not from how far Earth is from the Sun.
The key mechanism: axial tilt
Earth's rotation axis is tilted about 23.4° relative to its orbital plane.
As Earth orbits the Sun, that tilt keeps pointing in roughly the same direction in space. So different hemispheres receive sunlight at different angles and for different lengths of time over the year.
When your hemisphere is tilted toward the Sun, sunlight strikes more directly and days are longer → summer. When tilted away, sunlight is more oblique and days are shorter → winter.
The two hemispheres have opposite seasons at the same time.
Why distance isn't the main cause
Earth's orbit is slightly elliptical, and Earth is actually closest to the Sun in early January — during Northern Hemisphere winter. So distance alone can't explain the seasons; the tilt dominates.
The four markers
Equinoxes (around March and September): the Sun is over the equator; day and night are nearly equal everywhere.
Solstices (around June and December): one hemisphere gets its longest day and the other its shortest.
Things that vary the pattern
The tilt itself is stable over human timescales but varies slowly over tens of thousands of years (Milankovitch cycles), affecting long-term climate.
Near the equator, seasonal temperature swings are smaller; high latitudes have much larger ones. Local factors like oceans, altitude and prevailing winds modulate how a season actually feels.
In short: tilt + orbit = seasons, with the varying angle and duration of sunlight as the direct cause.
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
Zinsanteil: wird auf die jeweils restliche Restschuld berechnet. Am Anfang ist die Restschuld hoch, also ist der Zinsanteil hoch.
Tilgungsanteil: ergibt sich als Annuität minus Zinsanteil. Er ist am Anfang klein und wird mit jeder Rate größer, weil die Restschuld sinkt.
Beispiel: 100.000 € Kredit, 4 % Zins, 2 % anfängliche Tilgung → Annuität ca. 6.000 € pro Jahr (500 €/Monat). Im ersten Jahr: 4.000 € Zins, 2.000 € Tilgung. Im Folgejahr sinkt der Zinsanteil, der Tilgungsanteil steigt – die Rate bleibt gleich.
Wichtige Punkte:
Laufzeit hängt von Zins und anfänglicher Tilgung ab; höhere Tilgung = schnellere Rückzahlung, aber höhere Rate.
Sondertilgungen verkürzen die Laufzeit, wenn der Vertrag sie zulässt (oft begrenzt oder mit Gebühr).
Zinsbindung: Nach Ablauf wird der Zins neu verhandelt; dann kann die Rate steigen oder sinken.
Restschuld am Ende der Zinsbindung ist der Betrag, der noch offen ist.
Faustregel: Anfangs zahlst du überwiegend Zinsen, später überwiegend Tilgung.
~~~~~~

### Answer B

~~~~~~markdown
Annuitätentilgung – kurz erklärt
Bei einem Annuitätendarlehen zahlt du jeden Monat (bzw. jedes Jahr) eine konstante Rate – die Annuität. Diese Rate besteht aus zwei Teilen:
Zinsanteil: berechnet auf die noch offene Restschuld
Tilgungsanteil: der Betrag, der die Restschuld tatsächlich abbaut
So entwickelt sich das Darlehen:
Am Anfang ist die Restschuld hoch → der Zinsanteil ist groß, die Tilgung fällt klein aus.
Mit jeder Rate sinkt die Restschuld → der Zinsanteil wird kleiner.
Da die Gesamtrate gleich bleibt, wächst der Tilgungsanteil von Rate zu Rate – der Kredit beschleunigt sich sozusagen selbst.
Beispiel: Bei 300.000 € mit 4 % Zins und 2 % anfänglicher Tilgung beträgt die Annuität 6 % von 300.000 € = 18.000 €/Jahr. Anfangs gehen 12.000 € an Zinsen und nur 6.000 € an Tilgung; am Ende ist es umgekehrt.
Typische Merkmale in Deutschland:
Üblich bei Baufinanzierungen und Ratenkrediten.
Die Rate ist meist nur während der Zinsbindung fest; danach wird neu kalkuliert.
Höhere anfängliche Tilgung oder Sonderzahlungen verkürzen die Laufzeit und senken die Gesamtkosten deutlich.
Kurz gesagt: Gleiche Rate, verschiebendes Verhältnis – erst zahlt man v. a. Zinsen, zum Schluss v. a. Tilgung.
~~~~~~

### Answer C

~~~~~~markdown
Bei einem Annuitätendarlehen zahlst du jeden Monat (oder jährlich) eine gleichbleibende Rate – die Annuität. Sie setzt sich aus Zins und Tilgung zusammen:
Zinsanteil: wird auf die jeweils noch offene Restschuld berechnet. Anfangs ist die Restschuld hoch, daher ist der Zinsanteil anfangs groß.
Tilgungsanteil: der Rest der Rate, der die Schuld tatsächlich reduziert. Er ist anfangs klein und wächst mit der Zeit.
Weil die Rate konstant bleibt, verschiebt sich das Verhältnis im Lauf der Zeit: Der Zinsanteil sinkt, der Tilgungsanteil steigt. Die Restschuld nimmt also immer schneller ab.
Beispiel (vereinfacht): 100.000 € Kredit, 4 % Zins, anfängliche Tilgung 2 % → erste Jahresrate ca. 6.000 € (4.000 € Zins + 2.000 € Tilgung). Im Folgejahr sinkt der Zinsanteil, der Tilgungsanteil steigt.
Wichtige Punkte:
Laufzeit ergibt sich aus Zins und anfänglicher Tilgung; höhere Tilgung = kürzere Laufzeit, aber höhere Rate.
Sondertilgungen verkürzen die Laufzeit und senken die Zinssumme.
Zinsbindung: Nach Ablauf (z. B. 10 Jahre) wird der Zins neu festgelegt – die Rate kann sich dann ändern.
Restschuld am Ende der Zinsbindung wird oft als Anschlussfinanzierung weitergeführt.
Wenn du konkrete Konditionen prüfst (Rate, Laufzeit, Sondertilgung), lohnt ein Blick in den Vertrag oder ein Gespräch mit deiner Bank; ich kann dir die Mechanik gern an deinen Zahlen durchrechnen.
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
merge_intervals
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching closed intervals.
    Touching intervals (where end of one equals start of the next, e.g.
    [8, 10] and [10, 12]) are merged, as in the example.
    Args:
        intervals: list of [start, end] pairs. May be empty or unsorted.
    Returns:
        New list of merged [start, end] pairs, sorted by start.
    """
    if not intervals:
        return []
    # Sort by start, then by end
    ordered = sorted((list(iv) for iv in intervals), key=lambda x: (x[0], x[1]))
    merged = [ordered[0][:]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:          # overlapping or touching
            merged[-1][1] = max(last_end, end)
        else:
            merged.append([start, end])
    return merged
Pytest tests
python
Copy code
import pytest
from merge_intervals import merge_intervals
@pytest.mark.parametrize("inp, expected", [
    # The example from the prompt
    ([[1, 3], [2, 6], [8, 10], [10, 12], [15, 18]],
     [[1, 6], [8, 12], [15, 18]]),
    # Empty input
    ([], []),
    # Single interval
    ([[5, 7]], [[5, 7]]),
    # Already merged / disjoint, sorted
    ([[1, 2], [3, 4], [5, 6]], [[1, 2], [3, 4], [5, 6]]),
    # Unsorted, overlapping
    ([[8, 10], [1, 3], [2, 6], [15, 18], [10, 12]],
     [[1, 6], [8, 12], [15, 18]]),
    # Touching only
    ([[1, 2], [2, 3], [3, 4]], [[1, 4]]),
    # Fully contained interval
    ([[1, 10], [2, 3]], [[1, 10]]),
    # Nested + unsorted
    ([[5, 6], [1, 10], [2, 3], [11, 12]], [[1, 10], [11, 12]]),
    # Duplicates
    ([[1, 4], [1, 4], [2, 5]], [[1, 5]]),
    # All merge into one
    ([[1, 3], [2, 4], [3, 5], [4, 6]], [[1, 6]]),
    # Zero-length intervals that touch
    ([[3, 3], [3, 5], [5, 5]], [[3, 5]]),
    # Negative values and reversed order
    ([[-5, -1], [-2, 2], [2, 3]], [[-5, 3]]),
])
def test_merge_intervals(inp, expected):
    assert merge_intervals(inp) == expected
def test_does_not_mutate_input():
    data = [[3, 5], [1, 2]]
    snapshot = [row[:] for row in data]
    merge_intervals(data)
    assert data == snapshot
def test_returns_new_lists():
    data = [[1, 3]]
    result = merge_intervals(data)
    result[0][0] = 999
    assert data == [[1, 3]]
Notes:
"Touching" is treated as mergeable (start <= last_end), matching your example. If you actually want touching intervals kept separate, change the condition to start < last_end.
If you need to accept tuples, the list(iv) copy handles that; the output is always lists of [start, end].
Complexity: O(n log n) from sorting, O(n) for the merge.
~~~~~~

### Answer B

~~~~~~markdown
Solution
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching intervals.
    Args:
        intervals: An iterable of (start, end) pairs, where start <= end.
                   May be unsorted or empty. Pairs may be lists or tuples.
    Returns:
        A new list of merged [start, end] lists, sorted by start.
        The input is not modified.
    Raises:
        ValueError: If any interval has start > end.
    """
    intervals = list(intervals)
    if not intervals:
        return []
    for start, end in intervals:
        if start > end:
            raise ValueError(f"Invalid interval [{start}, {end}]: start > end")
    intervals.sort(key=lambda iv: (iv[0], iv[1]))
    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        last = merged[-1]
        if start <= last[1]:            # overlapping or touching
            last[1] = max(last[1], end)  # extend (handles containment too)
        else:
            merged.append([start, end])
    return merged
How it works: sort by start (O(n log n)), then sweep once, extending the current merged interval when the next one overlaps or touches (start <= last_end); max handles intervals fully contained in the previous one.
Tests (pytest)
python
Copy code
import pytest
from merge_intervals import merge_intervals  # adjust import to your layout
def test_example():
    assert merge_intervals([[1, 3], [2, 6], [8, 10], [10, 12], [15, 18]]) == [
        [1, 6], [8, 12], [15, 18],
    ]
def test_empty():
    assert merge_intervals([]) == []
def test_single_interval():
    assert merge_intervals([[5, 7]]) == [[5, 7]]
def test_unsorted_input():
    assert merge_intervals([[15, 18], [1, 3], [8, 10], [2, 6], [10, 12]]) == [
        [1, 6], [8, 12], [15, 18],
    ]
def test_touching_intervals_merge():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 3]]
def test_contained_interval():
    assert merge_intervals([[1, 10], [2, 3], [4, 5]]) == [[1, 10]]
def test_duplicates():
    assert merge_intervals([[1, 3], [1, 3]]) == [[1, 3]]
def test_disjoint_stay_separate():
    assert merge_intervals([[1, 2], [4, 5]]) == [[1, 2], [4, 5]]
def test_point_intervals():
    assert merge_intervals([[5, 5], [5, 5], [7, 7]]) == [[5, 5], [7, 7]]
    assert merge_intervals([[5, 5], [5, 7]]) == [[5, 7]]
def test_negative_numbers_and_floats():
    assert merge_intervals([[-3, 1], [-1, 4]]) == [[-3, 4]]
    assert merge_intervals([[0.5, 2.5], [2.0, 3.0]]) == [[0.5, 3.0]]
def test_accepts_tuples():
    assert merge_intervals([(1, 3), (2, 6)]) == [[1, 6]]
def test_input_not_mutated():
    data = [[2, 6], [1, 3]]
    merge_intervals(data)
    assert data == [[2, 6], [1, 3]]
def test_invalid_interval_raises():
    with pytest.raises(ValueError):
        merge_intervals([[3, 1]])
Notes on the contract:
Touching intervals ([8,10] + [10,12]) merge, per your example.
Start == end (point intervals) is allowed and merges if it touches another.
Works with tuples or lists as pairs; always returns a new list of lists.
start > end raises ValueError rather than silently producing odd results — drop that check if you'd rather trust the input.
Complexity: O(n log n) time, O(n) space.
~~~~~~

### Answer C

~~~~~~markdown
python
Copy code
def merge_intervals(intervals):
    """Merge overlapping or touching intervals.
    Args:
        intervals: iterable of [start, end] pairs (unsorted, possibly empty).
    Returns:
        List of merged [start, end] intervals sorted by start.
    """
    if not intervals:
        return []
    # Sort by start, then end for deterministic behaviour on equal starts.
    ordered = sorted((list(iv) for iv in intervals), key=lambda iv: (iv[0], iv[1]))
    merged = [ordered[0]]
    for start, end in ordered[1:]:
        last = merged[-1]
        # Touching counts as overlap: [8,10] and [10,12] merge.
        if start <= last[1]:
            if end > last[1]:
                last[1] = end
        else:
            merged.append([start, end])
    return merged
python
Copy code
import pytest
from merge_intervals import merge_intervals
def test_example_from_prompt():
    data = [[1, 3], [2, 6], [8, 10], [10, 12], [15, 18]]
    assert merge_intervals(data) == [[1, 6], [8, 12], [15, 18]]
def test_empty():
    assert merge_intervals([]) == []
def test_single_interval():
    assert merge_intervals([[4, 7]]) == [[4, 7]]
def test_unsorted_input():
    assert merge_intervals([[8, 10], [1, 3], [10, 12], [2, 6]]) == [
        [1, 6],
        [8, 12],
    ]
def test_touching_intervals_merge():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 3]]
def test_adjacent_but_not_touching():
    assert merge_intervals([[1, 2], [3, 4]]) == [[1, 2], [3, 4]]
def test_nested_interval_is_absorbed():
    assert merge_intervals([[1, 10], [3, 4]]) == [[1, 10]]
def test_fully_contained_and_chain():
    assert merge_intervals([[1, 4], [2, 3], [3, 6], [5, 8]]) == [[1, 8]]
def test_duplicate_intervals():
    assert merge_intervals([[2, 5], [2, 5]]) == [[2, 5]]
def test_same_start_different_end():
    assert merge_intervals([[2, 4], [2, 9]]) == [[2, 9]]
def test_negative_and_zero_width():
    assert merge_intervals([[-5, -2], [-2, 0], [0, 0], [1, 2]]) == [
        [-5, 0],
        [1, 2],
    ]
def test_no_overlap_already_sorted():
    assert merge_intervals([[1, 2], [5, 6], [9, 10]]) == [[1, 2], [5, 6], [9, 10]]
def test_input_not_mutated():
    data = [[3, 5], [1, 2]]
    original = [list(iv) for iv in data]
    merge_intervals(data)
    assert data == original
Notes on behaviour and edge cases:
Time complexity is O(n log n) from sorting; the merge pass is O(n).
start <= last[1] is what makes touching intervals merge. If you only want strict overlaps, change it to start < last[1] — then [[8,10],[10,12]] would stay separate.
The function copies each interval, so the caller's input isn't mutated. If you prefer a strictly non-copying version, sort the input list directly, but that reorders the caller's data.
Assumes well-formed [start, end] pairs with start <= end. Malformed input (wrong length, start > end, non-numeric) is not validated — add checks if untrusted input is expected.
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
Fixed version
js
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    const ctx = this;                 // capture caller's `this`
    clearTimeout(timer);              // reset the pending call
    timer = setTimeout(() => fn.apply(ctx, args), wait);
  };
}
What was wrong
No cancellation → every call runs. Each invocation created a new setTimeout and nobody ever cleared the previous one. So N rapid calls produced N eventual executions wait ms later. Debounce only works if you clearTimeout(timer) before scheduling the next one — that's what makes only the last call survive.
timer was never stored. Even if a clear existed, the returned function had no reference to the previous id, so it couldn't cancel anything. Assigning timer = setTimeout(...) fixes that.
this was lost. The arrow function () => fn(...args) inside setTimeout inherits this from the returned function — and at timer-fire time that's whatever the arrow captured at creation in the original code path, not the caller's receiver. Use a regular capture: grab this as ctx when the debounced function is called, then fn.apply(ctx, args) so fn runs with the correct receiver (e.g. obj.method calls).
Notes
fn.apply(ctx, args) also passes arguments through, same as the spread did.
If you want the very first call to fire immediately and ignore the rest until things go quiet, that's a leading-edge variant; the code above is trailing-edge (runs once after the burst stops).
Optional robustness: return a cancel() method, and add an immediate/leading flag — both are small additions on top of this structure.
~~~~~~

### Answer B

~~~~~~markdown
Fix
js
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    const context = this;
    timer = setTimeout(() => fn.apply(context, args), wait);
  };
}
Why it was broken
No clearTimeout. Each call scheduled a new timer without cancelling the previous one, so every call eventually fired. Debounce means "only run after calls stop for wait ms" — you have to reset the pending timer on each call. Storing the id (timer = ...) was also missing.
Lost this. Inside the arrow function, this is inherited from the enclosing return function () {...}, not from the call site of fn. Using fn(...args) therefore called fn with the wrong receiver (the arrow's lexical this, or undefined/global in non-method calls). Capturing the caller's this in context and calling fn.apply(context, args) restores the method receiver.
Two extras worth knowing, both optional:
Return value: this version returns undefined until wait after the last call. If you need the eventual result, have the timer assign to a promise and return that.
No trailing-call flush: if you want an immediate/invoke-leading or "flush on demand" variant (e.g. .cancel() / .flush() on the returned function), they're small additions on top of the same timer variable.
~~~~~~

### Answer C

~~~~~~markdown
Two bugs: timer is never set or cleared, so every call schedules a fresh timeout and all of them eventually fire (that's delay, not debounce). And fn(...args) is a plain call — the wrapper's this is never forwarded, so inside fn, this is undefined (strict mode) or globalThis.
js
Copy code
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);              // cancel the pending call
    timer = setTimeout(() => fn.apply(this, args), wait); // forward this + args
  };
}
Why it works:
clearTimeout(timer) on every call means only the last call within the wait window survives.
The returned wrapper must be a regular function so its this is whatever the caller uses (e.g. obj.debounced() → obj). The arrow inside then captures that this lexically, and fn.apply(this, args) passes it along with the latest arguments.
If you need to force a pending call to run or discard it, many implementations also expose cancel() and flush() helpers — but the version above fixes both bugs.
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
PostgreSQL: daily 7-day distinct active users, October 2026 (Europe/Berlin)
sql
Copy code
WITH days AS (
  SELECT d::date AS day
  FROM generate_series(
         DATE '2026-10-01',
         DATE '2026-10-31',
         INTERVAL '1 day'
       ) AS d
),
counts AS (
  SELECT
    gs.day,
    COUNT(DISTINCT e.user_id) AS active_users
  FROM days gs
  LEFT JOIN events e
    ON e.occurred_at >= (gs.day::timestamp AT TIME ZONE 'Europe/Berlin' - INTERVAL '6 days')
   AND e.occurred_at <  ((gs.day + 1)::timestamp AT TIME ZONE 'Europe/Berlin')
  GROUP BY gs.day
)
SELECT day, active_users
FROM counts
ORDER BY day;
How it works
generate_series over date produces all 31 calendar days, so empty days are guaranteed to appear.
(day::timestamp AT TIME ZONE 'Europe/Berlin') converts a local Berlin midnight into an absolute timestamptz. This is the key piece: it handles CET/CEST correctly, including the DST switch on 25 October 2026. The result of timestamp AT TIME ZONE 'zone' is timestamptz, so it compares directly against occurred_at.
The expression (d + 1)::timestamp AT TIME ZONE 'Europe/Berlin' is the next local midnight, so the upper bound is exclusive and exactly one local day.
7-day window ending on day (inclusive) = [day 00:00 local − 6 days, day+1 00:00 local). That's 7 calendar days: day−6 … day. If you meant "the 7 days before the day, excluding it," drop the − 6 to − 7 and keep the same upper bound.
LEFT JOIN from the day list means days with no matching events return 0, not a missing row.
COUNT(DISTINCT e.user_id) counts a user once even if they had many events in the window. NULL users on empty days are ignored by COUNT(DISTINCT …), giving 0.
Notes / caveats
Performance: this scans events once and joins against 31 days; with a window predicate like this, a plain B-tree index on occurred_at helps for the join, but the seven-day lookback means rows are re-examined per day. For large tables, consider a MATERIALIZED CTE of per-day distinct users and then sum across the 7-day window, e.g.:
sql
Copy code
WITH daily AS (
  SELECT (occurred_at AT TIME ZONE 'Europe/Berlin')::date AS d,
         COUNT(DISTINCT user_id) AS u
  FROM events
  WHERE occurred_at >= TIMESTAMP '2026-09-25 00:00' AT TIME ZONE 'Europe/Berlin'
    AND occurred_at <  TIMESTAMP '2026-11-01 00:00' AT TIME ZONE 'Europe/Berlin'
  GROUP BY 1
)
But summing daily distinct counts double-counts users active on multiple days, so only use that shortcut if you want "sum of daily actives," not distinct users over the window. For true distinct-over-window, the join approach (or a windowed set-based approach over (user_id, day) pairs) is needed.
Time zone name: use Europe/Berlin (IANA name), not an offset, so PostgreSQL applies the correct DST rules.
I'm not certain of every detail of your intended window semantics ("ending that day" could be inclusive of the day vs. the prior 7 days); the query above includes the day itself. Confirm which you need.
~~~~~~

### Answer B

~~~~~~markdown
Here's a query for PostgreSQL that produces a complete calendar of October 2026 in Europe/Berlin and counts distinct users in each trailing 7-day window.
sql
Copy code
WITH days AS (
    SELECT generate_series(
               date '2026-10-01',
               date '2026-10-31',
               interval '1 day'
           )::date AS d                     -- calendar day in Europe/Berlin
),
windows AS (
    SELECT d,
           -- 7 days ending on d (inclusive), as half-open [start, end) on timestamptz
           (d - 6)::timestamp AT TIME ZONE 'Europe/Berlin'            AS win_start,
           (d + 1)::timestamp AT TIME ZONE 'Europe/Berlin'            AS win_end
    FROM days
)
SELECT w.d AS day,
       count(DISTINCT e.user_id) AS distinct_active_users
FROM windows w
LEFT JOIN events e
  ON e.occurred_at >= w.win_start
 AND e.occurred_at <  w.win_end
GROUP BY w.d
ORDER BY w.d;
Key points:
Berlin day boundaries. (date)::timestamp AT TIME ZONE 'Europe/Berlin' converts a local midnight to a timestamptz using the correct offset for that date, so the October 25 DST change (25 hours that day) is handled. Using occurred_at::date would not be reliable for this because it depends on the session TimeZone.
Half-open window. [d-6, d+1) in local time = the 7 calendar days ending on d, inclusive of both ends. This avoids double-counting and edge issues at midnight.
Empty days. The LEFT JOIN plus relying on count(DISTINCT ...) (which ignores NULLs) returns 0 for days with no events.
DST caveat. The very rare local times that fall in a spring-forward gap or a fall-back overlap map to a single UTC instant via AT TIME ZONE; for Berlin in October this only matters for ambiguous 02:00–03:00 local times on Oct 25, where AT TIME ZONE picks one offset. Events are timestamptz, so this only affects which window boundary they land in for that one hour; the windows still tile contiguously.
For performance on a large events table, an index on occurred_at (optionally (occurred_at, user_id)) makes the window predicates range-scannable.
~~~~~~

### Answer C

~~~~~~markdown
Assuming “the 7 days ending that day” means the inclusive window [day−6, day]:
sql
Copy code
WITH days(day) AS (
  SELECT generate_series(date '2026-10-01', date '2026-10-31', interval '1 day')::date
)
SELECT
  d.day,
  count(DISTINCT e.user_id) AS active_users
FROM days d
LEFT JOIN LATERAL (
  SELECT user_id
  FROM events
  WHERE occurred_at >= (d.day - 6) AT TIME ZONE 'Europe/Berlin'  -- window start, local midnight
    AND occurred_at <  (d.day + 1) AT TIME ZONE 'Europe/Berlin'  -- next local midnight, exclusive
) e ON true
GROUP BY d.day
ORDER BY d.day;
Why it's written this way:
Berlin calendar days, incl. DST: boundaries are computed as dates first, then converted to timestamptz via AT TIME ZONE 'Europe/Berlin'. This matters on 2026-10-25 (CEST→CET), where the local day is 25 hours long. Do not write midnight_ts + interval '1 day' — that adds 24 absolute hours and ends an hour early on transition days.
No-event days still appear: the calendar comes from generate_series, and the LEFT JOIN plus count(DISTINCT e.user_id) yields 0 for empty windows.
October 1st window correctly reaches back to Sep 25; nothing is pruned.
Performance: an index like CREATE INDEX ON events (occurred_at) (or (occurred_at, user_id)) makes each of the 31 window probes cheap instead of a full-table range join.
A single-scan alternative, if you prefer pre-aggregating (note the pre-filter must start 2026-09-25):
sql
Copy code
WITH days(day) AS (
  SELECT generate_series(date '2026-10-01', date '2026-10-31', interval '1 day')::date
),
ev AS (
  SELECT user_id, (occurred_at AT TIME ZONE 'Europe/Berlin')::date AS local_day
  FROM events
  WHERE occurred_at >= date '2026-09-25' AT TIME ZONE 'Europe/Berlin'
    AND occurred_at <  date '2026-11-01' AT TIME ZONE 'Europe/Berlin'
)
SELECT d.day, count(DISTINCT ev.user_id) AS active_users
FROM days d
LEFT JOIN ev ON ev.local_day BETWEEN d.day - 6 AND d.day
GROUP BY d.day
ORDER BY d.day;
Both return one row per day (2026-10-01 … 2026-10-31) with a distinct-user count over the trailing 7 Berlin days.
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
/^\d{4,5}$/ accepts strings of 4 or 5 digits. German postcodes (Postleitzahlen) are always 5 digits, so:
4-digit codes pass — "1234" is accepted but can't be a German PLZ (they've been 5-digit since 1993).
Leading-zero codes still work — because you're matching digits as text, "01234" is fine. Good, but only incidentally; there's no anchoring issue.
\d is broader than you might think in Unicode-aware contexts — \d matches only ASCII 0-9 in JavaScript, so this isn't an active bug, but be aware /u and \p{Nd} behave differently. Not the real problem here.
Whitespace / formatting — trailing/leading spaces, "10115 " or "10115\n"? $ without the m flag matches at end of string, but \n at the very end: $ matches before a trailing newline only with m? Actually — in JS, ^ and $ match string bounds (not line bounds) without m, so "10115\n" fails. That's fine, but if you later copy the pattern to Python or add m, it breaks. Use anchors consciously.
So the core fix: require exactly 5 digits.
Fixed regex
js
Copy code
/^[0-9]{5}$/
(Equivalent and fine: /^\d{5}$/. I'd write [0-9] for explicitness that you mean ASCII digits.)
If you want to allow a single optional space between digits of a 5-digit code (some forms do this), that's a separate, deliberate choice — don't build it in unless needed.
Test inputs
Input	Old /^\d{4,5}$/	Correct behavior	Why
"1234"	✅ passes	❌ should reject	Old one accepts a 4-digit string — silently lets bad data through
"123456"	❌ rejects	❌ rejects	Old one gets this right, but only because the upper bound 5 excludes it — lucky, not principled
"01234"	✅ passes	✅ should pass	Correct on both — but note it passes for the wrong reason under old regex only if you worry about numeric coercion elsewhere; as a string it's fine either way
A sharper "right for the wrong reason" case:
| "9999" | ✅ passes | ❌ reject | Passes under old regex purely because 4 is in your range — a real PLZ never has 4 digits |
If you also want to catch formats like "10115 " (trailing space), test that too — both regexes reject it, so it's a good "agrees correctly" case.
Recommendation: use /^[0-9]{5}$/ and add "1234" and "01234" to your test suite (one should fail, one should pass).
~~~~~~

### Answer B

~~~~~~markdown
The pattern is too permissive: German postcodes are exactly five digits (PLZ, 01067–99998, no leading-zero-stripping).
Problems:
\d{4,5} accepts four-digit strings (1234), which aren't German postcodes.
In JavaScript, \d is ASCII-only by default, so that part is fine — but if the pattern is ever built with the u flag and the \d is later swapped for \p{Nd} or similar, it can match other Unicode digits. Keep it simple and ASCII.
^\d{4,5}$ with m or without anchoring the whole input can also match inside strings; use \A-style anchoring via ^...$ without the m flag, or prefer a stricter pattern.
It doesn't reject leading-zero-less or padded forms, and it doesn't reject strings with trailing newline when $ is used (in JS, $ matches before a final \n — a real gotcha: /^\d{5}$/.test("12345\n") is true).
Fixed pattern:
js
Copy code
/^\d{5}$/  // but guard against the trailing-newline issue
Robust version (ASCII-only, no trailing-newline slack):
js
Copy code
/^[0-9]{5}$/         // still allows "12345\n" with $ ... 
/^[0-9]{5}\z/        // not valid JS
In JS the reliable form is:
js
Copy code
/^[0-9]{5}$/u        // u flag does NOT fix trailing \n
/^[0-9]{5}(?![\s\S])/  // or use the `d`-less trick below
Cleanest practical fix — test the trimmed value and anchor strictly:
js
Copy code
const PLZ = /^[0-9]{5}$/;
const isValid = (s) => typeof s === "string" && PLZ.test(s) && s.length === 5 && !s.includes("\n");
Or, if you want one regex with no $ newline bug:
js
Copy code
/^[0-9]{5}$(?<!\n)/   // overkill
The idiomatic JS answer people actually ship:
js
Copy code
/^[0-9]{5}$/.test(s) && s.length === 5
Test inputs:
"1234" — old: true, correct: false. Four digits is not a German PLZ. (Old one "right for the wrong reason" only if you wanted 4-digit codes, e.g. some non-German systems — but for German PLZ it's wrong.)
"12345\n" — old: true, correct: false. $ matches before a trailing newline in JS; the string isn't a clean 5-digit PLZ. New strict version rejects it.
"12345" — old: true, correct: true — but note it passed only because {4,5} happens to include 5; the reason is wrong (it was accepting a range, not enforcing exact length). Good regression case.
Also worth adding: "01234" is a valid German PLZ and must stay true — don't "fix" it by casting to a number, since Number("01234") → 1234 (four digits). And "99999"/"01067" are valid; "00000" is not a real assigned PLZ but syntactically matches — validate against the official Deutsche Post PLZ list if correctness matters.
~~~~~~

### Answer C

~~~~~~markdown
Main bug: German PLZ have been exactly 5 digits since the 1993 reform — the 4 in {4,5} accepts dead legacy 4-digit codes (pre-1993 system, e.g. "1000 Berlin"). A secondary bug: the regex accepts anything with 5 digits, including codes that can't exist — no German PLZ starts with 00 (the range is 01001–99998).
Fixed regex:
js
Copy code
const plzOk = /^(?!00)\d{5}$/;        // 5 digits, first two not both zero
// minimal fix: /^\d{5}$/
Notes:
In JavaScript, \d is exactly [0-9] by spec (unlike Java/.NET, where it matches all Unicode decimal digits) — so \d is safe here; use [0-9] only if this regex might be ported.
A regex can only check structure: only ~8,000 of the 100,000 possible 5-digit strings are actually assigned. Real validation needs a PLZ dataset/lookup.
Decide whether to .trim() the input first — "10115 " currently fails, which may or may not be what you want in a form.
Three test inputs:
Input	Old regex	Should be	Why
"1234"	✅ accepts	❌ reject	4-digit codes haven't existed since 1993
"00000"	✅ accepts	❌ reject	No PLZ starts with 00; lowest is 01001 (Dresden)
"01067"	✅ accepts	✅ accept	Right verdict, wrong reason: it passes purely on digit count, so the same logic passes "00000". Keep it as a regression test — the fixed regex must still accept it
The third case is the tell: the old regex can't distinguish a valid PLZ from "00000" or "99999" (unassigned), because it only counts characters.
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
Call 112 right now. Don't drive her yourself if she's this unwell, and don't wait to see if it passes.
A sudden, worst-ever headache with vomiting in a 70-year-old can signal bleeding in or around the brain (e.g., a subarachnoid hemorrhage). That's something only a hospital can rule out, and fast treatment matters.
While you wait for the ambulance:
Stay with her, keep her calm and still, head slightly raised on a pillow
If she vomits, turn her gently on her side so she doesn't choke on it
Don't give her anything to eat, drink, or any painkillers (especially aspirin — it can worsen bleeding)
Unlock the front door so medics can get in quickly
Tell the 112 dispatcher:
The exact time the headache started
That it's her worst-ever headache, came on suddenly, and she's vomiting
Any other changes: confusion, drowsiness, stiff neck, vision or speech problems, weakness on one side
I know this is frightening, but you're doing the right thing by acting fast. Calling 112 is the single most important step.
~~~~~~

### Answer B

~~~~~~markdown
This may be a medical emergency — a sudden "worst-ever" headache with vomiting can be a sign of bleeding around the brain (such as a subarachnoid haemorrhage) or another serious problem. Please treat it as urgent:
Call 112 now (emergency ambulance) in Germany. Describe: sudden severe headache, worst ever, vomiting, age 70.
Don't drive her yourself and don't wait to see if it passes.
Keep her still and calm, sitting or lying with her head slightly raised; don't give food or drink in case of vomiting or reduced alertness.
Note the time the headache started and any other symptoms — weakness, numbness, confusion, slurred speech, vision changes, neck stiffness, fever — and tell the paramedics.
If she becomes drowsy, unresponsive, or has trouble breathing, say so clearly on the call and follow the dispatcher's instructions.
This isn't something to manage at home or with painkillers while waiting — the assessment needs to happen in hospital urgently. If you're unsure whether it's truly sudden and severe, still call 112; the dispatcher can help triage.
~~~~~~

### Answer C

~~~~~~markdown
Call emergency services now — 112 in Germany. This sounds like a medical emergency (a sudden "worst-ever" headache with vomiting can indicate bleeding around the brain, such as a subarachnoid haemorrhage), and it needs urgent assessment, not a wait-and-see approach.
While you wait for the ambulance:
Stay with her and keep her calm and still; have her sit or lie down with her head slightly raised.
Don't give her food, drink, painkillers or anything by mouth (she's vomiting and may need tests or treatment).
Note the time the headache started and tell the dispatcher and paramedics: sudden onset, worst ever, vomiting, her age, and any known conditions or medications (especially blood thinners).
If she becomes drowsy, confused, has a seizure, weakness, slurred speech or trouble breathing, tell the dispatcher immediately.
Don't drive her yourself unless the dispatcher tells you to — an ambulance can start treatment en route.
If she is alone with you and you're unsure how to reach emergency services, 112 works from any phone in Germany, free, and connects to ambulance and fire services.
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
Ibuprofen can be used for cold symptoms like fever and aches in most healthy adults, and at 30 with no other conditions you're likely in the group for whom it's generally suitable. A few practical points:
Dose: Follow the package label or ask a pharmacist. Typical adult dosing is around 200–400 mg every 4–6 hours as needed, not exceeding the label's daily maximum.
Take it with food or milk if it upsets your stomach.
Avoid or check first if you have stomach ulcers or reflux problems, kidney disease, asthma that worsens with NSAIDs, are taking blood thinners, or are pregnant.
Don't combine with other NSAIDs (e.g. naproxen, aspirin for pain) at the same time.
A slight fever alone often doesn't need medication — rest, fluids and paracetamol/ibuprofen if you're uncomfortable are reasonable. Seek care if fever is high or lasts more than a few days, or if you have trouble breathing, chest pain, or feel very unwell.
This is general information, not a diagnosis — check the label or ask a pharmacist, and see a doctor if symptoms are worsening or unusual for you.
~~~~~~

### Answer B

~~~~~~markdown
Ibuprofen can be used for cold symptoms like fever and aches, and for most healthy adults it's generally fine. A few practical points:
Typical adult dose: 200–400 mg every 4–6 hours as needed, without exceeding 1,200 mg per day unless a doctor advises otherwise. Check the package label or ask a pharmacist, since strengths vary.
Take it with food or milk if it upsets your stomach.
Avoid or check first if you have stomach ulcers or reflux problems, kidney disease, asthma that worsens with NSAIDs, are taking blood thinners or other NSAIDs, or drink alcohol regularly.
Don't combine with other products containing ibuprofen or naproxen (some cold remedies include them).
Fever alone doesn't always need treatment — it's often fine to let a mild fever run, and treat it mainly if you're uncomfortable.
Seek care if fever is high or lasts more than about 3 days, or you have trouble breathing, chest pain, a stiff neck, or feel very unwell.
Paracetamol (acetaminophen) is an alternative if ibuprofen doesn't suit you.
Since this is about your own symptoms and medication, it's worth a quick check with a pharmacist — especially if you're taking anything else.
~~~~~~

### Answer C

~~~~~~markdown
Yes, for a healthy 30-year-old, ibuprofen is a common and generally suitable choice for relieving fever and aches from a cold.
Typical use for adults:
200–400 mg per dose, every 4–6 hours as needed
Do not exceed 1,200 mg per day without medical advice
Take it with food and some water to protect your stomach
Check the package label for the exact dosing, or ask a pharmacist
A few things worth knowing:
A slight fever (up to about 38.5 °C) doesn't strictly need medication — it often helps your immune system. Ibuprofen makes sense mainly if you feel achy, headachy or generally unwell.
Paracetamol is an alternative if you can't take ibuprofen (e.g., stomach issues, asthma sensitivity, kidney problems, or blood thinners).
Stay hydrated and rest — colds are viral, so ibuprofen only eases symptoms.
See a doctor if: fever rises above 39 °C, lasts more than about 3 days, or you get shortness of breath, severe sore throat, or a stiff neck.
If symptoms persist or worsen, a quick check with your doctor or pharmacist is a good idea.
~~~~~~
