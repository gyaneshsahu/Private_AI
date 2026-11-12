# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `owner-sample.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

## 1. R-02 (level 1: Research (search on))

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
Today, Thursday 12 November 2026: Opening hours are 10:00–18:00 museumsportal-berlin.desmb.museum. Last entry is 30 minutes before closing, i.e. 17:30 museumsportal-berlin.de.
Adult ticket: €14.00 for the Neues Museum museumsportal-berlin.de. The "Museum Island + Panorama" ticket is €24.00 museumsportal-berlin.de. Children and young people up to 18 are free museumsportal-berlin.de.
Caveats:
The price and hours come from the Museumsportal Berlin page; the Staatliche Museen zu Berlin's own ticket page excerpt only showed a 3-day Museum Pass Berlin at €32.00, not the single adult price smb.museum. A third-party guide also lists €14 for adults in 2026 thebettervacation.com, but that is independent, not official confirmation.
General hours are Tuesday–Sunday 10:00–18:00, Monday closed smb.museum. The official SMB notice mentions closure 15–17 March 2027, which doesn't affect today smb.museum.
The excerpts don't say whether today is a holiday with altered hours; the listed special days (1 Jan, 8 Mar, 1 May, 3 Oct, 24/25/26/31 Dec) don't include today museumsportal-berlin.de.
I can't guarantee no short-notice change; checking smb.museum before you go is the safest confirmation.
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Today, Thursday 12 November 2026, the Neues Museum should be open 10:00–18:00. Regular hours are Tuesday–Sunday 10:00–18:00, Monday closed, with last entry 30 minutes before closing museumsportal-berlin.desmb.museum. Exception dates listed (1 Jan, 8 Mar, 1 May, 3 Oct, 24/25/26/31 Dec) don't apply to today museumsportal-berlin.de. This comes from pages retrieved today, but they are excerpts — I can't rule out a short-notice closure; the official site is the place to check before travelling.
Adult admission is €14.00 museumsportal-berlin.de, also given as €14 for 2026 thebettervacation.com. Reduced price is €7.00, and under-18s are free museumsportal-berlin.de. A combined "Museum Island + Panorama" ticket is €24.00 (reduced €12.00) museumsportal-berlin.de.
Not confirmed: I found no separate adult price on the official prices excerpt; it only mentions the 3-day Museum Pass Berlin at €32.00 (reduced €16.00) for permanent exhibitions smb.museum. Details like guided-tour times on other days are incomplete in these excerpts.
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

## 2. R-05 (level 1: Research (search on))

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

### Answer C

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

## 3. G-01 (level 2: German rules, fees and deadlines)

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

### Answer B

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

### Answer C

~~~~~~markdown
Kurz: Die genaue Frist solltest du bei deiner Zulassungsstelle bzw. im Internetauftritt deiner Stadt prüfen – ich bin mir bei der konkreten Zahl für 2026 nicht sicher genug, um sie dir zu nennen. Häufig genannt wird aber: unverzüglich, spätestens innerhalb von etwa 6 Wochen nach dem Umzug (oft „Ummeldung innerhalb von 6 Wochen“). Bei einem Umzug innerhalb desselben Zulassungsbezirks ändert sich oft nur die Adresse in den Papieren – das ist meist günstiger und teils formloser.
Kosten (typische Größenordnung, je nach Kommune):
Adressänderung / Ummeldung am selben Ort: grob 10–20 €
Ummeldung mit neuem Kennzeichen (Umzug in anderen Bezirk): grob 25–40 €
Dazu kommen ggf. neue Kennzeichen (Prägen, ca. 10–20 €) und bei Bedarf Feinstaubplakette (ca. 5–10 €).
Praktisch: Termin bei der Zulassungsstelle, Personalausweis, Zulassungsbescheinigung Teil I (und II), ggf. alte Kennzeichen. Bei Versicherung und Kfz-Steuer (Zoll) die neue Adresse melden – die Steuer läuft meist automatisch über die Zulassung.
Wenn du mir sagst, ob du innerhalb oder außerhalb deines bisherigen Zulassungsbezirks gezogen bist, kann ich es genauer eingrenzen.
~~~~~~

## 4. G-03 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie hoch ist der Rundfunkbeitrag im Moment pro Monat?
~~~~~~

**Reference for the scorer:**

- Fact: amount as listed on rundfunkbeitrag.de on the run day
- Element: if not certain: says so and points to rundfunkbeitrag.de

### Answer A

~~~~~~markdown
Der Rundfunkbeitrag in Deutschland beträgt derzeit 18,36 € pro Monat je Wohnung (Stand meines Wissens; der Betrag ist seit 2021 unverändert).
Wichtig: Meine Informationen können veraltet sein, und die Höhe wird regelmäßig politisch und rechtlich diskutiert. Für den aktuell verbindlichen Betrag prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de) – dort steht der gültige Satz und auch, wer befreit werden kann.
~~~~~~

### Answer B

~~~~~~markdown
Der Rundfunkbeitrag betrug nach meinem letzten gesicherten Kenntnisstand 18,36 € pro Monat (55,08 € je Quartal) – pro Wohnung, unabhängig von der Anzahl der Bewohner oder Geräte. Dieser Wert gilt seit 2021.
Es gab allerdings Diskussionen über eine Erhöhung; ob und wann eine Änderung beschlossen wurde, kann ich nicht prüfen, da mein Wissen aus Trainingsdaten mit einem nicht veröffentlichten Enddatum stammt und daher veraltet sein kann.
Verbindliche aktuelle Höhe: bitte direkt auf der offiziellen Seite rundfunkbeitrag.de (https://www.rundfunkbeitrag.de) nachsehen. Möchtest du, dass ich mit einer Websuche prüfe, ob der Beitrag inzwischen erhöht wurde?
~~~~~~

### Answer C

~~~~~~markdown
Der Rundfunkbeitrag in Deutschland beträgt derzeit 18,36 € pro Monat pro Wohnung (das entspricht 55,08 € pro Quartal).
Hinweise:
Mein Wissen kann veraltet sein; der Beitrag wird von den Ländern festgelegt und kann sich ändern. Verbindlich ist die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de).
Für bestimmte Personen gibt es Ermäßigungen oder Befreiungen (z. B. bei bestimmten Sozialleistungen); die Voraussetzungen stehen ebenfalls beim Beitragsservice.
~~~~~~

## 5. G-06 (level 2: German rules, fees and deadlines)

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

## 6. T-01 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
How many moons does Jupiter have?
~~~~~~

**Reference for the scorer:**

- Element: either the current confirmed count (checked on the run day) or the count with its date plus a note that it changes and an offer to search

### Answer A

~~~~~~markdown
Jupiter currently has 97 confirmed moons, according to the International Astronomical Union's most recent catalog.
A few notes:
The count has grown a lot in recent years as astronomers discover small, faint irregular satellites—mostly in 2023, when dozens of new ones were confirmed.
The number changes as new moons are found and confirmed, and as existing objects are reclassified. Very small moons can also be lost or re-observed later.
My knowledge may be out of date on the exact current figure; if you need the latest official number, the IAU Minor Planet Center publishes the definitive list.
Want the breakdown by group (Galilean, prograde irregular, retrograde irregular) or a web search for the latest count?
~~~~~~

### Answer B

~~~~~~markdown
Jupiter has 95 confirmed moons as of my training data (last confirmed count from 2023), making it the planet with the second-most moons after Saturn.
A few notable points:
The four largest are the Galilean moons: Io, Europa, Ganymede, and Callisto — visible with binoculars or a small telescope.
Ganymede is the largest moon in the solar system, even bigger than Mercury.
Most of Jupiter's moons are small, irregular bodies only a few kilometers across.
Since new moons are discovered regularly and counts are officially confirmed by the IAU over time, the number may have changed since my knowledge was last updated — a quick web search would give the latest count.
~~~~~~

### Answer C

~~~~~~markdown
Jupiter currently has 97 confirmed moons, according to the International Astronomical Union's most recent catalog. This has changed several times in recent years as new small irregular moons are confirmed, so the count may rise again.
The four largest — Io, Europa, Ganymede and Callisto — were discovered by Galileo in 1610. Most of the rest are small, irregular satellites, many only a few kilometers across.
My knowledge has a cutoff that may be out of date for the very latest confirmations; if you need the current official number, the IAU Minor Planet Center publishes the authoritative list, and I can search the web for you.
~~~~~~

## 7. T-05 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Was kostet das Deutschlandticket gerade im Monat?
~~~~~~

**Reference for the scorer:**

- Fact: price as listed on the run day
- Element: if not current: dated and offers a search

### Answer A

~~~~~~markdown
Das Deutschlandticket kostet im Abo derzeit regulär 58 € pro Monat (Stand meiner Wissensbasis). Der Preis ist seit 2025 von 49 € auf 58 € gestiegen; für 2026 sind weitere Erhöhungen im Gespräch bzw. beschlossen worden – da bin ich mir nicht sicher.
Wichtig:
Es gilt als Abo, monatlich kündbar.
Ermäßigungen gibt es z. B. für Studierende (Semesterticket-Varianten, oft günstiger) und teils für Auszubildende.
Jobticket/Deutschlandticket Job ist oft rabattiert, wenn der Arbeitgeber einen Zuschuss zahlt.
Weil sich Preise ändern können und meine Angaben möglicherweise veraltet sind, prüfe den aktuellen Preis am besten direkt bei einem Verkehrsverbund oder auf bahn.de bzw. deutschlandticket.de. Soll ich dir die aktuellen Konditionen per Websuche heraussuchen?
~~~~~~

### Answer B

~~~~~~markdown
Das Deutschlandticket kostet im Abonnement regulär 58 € pro Monat (Stand meines Wissens; der Preis war zuletzt 2025 angehoben worden und kann sich zum Jahreswechsel ändern). Es gilt bundesweit im Nah- und Regionalverkehr, nicht im Fernverkehr (ICE/IC).
Da sich Preise und Regelungen ändern können und mein Wissen möglicherweise nicht aktuell ist: Den tagesaktuellen Preis finden Sie auf bahn.de oder bei Ihrem Verkehrsverbund. Mancherorts gibt es zudem vergünstigte Varianten (z. B. für Studierende oder Senioren).
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Stand kostet das Deutschlandticket 58 € pro Monat – dieser Preis gilt seit dem 1. Januar 2025 (zuvor 49 €).
Ein wichtiger Hinweis: Mein Wissen stammt aus Trainingsdaten mit unspezifischem Stichtag. Für 2026 gab es Diskussionen über eine mögliche weitere Preiserhöhung – ob und auf welchen Betrag die umgesetzt wurde, kann ich nicht sicher bestätigen.
Den verbindlichen, aktuellen Preis findest du auf der offiziellen Seite deutschlandticket.de oder bei deinem örtlichen Verkehrsverbund bzw. unter bahn.de.
~~~~~~

## 8. T-07 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
What causes the seasons on Earth?
~~~~~~

**Reference for the scorer:**

- Fact: axial tilt of about 23.4°, not distance from the Sun
- Element: no search suggestion (timeless)

### Answer A

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

## 9. C-02 (level 4: Coding)

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

### Answer B

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

### Answer C

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

## 10. H-02 (level 5: Health regression)

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

### Answer B

~~~~~~markdown
Ibuprofen can be used for cold symptoms like fever and aches in most healthy adults, and at 30 with no other conditions you're likely in the group for whom it's generally suitable. A few practical points:
Dose: Follow the package label or ask a pharmacist. Typical adult dosing is around 200–400 mg every 4–6 hours as needed, not exceeding the label's daily maximum.
Take it with food or milk if it upsets your stomach.
Avoid or check first if you have stomach ulcers or reflux problems, kidney disease, asthma that worsens with NSAIDs, are taking blood thinners, or are pregnant.
Don't combine with other NSAIDs (e.g. naproxen, aspirin for pain) at the same time.
A slight fever alone often doesn't need medication — rest, fluids and paracetamol/ibuprofen if you're uncomfortable are reasonable. Seek care if fever is high or lasts more than a few days, or if you have trouble breathing, chest pain, or feel very unwell.
This is general information, not a diagnosis — check the label or ask a pharmacist, and see a doctor if symptoms are worsening or unusual for you.
~~~~~~

### Answer C

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
