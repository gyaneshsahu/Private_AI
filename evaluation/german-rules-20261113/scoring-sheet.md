# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

## 1. G-01 (level 2: German rules, fees and deadlines)

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
Glückwunsch zum Umzug! Kurzer Hinweis vorab: Da sich Fristen und Gebühren ändern können und ich hier keine aktuellen offiziellen Quellen habe, kann ich keine konkreten Zahlen als Fakt nennen – aber das Grundprinzip erkläre ich dir gern.
Frist
Grundsätzlich musst du dein Fahrzeug zum neuen Wohnort ummelden, sobald du dort gemeldet bist. Eine feste, überall gleiche Frist in Tagen gibt es pauschal nicht – manche Zulassungsstellen erwarten die Ummeldung zeitnah nach dem Einzug.
Wichtig: Deine Wohnsitzmeldung selbst hat eine Frist (in der Regel zwei Wochen nach dem Einzug beim Einwohnermeldeamt). Die Fahrzeugummeldung hängt daran.
Die Ummeldung geht inzwischen oft auch online (mit dem neuen eVB und Ausweis-/eID-Verfahren) – das spart den Zulassungsstellen-Besuch, die neuen Kennzeichen musst du aber trotzdem besorgen bzw. umprägen lassen.
Kosten (Richtwerte, bitte als unverifiziert betrachten)
Üblicherweise fallen zusammen an: Verwaltungsgebühr der Zulassungsstelle, Stempel/Prägung der neuen Kennzeichen und ggf. Enviro-/Kennzeichenhalter. Insgesamt landen viele Leute grob im Bereich von etwa 20–50 €, je nach Zulassungsstelle und ob du Kennzeichen selbst mitbringst. Das ist nur eine grobe Größenordnung.
Was du brauchst
Zulassungsbescheinigung Teil I (Fahrzeugschein) und Teil II (Fahrzeugbrief, falls vorzulegen)
Personalausweis
eVB-Nummer deiner Versicherung (kostet nichts, aber nötig)
ggf. SEPA-Mandat für die Kfz-Steuer
Alte Kennzeichen (falls Reservierung/Wunschkennzeichen behalten werden soll)
Wo du verlässliche Infos bekommst
Die Zulassungsstelle deiner neuen Stadt/Gemeinde (Website oder Telefon) nennt dir die geltende Frist und die aktuellen Gebühren – die Gebühren sind bundesweit per Gebührenordnung geregelt, können sich aber ändern.
Rechtsgrundlage findest du auf gesetze-im-internet.de (FZV, insb. § 22 zur Ummeldung).
Soll ich dir eine kurze Checkliste in der richtigen Reihenfolge (Meldeamt → eVB → Zulassungsstelle) zusammenstellen?
~~~~~~

### Answer B

~~~~~~markdown
Nach einem Umzug müssen Sie Ihr Fahrzeug ummelden – egal, ob Sie innerhalb derselben Stadt oder in einen anderen Landkreis gezogen sind umziehen.de.
Frist
Eine gesetzliche Frist gibt es nicht; als Faustregel gelten rund vier Wochen nach dem Umzug, sonst droht ein Bußgeld von bis zu 70 € allianzdirect.de.
Die Angaben variieren je nach Quelle: „innerhalb eines Monats" umziehen.de bzw. je nach Zulassungsstelle ein bis vier Wochen verti.de. Am besten kurz bei Ihrer Zulassungsstelle nachfragen.
Kosten (Richtwerte)
Reine Adressänderung im selben Zulassungsbezirk (Kennzeichen bleibt): ca. 10–15 €, mit Halterwechsel 25–30 € umziehen.de
Allgemein werden je nach Bezirk und Kennzeichen ca. 10–30 € umziehen.de bzw. 20–50 € verti.de genannt; eine Quelle nennt eine Festgebühr von 23,60 € bzw. 9,90 € online zulassungsstellen-deutschland.de
Neue Kennzeichen bei Wechsel des Zulassungsbezirks: ca. 20–30 € plus ggf. Feinstaubplakette 5–10 € umziehen.de
Wunschkennzeichen: Reservierung ca. 10–15 €, Extragebühr ca. 15–20 € umziehen.de
Gut zu wissen
Seit 2015 können Sie Ihr Kennzeichen beim Umzug bundesweit behalten umziehen.de.
Wichtig: Zuerst beim Einwohnermeldeamt ummelden – die neue Adresse muss im Personalausweis stehen oder per Meldebescheinigung nachweisbar sein umziehen.de.
Teilweise geht die Ummeldung auch online (i-Kfz), seit 2019 über das Portal der Zulassungsstelle – Voraussetzung sind u. a. ein neuer Personalausweis mit Online-Ausweisfunktion adac.de.
Unterlagen u. a.: Zulassungsbescheinigung Teil I und II, Personalausweis/Pass mit Meldebescheinigung, TÜV/HU-Nachweis, eVB-Nummer der Versicherung, SEPA-Mandat für die Kfz-Steuer umziehen.de.
Hinweis: Die Angaben zu Fristen und Kosten sind Richtwerte aus den Quellen und regional unterschiedlich – die exakte Gebühr erfahren Sie bei Ihrer zuständigen Zulassungsstelle umziehen.de.
~~~~~~

### Answer C

~~~~~~markdown
Frist
Nach einem Umzug muss die neue Halteradresse der Zulassungsstelle angezeigt werden. Die Rechtsgrundlage steht in § 13 der Fahrzeug-Zulassungsverordnung (FZV): Die Anzeige muss „unverzüglich" erfolgen – also ohne schuldhaftes Zögern. Ein fester Tageswert steht im Gesetz selbst nicht; oft wird in der Praxis etwa eine Frist von ein bis zwei Wochen genannt, das ist aber ungeprüft.
Reihenfolge in der Praxis: erst Anmeldung beim Einwohnermeldeamt (auch dort gilt eine kurze gesetzliche Frist, siehe Bundesmeldegesetz), dann zeitnah die Ummeldung beim Kfz-Zulassungsamt. Viele Ämter arbeiten mit Terminen – früh einen buchen.
Kosten
Die Gebühren richten sich nach der Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt) und den Landesgebührenverzeichnissen. Üblich sind niedrige zweistellige Beträge – häufig genannt werden insgesamt etwa 25–35 € (ungeprüft), hauptsächlich für die neuen Zulassungsbescheinigungen Teil I und II. Innerhalb Deutschlands kannst du dein Kennzeichen in der Regel behalten; nur wenn du ein neues wählst, kommen Schilder- und ggf. Reservierungskosten dazu.
Typisch mitzubringen: Personalausweis mit Meldebescheinigung, Zulassungsbescheinigung Teil I und II, SEPA-Lastschriftmandat für die Kfz-Steuer. Manche Bundesländer bieten die Adressänderung online an. Informiere zusätzlich deine Kfz-Versicherung.
Wo du es verbindlich prüfst
Fristen: gesetze-im-internet.de (FZV § 13, Bundesmeldegesetz)
Konkrete Gebühren und Ablauf: deine Zulassungsstelle (Landratsamt/Stadt)
Meine Angaben stammen aus Trainingsdaten ohne verlässliches Enddatum und können veraltet sein. Soll ich per Websuche die aktuelle Frist und die Gebühren deines Zulassungsbezirks heraussuchen?
~~~~~~

### Answer D

~~~~~~markdown
Nach einem Umzug musst du die neue Adresse für dein Fahrzeug der Zulassungsstelle melden. Die wichtigsten Punkte:
Frist
Die Anzeigepflicht steht in § 13 der Fahrzeug-Zulassungsverordnung (FZV): Änderungen der Halterdaten (u. a. die Anschrift) sind „unverzüglich" anzuzeigen – also ohne schuldhaftes Zögern. Als Orientierung wird oft „innerhalb einer Woche" genannt, das ist aber ein ungeprüfter Richtwert. Verbindlich ist, was deine Zulassungsstelle dazu sagt.
Wo und wie
Zuerst meldest du dich am neuen Wohnort beim Einwohnermeldeamt an (dafür gilt eine eigene gesetzliche Frist – bitte dort prüfen).
Zuständig fürs Fahrzeug ist die Zulassungsstelle deines neuen Landkreises bzw. deiner Stadt; oft braucht man einen Online-Termin.
Typische Unterlagen: Zulassungsbescheinigung Teil I (Fahrzeugschein) und Teil II (Fahrzeugbrief), Personalausweis mit neuer Adresse bzw. Meldebescheinigung, ggf. SEPA-Lastschriftmandat für die Kfz-Steuer, bei Vertretung eine Vollmacht.
Kosten
Es fällt eine Verwaltungsgebühr an, üblicherweise im niedrigen zweistelligen Euro-Bereich (oft werden ca. 10–20 € genannt – ungeprüft; dazu ggf. Kosten für die Neuausstellung der Papiere). Verbindlich sind nur die aktuellen Gebührensätze deiner Zulassungsstelle bzw. die landesrechtliche Gebührenordnung.
Kennzeichen
Das bisherige Kennzeichen kannst du in Deutschland beim Umzug in der Regel behalten; die Dokumente werden mit der neuen Adresse aktualisiert. Neue Schilder gibt es nur auf Wunsch (dann zusätzliche Kosten).
Nicht vergessen: Deine Kfz-Versicherung über die Adressänderung informieren (Meldepflicht aus dem Versicherungsvertrag).
Offizielle Quellen: Gesetzestext auf gesetze-im-internet.de (FZV), Fristen-Praxis und Gebühren auf der Website der Zulassungsstelle deines neuen Wohnorts.
Meine Angaben zu Fristen und Gebühren stammen aus Trainingsdaten ohne aktuelles Enddatum und können veraltet sein. Wenn du mir deinen neuen Wohnort (Stadt/Landkreis) nennst, mache ich gerne eine Websuche zur zuständigen Stelle und deren aktuellen Gebühren.
~~~~~~

## 2. G-02 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Ich bin Arbeitnehmerin, zur Abgabe einer Steuererklärung verpflichtet und habe keinen Steuerberater. Bis wann muss die Steuererklärung für 2025 beim Finanzamt sein?
~~~~~~

**Reference for the scorer:**

- Fact: 31. Juli 2026 (ohne Steuerberater); mit Steuerberater später

### Answer A

~~~~~~markdown
Kurz gesagt: Ich kann Ihnen hier keinen verbindlichen Termin nennen – die Fristen für die Abgabepflichtigen (ohne Steuerberater) wurden in den letzten Jahren mehrfach geändert, und mein Wissensstand hat kein aktuelles Datum. Ich möchte Ihnen daher keinen falschen Betrag oder Termin als Fakt nennen.
Was ich allgemein sagen kann:
Wenn man selbst abgibt (kein Steuerberater), gilt eine reguläre Frist im Folgejahr – traditionell war das der 31. Juli des Folgejahres. In den letzten Jahren gab es aber mehrere Fristverlängerungen, sodass der tatsächliche Termin für 2025 nicht sicher aus meinem Wissen stammt.
Mit Steuerberater oder Lohnsteuerhilfeverein verlängert sich die Frist automatisch (traditionell Ende Februar des übernächsten Jahres).
Eine Fristverlängerung auf Antrag ist beim Finanzamt möglich.
Wo Sie die verbindliche Antwort finden:
Die Frist steht in § 149 Abgabenordnung (AO): gesetze-im-internet.de
Am zuverlässigsten: Website Ihres Finanzamts oder des Bundesministeriums der Finanzen, oder einfach kurz beim Finanzamt anrufen.
Soll ich eine Websuche für Sie machen? Damit könnte ich die aktuell gültige Frist für die Steuererklärung 2025 (Abgabe 2026) prüfen und Ihnen den konkreten Termin nennen.
~~~~~~

### Answer B

~~~~~~markdown
Frist für die Steuererklärung 2025
Die Abgabefristen stehen in § 149 Abgabenordnung (AO) – verbindlich nachzulesen auf gesetze-im-internet.de oder direkt beim Finanzamt.
Grundregel für Pflichtfälle (ohne Steuerberater):
Wer zur Abgabe verpflichtet ist, hat grundsätzlich zwei Jahre nach Ende des Steuerjahres Zeit. Für das Steuerjahr 2025 wäre das – unverbindlich und ungeprüft – voraussichtlich Ende 2027 (31.12.2027).
Wer eine Steuerberaterin/einen Steuerberater oder einen Lohnsteuerhilfeverein beauftragt, bekommt länger (grundsätzlich bis zum Ende des dritten Jahres nach dem Steuerjahr).
Da du keinen Berater hast, gilt für dich die kürzere Frist.
Gut zu wissen:
Bei Verspätung kann das Finanzamt einen Verspätungszuschlag festsetzen.
Die Frist kann auf Antrag verlängert werden – am besten vor Ablauf schriftlich oder telefonisch beim Finanzamt beantragen.
Bei elektronischer Abgabe über ELSTER bist du meist ohnehin deutlich vor der Frist fertig.
Da sich Fristen und Regeln ändern können und ich keine tagesaktuelle Quelle prüfen kann, empfehle ich dir, das Datum zu verifizieren. Soll ich eine Websuche nach der aktuellen Frist für dich durchführen?
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Ohne aktuelle amtliche Quelle kann ich dir die Frist nicht verbindlich nennen – aber die Grundregel ist klar:
Allgemeine Regel (§ 149 AO):
Ohne Steuerberater/Lohnsteuerhilfeverein: Die Erklärung für ein Kalenderjahr ist grundsätzlich bis zum 31. Juli des Folgejahres abzugeben – für das Steuerjahr 2025 also in der Regel im Juli 2026 (unkontrolliert, bitte prüfen). Fällt der Stichtag auf ein Wochenende oder einen Feiertag, verschiebt er sich auf den nächsten Werktag (§ 108 AO).
Mit Steuerberater oder Lohnsteuerhilfeverein: Die Frist verlängert sich auf Ende Februar des übernächsten Jahres – betrifft dich nicht, da du ohne Berater abgibst.
Wichtig zu wissen:
Fristverlängerung: Auf Antrag beim Finanzamt wird häufig großzügig gewährt. Einfach formlos (z. B. telefonisch oder über ELSTER) beantragen, bevor die Frist abläuft.
Bei Verspätung: Das Finanzamt kann einen Verspätungszuschlag festsetzen (§ 152 AO); Höhe und Folgen hängen von der festgesetzten Steuer und der Dauer der Verspätung ab.
Abgabe: Elektronisch über ELSTER (elster.de) ist Standard; dort wird dir die Frist auch direkt angezeigt.
Verbindlich prüfen kannst du das hier:
§ 149, § 108 und § 152 AO auf gesetze-im-internet.de
Direkt bei deinem Finanzamt
Im ELSTER-Portal
Meine Angaben stammen aus Trainingsdaten ohne bekanntes Enddatum und können veraltet sein. Möchtest du, dass ich eine Websuche mache, um die aktuelle Frist für die Erklärung 2025 zu bestätigen?
~~~~~~

### Answer D

~~~~~~markdown
Als pflichtveranlagte Arbeitnehmerin ohne steuerliche Beratung müssen Sie die Steuererklärung für 2025 bis zum 31. Juli 2026 beim Finanzamt einreichen finanzamt.nrw.de.
Das bestätigen auch mehrere andere Quellen für den Fall ohne Beratung smartsteuer.de vlh.de.
Zur Einordnung:
Mit Steuerberater/Lohnsteuerhilfeverein: Frist verlängert sich auf den 1. März 2027 finanzamt.nrw.de vr.de. (Eine Quelle nennt den 2. März 2027 volksbank-kassel-goettingen.de – der offizielle NRW-Finanzamt-Text und die Volksbanken-Raiffeisenbanken nennen den 1. März 2027.)
Freiwillige Abgabe (ohne Pflicht): möglich bis zum 31. Dezember 2029, also vier Jahre vr.de.
Hinweis: Das Finanzamt fordert nicht automatisch zur fristgerechten Abgabe auf – Sie müssen selbst auf die Frist achten finanzamt.nrw.de. Bei Fristverlängerungsbedarf können Sie beim Finanzamt eine Fristverlängerung beantragen; dazu sagt das abgerufene Material nichts Weiteres.
~~~~~~

## 3. G-03 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie hoch ist der Rundfunkbeitrag im Moment pro Monat?
~~~~~~

**Reference for the scorer:**

- Fact: amount as listed on rundfunkbeitrag.de on the run day
- Element: if not certain: says so and points to rundfunkbeitrag.de

### Answer A

~~~~~~markdown
Ich bin mir beim aktuellen Betrag nicht sicher, da mein Wissen aus Trainingsdaten mit unbekanntem Stichtag stammt und sich Beiträge ändern können.
Was ich allgemein sagen kann: Der Rundfunkbeitrag ist ein fester Monatsbeitrag pro Wohnung, unabhängig von der Anzahl der Geräte und Personen (Ehepartner werden mit abgedeckt). Es gibt Ermäßigungen und Befreiungen, z. B. für Empfänger von Bürgergeld oder BAföG.
Den verbindlichen aktuellen Betrag finden Sie auf der offiziellen Seite des Beitragsdienstes: www.rundfunkbeitrag.de (http://www.rundfunkbeitrag.de). Dort steht auch, wie und wann der Beitrag gezahlt wird.
Möchte ich per Websuche den aktuellen Betrag für Sie nachschlagen?
~~~~~~

### Answer B

~~~~~~markdown
Aktuell beträgt der Rundfunkbeitrag 18,36 Euro pro Monat pro Wohnung – das ist der offiziell geregelt Betrag laut Beitragsservice rundfunkbeitrag.de.
Zur Einordnung:
Dreimonatszeitraum: 55,08 Euro
Halbjährlich: 110,16 Euro
Jährlich im Voraus: 220,32 Euro rundfunkbeitrag.de
Hinweis zu einer möglichen Erhöhung: Ein Quelle (Verbraucherzentrale-Blog) berichtet von einer Erhöhung auf 18,94 € monatlich verbraucherzentrale.alleaktien.com, während die offizielle Seite des Beitragsservice und andere Quellen weiterhin 18,36 € nennen rundfunkbeitrag.definanztip.de. Es handelt sich bei der Erhöhungsmeldung um einen Suchauszug ohne Datum der tatsächlichen Änderung – ich kann hier nicht mit Sicherheit sagen, ob und wann eine Erhöhung in Kraft getreten ist. Für den verbindlichen aktuellen Betrag empfehle ich einen Blick auf rundfunkbeitrag.de.
Wichtig: Der Beitrag gilt pro Wohnung, unabhängig davon, wie viele Personen dort wohnen oder ob ein Radio/TV vorhanden ist. Er ist gesetzlich geregelt und muss auch ohne Zahlungsaufforderung gezahlt werden rundfunkbeitrag.de.
~~~~~~

### Answer C

~~~~~~markdown
Der Rundfunkbeitrag wird im Rundfunkbeitragsstaatsvertrag (RBStV) festgelegt und ändert sich gelegentlich – zuletzt wurde er zum 1. April 2024 angehoben. Nach meinem Trainingsstand (der kein verlässliches Enddatum hat) lag er danach bei 18,36 € pro Monat – dieser Betrag ist aber ungeprüft und kann inzwischen anders sein.
Was Sie wissen sollten:
Der Beitrag wird pro Wohnung erhoben, unabhängig von der Anzahl der Bewohner, Geräte oder Einkommen.
Betriebsstätten und Kraftfahrzeuge zahlen nach eigenen Regelungen (gestaffelt).
Wo Sie den verbindlichen aktuellen Betrag finden:
Den Wortlaut des Staatsvertrags auf gesetze-im-internet.de (Rundfunkbeitragsstaatsvertrag)
Den ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de) bzw. Ihre zuständige Landesrundfunkanstalt
Soll ich für Sie eine Websuche durchführen, um den aktuell gültigen Betrag zu bestätigen?
~~~~~~

### Answer D

~~~~~~markdown
Eine verbindliche Zahl kann ich hier nicht als gesichert nennen, da sich der Beitrag ändern kann und mir in dieser Unterhaltung keine offizielle Quelle vorliegt.
Die allgemeine Regel:
Der Rundfunkbeitrag ist eine Pauschale pro Wohnung/Haushalt – unabhängig davon, wie viele Geräte oder Bewohner es gibt (§ 8 Rundfunkbeitragsstaatsvertrag, RBStV).
Änderungen des Betrags erfolgen auf Empfehlung der Kommission zur Ermittlung des Finanzbedarfs (KEF) und müssen von den Ländern beschlossen werden.
Ungeprüfte Zahlen aus meinem Trainingswissen (kann veraltet sein):
Zuletzt betrug der Beitrag 17,50 € pro Monat je Wohnung.
Die KEF hat eine Erhöhung auf rund 18,94 € ab 2027 empfohlen – auch das ist unbestätigt.
Wo Sie es verbindlich prüfen können:
Der Beitragsservice von ARD, ZDF und Deutschlandradio: rundfunkbeitrag.de
Der Gesetzestext (§ 8 RBStV) auf gesetze-im-internet.de
Soll ich das aktuell für Sie im Netz nachschlagen?
~~~~~~

## 4. G-04 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Welche Kündigungsfrist habe ich als Mieter bei einem normalen unbefristeten Mietvertrag?
~~~~~~

**Reference for the scorer:**

- Fact: drei Monate (§ 573c BGB), Kündigung spätestens am dritten Werktag eines Monats zum Ablauf des übernächsten Monats
- Fact: schriftlich

### Answer A

~~~~~~markdown
Kurz: Als Mieter gilt bei einem unbefristeten Mietvertrag in der Regel eine Kündigungsfrist von drei Monaten zum Ende eines Kalendermonats – unabhängig davon, wie lange du schon in der Wohnung wohnst (§ 573c BGB). Längere Fristen gelten nur für den Vermieter; sie steigen dort mit der Mietdauer. Diese Angabe ist ungeprüft – bitte verlass dich nicht allein darauf.
Worauf du achten solltest:
Mietvertrag prüfen: Es können abweichende Vereinbarungen gelten, z. B. ein bestimmter Kündigungstermin (etwa der 15. eines Monats). Zum Nachteil des Mieters darf die Frist aber nicht verlängert werden.
Form: Die Kündigung muss in der Regel schriftlich im gesetzlichen Sinne erfolgen – E-Mail oder WhatsApp genügen meist nicht.
Zugang zählt: Die Frist beginnt mit dem Zugang der Kündigung beim Vermieter, nicht mit dem Datum auf dem Brief.
Offizielle Quelle zum Nachlesen: § 573c BGB auf gesetze-im-internet.de (dort auch die Regeln für den Vermieter und mögliche Ausnahmen). Bei konkretem Streit hilft ein Mieterverein oder eine Mietrechtsberatung.
Soll ich das für dich im Web suchen und die aktuelle Fassung des § 573c BGB prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Als Mieterin/Mieter bei einem unbefristeten Mietvertrag gilt die gesetzliche Kündigungsfrist von drei Monaten – unabhängig davon, wie lange du schon in der Wohnung wohnst immobilienscout24.demein-nebenkostenrechner.deallianz.de.
Wichtig zur Fristberechnung: Dein Kündigungsschreiben muss spätestens am dritten Werktag eines Kalendermonats beim Vermieter eingehen, damit dieser Monat noch mitzählt (§ 573c Abs. 1 BGB). Werktage sind Montag bis Samstag immobilienscout24.de.
Beispiel: Du willst zum 30. Juni ausziehen → Kündigung muss spätestens am dritten Werktag im April beim Vermieter sein. Verpasst du das, verschiebt sich das Mietende um einen Monat immobilienscout24.de.
Ausnahmen, bei denen die 3 Monate nicht gelten:
Im Mietvertrag steht eine kürzere Frist zugunsten des Mieters (z. B. 1 Monat) – diese Klausel ist wirksam immobilienscout24.de
Befristeter (Zeit-)Mietvertrag: vorzeitige ordentliche Kündigung ist nicht möglich immobilienscout24.de
Kündigungsverzicht für eine vereinbarte Zeit (üblich bis vier Jahre) immobilienscout24.de
Tipp zur Zustellung: Sende die Kündigung per Einwurf-Einschreiben oder persönlich mit Zeugen, um den Zugang nachweisen zu können immobilienscout24.de.
Hinweis: Die Quellen liegen mir nur als Auszüge vor; bei einem konkreten Vertrag lohnt ein Blick in die vereinbarten Klauseln oder eine Mietrechtsberatung.
~~~~~~

### Answer C

~~~~~~markdown
Bei einem normalen unbefristeten Mietvertrag gilt für Mieter in der Regel eine Kündigungsfrist von drei Monaten, jeweils zum Ende eines Kalendermonats. Das bedeutet: Kündigst du z. B. bis zum 2. Oktober, kann das Mietverhältnis zum 31. Dezember enden.
Ein paar Hinweise:
Diese Frist gilt für Mieter unabhängig von der Mietdauer – die längeren Staffelfristen (die es beim Vermieter geben kann) betreffen nur die Vermieterseite.
Die Frist muss schriftlich eingehalten werden; die Kündigung sollte du sicher nachweisen können (z. B. per Einwurf-Einschreiben oder persönliche Übergabe mit Empfangsbestätigung).
Im Mietvertrag können Abweichungen stehen, und in Sonderfällen (z. B. befristeter Vertrag, gewerbliche Miete, möblierte Wohnung mit anderen Regelungen) kann anderes gelten.
Wichtig: Ich bin mir bei den genauen rechtlichen Details und aktuellen Regelungen nicht sicher. Die verbindliche Grundlage ist § 573c BGB, den du auf gesetze-im-internet.de nachlesen kannst, oder wende dich an den Mieterverein / eine Rechtsberatung. Gerne kann ich auch eine Websuche anbieten, um die aktuelle Rechtslage zu prüfen.
~~~~~~

### Answer D

~~~~~~markdown
Als Mieter kannst du ein unbefristetes Wohnraummietverhältnis jederzeit und ohne Angabe von Gründen kündigen. Anders als beim Vermieter verlängert sich deine Frist nicht mit der Dauer des Mietverhältnisses – sie ist gesetzlich fest.
Die gesetzliche Regel (hier ungeprüft wiedergegeben): Die Kündigung muss dem Vermieter spätestens am dritten Werktag eines Kalendermonats zugehen und wirkt dann zum Ende des übernächsten Monats – praktisch meist als „drei Monate zum Monatsende" zusammengefasst. Beispiel: Zugang Anfang März → Ende des Mietverhältnisses am 31. Mai. Bitte verifiziere die genauen Fristen im Gesetzestext.
Worauf es außerdem ankommt:
Schriftform: Die Kündigung muss im Sinne des BGB schriftlich und unterschrieben per Brief zugehen – E-Mail, WhatsApp oder Fax genügen nicht.
Zugang zählt, nicht Absendedatum: Entscheidend ist, wann der Vermieter die Kündigung erhält.
Vertrag prüfen: Im Vertrag können für dich kürzere Fristen vereinbart sein; ob längere Fristen zu deinen Lasten wirksam sind, hängt vom Einzelfall ab (Stichwort AGB-Kontrolle).
„Werktag" ist nicht „Montag–Freitag": Im BGB-Zusammenhang können Samstage mitzählen – das genaue Stichtagsdatum im Einzelfall lieber prüfen oder nachrechnen lassen.
Offizielle Quelle: Die Fristen stehen in § 573c BGB, die Schriftform in § 568 BGB – beide auf gesetze-im-internet.de. Verbindliche Auskunft geben außerdem Mietervereine (z. B. Deutscher Mieterbund) oder ein Anwalt für Mietrecht.
Soll ich eine Websuche machen, um die aktuelle Fristregelung gegen den geltenden Gesetzestext abzugleichen?
~~~~~~

## 5. G-05 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie viele Tage gesetzlichen Mindesturlaub habe ich bei einer Fünf-Tage-Woche?
~~~~~~

**Reference for the scorer:**

- Fact: 20 Arbeitstage (24 Werktage bei Sechs-Tage-Woche, BUrlG)

### Answer A

~~~~~~markdown
Bei einer Fünf-Tage-Woche beträgt der gesetzliche Mindesturlaub in der Regel 20 Werktage (also vier Wochen) pro Jahr, basierend auf dem Bundesurlaubsgesetz (§ 3 BUrlG).
Zur Einordnung:
Das Gesetz spricht von "Werktagen" – das sind grundsätzlich alle Tage außer Sonntagen (und je nach Auslegung auch Feiertagen).
Bei einer Sechs-Tage-Woche wären es daher 24 Werktage, bei einer Fünf-Tage-Woche entsprechend 20 Arbeitstage.
Wichtig zu wissen:
Tarifverträge oder Arbeitsverträge sehen oft mehr Urlaub vor – das ist erlaubt, weniger dagegen grundsätzlich nicht.
Bei Teilzeit oder unregelmäßigen Arbeitszeiten wird die Berechnung komplizierter.
Da ich keine aktuellen Gesetzesstände prüfen kann, empfehle ich, den genauen Wortlaut unter gesetze-im-internet.de (Bundesurlaubsgesetz) nachzulesen oder sich an einen Betriebsrat bzw. die zuständige Stelle zu wenden. Gerne kann ich auch eine Websuche anbieten, um die aktuellen Regelungen zu bestätigen.
~~~~~~

### Answer B

~~~~~~markdown
Der gesetzliche Mindesturlaub richtet sich in Deutschland nach dem Bundesurlaubsgesetz (BUrlG). Dessen Besonderheit: Der Anspruch wird in Werktagen (Montag bis Samstag) angegeben, das Gesetz geht also von einer 6-Tage-Woche aus. Arbeiten Sie weniger Tage pro Woche, wird der Anspruch anteilig umgerechnet.
Die häufig zitierte Rechnung – bitte als ungeprüft betrachten:
24 Werktage Mindesturlaub bei einer 6-Tage-Woche,
daraus umgerechnet 20 Werktage bei einer 5-Tage-Woche.
Worauf es außerdem ankommt:
Das Gesetz nennt nur die untere Grenze – Tarifvertrag oder Arbeitsvertrag sehen oft deutlich mehr Urlaub vor.
Der volle Anspruch entsteht erst nach der gesetzlichen Wartezeit; Details hängen vom Einzelfall ab.
Für bestimmte Gruppen (z. B. Jugendliche, Schwerbehinderte) gelten teils eigene Regeln.
Verbindlich nachprüfen können Sie das im Bundesurlaubsgesetz, insbesondere § 3, auf gesetze-im-internet.de – und für Ihren konkreten Anspruch in Ihrem Arbeitsvertrag bzw. einschlägigen Tarifvertrag.
Soll ich eine Websuche durchführen, um die aktuelle Fassung und die genaue Zahl zu prüfen?
~~~~~~

### Answer C

~~~~~~markdown
Der gesetzliche Mindesturlaub richtet sich in Deutschland nach dem Bundesurlaubsgesetz (BUrlG). Die Regel dort ist auf Arbeits­tage bezogen und skaliert mit der Anzahl der Arbeitstage pro Woche – d. h. bei einer Fünf-Tage-Woche ergibt sich der Anspruch anteilig aus der gesetzlichen Vorgabe (die ursprünglich auf eine Sechs-Tage-Woche ausgelegt ist). Häufig wird für eine Fünf-Tage-Woche ein Wert von 20 Arbeitstagen genannt – dieser Wert ist hier aber ungeprüft, und ich kann ihn nicht als gesichert bestätigen.
Wichtig zu wissen:
Der gesetzliche Anspruch ist nur eine Untergrenze. Arbeitsvertrag, Tarifvertrag oder Betriebsvereinbarung sehen oft mehr Urlaub vor – dann gilt die günstigere Regelung.
Der volle Anspruch besteht grundsätzlich erst nach Ablauf der Wartezeit (in der Regel nach sechs Monaten Beschäftigung).
Bei Teilzeit berechnet sich der Urlaub ebenfalls anteilig nach den Arbeitstagen pro Woche.
Wo Sie das verbindlich nachlesen können: Das Bundesurlaubsgesetz im Volltext auf gesetze-im-internet.de (insbes. § 1 und § 3 BUrlG). Bei Fragen zu Ihrem konkreten Fall ist auch die zuständige Stelle (z. B. Gewerbeaufsichtsamt bzw. das zuständige Landesministerium für Arbeit) oder der Betriebsrat eine Anlaufstelle.
Möchten Sie, dass ich das aktuelle Gesetz online nachschlage, um Ihnen die genaue Zahl zu bestätigen?
~~~~~~

### Answer D

~~~~~~markdown
Bei einer Fünf-Tage-Woche haben Sie gesetzlich mindestens 20 Urlaubstage pro Kalenderjahr juraforum.de.
Hintergrund: Das Bundesurlaubsgesetz (§ 3 Abs. 1 BUrlG) garantiert 24 Werktage, ausgehend von einer Sechs-Tage-Woche. Bei fünf Arbeitstagen pro Woche wird das rechnerisch umgestellt: 24 × 5/6 = 20 Tage. Das entspricht vier vollen Urlaubswochen – Wochenenden und arbeitsfreie Feiertage zählen nicht als Urlaubstage juraforum.de.
Wichtig zu wissen:
Teilzeit: Entscheidend ist die Zahl der Arbeitstage pro Woche, nicht die tägliche Stundenzahl. Wer z. B. fünf Tage à vier Stunden arbeitet, hat ebenfalls Anspruch auf 20 Urlaubstage juraforum.de.
Mehrurlaub: Tarif- oder Arbeitsvertrag können mehr Urlaub gewähren, aber den gesetzlichen Mindesturlaub nicht unterschreiten juraforum.de.
Fristen: Der volle Anspruch entsteht nach sechs Monaten Betriebszugehörigkeit; Urlaub ist grundsätzlich bis zum 31. Dezember des Jahres zu nehmen (§ 7 Abs. 3 BUrlG) juraforum.de.
~~~~~~

## 6. G-06 (level 2: German rules, fees and deadlines)

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
Personalausweis verloren – die wichtigsten Schritte
1. Online-Ausweisfunktion (eID) sofort sperren
Rund um die Uhr über den Sperrnotruf 116 116 amtsdeutschland.de.
2. Verlust melden
Melden Sie den Verlust umgehend beim Bürgeramt Ihres Wohnorts und lassen Sie das Dokument als verloren registrieren buergerservice.info. Die Verlustanzeige selbst ist grundsätzlich kostenfrei allrecht.de.
3. Neuen Ausweis beantragen
Sie müssen einen neuen Personalausweis beantragen, wenn Sie über 16 Jahre alt sind, kein anderes gültiges Passdokument besitzen und in Deutschland gemeldet sind verwaltung.bund.de. Einen offiziellen Online-Antrag gibt es über das Bundesportal, wobei die Details von Ihrer Region abhängen verwaltung.bund.de.
Kosten
Für die Ausstellung eines neuen Ausweisdokuments fallen Gebühren an allrecht.de. Die genaue Höhe steht in den Suchergebnissen leider nicht – die aktuellen Gebühren (derzeit ca. 37 € regulär, abweichend bei Verlust vor Ablauf der Gültigkeit) finden Sie verlässlich beim Bundesministerium des Innern oder direkt bei Ihrem Bürgeramt. Ich bin mir bei den genauen Beträgen nicht sicher und möchte keine veralteten Zahlen nennen.
Hinweis: Falls der Ausweis im Ausland verloren ging, wenden Sie sich an die nächste deutsche Auslandsvertretung allrecht.de.
~~~~~~

### Answer B

~~~~~~markdown
Verlorener Personalausweis – die wichtigsten Schritte:
Verlust melden: Wenn du einen Missbrauch befürchtest, kannst du den Ausweis sperren lassen. Dafür gibt es die Sperrhotline 116 116 (aus dem Ausland: +49 116 116 oder +49 30 40 50 40 50). Eine Anzeige bei der Polizei ist sinnvoll, vor allem wenn der Ausweis gestohlen wurde.
Neuen Ausweis beantragen: Das musst du persönlich bei der Bürgerbehörde / Einwohnermeldeamt deiner Wohnsitzgemeinde tun. Nimm mit:
ein aktuelles biometrisches Passfoto
einen amtlichen Identitätsnachweis (sofern vorhanden, z. B. Reisepass oder Geburtsurkunde – frag vorher nach, was akzeptiert wird)
ggf. die Verlustanzeige der Polizei
Frist: Der Verlust muss der Ausweisbehörde grundsätzlich angezeigt werden – melde dich also zeitnah beim Amt.
Kosten: Ich kann dir hier keinen verlässlichen Betrag nennen, da ich mir bei den aktuellen Gebühren nicht sicher bin und die Kosten auch von der Bearbeitungsdauer (regulär vs. Wunschkennzeichen/Express) und deinem Alter abhängen können. Die verbindlichen Gebühren stehen in der Personalausweisgebührenverordnung auf gesetze-im-internet.de (https://www.gesetze-im-internet.de), oder du fragst direkt bei deiner Bürgerbehörde nach.
Tipp: Viele Städte bieten Online-Terminbuchung für die Ausweisbehörde – die Wartezeiten ohne Termin können sonst lang sein.
~~~~~~

### Answer C

~~~~~~markdown
Response ended incomplete. This attempt is not a completed answer and is excluded from future context.
Sofortmaßnahmen
Verlust der Ausweisbehörde melden – also deinem Bürgeramt/Einwohnermeldeamt am Wohnort. Dort wird der Ausweis für ungültig (gesperrt) erklärt, damit er nicht missbraucht werden kann. Bei Diebstahl zusätzlich: Anzeige bei der Polizei erstatten.
Im Ausland verloren? Dann sind die örtliche Polizei und die deutsche Botschaft bzw. ein Konsulat die richtigen Anlaufstellen.
Online-Ausweisfunktion (eID): Falls du die eID-Funktion genutzt hast, lass auch diese sperren – über die Ausweisbehörde oder die zentrale Sperrhotline des Bundes (aktuelle Nummer über die Behörde bzw. das offizielle Personalausweis-Portal).
Neuen Ausweis beantragen
Termin beim Bürgeramt/Einwohnermeldeamt buchen; du musst persönlich erscheinen und den Ausweis später auch persönlich abholen.
Mitbringen: ein aktuelles biometrisches Lichtbild; je nach Beh
~~~~~~

### Answer D

~~~~~~markdown
Schade – hier die wichtigsten Schritte:
Was zu tun ist
Verlust unverzüglich anzeigen – bei der Personalausweisbehörde (meist Bürgeramt/Bürgerbüro am Hauptwohnsitz; die reine Verlustanzeige nehmen häufig auch andere Personalausweisbehörden an). Bei Diebstahl zusätzlich Anzeige bei der Polizei erstatten – empfehlenswert, für den Ersatz aber nicht zwingend.
Online-Ausweisfunktion (eID) sperren lassen, falls du sie aktiviert hattest – über die zentrale Sperrhotline bzw. die AusweisApp. Die Nummer nennt dir die Behörde oder steht auf der offiziellen AusweisApp-Seite des Bundes.
Neuen Personalausweis beantragen – persönlich, mit aktuellem biometrischem Foto. Da der alte Ausweis fehlt, verlangt die Behörde oft weitere Nachweise (z. B. Reisepass, Führerschein, Geburtsurkunde) – nimm mit, was du hast.
Wenn du kurzfristig etwas brauchst: vorläufigen Personalausweis (gilt nur in bestimmten Ländern) oder einen Reisepass mitbeantragen. Die Ausstellung des regulären Ausweises dauert je nach Behörde oft einige Wochen.
Im Ausland verloren: deutsche Botschaft/Konsulat kontaktieren.
Kosten
Die Gebühr richtet sich nach der Personalausweisverordnung (PAuswV). Eine ungeprüfte Größenordnung aus meinem Trainingswissen: ca. 20–40 €, abhängig u. a. vom Alter (unter/über 24) – den verbindlichen Betrag findest du in der PAuswV auf gesetze-im-internet.de oder direkt bei deinem Bürgeramt. Soll ich die aktuelle Gebühr per Websuche nachschlagen?
Danach
Wird der alte Ausweis wiedergefunden: bei der Behörde abgeben – er bleibt gesperrt/ungültig.
Behalte Post, Konten und Schreiben im Blick (Risiko Identitätsmissbrauch); bei Auffälligkeiten Behörde oder Polizei informieren.
~~~~~~

## 7. P-G1 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie lange muss ich als Privatperson Kontoauszüge und Rechnungen aufbewahren?
~~~~~~

**Reference for the scorer:**

- Fact: Privatpersonen haben grundsätzlich keine allgemeine Aufbewahrungspflicht
- Fact: Ausnahme: Rechnungen über Handwerker- oder Bauleistungen am Grundstück 2 Jahre (§ 14b UStG)
- Fact: Empfehlung, Unterlagen für Steuer und Gewährleistung länger zu behalten, ist keine Pflicht

### Answer A

~~~~~~markdown
Das kann ich nicht mit verlässlichen Zahlen beantworten, da ich mir bei den genauen Fristen und rechtlichen Details nicht sicher bin und sich Regelungen ändern können. Hier der allgemeine Rahmen:
Grober Überblick (unverbindlich):
Privatpersonen sind gesetzlich nicht verpflichtet, Kontoauszüge oder Belege aufzubewahren – anders als Unternehmen. Die Aufbewahrung dient nur der eigenen Absicherung.
Empfehlung aus der Praxis: Für Dinge, die steuerlich relevant sein könnten (z. B. Nachweise für Werbungskosten, Handwerkerrechnungen, Spendenbelege), werden oft 2–10 Jahre genannt, je nach Zusammenhang – das sind aber unverbindliche Faustwerte, keine gesetzlichen Pflichten.
Kontoauszüge: Viele halten sie aus Sicherheitsgründen (Nachweis von Abbuchungen, Zahlungen, Gewährleistung) einige Jahre auf, oft mindestens bis zum Ablauf von Verjährungsfristen der zugrunde liegenden Vorgänge.
Wovon es abhängt:
Ob ein Beleg steuerlich relevant ist (dann orientiert man sich meist an den Fristen der Festsetzungsfristen der Steuer)
Ob es um Gewährleistungs-, Schadens- oder Beweisfragen geht
Ob du Einkünfte aus selbstständiger Arbeit oder Vermietung hast (dann gelten strengere Maßstäbe)
Verlässlich prüfen:
Die einschlägigen Regelungen findest du auf gesetze-im-internet.de (z. B. AO für steuerliche Aufbewahrungspflichten – die betreffen aber primär Unternehmer)
Beim Finanzamt oder einem Steuerberater für deinen konkreten Fall
Soll ich im Web nach aktuellen, konkreten Fristen suchen?
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt: Für Privatpersonen gibt es grundsätzlich keine gesetzliche Aufbewahrungspflicht für Kontoauszüge und Rechnungen. Feste Fristen gelten vor allem für Gewerbetreibende und Selbstständige (geregelt u. a. in HGB und Abgabenordnung).
Warum Aufbewahren trotzdem sinnvoll ist:
Gewährleistung/Garantie: Rechnungen dienen als Kauf- und Datumsnachweis. Die gesetzliche Gewährleistungsfrist steht im BGB (häufig genannt: 2 Jahre bei Neuwaren, kürzer möglich bei Gebrauchtwaren – ungeprüft, bitte im Einzelfall nachsehen). Belege mindestens so lange aufheben.
Steuern: Wer haushaltsnahe Dienstleistungen oder Handwerkerrechnungen steuerlich geltend macht, sollte Rechnung plus Zahlungsnachweis (Kontoauszug) aufbewahren, solange das Finanzamt prüfen könnte. Häufig genannte Zeiträume sind 4–10 Jahre je nach Sachlage – das ist aber ungeprüft; maßgeblich sind die Festsetzungs- und Aufbewahrungsregeln der AO.
Sonstiges: Versicherungsfälle, Rückgaben, Mietkaution, Erbschafts- oder Nachlassfragen.
Wo Sie es verbindlich nachprüfen können:
Gesetze im Original: gesetze-im-internet.de (BGB für Gewährleistung, AO für Steuerfragen)
Für den Einzelfall: Ihr Finanzamt, eine Steuerberatung oder die Verbraucherzentrale
Praxis-Tipp: Steuerrelevante Belege und Belege für wertvolle Anschaffungen am besten bis zum Ende der möglichen steuerlichen Prüfung aufheben, Alltagsbelege nach kurzer Zeit vernichten. Scans/Photos der Belege erleichtern das Auffinden erheblich.
Mein Kenntnisstand stammt aus Trainingsdaten und kann veraltet sein. Soll ich eine aktuelle Websuche zu den konkreten Fristen durchführen?
~~~~~~

### Answer C

~~~~~~markdown
Aufbewahrungsfristen für Privatpersonen
Kontoauszüge
Für Privatpersonen gibt es keine gesetzliche Aufbewahrungspflicht für Kontoauszüge – theoretisch könnten sie sofort weg sparkasse.de. Empfohlen wird trotzdem, sie mindestens 3 Jahre aufzubewahren, um Zahlungen (Miete, Versicherungen, Bestellungen etc.) im Streitfall nachweisen zu können sparkasse.de. Die 3 Jahre orientieren sich an der regelmäßigen Verjährungsfrist finom.co.
Ausnahmen:
Positive Einkünfte über 500.000 €/Jahr (z. B. aus Arbeit, Kapitalvermögen, Vermietung): Kontoauszüge 6 Jahre aufbewahren sparkasse.de
Haushaltsnahe Dienstleistungen (Gärtner, Reinigungskraft etc.), die Sie steuerlich absetzen: aufbewahren, bis der Steuerbescheid da ist und die Einspruchsfrist abgelaufen ist sparkasse.de
Rechnungen
Handwerker- und Dienstleistungsrechnungen zu einem Grundstück/Haus/Wohnung: gesetzlich mindestens 2 Jahre (§ 14b UStG) sparkasse.de ordnungsgenie.de
Sonstige Rechnungen: auch hier empfiehlt sich die Orientierung an der 3-jährigen Verjährungsfrist vr.de finom.co
Praktischer Hinweis
Die Frist beginnt grundsätzlich mit Ende des Kalenderjahres, in dem das Dokument ausgestellt wurde – sie läuft also erst am 31. Dezember des Jahres ab, in dem die Pflicht endet vr.de.
Digitale Kontoauszüge im Online-Postfach Ihrer Bank können dort oft unbefristet abgerufen werden; ältere Auszüge (bis zu 10 Jahre) können Sie bei der Bank nachbestellen, meist gegen Gebühr sparkasse.de.
Für Selbstständige gilt übrigens etwas anderes: Auszüge von Geschäftskonten müssen 10 Jahre aufbewahrt werden sparkasse.de.
~~~~~~

### Answer D

~~~~~~markdown
Kurz gesagt: Als Privatperson gibt es – anders als für Gewerbetreibende – keine allgemeine gesetzliche Aufbewahrungspflicht für Kontoauszüge und Rechnungen. Die Fristen, die man überall liest, sind praktische Empfehlungen, damit Sie im Streit- oder Steuerfall Beweise haben.
Wovon die sinnvolle Dauer abhängt:
Verjährung: Ansprüche (z. B. Rückzahlung, Gewährleistung) verjähren nach den Regelungen im BGB (§§ 195 ff.). Häufig genannt wird eine regelmäßige Verjährungsfrist von 3 Jahren, beginnend mit dem Jahresende – das ist aber unverifiziert, bitte im BGB nachlesen.
Gewährleistung/Kaufbelege: Rechnungen für larger Anschaffungen lohnt sich aufzubewahren, solange Gewährleistungsansprüche möglich sind; bei Immobilien/Bauwerken gelten deutlich längere Fristen (BGB §§ 438, 634a – unverifiziert).
Steuern: Rechnungen, die steuerlich relevant sind (z. B. Handwerkerleistungen, Spendenbescheinigungen, Nachweise fürs Finanzamt), bis zum Ablauf der Festsetzungsverjährung nach AO § 169 aufbewahren. Häufig genannt werden 4 Jahre, in Sonderfällen mehr – unverifiziert.
Kapitalanlagen/Depotunterlagen: Hier empfiehlt sich oft dauerhafte Aufbewahrung, weil alte Kaufbelege noch Jahrzehnte später für die Steuer relevant sein können.
Mietkaution, Versicherung, Grundstückskaufverträge: möglichst lange oder dauerhaft aufbewahren.
Praxistipp: Scans/PDFs reichen für private Zwecke meist als Nachweis aus; Beweiskraft vor Gericht kann das Original aber stärken. Wichtige Originalpapiere (Grundstücksverträge, Testamente) immer in Papierform behalten.
Offizielle Quellen zum Nachprüfen:
BGB, HGB, AO auf gesetze-im-internet.de
Ihr Finanzamt bzw. die Verbraucherzentrale für praktische Aufbewahrungsfristen
Soll ich eine Web-Suche nach den aktuellen, konkreten Fristen durchführen?
~~~~~~

## 8. P-G2 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Wie lange gilt die gesetzliche Gewährleistung, wenn ich im Laden einen neuen Fernseher kaufe?
~~~~~~

**Reference for the scorer:**

- Fact: 2 Jahre gesetzliche Gewährleistung beim Verbrauchsgüterkauf
- Fact: Beweislastumkehr in den ersten 12 Monaten (seit 2022)
- Fact: Garantie ist freiwillig und etwas anderes

### Answer A

~~~~~~markdown
Bei einem Neukauf im Ladengeschäft gilt die gesetzliche Gewährleistung (Mängelhaftung) in der Regel 2 Jahre ab Übergabe des Fernsehers.
Die wichtigsten Punkte dazu:
Beweislastumkehr: Tritt der Mangel innerhalb der ersten 12 Monate auf, wird vermutet, dass er bereits bei Übergabe vorhanden war. Der Verkäufer muss dann beweisen, dass der Fernseher mängelfrei geliefert wurde. Nach 12 Monaten kehrt sich das um – dann müssen Sie als Käufer nachweisen, dass der Mangel schon bei Übergabe bestand.
Nacherfüllung zuerst: Zuerst haben Sie Anspruch auf Reparatur oder Ersatzlieferung. Erst wenn die Nacherfüllung fehlschlägt (z. B. zweimal erfolglos), können Sie vom Kauf zurücktreten, den Kaufpreis mindern oder (bei leichten Mängeln meist nur) Schadensersatz verlangen.
Verjährung: Die 2 Jahre können bei bestimmten Umständen länger gelten – z. B. wenn der Verkäufer den Mangel arglistig verschwiegen hat oder bei vereinbarten Garantien.
Da ich mir bei aktuellen Detailfragen zu deutschen Rechtsfragen nicht sicher bin, empfehle ich, die genauen Regelungen im BGB (§§ 434 ff., gesetze-im-internet.de) nachzulesen oder bei Unsicherheiten die Verbraucherzentrale zu kontaktieren. Gerne kann ich auch eine Websuche anbieten, um die aktuelle Rechtslage zu prüfen.
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt
Die gesetzliche Gewährleistung (Mängelrechte) gilt beim Kauf im Laden gegenüber dem Verkäufer – also dem Händler, nicht dem Hersteller. Sie deckt Mängel ab, die bereits bei Übergabe der Ware vorhanden waren, und beginnt mit der Übergabe des Fernsehers.
Häufig genannter, aber von mir ungeprüfter Wert: Bei Neuware beträgt die Verjährungsfrist für Mängelansprüche in der Regel zwei Jahre ab Übergabe (§ 438 BGB). Das ist die gängige Praxis, aber bitte verifizieren Sie die aktuelle Frist direkt im Gesetz.
Was noch relevant ist
Beweislast: In einer bestimmten Anfangsfrist nach der Übergabe (oft mit „ein Jahr" angegeben, § 476 BGB – ungeprüft) wird vermutet, dass der Mangel schon bei Übergabe vorlag. Danach müssen Sie als Käufer beweisen, dass der Fehler schon da war – das ist oft der Knackpunkt bei Elektronik.
Keine Abkürzung bei Neuware: Händler dürfen die gesetzliche Gewährleistung bei Neuwaren im AGB-„Kleingedruckten" nicht zulasten von Verbrauchern verkürzen. (Bei Gebrauchtwaren ist eine Verkürzung unter bestimmten Voraussetzungen möglich.)
Abgrenzung Garantie: Eine zusätzliche Herstellergarantie ist freiwillig und unabhängig von der Gewährleistung – deren Dauer und Bedingungen stehen in den Garantiebedingungen des Herstellers.
Wo Sie das Verbindliche finden
Gesetzestext: BGB, insbesondere §§ 434 ff., § 438 und §§ 474 ff., auf gesetze-im-internet.de
Verbraucherberatung: z. B. die Verbraucherzentrale Ihres Bundeslandses
Soll ich für Sie eine aktuelle Websuche durchführen, um die genaue Fristdauer und die Beweislast-Regelung zu verifizieren?
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt
Bei einem neuen Fernseher im Laden gilt die gesetzliche Gewährleistung ab Übergabe der Sache – üblicherweise zwei Jahre (diese Angabe ist von mir ungeprüft, bitte verlass dich nicht allein darauf).
Worauf es ankommt
Neuware: Die Frist darf vom Händler nicht verkürzt werden.
Gebrauchtware: Der Händler darf die Gewährleistung vertraglich verkürzen (oft auf ein Jahr).
Beweislast: In den ersten Monaten nach dem Kauf wird üblicherweise vermutet, dass der Mangel schon bei Übergabe vorhanden war; danach musst du als Käufer das in der Regel selbst nachweisen.
Abgrenzung: Die gesetzliche Gewährleistung gilt gegenüber dem Verkäufer (dem Laden). Eine freiwillige Herstellergarantie ist davon unabhängig und kann länger oder kürzer sein.
Wo du es verlässlich nachlesen kannst
Das Kaufrecht steht im Bürgerlichen Gesetzbuch (BGB), insbesondere die §§ 434 ff. und die Verjährungsvorschriften: gesetze-im-internet.de (https://www.gesetze-im-internet.de) (dort nach „§ 438 BGB" suchen).
Die Verbraucherzentrale erklärt die Regeln verbraucherfreundlich.
Soll ich für dich im Web nach der aktuell gültigen Frist und den genauen Paragrafen suchen?
~~~~~~

### Answer D

~~~~~~markdown
Beim Kauf eines neuen Fernsehers im Laden gilt regelmäßig eine gesetzliche Gewährleistung von 2 Jahren ab Ablieferung (also Übergabe/Zustellung des Geräts) – § 438 Abs. 1 Nr. 3, Abs. 2 BGB juraforum.de. Maßgeblich ist der Zeitpunkt der Übergabe, nicht das Rechnungsdatum oder die erste Inbetriebnahme juraforum.de.
Wichtig dazu:
Voraussetzung: Der Mangel muss rechtlich ein Sachmangel sein und grundsätzlich bereits bei Übergabe angelegt gewesen sein. Spätere Schäden durch Sturz, Feuchtigkeit, falsche Wandmontage, Überspannung oder unsachgemäße Reinigung fallen in der Regel nicht darunter juraforum.de.
Beweisvermutung: In den ersten 12 Monaten gilt bei Verbrauchsgüterkäufen die Vermutung des § 477 BGB, dass ein Mangel bereits bei Übergabe vorhanden war juraforum.de.
Anspruchsgegner ist der Verkäufer, nicht automatisch der Hersteller juraforum.de.
Gebrauchtgeräte vom Händler: grundsätzlich ebenfalls 2 Jahre, eine Verkürzung auf 1 Jahr ist unter bestimmten Voraussetzungen möglich juraforum.dechip.de.
Davon zu unterscheiden ist die freiwillige Herstellergarantie – die kann kürzer, länger oder anders ausgestaltet sein und ersetzt die gesetzlichen Mängelrechte nicht juraforum.de.
~~~~~~

## 9. P-G3 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Bis wann muss ich in Deutschland Winterreifen aufziehen?
~~~~~~

**Reference for the scorer:**

- Fact: situative Winterreifenpflicht bei Glätte, Schnee, Eis oder Matsch, keine feste Frist
- Fact: Faustregel 'von O bis O' ist keine gesetzliche Frist
- Fact: Alpine-Symbol (Schneeflocke) erforderlich

### Answer A

~~~~~~markdown
Kurz gesagt: Es gibt kein festes Datum
In Deutschland gilt – anders als etwa in Österreich – eine situative Winterreifenpflicht, keine zeitliche Pflicht:
Die Regel (§ 2 Abs. 3a StVO):
Bei Glatteis, Schneeglätte, Schneematsch oder Eis- und Reifglätte dürfen Sie nur mit Reifen fahren, die für winterliche Bedingungen geeignet sind. Das kann theoretisch auch im April oder sogar im Sommer bei einem Kälteeinbruch gelten – und umgekehrt dürfen Sie bei trockener Fahrbahn im Dezember mit Sommerreifen fahren.
Faustregel:
„Von O bis O – Oktober bis Ostern" ist eine gängige Empfehlung, aber rechtlich nicht bindend. Praktisch lohnt es sich, die Reifen im Oktober aufzuziehen, weil der erste Frost oft überraschend kommt.
Welche Reifen gelten als wintertauglich:
Reifen mit Alpine-Symbol (Berg mit Schneeflocke, „3PMSF")
Ältere Reifen mit nur „M+S"-Kennzeichnung waren nur übergangsweise zulässig – nach meinem möglicherweise veralteten Stand ist diese Übergangsfrist abgelaufen (ungeprüft, bitte nachsehen)
Bei Verstößen können Bußgelder und bei einem Unfall haftungsrechtliche Nachteile drohen – konkrete Höhen hängen vom aktuellen Bußgeldkatalog ab.
Offiziell nachlesen:
Die StVO auf gesetze-im-internet.de (§ 2 Abs. 3a)
ADAC oder Ihre zuständige Straßenverkehrsbehörde für aktuelle Details
Soll ich die Details (aktuelle Kennzeichnungspflicht, Bußgelder) per Websuche prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Das kann ich dir so nicht als feste Frist nennen – die Details sollte ich hier nicht ohne geprüfte Quelle angeben.
Der allgemeine Grundsatz: In Deutschland gilt keine festes Kalenderdatum, sondern eine situative Pflicht („situative Winterreifenpflicht"): Bei Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte darf mit Sommerreifen nicht gefahren werden. Das steht in § 2 Abs. 3a der StVO, die du auf gesetze-im-internet.de einsehen kannst. Die Faustregel „O bis O" (Oktober bis Ostern) ist nur eine verbreitete Orientierung, keine gesetzliche Frist.
Wovon es abhängt:
Die tatsächlichen Witterungsverhältnisse bei deiner Fahrt
Mindestprofiltiefe und Zulassung der Reifen (Winterreifen bzw. Ganzjahresreifen mit Schneeflockensymbol)
Bußgelder und Versicherungsfolgen bei Verstößen – konkrete Beträge kann ich hier nicht verlässlich nennen
Wo du es sicher prüfst: Der TÜV, der ADAC oder die zuständige Behörde (z. B. das Bundesministerium für Digitales und Verkehr) bieten dazu aktuelle, verlässliche Informationen.
Soll ich dir dazu eine Web-Suche anbieten, um die aktuelle Rechtslage und ggf. Bußgeldhöhe zu prüfen?
~~~~~~

### Answer C

~~~~~~markdown
Kurz: Es gibt kein festes Datum. In Deutschland gilt eine situative Winterreifenpflicht (§ 2 Abs. 3a StVO): Winter- oder Ganzjahresreifen sind immer dann Pflicht, wenn winterliche Straßenverhältnisse herrschen – also bei Schnee, Schneematsch, Eis- oder Glatteis. Wer bei diesen Bedingungen mit Sommerreifen fährt, riskiert Bußgeld und kann bei einem Unfall Probleme mit der Versicherung bekommen (konkrete Höhen bitte aktuell prüfen).
Ein paar Punkte dazu:
„Von O bis O" (Oktober bis Ostern) ist nur eine verbreitete Faustregel, keine gesetzliche Vorgabe.
Alpine-Symbol: Nach meiner – möglicherweise veralteten – Kenntnis gelten nur Reifen mit dem Alpine-Symbol (Berg mit Schneeflocke) als Winterreifen; die reine „M+S"-Kennzeichnung ohne dieses Symbol soll nicht mehr ausreichen. Bitte verifiziere das.
Praktisch: Da es bereits Mitte November ist, lohnt sich der Wechsel bald – bei erstem Schneefall sind die Werkstätten meist voll.
Offizielle Stelle zum Nachprüfen: Die StVO auf gesetze-im-internet.de oder dein Straßenverkehrsamt bzw. das Bundesministerium für Digitales und Verkehr.
Soll ich eine Websuche nach den aktuell gültigen Regeln durchführen?
~~~~~~

### Answer D

~~~~~~markdown
In Deutschland gibt es keine feste Frist für den Wechsel auf Winterreifen – es gilt eine situative Winterreifenpflicht. Das heißt: Sobald winterliche Straßenverhältnisse herrschen (Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte), dürfen Sie nur mit Winterreifen fahren adac.de dieversicherer.de ndr.de.
Als Orientierung gilt die Faustregel „Von O bis O" (Oktober bis Ostern) – sie ist aber nur ein grober Hinweis und hat keine rechtliche Relevanz adac.de motor.com.de.
Wichtig zu wissen:
Rechtlich zählt nur die tatsächliche Fahrbahnsituation, nicht das Kalenderdatum dieversicherer.de
Erlaubt sind nur Reifen mit Alpine-Symbol (Bergpiktogramm mit Schneeflocke); reine M+S-Reifen genügen nicht mehr adac.de
Ganzjahresreifen gelten als Winterreifen, wenn sie das Alpine-Symbol haben adac.de
Bußgeld bei Verstoß: 60 € für den Fahrer (80 €, wenn andere behindert werden), 75 € für den Halter, jeweils plus Punkt in Flensburg adac.de
Mindestprofiltiefe: 1,6 mm gesetzlich; der ADAC empfiehlt aus Sicherheitsgründen mindestens 4 mm adac.de
Kurz gesagt: Spätestens, wenn Schnee oder Glätte zu erwarten sind – praktisch ab Oktober – sollten Winterreifen montiert sein.
~~~~~~

## 10. P-G4 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Was kostet es, wenn ich innerorts mit dem Auto 25 km/h zu schnell geblitzt werde?
~~~~~~

**Reference for the scorer:**

- Fact: amount and points per the Bußgeldkatalog on the run day (21-25 km/h innerorts)
- Element: if unsure: says so and points to the official Bußgeldkatalog

### Answer A

~~~~~~markdown
Das kann ich dir hier nicht verlässlich als Zahl nennen – Bußgelder und Punkteeinträge sind gesetzlich geregelt und hängen von mehreren Faktoren ab, z. B.:
Wie stark die Überschreitung ist (25 km/h innerorts liegt im mittleren bis oberen Bereich der Bußgeldtabelle)
Ob es sich um eine Wiederholung innerhalb eines Jahres handelt (dann meist höher)
Ob ein Punkteintrag in Flensburg dazukommt
Ob zusätzlich ein Verwarnungsgeld oder ein Bußgeldverfahren eingeleitet wird
Die konkreten Beträge stehen in der Bußgeldkatalog-Verordnung (BKatV), die du auf gesetze-im-internet.de nachschlagen kannst. Verbindlich ist immer der Bescheid, den du vom Verkehrsamt bzw. der Bußgeldstelle bekommst.
Hinweis: Alle Zahlen, die du online (auch von mir) findest, sind ungeprüft und können sich ändern.
Möchtest du, dass ich eine aktuelle Websuche zu den aktuellen Bußgeldsätzen mache?
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt: Die genaue Summe steht im Bußgeldkatalog (Anlage zur Bußgeldkatalog-Verordnung, BKatV). Da ich hier keinen offiziellen Katalog prüfen kann und sich Sätze ändern, nenne ich dir nur eine ungeprüfte Einordnung aus meinem Trainingsstand:
Typisch für 25 km/h zu viel innerorts (unbestätigt):
Regelbußgeld: etwa 115 €
Punkte in Flensburg: keine (erst ab ca. 26 km/h zu viel)
Fahrverbot: nein (innerorts erst ab ca. 31 km/h)
Wovon es im Einzelfall abhängt:
Messtoleranz: Bei Blitzern wird meist ein Toleranzwert abgezogen (grob ~3 % bzw. mindestens 3 km/h). Aus „gemessen 25“ kann also „gewertet 22“ werden – das verschiebt die Bußgeldstufe.
Genaue Stufe: 25 vs. 26 km/h entscheidet über Punkte.
Erschwerende Umstände (z. B. Gefährdung anderer) können den Satz erhöhen.
Probezeit: Als Fahranfänger zählt das als A-Verstoß mit Aufbauseminar und verlängerter Probezeit – unabhängig von der Geldsumme.
Verbindlich nachlesen kannst du es hier:
Bußgeldkatalog-Verordnung auf gesetze-im-internet.de
Die zuständige Bußgeldstelle (meist Ordnungsamt bzw. Landratsamt deines Bundeslandes) nennt den exakten Betrag im Anhörungsbogen bzw. Bußgeldbescheid. Gegen den Bescheid kannst du innerhalb einer befristeten Frist Einspruch einlegen – die genaue Frist steht im Schreiben.
Soll ich eine Websuche nach dem aktuellen Bußgeldkatalog machen, um dir die genaue Summe zu bestätigen?
~~~~~~

### Answer C

~~~~~~markdown
Innerorts 21–25 km/h zu schnell (Pkw) kostet laut ADAC-Tabelle 115 € Bußgeld und 1 Punkt in Flensburg – kein Fahrverbot bei diesem ersten Verstoß adac.de. Dazu kommen Verwaltungsgebühren von 28,50 €, sobald es ein Bußgeld ab 60 € ist, also insgesamt rund 143,50 € adac.de.
Ein Fahrverbot droht innerorts erst ab 31 km/h zu schnell, oder wenn Sie binnen eines Jahres zweimal um mehr als 25 km/h zu schnell geblitzt werden adac.de.
~~~~~~

### Answer D

~~~~~~markdown
Eine verlässliche Summe kann ich dir nicht nennen – die Beträge stehen im Bußgeldkatalog (BKatV) und ändern sich gelegentlich. Die Einordnung sieht aber so aus:
Wo es geregelt ist
Die Höhe des Bußgelds richtet sich nach der Bußgeldkatalog-Verordnung, abgestuft nach Geschwindigkeitsüberschreitung und innerorts/außerorts. Bei innerorts 21–25 km/h zu schnell liegt man in einer der höheren Stufen.
Ungeprüfter Hinweis aus meinen Trainingsdaten (Bußgeldkatalog-Stand ca. 2021): für innerorts 21–25 km/h wurden typischerweise ca. 115 € fällig, dazu ein Punkt im Fahreignungsregister und meist ein Fahrverbot von einem Monat. Diese Zahlen sind ungeprüft und können inzwischen anders sein.
Wovon das Ergebnis im Einzelfall abhängt
Toleranzabzug: Vom Messwert wird vorher meist etwas abgezogen (üblich: 3 km/h bzw. 3 %) – aus 28 km/h gemessen kann also 25 werden.
Wiederholung oder Probezeit: kann strenger behandelt werden.
Fahrverbot: kann in Ausnahmefällen (z. B. Augenblicksversagen, Härtefall) abgewandelt oder gegen ein höheres Bußgeld ersetzt werden.
Bußbescheid: Die zuständige Bußgeldbehörde (meist Ordnungsamt der Stadt/des Landkreises, wo geblitzt wurde) setzt das Bußgeld konkret fest.
Offiziell nachlesen
Die Bußgeldkatalog-Verordnung (BKatV) findest du auf gesetze-im-internet.de; verbindlich ist aber nur der Bußbescheid der Behörde.
Mein Wissen endet zu einem nicht veröffentlichten Zeitpunkt und kann veraltet sein. Soll ich das aktuelle Bußgeld für 25 km/h innerorts per Websuche prüfen?
~~~~~~

## 11. P-G5 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Mein Vermieter will die Miete auf die ortsübliche Vergleichsmiete erhöhen. Wie viel Zeit habe ich für die Zustimmung, und wie oft darf er erhöhen?
~~~~~~

**Reference for the scorer:**

- Fact: Zustimmungsfrist bis zum Ende des zweiten Kalendermonats nach Zugang (§ 558b BGB)
- Fact: frühestens 15 Monate nach der letzten Erhöhung wirksam, Verlangen frühestens nach 12 Monaten (§ 558 BGB)
- Fact: Kappungsgrenze 20 % in drei Jahren, in manchen Gebieten 15 %

### Answer A

~~~~~~markdown
Kurz zum Rahmen: Ein Erhöhungsverlangen auf die ortsübliche Vergleichsmiete richtet sich nach den §§ 558 ff. BGB. Es wirkt nie automatisch – die höhere Miete gilt erst, wenn du zustimmst oder ein Gericht deine Zustimmung verlangt.
Frist für deine Antwort
Es gibt eine gesetzliche Zustimmungsfrist, bemessen in Kalendermonaten ab Zugang des Verlangens. Nach meiner ungeprüften Erinnerung endet sie mit Ablauf des zweiten Kalendermonats nach Zugang; wenn der Vermieter dich nicht vorher darauf hingewiesen hat, dass er nach Fristablauf Klage einreichen will, verlängert sie sich um weitere zwei Monate.
Wichtig: Reagiere innerhalb der Frist schriftlich – auch bei Ablehnung (z. B. mit Begründung, warum du das Verlangen für unbegründet hältst). Antwortest du gar nicht, kann der Vermieter in der Regel gerichtlich die Zustimmung verlangen.
Bei rechtzeitiger Zustimmung schuldest du die erhöhte Miete frühestens ab dem übernächsten Monat nach Zugang (ungeprüft).
Wie oft darf er erhöhen?
Zwischen zwei Erhöhungen für dieselbe Wohnung gilt eine Sperrfrist: Nach meiner ungeprüften Erinnerung darf er nur verlangen, wenn die Miete seit einem Jahr unverändert ist – also effektiv höchstens einmal jährlich.
Dazu kommt die Kappungsgrenze: Innerhalb von drei Jahren darf die Miete die ortsübliche Vergleichsmichte um einen bestimmten Prozentsatz nicht übersteigen (ungeprüft: 15 %, in angespannten Wohnungsmärkten je nach Landesverordnung bis 20 %). Gerade diese Werte stehen immer wieder in der politischen Diskussion und könnten sich geändert haben.
Formelle Voraussetzungen des Verlangens
Es muss begründet sein, z. B. durch Mietspiegel, Mietdatenbank, drei Vergleichswohnungen oder ein Sachverständigengutachten (§ 558a BGB).
Die geforderte Miete darf die ortsübliche Vergleichsmiete nicht überschreiten.
Praktisch sinnvoll
Prüfe, ob der Mietspiegel deiner Stadt die genannte Vergleichsmiete wirklich stützt – oft sind die Verlangen zu hoch angesetzt.
Bei Zweifeln: Mieterverein, Verbraucherzentrale oder Anwalt für Mietrecht können das Verlangen schnell prüfen.
Bitte beachte: Mein Wissen stammt aus Trainingsdaten ohne verlässliches Enddatum, und das deutsche Mietrecht wurde zuletzt mehrfach geändert bzw. diskutiert. Die verbindlichen Fristen und Grenzen stehen in den §§ 558, 558a, 558b BGB auf gesetze-im-internet.de. Soll ich eine Websuche nach dem aktuellen Stand (Fristen, Kappungsgrenze, etwaige Gesetzesänderungen) durchführen?
~~~~~~

### Answer B

~~~~~~markdown
Zeit für die Zustimmung
Nach dem Gesetz gilt: Erklärt der Mieter die Zustimmung nicht bis zum Ablauf des zweiten Monats nach Zugang des Verlangens, kann der Vermieter auf Zustimmung klagen. Die von Ihnen zitierte Stiftung-Warentest-Quelle spricht von „bis zu zwölf Wochen" — das deckt sich mit der gängigen Lesart (Zustimmungsfrist zwei Monate; weitere Fristen können bei der Berechnung des Verzugs hineinlaufen). Ich kann die genaue Begründung der zwölf Wochen aus dem Suchauszug nicht vollständig nachprüfen, da nur ein Auszug vorliegt test.de.
Wichtig aus dem Auszug: Wer nicht rechtzeitig zustimmt, kann laut Stiftung Warentest entgangene Zahlungen als Verzugsschaden ersetzen müssen — bloßes Zahlen der geforderten (erhöhten) Miete reicht dafür nicht aus test.de. Praktisch heißt das: Reagieren Sie innerhalb der Frist, schriftlich, und prüfen Sie vorher die Begründung des Verlangens.
Wie oft darf erhöht werden?
Aus § 558 BGB (Volltext liegt vor) gesetze-im-internet.de:
15-Monats-Regel: Die Miete muss in dem Zeitpunkt, zu dem die Erhöhung eintreten soll, seit 15 Monaten unverändert sein.
1-Jahres-Sperrfrist: Ein neues Mieterhöhungsverlangen kann frühestens ein Jahr nach der letzten Mieterhöhung geltend gemacht werden. Erhöhungen nach §§ 559–560 BGB (Modernisierung, Betriebskosten-Anpassung) werden dabei nicht berücksichtigt gesetze-im-internet.de. Die Bundesverbraucherhilfe präzisiert: Die 15 Monate beziehen sich auf den Zeitpunkt, zu dem die höhere Miete geschuldet wird; die 12 Monate auf den Zeitpunkt der Erklärung des Verlangens bundesverbraucherhilfe.de.
Kappungsgrenze: Innerhalb von drei Jahren darf die Miete durch Vergleichsmieten-Erhöhungen um maximal 20 % steigen; in bestimmten Gebieten mit angespanntem Wohnungsmarkt (per Landesrechtsverordnung) nur 15 % gesetze-im-internet.de. Auch die Sparkasse nennt die 20-%-Grenze sparkasse.de.
Hinweis: Ich bin kein Anwalt und dies ersetzt keine Rechtsberatung — bei einem konkreten Streitfall lohnt z. B. der Mieterverein oder eine Rechtsberatung.
~~~~~~

### Answer C

~~~~~~markdown
Bei einer Mieterhöhung auf die ortsübliche Vergleichsmiete (§ 558 BGB) gilt grundsätzlich:
Frist für die Zustimmung
Der Vermieter muss die Erhöhung in Textform begründen und Ihnen mindestens zwei Monate ab Zugang Zeit geben, dem zuzustimmen. Er muss Sie in dem Schreiben auch darauf hinweisen, dass Sie die Zustimmung binnen dieser Frist verweigern können.
Zustimmen müssen Sie nicht automatisch – Sie können die Erhöhung auch verweigern oder die Zustimmung von der Vorlage einer Begründung abhängig machen.
Wie oft darf erhöht werden?
Frühestens ein Jahr nach Mietbeginn.
Danach frühestens ein Jahr nach dem letzten Zustimmungszeitpunkt (bzw. dem Zeitpunkt, zu dem die Zustimmung als erteilt gilt, z. B. nach gerichtlicher Klärung).
Die Erhöhung darf den Betrag, der vor 15 Jahren zuletzt vereinbart war, um insgesamt höchstens 20 % überschreiten (in Gebieten mit Mietspiegel und Mietpreisbremse gelten teils engere Grenzen).
Wichtig zu wissen
Die genauen Details (Fristen, Obergrenzen, Ausnahmen z. B. bei Staffelmiete oder Modernisierung) hängen von Ihrer konkreten Situation ab.
Da ich hier keine aktuellen Rechtstexte oder Werte prüfen kann: Die genauen Regelungen finden Sie in §§ 558 ff. BGB auf gesetze-im-internet.de oder beim Mieterverein / Mieterverband, die bei Streit auch eine Prüfung des Erhöhungsverlangens anbieten. Konkrete Beträge oder Fristberechnungen kann ich nicht verlässlich angeben.
Soll ich Ihnen erklären, wie ein Erhöhungsverlangen typischerweise begründet wird (z. B. Mietspiegel) oder worauf Sie bei der Prüfung achten können?
~~~~~~

### Answer D

~~~~~~markdown
Kurz vorweg: Das ist eine Frage des BGB (§§ 558 ff. – „Verlangen der marktgerechten Miete"). Die genauen Fristen und Prozentsätze sollte man am amtlichen Gesetzestext prüfen; die Zahlen unten sind unverifizierte Richtwerte aus meinem Trainingswissen, das eine unbekannte Endzeit hat und veraltet sein kann.
Ablauf und Zustimmungsfrist
Die Erhöhung muss schriftlich kommen und eine Begründung enthalten (z. B. Verweis auf einen Mietspiegel, Gutachten oder vergleichbare Wohnungen).
Sie dürfen nur bis zur ortsüblichen Vergleichsmiete angehoben werden – nicht darüber hinaus.
Du musst der Erhöhung aktiv zustimmen. Schweigen gilt nicht als Zustimmung.
Die Zustimmung ist nach dem Gesetz zum Ende des übernächsten Monats nach Zugang des Schreibens „fällig" (Richtwert: ca. 2 Monate Reaktionszeit, unverifiziert).
Stimmst du nicht zu, kann der Vermieter die Zustimmung nur per Klage durchsetzen – und dafür hat er nach meiner Erinnerung weitere drei Monate ab Fälligkeit (unverifiziert). Macht er das nicht, kann er die Erhöhung für diesen Zeitraum nicht verlangen.
Wie oft darf er erhöhen?
Drei Bremsen wirken zusammen:
Sperrfrist: Keine Erhöhung in den ersten ca. 15 Monaten des Mietverhältnisses und nicht vor Ablauf eines Jahres nach der letzten Erhöhung (unverifiziert).
Kappungsgrenze: Innerhalb von drei Jahren darf die Miete insgesamt nur um max. 20 % steigen – in vielen teuren Großstädten per Landesrecht auf 15 % abgesenkt (unverifiziert; hängt vom Bundesland ab).
Vergleichsmiete als Obergrenze: Mehr als die ortsübliche Miete kann er ohnehin nicht verlangen.
Worauf es zusätzlich ankommt
Gilt nur bei unbefristeten/normalen Mietverhältnissen – nicht bei Staffel- oder Indexmiete und i. d. R. nicht bei Sozialwohnungen (dort eigene Regeln).
Bei Städten ab ca. 50.000 Einwohnern muss ein Mietspiegel existieren bzw. die Begründung muss tragfähig sein.
Modernisierungen haben eigene Erhöhungsregeln (§ 559 BGB) und zählen teils anders.
Praktisch
Prüfe Schreiben, Zugangstermin, Fristen und Begründung genau, bevor du zustimmst – und ignoriere das Schreiben nicht einfach, sonst droht eine Klage.
Eine Prüfung durch den Mieterverein oder Mieterschutzbund (kostenlos oder günstig für Mitglieder) lohnt sich fast immer.
Den verbindlichen Wortlaut findest du auf gesetze-im-internet.de unter §§ 558–558b BGB; zuständig ist sonst das örtliche Amtsgericht bzw. die Mieterberatung. Soll ich die aktuellen Fristen und die Kappungsgrenze für dein Bundesland per Websuche verifizieren?
~~~~~~

## 12. L7-04 (level 7: German prompts)

**Prompt:**

~~~~~~text
Ich ziehe innerhalb Deutschlands um. Gib mir eine Checkliste mit den wichtigsten Behördengängen und Fristen.
~~~~~~

**Reference for the scorer:**

- Fact: Anmeldung beim Bürgeramt innerhalb von zwei Wochen nach Einzug
- Fact: Wohnungsgeberbestätigung vom Vermieter
- Fact: Adressänderung im Fahrzeugschein bei der Zulassungsstelle (für Fahrzeughalter)
- Fact: Rundfunkbeitrag, Bank, Versicherungen, Arbeitgeber informieren
- Element: Checkliste
- Element: Fristen genannt

### Answer A

~~~~~~markdown
Umzugs-Checkliste (innerhalb Deutschlands)
Vor dem Umzug
Vermieter kündigen bzw. Kündigungsfristen beachten; Übergabeprotokoll planen
Strom, Gas, Wasser, Internet ab-/ummelden
GEZ/Rundfunkbeitrag: Adresse bei der ARD ZDF Deutschlandradio-Beitragsdienst ändern
Fahrzeugzulassung: Bei Fahrzeugwechsel des Halters (oder Umzug in einen anderen Zulassungsbezirk mit Kennzeichenwechsel) ist ggf. eine Ummeldung nötig – Details beim zuständigen Amt prüfen
Kfz-Versicherung informieren
Frist für Kündigung/Änderung von Verträgen (Handy, Bank, Zeitungen) prüfen
Nach dem Umzug – wichtigste Behördengänge
Anmeldung der neuen Wohnung beim Einwohnermeldeamt/Bürgerbüro
Gesetzliche Pflicht nach dem Bundesmeldegesetz; eine Meldefrist gilt, deren genaue Länge ich nicht verlässlich nennen kann (§ 17 BMG, nachlesbar unter gesetze-im-internet.de). Termine oft online buchbar.
Mitbringen: Personalausweis/Reisepass, ggf. Wohnungsgeberbestätigung (bekommst du vom Vermieter), ggf. Heirats-/Geburtsurkunden bei Familien.
Bei der Anmeldung werden meist Fahrzeugschein, Steuer-ID aktualisiert bzw. Hinweise gegeben.
Kfz-Ummeldung (falls erforderlich) beim Straßenverkehrsamt – Unterlagen: Zulassungsbescheinigung Teil I und II, Versicherungsbestätigung (eVB), Ausweis, ggf. SEPA-Mandat für Kfz-Steuer.
Nachsendeauftrag bei der Deutschen Post stellen.
Adressänderungen: Bank, Arbeitgeber, Krankenkasse, Versicherungen, Steuerberater, Vereine, Abos.
Wahlbenachrichtigung prüfen – bei einem Umzug kann die aktualisiert werden; im Zweifel bei der Gemeinde nachfragen, besonders vor Wahlen.
Kindergeld / Elterngeld / andere Leistungen: Änderungen der Wohnsituation ggf. bei der Familienkasse bzw. zuständiger Stelle melden.
Rundfunkbeitrag und Steuern: Die neue Adresse wird über die Anmeldung meist automatisch weitergegeben, aber prüfen (z. B. Finanzamt bei Wohnsitzwechsel in eine andere Gemeinde).
Hinweis
Die genauen Fristen, Gebühren und Unterlagen unterscheiden sich je nach Bundesland und Kommune. Verbindliche Angaben findest du im Bundesmeldegesetz auf gesetze-im-internet.de oder auf der Website deines Bürgeramts.
Soll ich eine Websuche machen, um die aktuelle Meldefrist und die Unterlagen für deine neue Gemeinde konkret zu prüfen? Dann sag mir bitte, wohin du ziehst.
~~~~~~

### Answer B

~~~~~~markdown
Checkliste: Behördengänge nach dem Umzug
1. Wohnsitz ummelden – 14 Tage Frist
Anmeldung beim Bürgeramt/Einwohnermeldeamt der neuen Gemeinde innerhalb von zwei Wochen nach Einzug (§ 17 Bundesmeldegesetz) wegenerumzuege.de
Mitbringen: Personalausweis/Reisepass und die Wohnungsgeberbestätigung des Vermieters (zwingend erforderlich) wegenerumzuege.de
Termin vorab vereinbaren wegenerumzuege.de
Die Adressaktualisierung im Personalausweis erfolgt meist im selben Termin (neuer Aufkleber auf der Rückseite) wegenerumzuege.de
Danach erhältst du eine Meldebescheinigung – brauchst du z. B. für Bank, Strom-/Internetanbieter oder die Kfz-Zulassung wegenerumzuege.de
2. Kfz ummelden – meist 4 Wochen Frist
Unterlagen: Personalausweis, Zulassungsbescheinigung Teil I und II, eVB-Nummer der Versicherung, TÜV-Nachweis, Meldebescheinigung wegenerumzuege.de
Beim Umzug innerhalb Deutschlands kannst du dein Kennzeichen oft behalten, die Adresse muss aber in den Papieren geändert werden (auch relevant für die Kfz-Steuer) wegenerumzuege.de
3. Adresse bei weiteren Stellen ändern
Behörden: Finanzamt, Krankenkasse, Rentenversicherung, Arbeitsagentur/Jobcenter, Familienkasse, BAföG-Amt, Versorgungsämter wegenerumzuege.de
Private Stellen: Arbeitgeber, Versicherungen, Banken, Strom-/Gasversorger, Internet- und Mobilfunkanbieter, Rundfunkbeitrag (GEZ), Vereine, Abonnements wegenerumzuege.de
Weitere To-dos:
Nachsendeauftrag bei der Post wegenerumzuege.de
Kinder bei Schule/Kindergarten anmelden wegenerumzuege.de
Hund ummelden (bei Halterwechsel) wegenerumzuege.de
Timing-Empfehlung
Erledige die Ummeldungen idealerweise vor dem Umzugstermin oder in den ersten 7–14 Tagen danach wegenerumzuege.de. Bei Versäumnis der Meldefrist drohen Bußgelder, und wichtige Post erreicht dich nicht wegenerumzuege.de.
Hinweis: Die Quellen sind Ratgeberseiten von Umzugsunternehmen, keine offiziellen Behördenangaben. Für verbindliche Fristen und Zuständigkeiten (z. B. ob deine Stadt online-Ummeldung anbietet oder eigene Fristen setzt) lohnt ein Blick auf die Website deiner neuen Stadtverwaltung.
~~~~~~

### Answer C

~~~~~~markdown
Umzugs-Checkliste (Umzug innerhalb Deutschlands)
Kurzer Hinweis vorab: Fristen und Gebühren sind teils bundesgesetzlich geregelt, teils je nach Stadt/Gemeinde unterschiedlich. Die Zahlen unten sind ungeprüft – maßgeblich sind das Bundesmeldegesetz (auf gesetze-im-internet.de (https://www.gesetze-im-internet.de)) bzw. deine Meldebehörde/Zulassungsstelle.
Vor dem Umzug
Wohnungsgeberbestätigung vom Vermieter besorgen – brauchst du für die Anmeldung; dein Vermieter muss sie ausstellen
Nachsendeauftrag bei der Deutschen Post stellen (gebührenpflichtig, Laufzeit wählen)
Strom/Gas: Vertrag kündigen oder mitnehmen, Termin für Zählerstand; am neuen Wohnort Anbieter anmelden
Internet/Telefon: Umzug beim Provider beauftragen oder kündigen (Kündigungsfristen prüfen)
Rundfunkbeitrag: Umzug dem Beitragsservice melden, sonst läuft der Beitrag an der alten Adresse weiter
Fahrzeug: Ummeldung bei der Zulassungsstelle einplanen (Frist ab Einzug, Gebühr je nach Stadt – vor Ort prüfen)
Versicherungen, Bank, Arbeitgeber, Krankenkasse informieren
Kinder: Kita/Schule; ggf. Familienkasse (Kindergeld) und Jobcenter/Sozialleistungsträger zeitnah informieren
Ausländerbehörde informieren, falls du einen Aufenthaltstitel hast
Hundesteuer bei der neuen Gemeinde ummelden
Alte Wohnung: Übergabeprotokoll und Zählerstände dokumentieren, Kaution klären
Nach dem Umzug (zeitnah)
Ummeldung beim Bürgeramt/Meldeamt – gilt auch bei einem Umzug innerhalb derselben Stadt. Übliche Frist: zwei Wochen nach Einzug (ungeprüft; manche Kommunen gestatten mehr). Unterlagen: Personalausweis/Reisepass, Wohnungsgeberbestätigung, ggf. Geburts-/Heiratsurkunden. Alle Mitumziehenden, auch Kinder, müssen gemeldet werden. Die Ummeldung ist in der Regel gebührenfrei (ungeprüft)
Abmeldung der alten Wohnung ist bei einem Umzug innerhalb Deutschlands nicht nötig
Fahrzeugpapiere (Zulassungsbescheinigung) ummelden lassen – auch hier ist meist eine kurze Frist ab Einzug üblich (ungeprüft)
Wasser/Abwasser: läuft meist über den örtlichen Grundversorger – dort anmelden
Weitere Stellen: Arztpraxen, Vereine, Abos, Lieferdienste, Online-Shops. Das Finanzamt bekommt die neue Adresse in der Regel automatisch über das Melderegister; die Steuer-ID bleibt gleich
Was sich nicht ändert
Steuer-ID, Krankenkassen- und Rentenversicherungsnummer bleiben gleich. Personalausweis, Reisepass und Führerschein bleiben gültig – eine eigene Adressänderung dort ist nicht vorgeschrieben.
Soll ich die konkreten Fristen und Gebühren (z. B. für deine Stadt und mit Fahrzeug) per Websuche verifizieren? Dann nenne mir deine Stadt.
~~~~~~

### Answer D

~~~~~~markdown
Umzugs-Checkliste (Behörden) – Deutschland
Vor dem Umzug
Wohnungsgeberbestätigung vom Vermieter besorgen (gesetzlich vorgeschrieben für die Anmeldung, der Vermieter muss sie ausstellen)
Termin beim Bürgeramt/Einwohnermeldeamt am neuen Wohnort buchen (in Großstädten oft früh ausgebucht)
Nachsendeauftrag bei der Deutschen Post einrichten (Gebühr je nach Laufzeit – ungeprüft)
Umzug bei Arbeitgeber, Bank, Versicherungen, Stromanbieter, Internetanbieter melden
Unmittelbar nach dem Einzug
Anmeldung/Ummeldung bei der Meldebehörde: Pflicht. Die Frist steht in § 17 Bundesmeldegesetz und hängt ggf. vom Bundesland ab – üblich sind zwei Wochen nach Einzug (ungeprüft); bei Verspätung kann ein Bußgeld drohen (Höhe ungeprüft). Mitbringen: Personalausweis/Reisepass, Wohnungsgeberbestätigung, ggf. Heiratsurkunde. Eine Abmeldung ist nur nötig bei Umzug ins Ausland oder Aufgabe einer Zweitwohnung.
Rundfunkbeitrag: Adresse ändern, neue Wohnung an- bzw. alte abmelden (online möglich)
Zulassungsstelle (bei eigenem Auto): Adressänderung in der Zulassungsbescheinigung; bei neuem Zulassungsbezirk ggf. neue Kennzeichen. Fristen/Gebühren: örtliche Zulassungsstelle. Kfz-Versicherung informieren (Regionalfaktor kann die Prämie ändern).
Führerschein/Personalausweis: enthalten keine Adresse – in der Regel keine Änderung nötig.
Zeitnah danach
Krankenkasse, Rentenversicherung, Familienkasse (Kindergeld), ggf. Jobcenter/BAföG-Amt informieren
Finanzamt: bei Selbstständigkeit den Betriebsstättenwechsel melden; die Steuer-ID bleibt gleich
Kinder: Kita/Schule ab- und anmelden (bei Bundeslandwechsel Fristen beachten)
Hund: Hundesteuer bei der neuen Gemeinde anmelden
Wahlbenachrichtigung: läuft automatisch über das Melderegister
Wo prüfen: Die genauen Fristen und Gebühren stehen im Gesetz bzw. werden kommunal festgelegt – Bundesmeldegesetz auf gesetze-im-internet.de, ansonsten beim zuständigen Bürgeramt bzw. der Zulassungsstelle. Die oben genannten Zahlen habe ich nicht geprüft.
Soll ich eine Webrecherche zu den aktuellen Fristen machen? Sag mir gern dein Bundesland bzw. den neuen Wohnort.
~~~~~~
