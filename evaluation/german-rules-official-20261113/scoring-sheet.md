# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `confidentWrong` to `yes` when the answer states a false figure, deadline or rule as fact (not hedged or labelled unchecked); otherwise `no`. Set `officialSourceCited` to `yes` when the answer cites an official or primary source (a German federal, state or city authority or portal, the statute itself, or EU law) for the key fact asked; otherwise `no`. Citations appear as site names after the claims. Check every fact live on the web on the day you score; the reference under each prompt is a starting point, not a key. `comment` is free text: say what was wrong and what source you checked. Do not look up which label is which until every row is filled.

## 1. F-01 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie hoch ist die Hundesteuer in Berlin für den ersten Hund?
~~~~~~

**Reference for the scorer:**

- Fact: amount per year as published by the Berlin tax administration (berlin.de) on the run day

### Answer A

~~~~~~markdown
Die Hundesteuer in Berlin beträgt 120 € im Jahr für den ersten Hund und 180 € für jeden weiteren Hund berlin.de.
Ein paar ergänzende Infos aus der offiziellen FAQ (Berlin.de):
Anmeldung: innerhalb eines Monats nach Kauf oder Umzug nach Berlin; bei Welpen unter drei Monaten innerhalb der ersten vier Lebensmonate. Die Anmeldung beim Hunderegister (hunderegister.berlin.de) gilt gleichzeitig als steuerliche Anmeldung berlin.de.
Zahlung: nach dem Steuerbescheid wird die Steuer vierteljährlich am 5. März, 5. Juni, 5. September und 5. Dezember fällig; Vorauszahlung fürs ganze Jahr ist möglich berlin.de.
Befreiungen: u. a. für Blindenführhunde, Rettungs- und Sanitätshunde, Hunde aus Tierheimen (befristet auf fünf Jahre) sowie bei Bezug von Bürgergeld, Grundsicherung oder bestimmten Sozialleistungen berlin.de.
Hundesteuermarke: gibt es seit dem 01.01.2024 nicht mehr berlin.de.
~~~~~~

### Answer B

~~~~~~markdown
Die Hundesteuer in Berlin beträgt 120 € pro Jahr für den ersten Hund (und 180 € für jeden weiteren) [ebaefbc0bf46, offizielle FAQ der Senatsverwaltung für Finanzen, berlin.de]. Dies wird auch von mehreren unabhängigen Quellen für 2026 bestätigt hundepapiere.deberlinecho.de.
Zusätzlich aus der offiziellen FAQ:
Anmeldung: innerhalb eines Monats nach Kauf/Umzug nach Berlin; am einfachsten über das Hunderegister (hunderegister.berlin.de) – diese Anmeldung gilt gleichzeitig als steuerliche Anmeldung berlin.de
Fälligkeit: vierteljährlich am 5. März, 5. Juni, 5. September und 5. Dezember (je ein Viertel des Jahresbetrags) berlin.de
Befreiungen gibt es z. B. für Blindenführhunde, Rettungshunde, Tierschutztierheimhunde (5 Jahre) sowie bei Bezug bestimmter Sozialleistungen berlin.de
~~~~~~

## 2. F-02 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie lange habe ich Zeit, gegen einen Bußgeldbescheid Einspruch einzulegen?
~~~~~~

**Reference for the scorer:**

- Fact: 2 Wochen ab Zustellung (§ 67 OWiG)
- Fact: schriftlich oder zur Niederschrift bei der Behörde

### Answer A

~~~~~~markdown
Sie haben zwei Wochen ab Zustellung des Bußgeldbescheids Zeit, Einspruch einzulegen. Innerhalb dieser Frist muss der Einspruch bei der zuständigen Bußgeldbehörde eingehen – entscheidend ist also nicht das Absendedatum adac.de.
Wichtig dazu:
Fristbeginn: Die Zustellung erfolgt meist per Post mit Zustellungsurkunde. Wird der Bescheid in den Briefkasten eingeworfen, beginnt die Frist bereits damit adac.de.
Nach Fristablauf: Wird der Bescheid rechtskräftig, die Geldbuße wird fällig, eine Überprüfung ist ausgeschlossen. Nur bei nachweislich unverschuldet versäumter Frist ist eine Wiedereinsetzung möglich – dann müssen Sie den Einspruch nachholen und begründen, warum die Frist nicht haltbar war adac.de.
Form: Schriftlich (Post oder Fax), je nach Bundesland auch online oder telefonisch zur Niederschrift. Eine einfache E-Mail genügt in der Regel nicht – maßgeblich sind die Vorgaben im Bescheid adac.de.
Begründung: Zunächst nicht erforderlich; ein Satz wie „Gegen den Bußgeldbescheid mit dem Aktenzeichen … lege ich Einspruch ein." reicht adac.de.
Bis zur rechtskräftigen Entscheidung müssen Sie die Geldbuße nicht zahlen adac.de.
Im Zweifel lohnt sich eine vorsorgliche Einspruchseinlegung innerhalb der Frist adac.de.
~~~~~~

### Answer B

~~~~~~markdown
Einspruchsfrist beim Bußgeldbescheid
Sie haben zwei Wochen ab Zustellung des Bußgeldbescheids Zeit, Einspruch einzulegen adac.de. Innerhalb dieser Frist muss der Einspruch bei der zuständigen Bußgeldbehörde eingehen adac.de.
Wichtige Details
Fristbeginn: Maßgeblich ist die Zustellung, die meist per Post mit Zustellungsurkunde erfolgt. Wird der Bescheid in den Briefkasten eingeworfen, löst das bereits den Fristbeginn aus adac.de.
Fristberechnung: Beispiel: Kommt der Bescheid an einem Montag, läuft die Frist bis zum Montag zwei Wochen darauf, 24 Uhr bussgeldkatalog.org.
Nach Fristablauf: Wird der Bescheid rechtskräftig, die Geldbuße wird fällig, eine Überprüfung ist dann ausgeschlossen adac.de. Nur bei nachweislich unverschuldetem Versäumen ist eine Wiedereinsetzung möglich – dann muss der Einspruch gleichzeitig nachgeholt und begründet werden, warum die Frist nicht eingehalten werden konnte adac.de.
Praktische Hinweise
Ein Einspruch muss zunächst nicht begründet werden; ein Satz genügt: „Gegen den Bußgeldbescheid mit dem Aktenzeichen … lege ich Einspruch ein." adac.de
Form beachten: schriftlich per Post oder Fax, je nach Bundesland auch online oder telefonisch zur Niederschrift. Eine einfache E-Mail genügt nicht, wenn sie im Bescheid nicht zugelassen ist – der Einspruch wäre dann formunwirksam adac.de.
Bis zur rechtskräftigen Entscheidung müssen Sie die Geldbuße nicht zahlen adac.de.
Im Zweifel lohnt sich ein vorsorglicher Einspruch, da eine Begründung später nachgereicht werden kann adac.de.
Die Zweiwochenfrist bestätigen auch mehrere weitere Quellen bussgeldkatalog.org bussgeldrechner.org bussgeldkatalog.net.
~~~~~~

## 3. F-03 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Was kostet ein einfaches Führungszeugnis?
~~~~~~

**Reference for the scorer:**

- Fact: fee as published by the Bundesamt für Justiz on the run day

### Answer A

~~~~~~markdown
Beim genauen Betrag bin ich mir nicht sicher – die Gebühr kann sich geändert haben, und mein Wissensstand ist möglicherweise nicht aktuell. Verlässlich findest du die aktuelle Höhe hier:
Online-Antrag beim Bundesamt für Justiz: fuehrungszeugnis.bund.de (https://fuehrungszeugnis.bund.de) – dort ist die aktuelle Gebühr angegeben
Persönlicher Antrag beim Bürgeramt / Einwohnermeldeamt deiner Stadt – die Gebühr zahlst du direkt vor Ort
Gut zu wissen: Für ein Führungszeugnis, das du für ehrenamtliches Engagement brauchst (z. B. Verein, Schule, Feuerwehr), entfällt die Gebühr meist, wenn dir die Organisation eine entsprechende Bestätigung mitgibt.
Soll ich den aktuellen Betrag kurz im Netz nachschlagen?
~~~~~~

### Answer B

~~~~~~markdown
Ein einfaches Führungszeugnis kostet 13 € – dasselbe wie das erweiterte Führungszeugnis (Gebühr nach dem Bundeszentralregistergesetz). Stand meines Wissens; da sich Gebühren ändern können, lohnt ein kurzer Blick auf die Seite des Bundesamts für Justiz (fuehrungszeugnis.bund.de), wo du es auch online beantragen kannst.
Noch gut zu wissen:
Beantragung: online über das Bundesamt für Justiz oder persönlich bei der Meldebehörde/Bürgeramt.
Gebührenbefreiung: Für viele Ehrenämter (z. B. Arbeit mit Kindern und Jugendlichen, Vereinsarbeit, Pflege) ist es gebührenfrei (§ 32a BZRG) – beim Antrag einfach den Verwendungszweck angeben.
Dauer: In der Regel etwa 1–2 Wochen.
Wenn du willst, kann ich das kurz im Web nachschlagen, ob der Betrag aktuell noch stimmt.
~~~~~~

## 4. F-04 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie lange ist ein Reisepass für Erwachsene gültig?
~~~~~~

**Reference for the scorer:**

- Fact: 10 Jahre ab 24 Jahren; 6 Jahre unter 24 (Passgesetz)

### Answer A

~~~~~~markdown
Ein deutscher Reisepass für Erwachsene (ab 24 Jahren) ist 10 Jahre gültig. Für Antragsteller unter 24 Jahren gilt eine Gültigkeit von 6 Jahren auswaertiges-amt.de germany.info.
Hinweis: Beim Reisen verlangen manche Länder, dass der Pass über das Reiseende hinaus noch eine bestimmte Zeit gültig ist – dazu sagen die vorliegenden Quellen nichts Konkretes.
~~~~~~

### Answer B

~~~~~~markdown
Ein regulärer deutscher Reisepass ist für Erwachsene (ab 24 Jahren) 10 Jahre gültig, für Personen unter 24 Jahren 6 Jahre auswaertiges-amt.de. Eine Verlängerung nach Ablauf ist nicht möglich – es wird ein neuer Pass beantragt auswaertiges-amt.de.
Zur Einordnung: Die 10-Jahres-Gültigkeit orientiert sich an der ICAO-Empfehlung für elektronische Reisedokumente bmi.bund.de.
~~~~~~

## 5. F-05 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie viel darf ich 2026 in einem Minijob verdienen, und muss ich dabei Rentenversicherung zahlen?
~~~~~~

**Reference for the scorer:**

- Fact: Minijob-Grenze 2026 as published by the Minijob-Zentrale on the run day
- Fact: rentenversicherungspflichtig mit Möglichkeit der Befreiung auf Antrag

### Answer A

~~~~~~markdown
Minijob 2026: Verdienstgrenze und Rentenversicherung
Verdienstgrenze: 2026 liegt die Minijob-Grenze bei 603 Euro pro Monat. Sie ist zum Jahreswechsel von 556 Euro gestiegen, weil der Mindestlohn von 12,82 auf 13,90 Euro erhöht wurde deutsche-rentenversicherung.de.
Rentenversicherung: Ja, Minijobs unterliegen seit 2013 grundsätzlich der Versicherungspflicht in der gesetzlichen Rentenversicherung deutsche-rentenversicherung.de:
Der Arbeitgeber zahlt einen Pauschalbeitrag von 15 %.
Sie zahlen als Eigenbeitrag in der Regel 3,6 % – bei 603 Euro Verdienst also 21,71 Euro im Monat deutsche-rentenversicherung.de.
Liegt der Verdienst unter 175 Euro, gilt für den Teil bis 175 Euro der volle Beitragssatz von 18,6 % deutsche-rentenversicherung.de.
Opt-out möglich: Auf Antrag können Sie sich von der Eigenbeitragspflicht befreien lassen deutsche-rentenversicherung.de. Das wird aber meist nicht empfohlen, da die Beiträge z. B. Wartezeiten für die volle Rente füllen und Schutz bei Erwerbsminderung sowie Anspruch auf medizinische Rehabilitation bieten können deutsche-rentenversicherung.dedeutscherechner.de.
Sonderfall Privathaushalt: Bei einer Beschäftigung in einem Privathaushalt leistet der Arbeitgeber nur 5 % pauschal, sodass Sie für den vollen Beitrag ca. 13,6 % als Eigenleistung zahlen finanztip.de.
Hinweis: Werden mehrere Minijobs ausgeübt, zählt der Gesamtverdienst – die Grenze gilt also für alle Minijobs zusammen deutsche-rentenversicherung.de. Bei Fragen zur Befreiung können Sie sich an die kostenlose Servicenummer der Deutschen Rentenversicherung wenden (steht in der Quelle als Platzhalter 0800 1000 4800) deutsche-rentenversicherung.de.
~~~~~~

### Answer B

~~~~~~markdown
Verdienstgrenze 2026
Die Minijob-Grenze liegt 2026 bei 603 Euro pro Monat – sie ist von 556 Euro gestiegen, weil der Mindestlohn von 12,82 auf 13,90 Euro angehoben wurde deutsche-rentenversicherung.de.
Rentenversicherung im Minijob
Ja, Minijobs unterliegen seit 2013 grundsätzlich der Versicherungspflicht in der gesetzlichen Rentenversicherung deutsche-rentenversicherung.de:
Der Arbeitgeber zahlt einen Pauschalbeitrag von 15 Prozent.
Sie selbst zahlen einen Eigenbeitrag von in der Regel 3,6 Prozent – bei 603 Euro Verdienst also 21,71 Euro pro Monat deutsche-rentenversicherung.de.
Dafür erwerben Sie den vollen Schutz der gesetzlichen Rentenversicherung, z. B. auch Anwartschaften auf Erwerbsminderungsrente und Rehabilitation deutsche-rentenversicherung.de.
Befreiung möglich: Auf Antrag können Sie sich von der Zahlung des Eigenbeitrags befreien lassen deutsche-rentenversicherung.de. Dann erwerben Sie aber keine eigenen Rentenansprüche durch den Minijob arbeitsamt.info. Mehrere Quellen raten davon in der Regel ab, weil die Beitragszeiten für die spätere Rente zählen deutscherechner.de – das ist aber eine Einschätzung, keine offizielle Empfehlung.
Sonderfälle:
Privathaushalt: Hier gelten andere Beträge; der Arbeitgeber leistet nur 5 Prozent pauschal, sodass Sie für den vollen Beitrag ca. 13,6 Prozent als Eigenleistung zahlen müssten finanztip.de. Die genauen offiziellen Beträge nennt die Deutsche Rentenversicherung unter dem Hinweis „Für geringfügig Beschäftigte in Privathaushalten gelten andere Beträge" deutsche-rentenversicherung.de.
Verdienst unter 175 Euro/Monat: Dann zahlen Sie 3,6 Prozent auf den tatsächlichen Verdienst plus den vollen Beitragssatz von 18,6 Prozent auf die Differenz bis 175 Euro deutsche-rentenversicherung.de.
Vor 2013 begonnene Minijobs mit bis zu 400 Euro bleiben versicherungsfrei deutsche-rentenversicherung.de.
Mehrere Minijobs: Es zählt der Gesamtverdienst aller Minijobs zusammen deutsche-rentenversicherung.de.
Bei Fragen gibt es die kostenlose Servicetelefonnummer der Deutschen Rentenversicherung: 0800 1000 4800 deutsche-rentenversicherung.de.
~~~~~~

## 6. F-06 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Ich arbeite seit vier Jahren in derselben Firma. Mit welcher Frist kann mein Arbeitgeber mir kündigen?
~~~~~~

**Reference for the scorer:**

- Fact: § 622 BGB: nach 2 Jahren Betriebszugehörigkeit 1 Monat zum Ende eines Kalendermonats (2 Monate erst ab 5 Jahren)
- Fact: Tarif- oder Arbeitsvertrag kann längere Fristen vorsehen

### Answer A

~~~~~~markdown
Nach vier Jahren Betriebszugehörigkeit gilt gesetzlich für Ihren Arbeitgeber eine ordentliche Kündigungsfrist von 1 Monat zum Monatsende (§ 622 Abs. 2 BGB) jusora.de. Beispiel: Geht die Kündigung am 13. November 2026 zu, endet das Arbeitsverhältnis am 31. Dezember 2026 jusora.de.
Wichtige Punkte dazu:
Ihre eigene Kündigungsfrist bleibt bei der Grundfrist von vier Wochen zum 15. oder zum Monatsende (§ 622 Abs. 1 BGB), sofern der Vertrag sie nicht verlängert jusora.de.
Arbeits- oder Tarifvertrag können längere Fisten vorsehen; eine Klausel, wonach die verlängerten Fristen „für beide Seiten" gelten, kann auch für Sie die 1-Monats-Frist bedeuten jusora.de.
Klagefrist: Gegen eine Kündigung können Sie nur binnen drei Wochen ab Zugang Klage erheben (§ 4 KSchG) – unabhängig von der Kündigungsfrist jusora.de.
Zu kurze Frist: Macht die Kündigung nicht unwirksam, sondern verschiebt das Ende auf den nächstzulässigen Termin jusora.de.
Nach fünf Jahren würde die nächste Stufe greifen: 2 Monate zum Monatsende jusora.de.
Hinweis: Die Quellen sind Anwaltsportale, keine offiziellen Gesetzesseiten – die genannten Fristen entsprechen zwar § 622 BGB, im Zweifel lohnt ein Blick in Ihren Arbeitsvertrag oder eine Beratung.
~~~~~~

### Answer B

~~~~~~markdown
Nach vier Jahren Betriebszugehörigkeit gilt für eine ordentliche Kündigung durch den Arbeitgeber eine Frist von 1 Monat zum Monatsende (§ 622 Abs. 2 BGB) jusora.de.
Beispiel: Geht Ihnen die Kündigung am 13. November 2026 zu, endet das Arbeitsverhältnis am 31. Dezember 2026 jusora.de.
Wichtig zu wissen:
Ihre eigene Kündigungsfrist bleibt die Grundfrist von vier Wochen zum 15. oder zum Monatsende (§ 622 Abs. 1 BGB) – es sei denn, Ihr Arbeits- oder Tarifvertrag verlängert sie jusora.de.
Vertragliche Abweichungen sind möglich: Der Vertrag darf längere Fristen vorsehen, und eine Klausel, wonach die verlängerten Arbeitgeberfristen „für beide Seiten" gelten, ist wirksam – dann müssten auch Sie 1 Monat zum Monatsende einhalten jusora.de.
Tarifverträge können die gesetzlichen Fristen abweichend regeln, sehen aber häufiger längere Fristen vor jusora.de.
Zu kurze Frist: Hält der Arbeitgeber die Frist nicht ein, wird die Kündigung in eine fristgemäße Kündigung umgedeutet – sie ist dann zum nächstmöglichen (zulässigen) Termin wirksam, nicht unwirksam abfindo.de.
Klagefrist: Gegen eine Kündigung können Sie nur binnen drei Wochen ab Zugang Klage erheben (§ 4 KSchG) – unabhängig von der Kündigungsfrist jusora.de.
Die nächste Stufe der Fristentreppe erreichen Sie nach fünf Jahren: dann gilt eine Frist von 2 Monaten zum Monatsende jusora.de.
Hinweis: Dies ist eine allgemeine Information, keine Rechtsberatung. Wenn Sie eine konkrete Kündigung erhalten haben, lohnt sich wegen der kurzen Drei-Wochen-Frist zeitnah anwaltliche Beratung.
~~~~~~

## 7. F-07 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Was kostet es, nach einem Umzug meinen Wohnsitz beim Bürgeramt umzumelden?
~~~~~~

**Reference for the scorer:**

- Fact: die An- bzw. Ummeldung selbst ist gebührenfrei
- Fact: Frist zwei Wochen nach Einzug

### Answer A

~~~~~~markdown
Nach einem Umzug ist die Ummeldung des Wohnsitzes meist kostenlos – die genaue Gebühr hängt aber von Ihrer Stadt oder Gemeinde ab.
Was die Quellen sagen:
In den meisten Fällen ist die Ummeldung kostenlos; manche Kommunen verlangen eine geringe Gebühr, meist zwischen 5 und 10 € studenten-umzug.berlin.
Eine andere Quelle nennt amtliche Gebühren von 9,00 € bis 10,80 €, je nach Fall amtsfinder.de – die Angaben der Quellen weichen also etwas voneinander ab.
Beispiele aus der Tabelle des geöffneten Artikels: Berlin, Hamburg, Köln, Frankfurt, Leipzig, Dresden und Hannover 0 €; München und Stuttgart 10 €; Bremen 6 € studenten-umzug.berlin.
Die Adressänderung im Personalausweis selbst (Aufkleber auf der Rückseite) ist ebenfalls kostenlos; Kosten entstehen nur bei beschädigtem oder verlorenem Ausweis bzw. bei Neuausstellung (z. B. 37 € ab 24 Jahre, 22,80 € unter 24 Jahre laut derselben Quelle) studenten-umzug.berlin.
Frist und Bußgeld:
Sie müssen sich laut Quelle innerhalb von 14 Tagen nach dem Einzug ummelden (§ 17 BMG) studenten-umzug.berlinaroundhome.de.
Bei verspäteter Ummeldung droht ein Bußgeld – laut einer Quelle bis zu 1.000 € nach § 54 BMG, in der Praxis aber oft nur 15–50 € bei Kulanz studenten-umzug.berlin. Eine weitere Quelle bestätigt grundsätzlich, dass ein Bußgeld möglich ist umziehen.de.
Unterlagen: Personalausweis oder Reisepass, Wohnungsgeberbestätigung des Vermieters, ggf. Ummeldeformular studenten-umzug.berlinbuergerservice.info.
Hinweis: Die genaue Gebühr in Ihrer Stadt steht nicht in den Quellen – am sichersten prüfen Sie die Website Ihres Bürgeramts oder fragen dort direkt nach.
~~~~~~

### Answer B

~~~~~~markdown
Nach einem Umzug innerhalb Deutschlands kostet die Ummeldung des Wohnsitzes in den meisten Fällen nichts – es kommt aber auf die Gemeinde an:
In der Regel kostenlos: Viele Städte verlangen keine Gebühr, z. B. Berlin, Hamburg, Köln, Frankfurt, Leipzig, Dresden und Hannover (0 € bei vollständigen Unterlagen) studenten-umzug.berlin.
Manche Kommunen verlangen eine kleine Gebühr: meist zwischen 5 und 10 €, z. B. München und Stuttgart (je 10 €) oder Bremen (6 €) studenten-umzug.berlin. Eine andere Quelle nennt amtliche Gebühren von 9,00 € bis 10,80 € je nach Fall amtsfinder.de.
Die Adressänderung im Personalausweis selbst (Aufkleber auf der Rückseite) ist meist kostenlos; nur bei beschädigtem oder verlorenem Ausweis entstehen Zusatzkosten studenten-umzug.berlin.
Wichtig zur Frist: Du musst dich innerhalb von 14 Tagen nach dem Einzug ummelden studenten-umzug.berlin amtly.app aroundhome.de. Bei Versäumnis droht laut Bundesmeldegesetz eine Ordnungswidrigkeit mit einem Bußgeld von bis zu 1.000 € studenten-umzug.berlin; in der Praxis werden oft nur 15–50 € verhängt, wenn die Verspätung plausibel erklärbar ist studenten-umzug.berlin.
Mitbringen: Personalausweis oder Reisepass sowie die vom Vermieter unterschriebene Wohnungsgeberbestätigung studenten-umzug.berlin buergerservice.info.
Hinweis: Alle Quellen sind kommerzielle Ratgeberseiten, keine offiziellen Behördenangaben – die genauen Gebühren und die Frist solltest du auf der Seite deines Bürgeramts bzw. deiner Stadt prüfen, da sie je nach Kommune variieren.
~~~~~~

## 8. F-08 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie hoch ist der Pfändungsfreibetrag für eine alleinstehende Person ohne Unterhaltspflichten?
~~~~~~

**Reference for the scorer:**

- Fact: monthly amount under the Pfändungsfreigrenzenbekanntmachung in force on the run day (adjusted each 1 July)

### Answer A

~~~~~~markdown
Für eine alleinstehende Person ohne Unterhaltspflichten liegt die Pfändungsfreigrenze aktuell bei 1.589,99 € netto pro Monat schuldnerberatung.de anwalt.org schuldnerberatung.de.
Einige Hinweise dazu:
Der genaue unpfändbare Betrag richtet sich nach dem bereinigten Nettoeinkommen – oberhalb der Freigrenze bleibt zusätzlich ein Teil des Einkommens geschützt (§ 850c Abs. 3 ZPO). Beispiel: Bei 2.000 € Netto sind laut Pfändungstabelle nur 288,82 € pfändbar, es bleiben also 1.711,18 € schuldnerberatung.de.
Mit Unterhaltspflichten steigt der Freibetrag, z. B. auf 2.189,99 € mit einem Kind schuldnerberatung.de.
Achtung: Bei der Vollstreckung von Unterhaltsansprüchen gelten diese Freigrenzen nicht; dann gelten Sonderregelungen (§ 850d ZPO) finanztip.de.
Zur Einordnung: Die Quellen sind keine offiziellen Behördenseiten, sondern Ratgeberportale. Eine Quelle (Finroom) nennt mit 1.587,40 € einen abweichenden Betrag finroom.de – die Mehrheit der Quellen nennt jedoch 1.589,99 €. Verbindlich ist die amtliche Pfändungstabelle; im Zweifel beim zuständigen Amtsgericht/Vollstreckungsgericht oder einer Schuldnerberatung nachfragen.
~~~~~~

### Answer B

~~~~~~markdown
Nach den vorliegenden Quellen liegt der Pfändungsfreibetrag (Pfändungsfreigrenze) für eine alleinstehende Person ohne Unterhaltspflichten bei 1.589,99 € netto pro Monat schuldnerberatung.deanwalt.orgschuldnerberatung.de.
Einige Hinweise dazu:
Der Betrag ergibt sich aus der Pfändungstabelle nach § 850c ZPO und gilt u. a. für Lohn-, Konto- und Forderungspfändungen schuldnerberatung.de.
Es bleibt Ihnen sogar mehr als dieser Grundbetrag: Nach § 850c Abs. 3 ZPO ist auch ein Teil des Einkommens oberhalb der Freigrenze unpfändbar. Beispiel aus der Quelle: Bei 2.000 € Netto und ohne Unterhaltspflichten sind nur 288,82 € pfändbar, es verbleiben 1.711,18 € schuldnerberatung.de.
Achtung: Eine Quelle (Finroom) nennt abweichend 1.587,40 € finroom.de – die meisten Quellen und die geöffnete Seite nennen jedoch 1.589,99 €. Bei Unsicherheit empfiehlt sich der Blick in die aktuelle offizielle Pfändungstabelle.
Bei einer Privatinsolvenz gelten dieselben Freibeträge wie bei der Lohnpfändung schuldnerberatung.de.
~~~~~~

## 9. F-09 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Bis zu welchem Betrag darf mein Arbeitgeber mir Sachgeschenke steuerfrei geben?
~~~~~~

**Reference for the scorer:**

- Fact: Sachbezugsfreigrenze 50 EUR im Monat (§ 8 Abs. 2 Satz 11 EStG)
- Fact: Aufmerksamkeiten zu persönlichen Anlässen bis 60 EUR

### Answer A

~~~~~~markdown
Kurz zusammengefasst (Deutschland, Stand meines Trainingswissens – bitte beim Bundesfinanzministerium oder Steuerberater verifizieren):
Sachgeschenke (Gelegenheitsgeschenke): Bis 60 € brutto (inkl. USt.) pro Anlass sind steuer- und sozialversicherungsfrei (§ 3 Nr. 14 EStG, R 8.1 LStR). Voraussetzung: Das Geschenk ist gelegentlich (z. B. zu Geburtstag, Weihnachten, Jubiläum) und kein Arbeitslohn – also keine Leistung, die der Arbeitgeber für die Tätigkeit gibt (z. B. Bonus, Prämie).
Pro Jahr möglich: Mehrere Anlässe sind zulässig, z. B. je 60 € zu Weihnachten und zum Geburtstag – solange jedes Geschenk ein eigener Gelegenheitsanlass ist.
Betriebliche Veranstaltungen: Zusätzlich sind Sachzuwendungen (z. B. Lebensmittel/Getränke) bei Betriebsfesten bis 110 € pro Person und Veranstaltung begünstigt (§ 4 Abs. 5 Nr. 2 EStG).
Gutscheine: Auch Gutscheine können als Sachzuwendung gelten, wenn sie auf Sachleistungen beschränkt sind.
Über dem Freibetrag: Alles darüber hinaus ist lohnsteuerpflichtig (bei Sachbezügen ggf. Pauschalierung mit 25 % möglich).
Wichtig: Die genauen Grenzen und Bedingungen (insb. 60 €/110 €) können sich durch Gesetzesänderungen verschieben – verlässliche Auskunft gibt die aktuelle Lohnsteerrichtlinie bzw. Ihr Finanzamt oder Steuerberater.
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gelten für Sachgeschenke an Arbeitnehmer zwei steuerfreie Freigrenzen:
1. Sachbezüge-Freigrenze: 50 € pro Monat
Sachgeschenke (z. B. Gutscheine, Waren, Warengutschein statt Bargeld) sind steuer- und sozialabgabenfrei, solange die Sachbezüge des Monats zusammen 50 € nicht übersteigen (§ 8 Abs. 2 EStG).
Wichtig: Es muss eine Sachleistung sein – reine Geldgeschenke oder Geldgutscheine sind nicht begünstigt. Bei Warengutscheinen (z. B. Amazon, Supermarkt) mit konkretem Warenwert geht das meist, bei Gutschein­karten mit frei wählbarem Geldbetrag nicht.
2. Anlassbezogene Geschenke: 60 € pro Anlass
Zu persönlichen Anlässen wie Geburtstag, Hochzeit, Jubiläum oder Weihnachten sind Geschenke bis 60 € je Anlass steuerfrei (dazu ggf. noch 60 € für den Ehe-/Eingetragenen Partner). Mehr als zwei solcher Anlässe pro Jahr sind nicht begünstigt.
Diese 60 € gelten zusätzlich zur 50-€-Monatsgrenze, wenn der Anlass nicht schon darüber abgegolten wird.
Beispiel: Ein Weihnachtsgeschenk in Form eines Warengutscheins über 55 € ist über die Anlassregel steuerfrei. Ein „einfach so“-Gutschein über 55 € im März wäre dagegen über der 50-€-Grenze und würde steuerpflichtige Sachbezüge auslösen.
Hinweis: Die genauen Beträge können sich durch Gesetzesänderungen verschieben – für eine verbindliche Auskunft lohnt ein Blick auf aktuelle BMF-Hinweise oder eine Nachfrage beim Steuerberater.
~~~~~~

## 10. F-10 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
How long is the right of withdrawal for online purchases in Germany, and when does it start?
~~~~~~

**Reference for the scorer:**

- Fact: 14 days (§ 355 BGB)
- Fact: starts on receipt of the goods (for goods), with correct information about the right
- Fact: extends up to 12 months and 14 days without correct information

### Answer A

~~~~~~markdown
For online purchases in Germany, you generally have at least 14 days to exercise your right of withdrawal (Widerrufsrecht) after a distance purchase — online, by phone, by mail order, etc. evz.de
When the period starts: for physical goods, the 14 days begin when you (or a person you designated) receive the last item; for services, it starts at contract conclusion. plainlawguide.com
A few important details:
Exceptions: the right doesn't apply to custom-made items, perishables, event/travel tickets, digital content you've accessed with your consent, or goods unsealed for health/hygiene reasons. evz.de
If the seller didn't inform you of your right of withdrawal, the period is extended — up to twelve months and 14 days after receipt of the goods as the outer limit. recordinglaw.com evz.de
In-store purchases (including fairs and exhibitions) carry no withdrawal right in Germany. evz.de
Sellers can offer a longer period, but never a shorter one. evz.de
Note: these sources are excerpts or consumer-information pages, not the statute itself (§ 355 BGB). For a legally binding answer, check gesetze-im-internet.de or the EVZ (European Consumer Centre) directly.
~~~~~~

### Answer B

~~~~~~markdown
14 days, for distance contracts like online purchases (§ 355 BGB), and you don't need to give a reason recordinglaw.com.
When it starts: For physical goods, the clock starts on receipt of the goods — not on ordering. If one order arrives in several parcels or part-deliveries, the period starts when the last item arrives (§ 356 Abs. 2 BGB) recordinglaw.complainlawguide.com. For other contracts, the default start is contract conclusion recordinglaw.com.
Two practical points:
It's enough to send the withdrawal within 14 days; it doesn't have to arrive by then recordinglaw.com.
If the trader failed to give the required withdrawal instructions, the 14 days never start running, and the outer limit is 12 months and 14 days from the start point recordinglaw.com.
Note: this right applies to online, phone, catalogue and doorstep sales — not to purchases made inside a physical shop, where any return is only the shop's voluntary policy recordinglaw.comnew-german.com.
~~~~~~

## 11. F-11 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Ab welchem Krankheitstag muss ich meinem Arbeitgeber eine Arbeitsunfähigkeitsbescheinigung vorlegen?
~~~~~~

**Reference for the scorer:**

- Fact: nach mehr als drei Kalendertagen, also spätestens am vierten Tag (§ 5 EFZG)
- Fact: Arbeitgeber darf sie früher verlangen
- Fact: für gesetzlich Versicherte als eAU, die der Arbeitgeber abruft

### Answer A

~~~~~~markdown
Das hängt von Ihrem Arbeitsvertrag bzw. Ihrer Betriebsvereinbarung ab – es gibt keine bundesweit einheitliche Regelung.
Übliche Praxis:
Bei vielen Arbeitgebern gilt die sogenannte "Drei-Tage-Frist": Die Bescheinigung muss spätestens am 4. Kalendertag der Krankheit vorliegen. Diese Frist kann der Arbeitgeber aber nur verlangen, wenn sie arbeitsvertraglich oder per Betriebsvereinbarung vereinbart wurde.
Ohne entsprechende Vereinbarung gilt: Sie müssen den Arbeitgeber unverzüglich über die Krankheit und ihre voraussichtliche Dauer informieren, aber zunächst keine Bescheinigung vorlegen.
Der Arbeitgeber kann die Bescheinigung auch schon ab dem ersten Krankheitstag verlangen – das ist rechtlich zulässig.
Wichtig seit 2023 (elektronische AU / eAU):
Die Bescheinigung wird von der Arztpraxis digital an die Krankenkasse übermittelt; der Arbeitgeber ruft die Daten dort ab (bei gesetzlich Versicherten).
Sie sollten trotzdem die AU-Schlußschein-Nummer (auf dem Behandlungsausweis/den Patienteninformationen) an Ihren Arbeitgeber weitergeben.
Krankengeld: Ab dem 6. Woche (genauer: ab der 7. Kalendertag, wenn die Arbeitsunfähigkeit durch dieselbe Krankheit andauert) zahlt die Krankenkasse Krankengeld – dafür ist die Bescheinigung nötig.
Da die genaue Frist von Ihrem Vertrag abhängt, prüfen Sie am besten dort oder fragen Sie bei Ihrer Personalabteilung nach. Für verbindliche Details empfehle ich einen Blick auf die offiziellen Seiten (z. B. Bundesarbeitsministerium oder Ihre Krankenkasse), da ich mir bei Details zur aktuellen Rechtslage nicht hundertprozentig sicher bin.
~~~~~~

### Answer B

~~~~~~markdown
Das hängt von Ihrem Arbeitgeber ab:
Grundregel: Für die Lohnfortzahlung im Krankheitsfall müssen Sie spätestens ab dem 4. Kalendertag eine Arbeitsunfähigkeitsbescheinigung vorlegen können ("Dauer der Arbeitsunfähigkeit, die über 3 Kalendertage hinausgeht").
Aber: Ihr Arbeitgeber kann im Arbeits- oder Tarifvertrag oder per Einzelanweisung verlangen, dass Sie die Bescheinigung schon früher, z. B. am ersten Krankheitstag, vorlegen. Das ist zulässig und kommt häufig vor.
Seit 2023 wird die Bescheinigung bei gesetzlich Versicherten als elektronische AU (eAU) direkt an die Krankenkasse und den Arbeitgeber übermittelt – die Vorlagepflicht des Papierausdrucks ist dadurch weitgehend entfallen, aber die Fristen gelten unverändert.
Da die genaue Frist von Ihrem Arbeitsvertrag bzw. betrieblichen Regelungen abhängt, empfehle ich einen Blick in Ihren Vertrag oder eine kurze Nachfrage bei Ihrer Personalabteilung. Für verbindliche Details siehe auch die Informationen der Deutschen Rentenversicherung bzw. Ihres Arbeitgebers.
~~~~~~

## 12. F-12 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
Wie lange dauert der Mutterschutz vor und nach der Geburt?
~~~~~~

**Reference for the scorer:**

- Fact: 6 Wochen vor, 8 Wochen nach der Geburt (MuSchG)
- Fact: 12 Wochen nach Früh- oder Mehrlingsgeburten und bei Behinderung des Kindes

### Answer A

~~~~~~markdown
Mutterschutzfristen in Deutschland
Grundregel: Die Mutterschutzfrist beginnt 6 Wochen vor dem errechneten Geburtstermin und endet 8 Wochen nach der Geburt – insgesamt also mindestens 14 Wochen familienportal.de.
Besondere Situationen
Frühgeburt: Gilt das Kind medizinisch als Frühgeburt (z. B. bei einem Geburtsgewicht unter 2.500 Gramm), verlängert sich der Mutterschutz nach der Geburt auf 12 Wochen – insgesamt dann 18 Wochen familienportal.de.
Verfrühte Geburt ohne Frühgeburt: Kommt das Kind vor dem errechneten Termin, bleibt die Gesamtfrist trotzdem bei 14 Wochen – die Frist nach der Geburt verlängert sich um so viele Tage, wie das Kind zu früh kam familienportal.de.
Verspätete Geburt: Die 8 Wochen nach der Geburt bleiben in voller Länge erhalten, die Frist endet entsprechend ein paar Tage später familienportal.de.
Mehrlinge (Zwillinge, Drillinge etc.) sowie Kinder mit Behinderung (mit Antrag bei der Krankenkasse): ebenfalls 12 Wochen nach der Geburt familienportal.de.
Kaiserschnitt: Es gibt keine besonderen gesetzlichen Schutzfristen familienportal.de.
Fehlgeburt ab der 13. Schwangerschaftswoche: Es gelten gestaffelte Mutterschutzfristen knappschaft.de; wie genau diese aussehen, steht in den Suchauszügen nicht – das müsste ich bei Bedarf gesondert nachschlagen.
Arbeiten während des Mutterschutzes
Vor der Geburt: Sie dürfen auf eigenen Wunsch weiterarbeiten; der Arbeitgeber darf es nicht verlangen. Der Wunsch kann jederzeit zurückgenommen werden familienportal.de.
Nach der Geburt: Gilt ein absolutes Beschäftigungsverbot – Arbeiten ist auch auf eigenen Wunsch nicht erlaubt. Eine Ausnahme kann für Schülerinnen und Studentinnen gelten familienportal.de.
Quelle: Familienportal des Bundes (BMBFSFJ), abgerufen am 13.11.2026 familienportal.de.
~~~~~~

### Answer B

~~~~~~markdown
Mutterschutz in Deutschland – die Grundregeln:
Vor der Geburt: Die Mutterschutzfrist beginnt 6 Wochen vor dem errechneten Geburtstermin familienportal.de.
Nach der Geburt: Sie endet in der Regel 8 Wochen nach der Geburt – insgesamt also mindestens 14 Wochen familienportal.de.
Sonderfälle:
Frühgeburt: Wenn das Kind vor dem Termin kommt, bleibt die Gesamtfrist trotzdem 14 Wochen – sie endet dann entsprechend später nach der Geburt. Gilt das Kind medizinisch als Frühgeburt (z. B. unter 2.500 g), verlängert sich der Mutterschutz nach der Geburt auf 12 Wochen, insgesamt also auf 18 Wochen familienportal.de.
Mehrlinge (Zwillinge, Drillinge usw.) sowie Kinder mit Behinderung (mit Antrag auf Verlängerung bei der Krankenkasse): ebenfalls 12 Wochen nach der Geburt familienportal.de.
Kaiserschnitt: Es gibt keine besonderen gesetzlichen Schutzfristen familienportal.de.
Fehlgeburt ab der 13. Schwangerschaftswoche: Auch hier gelten gestaffelte Schutzfristen; Details dazu nennt die offizielle Quelle nicht – hierzu gibt es nur Angaben aus nicht-offiziellen Quellen elterngeld.net.
Wichtig zur Arbeit:
Vor der Geburt dürfen Sie freiwillig weiterarbeiten (kein Anspruch des Arbeitgebers, Widerruf jederzeit möglich).
Nach der Geburt gilt ein absolutes Beschäftigungsverbot – auch auf eigenen Wunsch nicht familienportal.de.
Quelle: Familienportal des Bundes (BMBFSFJ), offizielle Seite familienportal.de.
~~~~~~

## 13. F-13 (level 1: German rules (fresh))

**Prompt:**

~~~~~~text
How much cash can I bring into Germany from outside the EU without declaring it?
~~~~~~

**Reference for the scorer:**

- Fact: 10,000 EUR or more must be declared in writing when entering or leaving the EU (zoll.de)

### Answer A

~~~~~~markdown
For Germany, the threshold is €10,000 or equivalent. Cash of €10,000 or more (including other currencies, traveller's cheques, etc., converted to euro value) entering from a non-EU country must be declared in writing to customs. Amounts under that don't require a declaration.
A few notes:
This applies per person — travelling in a family doesn't let you split cash to avoid the rule; amounts carried collectively on behalf of one another can be added together.
Failure to declare can lead to fines and seizure of the money.
Between EU countries there's no border declaration, but if you're carrying €10,000+ and customs asks, you must disclose it.
For current details and the declaration form (form 0402210), the official source is German customs (zoll.de). I'm confident about the €10,000 threshold itself, as it's a long-standing EU-wide rule, but if you want the very latest procedural details, checking zoll.de before travelling is worthwhile.
~~~~~~

### Answer B

~~~~~~markdown
For Germany, the rule is €10,000 or equivalent. If you're bringing cash (or certain cash-equivalent instruments) worth more than that from a non-EU country, you must declare it in writing to the customs authorities (Zoll) on entry.
A few points worth knowing:
Cash includes banknotes, coins, and also things like travellers' cheques and cheques that are signed but not yet made out to a specific recipient.
Travelling within the EU you don't declare, but customs may still ask you to explain amounts of €10,000 or more if they check.
Failure to declare can lead to significant fines and, in serious cases, seizure of the money.
The declaration is made via the Zoll's written form (available online or at the border crossing).
I'm confident in the €10,000 threshold as the long-standing EU-wide rule, but since thresholds and procedures can change, please verify the current requirements on the official Zoll website (zoll.de) before you travel — that's the authoritative source for entry declarations.
~~~~~~
