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
Opening hours today (Thursday, 12 November 2026): 10:00–18:00. The museum is closed on Mondays; Tuesday–Sunday opening is 10:00–18:00, with last entry 30 minutes before closing museumsportal-berlin.desmb.museum.
Caveat: these are the museum's regular hours, and I can't independently confirm that today has no special closure. The only announced closure in the sources is 15–17 March 2027 for maintenance smb.museum.
Adult ticket price: €14.00 for the Neues Museum; the combined "Museum Island + Panorama" ticket is €24.00. Reduced admission is €7.00 (€12.00 for the combined ticket). Children and young people up to 18 are free museumsportal-berlin.de. Both the Berlin museums portal and a third-party ticket page give €14 for 2026 museumsportal-berlin.dethebettervacation.com.
Not confirmed: I did not find a current price for the separate Museum Pass Berlin in a listing that clearly matches the Neues Museum admission — one excerpt mentions a 3-day pass for €32.00 (€16.00 reduced) smb.museum, but I can't confirm from the sources that this covers the Neues Museum or is up to date. Check the official SMB ticket page before relying on it.
Main entrance is the James-Simon-Galerie; the Kolonnadenhof entrance requires a valid ticket museumsportal-berlin.de.
~~~~~~

### Answer B

~~~~~~markdown
Kept on this device: 1 phone number. Placeholders went to the secure server instead; the values were put back here. Not every number is recognised, least of all in photos and scans.
Opening hours today (Thu, 12 Nov 2026): 10:00–18:00, with last entry 30 minutes before closing (17:30) museumsportal-berlin.de. The museum is closed on Mondays; otherwise Tue–Sun 10:00–18:00 museumsportal-berlin.desmb.museum. No special hours or closure are listed for today — the only maintenance closure mentioned is 15–17 March 2027 smb.museum.
Adult ticket price: €14 museumsportal-berlin.de, which matches the 2026 price reported by a second source thebettervacation.com. For context: reduced admission is €7, children and young people up to 18 are free, and a combined Museum Island + Panorama ticket costs €24 museumsportal-berlin.de.
Both items are confirmed by the official Museumsportal Berlin page and the SMB website. One caveat: I'm relying on my device clock for "today"; if your actual date is a Monday, the museum would be closed.
~~~~~~

### Answer C

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
259 Euro pro Kind und Monat ab dem 1. Januar 2026. kindergeld.org
Das ist eine Erhöhung um 4 Euro gegenüber 2025 (255 Euro). dgb.de Der Betrag gilt einheitlich für jedes Kind, unabhängig von der Anzahl der Kinder. dgb.de finanz.de
Details:
Ausgezahlt wird ab dem Geburtsmonat, bis zum 18. Lebensjahr ohne Bedingungen, in Ausbildung/Studium unter Nachweis längstens bis zum 25. Geburtstag. kindergeld.org finanz.de
Ein schriftlicher Antrag bei der Familienkasse ist erforderlich. kindergeld.org
~~~~~~

### Answer B

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

### Answer C

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
Wenn du innerhalb Deutschlands umgezogen bist:
Frist: Die Adressänderung muss unverzüglich bei der Zulassungsbehörde gemeldet werden (§ 15 FZV). Ein bundesweit einheitliches festes Datum wie „innerhalb von X Wochen“ gibt es nicht; viele Zulassungsstellen erwarten aber eine Meldung innerhalb von etwa 2 Wochen. Bei einem neuen Zulassungsbezirk brauchst du in der Regel neue Kennzeichen; im selben Bezirk wird meist nur die Adresse in den Fahrzeugpapieren geändert.
Kosten: Das hängt von der Behörde und davon ab, ob neue Kennzeichen nötig sind. Grob:
gleicher Zulassungsbezirk: ca. 10–25 €
neuer Bezirk mit neuen Kennzeichen: ca. 30–70 € inklusive Kennzeichen
Mitnehmen: Ausweis, Zulassungsbescheinigung Teil I und Teil II, ggf. Vollmacht. Bei Leasing/Finanzierung vorher klären, wer Teil II hat.
Wichtig: Informiere auch deine Kfz-Versicherung über den Umzug.
Die genauen Gebühren und die lokale Handhabung findest du bei deiner Zulassungsstelle; die Beträge variieren.
~~~~~~

### Answer C

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
Der Rundfunkbeitrag liegt aktuell bei 18,36 € pro Monat (55,08 € pro Quartal). Er gilt seit 2015 unverändert in dieser Höhe.
Wichtig: Zuletzt gab es Diskussionen und eine Entscheidung zum ARD-Staatsvertrag und zur Beitragsentwicklung. Da sich solche Beschlüsse kurzfristig ändern können, kann mein Wissensstand veraltet sein – für die aktuell verbindliche Höhe prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de).
Wenn du möchtest, suche ich dir die aktuelle Bestätigung heraus.
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt: Nach meinem Trainingsstand, der veraltet sein kann – der Grundbeitrag je Wohnung lag bei 18,36 €/Monat (55,08 €/Quartal), gültig seit Mai 2021. Die Länder haben eine Erhöhung auf 18,94 €/Monat beschlossen; als Inkrafttreten wurden je nach Berichtslage der 1. Juli 2025 bzw. der 1. Januar 2026 genannt. Welches Datum letztlich galt und ob es inzwischen weitere Änderungen gibt, kann ich nicht sicher sagen, da mein Wissen einen nicht veröffentlichen Stichtag hat.
Ein paar Einordnungen:
Der Beitrag gilt pro Wohnung, unabhängig von Anzahl der Personen, Geräte oder Radiosender.
Verbindlich und aktuell ist die offizielle Seite des Beitragsservice von ARD, ZDF und Deutschlandradio: rundfunkbeitrag.de. Dort steht der momentane Betrag und auch, ob du unter Umständen (z. B. Schwerbehinderung, BAföG, Wohngeld) ermäßigt oder befreit bist.
Da Gebühren sich ändern können: Möchtest du, dass ich eine Websuche nach dem aktuellen Stand mache?
~~~~~~

### Answer C

~~~~~~markdown
Der Rundfunkbeitrag beträgt seit August 2024 18,36 € pro Monat (55,08 € pro Quartal). Er gilt pro Wohnung, unabhängig von der Anzahl der Personen oder Geräte.
Hinweis: Diese Angaben stammen aus meinem Trainingswissen und können veraltet sein. Für den aktuell verbindlichen Stand prüfe bitte die offizielle Seite des ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de) – dort findest du auch mögliche Änderungen oder Befreiungen (z. B. für Studierende, Empfänger von Sozialleistungen).
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

## 6. T-01 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
How many moons does Jupiter have?
~~~~~~

**Reference for the scorer:**

- Element: either the current confirmed count (checked on the run day) or the count with its date plus a note that it changes and an offer to search

### Answer A

~~~~~~markdown
Jupiter has 95 confirmed moons, according to the International Astronomical Union's count as of recent years. That number can change as new small moons are discovered and confirmed, so treat it as current-ish rather than permanent.
Quick context: most are tiny, irregular objects; the four largest (Io, Europa, Ganymede, Callisto) were found by Galileo in 1610. If you need the latest confirmed figure, I can offer a web search—my knowledge may be out of date.
~~~~~~

### Answer B

~~~~~~markdown
Jupiter currently has 95 confirmed moons, according to the International Astronomical Union's most recent count. That figure has changed repeatedly as astronomers discover and confirm small, distant satellites, so it may already be out of date—my knowledge comes from training data with an unpublished end date. For the latest number, a quick check of the IAU or NASA is worthwhile.
~~~~~~

### Answer C

~~~~~~markdown
Jupiter has 95 confirmed moons according to my training data (recognized by the International Astronomical Union as of early 2024). The four largest are the Galilean moons—Io, Europa, Ganymede, and Callisto—discovered by Galileo in 1610.
Keep in mind that moon counts change as new discoveries are confirmed, so the current number may be higher. Notably, Saturn overtook Jupiter in 2023 and now has the most known moons of any planet. If you'd like, I can offer a web search for the latest count.
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
Das Deutschlandticket kostet im Abo regulär 58 € pro Monat (Stand meiner Informationen; der Preis ist seit 2025 von 49 € auf 58 € gestiegen). Es ist ein reines Abo-Monatsticket und gilt im gesamten Nah- und Regionalverkehr.
Wichtig: Preise und Konditionen können sich ändern, und mein Wissen hat ein unbekanntes Enddatum – der aktuelle Preis könnte also abweichen. Verbindlich steht er auf bahn.de bzw. bei deinem Verkehrsverbund. Soll ich für dich im Web nachsehen, ob es gerade einen anderen Preis oder Sonderregelungen (z. B. für Studierende oder Ermäßigungen) gibt?
~~~~~~

### Answer B

~~~~~~markdown
Das Deutschlandticket kostet im Monat 58 € als reguläres Abo (Stand meiner Informationen; der Preis kann sich ändern). Es ist ein bundesweit gültiges Nahverkehrs-Abo im monatlich kündbaren Modell.
Weil sich Preise und Konditionen ändern können und mein Wissensstand nicht tagesaktuell ist, prüfe den aktuellen Preis am besten direkt bei einem Verkehrsverbund oder auf bahn.de bzw. der Seite des Deutschlandtickets. Soll ich für dich danach suchen?
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Kenntnisstand kostet das Deutschlandticket 58 € pro Monat – dieser Preis gilt seit Januar 2025 (zuvor waren es 49 €).
Allerdings gab es bereits Diskussionen über weitere Preiserhöhungen, und da mein Wissen aus Trainingsdaten stammt, die nicht tagesaktuell sind, kann ich nicht sicher sagen, ob die 58 € im November 2026 noch gelten. Den verbindlichen aktuellen Preis findest du auf deutschlandticket.de oder bei der Deutschen Bahn bzw. deinem Verkehrsverbund.
Soll ich danach suchen, um den aktuellen Preis zu prüfen?
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
Earth's seasons are caused by the tilt of Earth's axis, not by its changing distance from the Sun.
Axial tilt (~23.4°): Earth's rotational axis is tilted relative to its orbital plane. As Earth orbits the Sun, different hemispheres lean toward or away from the Sun at different times of year.
Changing Sun angle and day length: When your hemisphere leans toward the Sun, sunlight strikes more directly and days are longer — summer. When it leans away, sunlight is more slanted and days shorter — winter. Spring and autumn are the transitions.
Opposite hemispheres: Because of the tilt, the Northern and Southern Hemispheres have opposite seasons at the same time.
Not distance: Earth is actually closest to the Sun in early January, during Northern-Hemisphere winter, so distance is not the main driver. The ~3% variation in distance has only a minor effect.
Solstices and equinoxes: Solstices mark when a hemisphere is tilted most toward or away from the Sun; equinoxes occur when the tilt is roughly side-on, giving nearly equal day and night.
A simple way to picture it: the tilt stays pointed in the same direction in space as Earth orbits, so each hemisphere alternately faces toward and away from the Sun over the year.
~~~~~~

### Answer B

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

### Answer C

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

### Answer B

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
