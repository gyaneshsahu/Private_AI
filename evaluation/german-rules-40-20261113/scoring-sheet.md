# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

## 1. Q01 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie hoch ist das Verwarnungsgeld, wenn ich im absoluten Halteverbot parke?
~~~~~~

**Reference for the scorer:**

- Fact: amount per the Bußgeldkatalog on the run day (with and without obstruction)

### Answer A

~~~~~~markdown
Beim Parken im absoluten Halteverbot (Zeichen 283) liegt das Verwarnungsgeld nach dem Bußgeldkatalog typischerweise bei 55 € (ohne Behinderung anderer). Bei längerem Parken steigt es meist stufenweise an (z. B. nach mehr als einer Stunde höher, mit Zuschlägen je weiterer Stunde).
Ein paar Hinweise:
Der Bußgeldkatalog kann sich ändern; mein Wissen hat einen unbestimmten Stand und ist möglicherweise nicht aktuell. Verbindlich sind die Angaben des Bundesjustizministeriums (Bußgeldkatalog-Verordnung) bzw. die Website bussgeldkatalog.org oder die offizielle BKatV.
Zusätzlich können Kosten für Abschleppen oder die Verkehrszeichen­behörde dazukommen.
Wer wirklich behindert wird (z. B. Rettungsgasse, andere Verkehrsteilnehmer), zahlt deutlich mehr und kann Punkte in Flensburg bekommen.
Wenn du es genau wissen willst, sag mir kurz, wie lange das Fahrzeug stand und ob jemand behindert wurde – dann kann ich das genauer einordnen.
~~~~~~

### Answer B

~~~~~~markdown
Beim Parken im absoluten Halteverbot (Zeichen 283) liegt das Verwarnungsgeld in der Regel bei 25 Euro. Es können zusätzliche Punkte in Flensburg hinzukommen, wenn es z. B. zu einer Behinderung oder Gefährdung kommt – dann steigen auch die Bußgelder deutlich (etwa bei Behinderung 35 €, bei Gefährdung mehr).
Ein paar Hinweise:
Die genauen Sätze sind im Bußgeldkatalog festgelegt und können sich ändern; meine Angaben stammen aus Trainingsdaten und sind möglicherweise nicht aktuell.
Bei einem Verstoß im zeitlich begrenzten Halteverbot (Zeichen 286) gelten oft niedrigere Sätze.
Zusätzlich können Abschleppkosten entstehen, wenn das Fahrzeug abgeschleppt wird.
Für den aktuell gültigen Betrag lohnt ein Blick in den offiziellen Bußgeldkatalog des Bundes (bussgeldkatalog-2024.de bzw. die Angaben des BMV) oder eine Nachfrage bei der zuständigen Behörde.
~~~~~~

### Answer C

~~~~~~markdown
Bei unzulässigem Halten (ab 1 Stunde) oder Parken (ab 1 Stunde) in einem absoluten Halteverbot liegt das Verwarnungsgeld in der Regel bei 25 € (plus ggf. Punkte nur in besonders gefährlichen Fällen – hier meist nicht).
Wichtige Einschränkungen:
Die genaue Höhe hängt vom konkreten Verstoß und der Dauer ab; es gibt gestaffelte Sätze (z. B. mit Behinderung anderer mehr).
Kosten für Abschleppen oder Verwahrung können deutlich teurer werden als das Verwarnungsgeld selbst.
Ich bin mir bei den exakten Beträgen nicht 100 % sicher, da sich der Bußgeldkatalog ändern kann. Verbindliche Angaben findest du beim Bundesschatzmeister bzw. im aktuellen Bußgeldkatalog auf der Seite des BMVI oder bei buessgeldkatalog.org bzw. der ADAC-Website.
Kurz: Rechne mit ca. 25 € fürs eigentliche Verstoß, aber mit deutlich mehr, wenn das Fahrzeug abgeschleppt wird.
~~~~~~

## 2. Q02 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Mein Handyvertrag läuft seit drei Jahren. Mit welcher Frist kann ich ihn kündigen?
~~~~~~

**Reference for the scorer:**

- Fact: nach der Mindestlaufzeit jederzeit mit einer Frist von einem Monat kündbar (TKG seit Dezember 2021)

### Answer A

~~~~~~markdown
Nach drei Jahren ist Ihre ursprüngliche Laufzeit (meist 24 Monate) sicher abgelaufen, und der Vertrag läuft vermutlich stillschweigend weiter. Dann gilt:
Kündigungsfrist: ein Monat – ein sich automatisch verlängerter Vertrag kann jederzeit mit einer Frist von einem Monat gekündigt werden bundesnetzagentur.devis.bayern.de. Das gilt auch für Verträge, die vor dem 1.12.2021 abgeschlossen wurden (früher galten oft 3 Monate) bundesnetzagentur.devis.bayern.de.
Keine zusätzlichen Kosten durch diese Kündigung; der Anbieter muss auf das Recht hinweisen vis.bayern.de.
Die genaue Frist steht auch im Vertrag selbst verbraucherzentrale.de.
Praktisch: Kündigen Sie zum Ende eines beliebigen Monats mit mindestens einmonatiger Frist, z. B. schriftlich per Post, und lassen Sie sich den Eingang bestätigen.
~~~~~~

### Answer B

~~~~~~markdown
Nach Ablauf der Mindestlaufzeit (maximal 24 Monate) läuft der Vertrag auf unbestimmte Zeit weiter und du kannst ihn jederzeit mit einer Frist von einem Monat kündigen – eine automatische Verlängerung um ein weiteres Jahr ist seit der TKG-Reform 2021 nicht mehr zulässig [20d7297b32c6, Seite; 0341e448769e; bd77a8f70e1d].
Praktisch heißt das: Kündigst du zum 1. eines Monats, muss die Kündigung dem Anbieter bis zum 1. des Vormonats zugehen. Rechtswirksam ist die Textform (E-Mail, Brief, Online-Formular/Kündigungsbutton); achte auf einen Zugangsnachweis mlp-financify.de.
Hinweis: Die Quellen sind Ratgeberseiten, keine offizielle Behördenquelle – die genaue Frist steht letztlich in deinen Vertragsunterlagen.
~~~~~~

### Answer C

~~~~~~markdown
Nach drei Jahren ist die erstmalige Mindestvertragslaufzeit (meist 24 Monate) sehr wahrscheinlich abgelaufen. Dann gilt der Grundsatz:
Allgemeine Regel (TKG): Nach Ablauf der ursprünglichen Laufzeit verlängert sich ein Handyvertrag nicht mehr automatisch um ein Jahr, sondern läuft unbefristet weiter und ist jeden Monat kündbar. Üblich ist eine Kündigungsfrist von einem Monat zum Monatsende – dieser Wert ist aber ungeprüft, die genaue Frist hängt von deinem Vertrag ab.
Wovon es abhängt:
Wann der Vertrag abgeschlossen wurde (ältere Verträge können andere Klauseln enthalten)
Die vereinbarte Mindestlaufzeit in deinem Vertrag bzw. den AGB
Das genaue Datum des Laufzeitendes (drei Jahre „seit ca." reicht oft nicht für den Stichtag)
Wo du es verlässlich prüfen kannst:
Deine Vertragsunterlagen / AGB des Anbieters
Das Telekommunikationsgesetz (§ 95 TKG) auf gesetze-im-internet.de
Direkt beim Anbieter (Kundenhotline oder Kundenkonto)
Praktischer Hinweis: Eine Kündigung in Textform (z. B. per E-Mail) genügt in der Regel – ein Brief ist meist nicht nötig. Kündigungsbestätigung vom Anbieter einfordern.
Soll ich eine Websuche machen, um die aktuelle Fristenregelung und Details zu § 95 TKG zu prüfen?
~~~~~~

## 3. Q03 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie hoch darf die Mietkaution höchstens sein, und darf ich sie in Raten zahlen?
~~~~~~

**Reference for the scorer:**

- Fact: höchstens drei Nettokaltmieten (§ 551 BGB)
- Fact: Zahlung in drei gleichen monatlichen Raten erlaubt

### Answer A

~~~~~~markdown
Maximale Höhe
Die Mietkaution darf bei Wohnraummietverhältnissen höchstens drei Nettokaltmieten betragen – also das Dreifache der Monatsmiete ohne Betriebskosten- und Heizkostenvorauszahlungen (§ 551 BGB) sparkasse.de hausverwalter-vz.de juraforum.de.
Ein paar Punkte dazu:
Die Höhe wird im Mietvertrag geregelt; eine nachträgliche Erhöhung ist nicht zulässig, selbst wenn die Miete steigt sparkasse.de.
Eine Vertragsklausel, die hiervon zu deinen Lasten abweicht, ist unwirksam juraforum.de.
Ratenzahlung
Ja, du darfst die Kaution in drei gleichen monatlichen Raten zahlen – die erste Teilzahlung ist zu Beginn des Mietverhältnisses fällig, die weiteren folgen mit den nächsten Mietzahlungen sparkasse.de. Das gilt laut einer Quelle auch für eine Barkaution evernest.com.
Hinweis: Alle genannten Quellen sind Suchauszüge bzw. Anbietertexte, keine offiziellen Gesetzesseiten. Die Kernaussagen decken sich aber mit § 551 BGB; im Zweifel lohnt ein Blick auf den Gesetzestext (z. B. gesetze-im-internet.de) oder Beratung bei einer Mieterberatung.
~~~~~~

### Answer B

~~~~~~markdown
Maximale Höhe
Die Kaution darf höchstens das Dreifache der Monatsmiete ohne Betriebskosten betragen – also drei Nettokaltmieten. Als Pauschale oder Vorauszahlung ausgewiesene Betriebskosten (und Heizkosten) zählen nicht mit gesetze-im-internet.de.
Ratenzahlung
Ja, bei einer Geldsumme als Sicherheit haben Sie als Mieter einen Anspruch auf drei gleiche monatliche Teilzahlungen:
Die erste Rate ist zu Beginn des Mietverhältnisses fällig.
Die weiteren Raten werden jeweils mit den folgenden Mietzahlungen fällig gesetze-im-internet.de.
Wichtig zu wissen
Der Vermieter muss das Geld getrennt von seinem eigenen Vermögen bei einem Kreditinstitut anlegen (zum üblichen Zinssatz für Spareinlagen mit dreimonatiger Kündigungsfrist); die Erträge stehen Ihnen zu und erhöhen die Sicherheit gesetze-im-internet.de.
Abweichende Vereinbarungen zum Nachteil des Mieters sind unwirksam – z. B. eine Klausel, die mehr als drei Nettokaltmieten oder sofortige Vollzahlung verlangt gesetze-im-internet.de.
Diese Regeln gelten für Wohnraummietverhältnisse.
~~~~~~

### Answer C

~~~~~~markdown
Höhe der Kaution (Wohnraum)
Die Regel steht in § 551 BGB. Nach meinem – hier ungeprüften – Kenntnisstand gilt für Wohnraum:
Höchstens das Dreifache der Nettokaltmiete – also nur die Grundmiete, ohne Heiz- und Nebenkosten.
Verlangt der Vermieter mehr, ist die höhere Forderung in der Regel insoweit unwirksam; zu viel Gezahltes kann man grundsätzlich zurückverlangen.
Bei Gewerberäumen gibt es diese Deckelung nicht – dort ist die Höhe frei verhandelbar.
Ratenzahlung
Ja, bei Wohnraum ist die Zahlung in drei gleichen Monatsraten gesetzlich vorgesehen (ungeprüft):
Die erste Rate wird erst bei Wohnungsübergabe fällig – nicht schon bei Vertragsunterschrift.
Die restlichen beiden Raten werden mit den folgenden Monatsmieten fällig.
Klauseln, die die sofortige Zahlung der vollen Kaution verlangen, sind in Formularverträgen in der Regel unwirksam.
Der Vermieter muss das Geld getrennt von seinem Vermögen auf einem Mietkautionskonto anlegen (dreimonatig kündbar, verzinst); die Zinsen gehören Ihnen.
Wo prüfen?
Den verbindlichen Wortlaut finden Sie unter gesetze-im-internet.de → BGB → § 551 (https://www.gesetze-im-internet.de/bgb/__551.html). Bei konkretem Streit helfen Mieterverein oder Verbraucherzentrale; durchsetzen lässt sich das vor dem Amtsgericht.
Mein Kenntnisstand stammt aus Trainingsdaten und kann veraltet sein – wenn Sie möchten, führe ich gern eine Websuche durch, um den aktuellen Wortlaut und ggf. Änderungen zu prüfen.
~~~~~~

## 4. Q04 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie viel Elternzeit steht mir pro Kind zu?
~~~~~~

**Reference for the scorer:**

- Fact: bis zu drei Jahre pro Elternteil und Kind (BEEG)
- Fact: bis zu 24 Monate zwischen 3. und 8. Geburtstag übertragbar

### Answer A

~~~~~~markdown
Pro Kind haben Sie als Arbeitnehmerin oder Arbeitnehmer Anspruch auf bis zu 3 Jahre Elternzeit familienportal.debmbfsfj.bund.de. Die drei Jahre stehen jedem Elternteil unabhängig voneinander zu zbfs.bayern.de.
Wichtige Punkte dazu:
Zeitraum: Die Elternzeit beginnt frühestens mit der Geburt des Kindes (als Mutter frühestens nach Ablauf des Mutterschutzes) und kann bis vor dem 3. Geburtstag des Kindes genommen werden familienportal.defamilienportal.de.
Übertragung: Bis zu 12 Monate der Elternzeit können auf den Zeitraum zwischen dem 3. und dem 8. Geburtstag des Kindes verschoben werden destatis.defamilienportal.de.
Nebenbei arbeiten: Während der Elternzeit dürfen Sie gar nicht oder höchstens 30 Stunden pro Woche arbeiten. Für Kinder, die ab dem 01.09.2021 geboren sind, sind bis zu 32 Stunden pro Woche erlaubt familienportal.de.
Die Elternzeit selbst ist unbezahlt – zum Ausgleich können Sie Elterngeld beantragen familienportal.de. Details zum Elterngeld (Höhe, Dauer, Antrag) sind in den vorliegenden Quellen nicht enthalten – dazu kann ich gerne eine separate Suche machen.
~~~~~~

### Answer B

~~~~~~markdown
Elternzeit pro Kind – die Grundlagen
Elternzeit ist im Bundeselterngeld- und Elternzeitgesetz (BEEG, § 15) geregelt. Die wichtigsten Punkte:
Pro Kind, nicht pro Elternteil gedacht: Beide Eltern haben jeweils einen eigenen Anspruch und können sich die Zeit aufteilen – auch gleichzeitig oder abwechselnd.
Umfang: Die bekannte Regel lautet bis zu drei Jahre pro Kind – dieser Wert ist von mir ungeprüft und kann sich durch aktuelle Reformen geändert haben. Teile davon können mit Zustimmung des Arbeitgebers auch später genommen werden (üblicherweise bis zum achten Geburtstag des Kindes).
Voraussetzungen: Anspruch haben Arbeitnehmer*innen; Selbstständige brauchen keine Elternzeit, haben aber auch keinen Anspruch auf sie. Die Elternzeit muss schriftlich beim Arbeitgeber beantragt werden, mit gesetzlichen Fristen (die genauen Fristen bitte im Gesetz nachschlagen).
Nicht zu verwechseln mit Elterngeld: Das ist eine Geldleistung, über die die Elterngeldstelle entscheidet – rechtlich getrennt von der Elternzeit selbst.
Wo Sie es verbindlich prüfen
Das Gesetz im Volltext: BEEG auf gesetze-im-internet.de (§ 15 Elternzeit)
Ihr Arbeitgeber bzw. die Personalabteilung
Das offizielle Familienportal des BMFSFJ und ggf. die Elterngeldstelle Ihrer Stadt/des Landkreises
Hinweis: Es gab zuletzt politische Diskussionen über eine Reform der Elternzeit. Meine Angaben stammen aus Trainingsdaten und können veraltet sein – ich kann gern eine Websuche nach dem aktuellen Stand machen, wenn Sie möchten.
~~~~~~

### Answer C

~~~~~~markdown
Pro Kind steht Ihnen als Arbeitnehmerin oder Arbeitnehmer bis zu 3 Jahre Elternzeit zu familienportal.de bmbfsfj.bund.de.
Wichtige Punkte aus dem offiziellen Familienportal des Bundes:
Zeitraum: Sie können die Elternzeit vor dem 3. Geburtstag des Kindes nehmen; ein Teil kann auch zwischen dem 3. und 8. Geburtstag genommen werden familienportal.de.
Voraussetzungen: Sie leben mit dem Kind in einem Haushalt, betreuen und erziehen es selbst, und arbeiten während der Elternzeit höchstens 30 Stunden pro Woche (bei Kindern ab Geburt 01.09.2021 bis zu 32 Stunden) familienportal.de.
Mehrlinge: Für Zwillinge oder andere Mehrlinge besteht ein eigener Anspruch pro Kind (bis zu 6 Jahre bei Zwillingen) – das ist aber nur aus einer nicht-offiziellen Quelle elterngeld-zentrum.de, nicht aus dem offiziellen Material hier.
Die Elternzeit selbst ist unbezahlt; als Ausgleich kann z. B. Elterngeld beantragt werden familienportal.de. Details dazu (Höhe, Fristen) sind in den vorliegenden Quellen nicht enthalten – die kann ich bei Bedarf separat nachschlagen.
~~~~~~

## 5. Q05 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie lange vorher muss ich meinem Arbeitgeber die Elternzeit ankündigen?
~~~~~~

**Reference for the scorer:**

- Fact: 7 Wochen vor Beginn für Elternzeit bis zum 3. Geburtstag
- Fact: 13 Wochen für Elternzeit zwischen 3. und 8. Geburtstag (§ 16 BEEG)

### Answer A

~~~~~~markdown
Spätestens 7 Wochen vor Beginn der Elternzeit müssen Sie die Elternzeit bei Ihrem Arbeitgeber anmelden – und zwar in Textform (z. B. E-Mail oder Brief, auch ohne Unterschrift reicht). Es gibt dabei keinen formellen „Antrag" familienportal.de.
Einige wichtige Punkte:
Elternzeit vor dem 3. Geburtstag des Kindes: 7 Wochen vor Beginn bmbfsfj.bund.defamilienportal.de
Elternzeit zwischen dem 3. und dem 8. Geburtstag: 13 Wochen vor Beginn familienportal.de
Sonderfall Geburt: Soll die Elternzeit direkt nach der Geburt beginnen, gilt für die Mutter: Anmeldung spätestens 7 Wochen vor Ende der Mutterschutzfrist. Für den anderen Elternteil: Anmeldung 7 Wochen vor dem errechneten Geburtstermin familienportal.de
Dringende Ausnahmefälle (z. B. Frühgeburt): kürzere Fristen können möglich sein; melden Sie die Elternzeit dann so früh wie möglich familienportal.de
Der Arbeitgeber kann die Elternzeit nicht ablehnen oder vertraglich ausschließen; er kann sie nur aus dringenden betrieblichen Gründen und nur für den Zeitraum bis zum dritten Lebensjahr des Kindes innerhalb von acht Wochen nach Zugang der Anmelde-Erklärung kurzfristig ablehnen familienportal.berlin.dezbfs.bayern.de.
~~~~~~

### Answer B

~~~~~~markdown
Elternzeit müssen Sie Ihrem Arbeitgeber schriftlich „verlangen" – eine E-Mail reicht dafür nach der Rechtslage nicht, es braucht grundsätzlich die echte Schriftform mit Unterschrift.
Allgemeine Regel (Frist): Es gilt eine gesetzliche Vorlauf­frist in Wochen zwischen Antrag und Beginn der Elternzeit. Nach meiner Erinnerung beträgt sie sieben Wochen vor Beginn (§ 16 BEEG) – diese Angabe ist aber ungeprüft, bitte verlassen Sie sich nicht allein darauf. Es gibt Sonderregeln, z. B. bei Frühgeburt (Geburt vor der 24. Schwangerschaftswoche oder unter einem bestimmten Geburtsgewicht) und bei Adoptionen, wo die Frist entfallen oder verkürzt sein kann – auch das ist ungeprüft.
Wichtig zu wissen:
Im Antrag geben Sie den Zeitraum an; verbindlich angemeldet wird jeweils ein Zeitraum von bis zu zwei Jahren. Eine spätere Verlängerung ist ebenfalls fristgebunden oder erfordert das Einverständnis des Arbeitgebers.
Der Arbeitgeber kann Elternzeit selbst grundsätzlich nicht ablehnen – anders als bei der gleichzeitigen Bitte um Elternzeit in Teilzeit (verkürzte Arbeitszeit), bei der er innerhalb einer Frist aus betrieblichen Gründen ablehnen kann.
Das Elterngeld ist eine separate Leistung und muss bei der zuständigen Elterngeldstelle beantragt werden, nicht beim Arbeitgeber.
Wo Sie das verbindlich nachlesen: das Bundeselterngeld- und Elternzeitgesetz (BEEG), insbesondere § 16, auf gesetze-im-internet.de, oder direkt bei Ihrer Personalabteilung bzw. der Elterngeldstelle Ihres Landkreises/Ihrer Stadt.
Da sich Fristen geändert haben können und ich keine aktuelle Quelle abrufen kann: Soll ich eine Websuche nach der aktuellen Frist und den Sonderfällen durchführen?
~~~~~~

### Answer C

~~~~~~markdown
Spätestens 7 Wochen vor Beginn der Elternzeit müssen Sie sie beim Arbeitgeber in Textform anmelden – das geht auch per E-Mail oder Brief ohne Unterschrift, ein förmlicher Antrag ist nicht nötig familienportal.de.
Wichtige Details:
Elternzeit vor dem 3. Geburtstag (Geburten ab 1.7.2015): 7 Wochen Frist familienportal.de
Elternzeit zwischen 3. und 8. Geburtstag: 13 Wochen Frist familienportal.de
Beginn am Tag der Geburt (Mutter): Die Elternzeit beginnt erst nach Ende der Mutterschutzfrist (i. d. R. 8 Wochen), daher reicht eine Anmeldung nach der Geburt, spätestens 7 Wochen vor deren Ende familienportal.de
Vater/anderer Elternteil: Anmeldung 7 Wochen vor dem errechneten Geburtstermin familienportal.de
Dringende Ausnahmefälle (z. B. Frühgeburt): kürzere Fristen können gelten; dann möglichst früh anmelden familienportal.de
Praktischer Hinweis aus nicht-offiziellen Quellen: Etwa 8 Wochen vorher beginnt auch der besondere Kündigungsschutz – deshalb wird oft geraten, sich rechtzeitig in diesem Zeitfenster zu melden reddit.comelterngeld.net.
~~~~~~

## 6. Q06 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Was kostet ein internationaler Führerschein?
~~~~~~

**Reference for the scorer:**

- Fact: fee as published by a Fahrerlaubnisbehörde / Gebührenordnung on the run day

### Answer A

~~~~~~markdown
Kosten internationaler Führerschein
Es gibt keinen bundesweit einheitlichen Preis – die Gebühr legt jede Kommune über ihre eigene Gebührensatzung fest. Sie liegt meist im Bereich von etwa 15–25 €, aber dieser Betrag ist von mir ungeprüft und kann je nach Stadt/Landkreis abweichen.
Wo du den verbindlichen Betrag findest:
Führerscheinstelle deines Wohnorts (Bürgeramt, Landratsamt oder Ordnungsamt) – dort gilt die lokale Gebührensatzung
Rechtsgrundlage: die Verordnung über den internationalen Führerschein (IntVO) auf gesetze-im-internet.de (https://www.gesetze-im-internet.de)
Was du sonst wissen solltest:
Du brauchst deinen gültigen deutschen Führerschein und ein aktuelles biometrisches Passfoto
Der internationale Führerschein ist zeitlich begrenzt gültig (genaue Geltungsdauer steht in der IntVO) und nur zusammen mit dem nationalen Führerschein gültig
Er wird meist direkt vor Ort ausgestellt
Soll ich für dich im Web nach dem genauen aktuellen Preis für deine Stadt suchen?
~~~~~~

### Answer B

~~~~~~markdown
Laut der offiziellen Quelle (Serviceportal Baden-Württemberg) kostet der internationale Führerschein je nach Stadt- oder Landkreis 12,20–16,30 € service-bw.de.
Die nicht-offiziellen Quellen nennen grob übereinstimmend etwa 15–20 € allianzdirect.de bzw. ca. 15 € adac.de fuehrerscheinfix.de.
Wichtig: Der internationale Führerschein ist nur in Kombination mit dem Scheckkartenführerschein gültig adac.de. Falls du noch einen alten Papierführerschein hast, musst du ihn vorher umtauschen – das kostet laut einer Quelle zusätzliche 26,50 € ka-news.de.
Der genaue Preis hängt von deiner örtlichen Fahrerlaubnisbehörde (Stadt- bzw. Landkreis) ab – am besten dort direkt nachfragen.
~~~~~~

### Answer C

~~~~~~markdown
Kosten für den internationalen Führerschein
Die Gebühr ist nicht bundeseinheitlich festgelegt, sondern variiert je nach Stadt- oder Landkreis. Aus den vorliegenden Quellen:
Baden-Württemberg: je nach Stadt-/Landkreis 12,20 – 16,30 € service-bw.de
Frankfurt am Main: 16,30 € für den internationalen Führerschein (plus ggf. weitere Verwaltungsgebühren, z. B. 32,80 € bei zusätzlichem Umtausch eines Papierführerscheins – insgesamt 46,60 €) frankfurt.de
Die Quellen aus München, Hamburg, Köln und Berlin nennen keine Gebühren, sondern nur Gültigkeitsdauer und Voraussetzungen.
Hinweis: Alle Angaben stammen aus Suchauszügen offizieller Seiten, nicht aus vollständig gelesenen Seiten. Für den genauen Betrag an Ihrem Wohnort prüfen Sie am besten die Seite Ihrer örtlichen Führerscheinstelle. Falls Sie möchten, suche ich gezielt nach den Gebühren für Ihre Stadt oder Ihren Landkreis.
~~~~~~

## 7. Q07 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Ich bin selbstständig. Wie lange muss ich meine Rechnungen und Belege aufbewahren?
~~~~~~

**Reference for the scorer:**

- Fact: Buchungsbelege 8 Jahre (seit 2025, § 147 AO / § 257 HGB)
- Fact: Bücher, Jahresabschlüsse 10 Jahre
- Fact: Geschäftsbriefe 6 Jahre

### Answer A

~~~~~~markdown
Kurz gesagt: Die Quellen widersprechen sich hier, und keine offizielle Quelle (z. B. Finanzverwaltung) war dabei – daher bitte die genaue Frist beim Finanzamt oder in der AO prüfen.
Was die gefundenen Quellen sagen:
10 Jahre: Die Verbraucherzentrale nennt für Selbstständige und Freiberufler:innen eine Aufbewahrungspflicht von 10 Jahren; die Frist beginnt zum Ende des Kalenderjahres, in dem die Rechnung ausgestellt oder der Vertrag geschlossen wurde verbraucherzentrale.de. Auch ein weiterer Ratgeber nennt 10 Jahre für Rechnungen und Buchungsbelege flatpay.com, und ein dritter nennt 10 Jahre (GoBD-konform) für Rechnungen inkl. E-Rechnungen kostenlose-erechnung.de.
8 Jahre: Zwei neuere Ratgeber behaupten, seit 2025 müssten Buchungsbelege (Rechnungen, Quittungen, Kassenbons) nur noch 8 Jahre aufbewahrt werden, Fristbeginn ebenfalls Ende des Kalenderjahres erfolgreich-selbststaendig-sein.de sparkreceipt.com. Ein weiterer spricht von „8 Jahre für bestimmte steuerrelevante Unterlagen (neuere Regelung)" flatpay.com.
Einordnung: Die 8-Jahre-Angabe erscheint in mehreren nicht-offiziellen Quellen mit Bezug auf eine Änderung „seit 2025", aber ich habe keine offizielle Bestätigung dafür in den Ergebnissen. Die sichere Variante ist, Belege 10 Jahre aufzubewahren (Fristbeginn: Ende des Kalenderjahres der Rechnung) verbraucherzentrale.de.
Sonstiges aus den Quellen:
Es spielt keine Rolle, ob Papier oder digital – auf den Inhalt kommt es an verbraucherzentrale.de.
Digitale Unterlagen müssen DSGVO-konform vernichtet werden verbraucherzentrale.de.
Da keine offizielle Quelle (z. B. BMF oder Landesfinanzverwaltung) dabei war, empfehle ich, die aktuelle Frist auf bmf.de oder beim Finanzamt zu verifizieren. Ich kann gerne nochmal gezielt nach einer offiziellen Quelle suchen.
~~~~~~

### Answer B

~~~~~~markdown
Für Selbstständige gelten in Deutschland Aufbewahrungspflichten vor allem aus der Abgabenordnung (AO) und, je nach Rechtsform, aus dem Handelsgesetzbuch (HGB).
Was Sie aufbewahren müssen (typischerweise):
Rechnungen und alle sonstigen Belege
Buchungsunterlagen, Kontenbelege, Bankauszüge
Geschäftskorrespondenz (z. B. Verträge, wichtige E-Mails)
Steuererklärungen, Steuerbescheide, Jahresabschlüsse
Lohnunterlagen, falls Sie Arbeitnehmer beschäftigen
Die Fristen hängen von der Art der Unterlage und der Rechtsform ab. Häufig genannt werden 8 Jahre für Buchungs- und Buchführungsunterlagen (dazu zählen Rechnungen und Belege), 10 Jahre für z. B. Jahresabschlüsse und Eröffnungsbilanzen, 6 Jahre für sonstige Geschäftsbriefe – die Frist beginnt regelmäßig mit Ende des Kalenderjahres, in dem die Unterlage entstanden ist. Diese Zahlen sind aber ungeprüft, und es gibt Ausnahmen und Besonderheiten, etwa bei Grundstücksgeschäften oder bei Kapitalgesellschaften.
Wo Sie es verbindlich prüfen können:
§ 147 AO auf gesetze-im-internet.de (Aufbewahrungsfristen für Steuerunterlagen)
§§ 257 ff. HGB (für Kaufleute und Kapitalgesellschaften)
Ihr Finanzamt oder ein Steuerberater kann Ihre konkrete Situation einordnen
Soll ich für Sie eine Websuche nach den aktuellen Aufbewahrungsfristen für Ihre Rechtsform durchführen?
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Die Quellen widersprechen sich hier, deshalb mit Vorsicht.
Was die Suchergebnisse zeigen:
Die Verbraucherzentrale (Stand: 23.10.2025) nennt für Selbstständige und Freiberufler:innen eine Aufbewahrungspflicht von 10 Jahren; die Frist beginnt mit dem Ende des Kalenderjahres, in dem die Rechnung ausgestellt oder der Vertrag geschlossen wurde verbraucherzentrale.de.
Mehrere andere Quellen behaupten, seit 2025 gelte für Buchungsbelege (Rechnungen, Quittungen, Kassenbons) eine Frist von 8 Jahren erfolgreich-selbststaendig-sein.de sparkreceipt.com flatpay.com. Eine davon erwähnt zusätzlich, E-Rechnungen (ZUGFeRD/XRechnung) müssten 10 Jahre GoBD-konform gespeichert werden kostenlose-erechnung.de – das ist aber nicht unabhängig bestätigt.
Eine Quelle nennt außerdem kürzere Fristen für spezielle Fälle, z. B. 2 Jahre für Belege zu umsatzsteuerpflichtigen Hausleistungen wie Handwerks- oder Gärtnerrechnungen kontist.com.
Einordnung: Die 8-Jahre-Angabe für Buchungsbelege neben 10 Jahren für Jahresabschlüsse entspricht der klassischen AO-Systematik; ob es 2025 tatsächlich eine Änderung gab, lässt sich aus den vorliegenden Auszügen nicht sicher bestätigen. Es wurde keine offizielle Quelle (z. B. Finanzamt, BMF, AO-Text) in den Ergebnissen gefunden – die genannten Zahlen können also falsch oder veraltet sein.
Mein Rat: Da die Quellen uneins sind (10 vs. 8 Jahre), prüfen Sie das beim Finanzamt, in der Abgabenordnung (§ 147 AO) oder bei Ihrem Steuerberater nach. Im Zweifel gilt: länger aufbewahren ist nie schädlich.
Soll ich nochmal gezielt nach einer offiziellen Quelle (z. B. BMF oder Gesetzentext) suchen?
~~~~~~

## 8. Q08 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie hoch ist der Kinderzuschlag maximal pro Kind und Monat?
~~~~~~

**Reference for the scorer:**

- Fact: maximum per child per month as published by the Familienkasse on the run day

### Answer A

~~~~~~markdown
Der Kinderzuschlag (KiZ) liegt aktuell bei bis zu 297 Euro pro Kind und Monat (Stand 2025).
Wichtige Hinweise:
Der Höchstbetrag wird bei der Berechnung mit dem Einkommen der Eltern verrechnet – je nach Einkommen kann der tatsächliche Betrag also niedriger ausfallen.
Der Kinderzuschlag wird bei der Familienkasse der Bundesagentur für Arbeit beantragt und meist für 6 Monate bewilligt.
Familien mit Kinderzuschlag sind oft auch anspruchsberechtigt für weitere Leistungen, z. B. Bildung und Teilhabe oder befreite Rundfunkbeiträge.
Da die Beträge regelmäßig angepasst werden (zuletzt zum 1. Januar 2025), empfehle ich, den aktuellen Wert auf der Seite der Bundesagentur für Arbeit (arbeitsagentur.de) zu prüfen – meine Angaben können veraltet sein. Dort gibt es auch einen Rechner zur Prüfung des Anspruchs.
~~~~~~

### Answer B

~~~~~~markdown
Der Kinderzuschlag (KiZ) liegt bei bis zu 297 Euro pro Kind und Monat (Stand 2025, gültig ab 1. Januar 2025).
Ein paar wichtige Punkte dazu:
Der Kinderzuschlag wird zusammen mit Wohngeld und/oder Bildung- und Teilhabe-Leistungen beantragt und soll Familien helfen, die zwar arbeiten, aber mit ihrem Einkommen den Bedarf der Kinder nicht vollständig decken können.
Die tatsächliche Höhe hängt vom Einkommen und Vermögen der Eltern ab – nicht jede Familie erhält den vollen Betrag.
Zuständig ist die Familienkasse der Bundesagentur für Arbeit; Anträge können online über das Portal der Bundesagentur gestellt werden.
Hinweis: Meine Angaben stammen aus Trainingsdaten und können veraltet sein – die Beträge werden regelmäßig angepasst. Für den aktuellen Stand empfehle ich einen Blick auf die Website der Bundesagentur für Arbeit (arbeitsagentur.de) oder eine kurze Nachfrage bei der Familienkasse.
~~~~~~

### Answer C

~~~~~~markdown
Der Kinderzuschlag (KiZ) beträgt seit 2024 maximal 297 Euro pro Kind und Monat (2023 waren es noch 250 Euro).
Wichtig zu wissen:
Der tatsächliche Betrag kann niedriger ausfallen, da er einkommensabhängig berechnet wird.
Ob und wie viel Kinderzuschlag Sie bekommen, hängt vom Einkommen und Vermögen der Eltern ab.
Beantragt wird der Kinderzuschlag bei der Familienkasse; dort gibt es auch einen Rechner zur Vorauszahlung ("KiZ-Lotse").
Hinweis: Mein Wissensstand hat ein unbestimmtes Enddatum, und solche Beträge werden regelmäßig angepasst. Die aktuellen Zahlen finden Sie auf familienportal.de oder bei der Familienkasse der Bundesagentur für Arbeit.
~~~~~~

## 9. Q09 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Muss ich für meine Zweitwohnung noch einmal Rundfunkbeitrag zahlen?
~~~~~~

**Reference for the scorer:**

- Fact: auf Antrag befreit, wenn für die Hauptwohnung gezahlt wird (seit dem BVerfG-Urteil 2018)

### Answer A

~~~~~~markdown
Grundsätzlich: Ja – für jede Wohnung fällt ein eigener Rundfunkbeitrag an, auch für eine Zweitwohnung service.bremen.deverbraucherfenster.hessen.derundfunkbeitrag.de.
Aber: Befreiung auf Antrag möglich. Seit dem 23. Rundfunkänderungsstaatsvertrag (in Kraft seit 1. Juni 2020) müssen Inhaber von Nebenwohnungen den Beitrag nicht doppelt zahlen rundfunkbeitrag.de. Die Befreiung gilt aber nicht automatisch – Sie müssen sie beim Beitragsservice beantragen und einen behördlichen Nachweis beilegen, z. B. eine Meldebescheinigung für beide Wohnungen oder den Zweitwohnungssteuerbescheid rundfunkbeitrag.de.
Wichtig zu wissen: Der Beitragsservice kann von sich aus nicht erkennen, ob eine Wohnung Haupt- oder Nebenwohnung ist rundfunkbeitrag.de – Sie sollten also aktiv tätig werden.
Ein Hinweis zur Höhe: Derzeit beträgt der Beitrag 18,36 € pro Monat pro Wohnung verbraucherfenster.hessen.de. Ob sich dieser Betrag geändert hat, entnehme ich den Suchergebnissen nicht – das prüfen Sie am besten auf rundfunkbeitrag.de.
Antrag und Infos: rundfunkbeitrag.de (Beitragsservice von ARD, ZDF und Deutschlandradio) rundfunkbeitrag.de.
~~~~~~

### Answer B

~~~~~~markdown
Kurze Antwort: In der Regel nein – aber nur, wenn bestimmte Voraussetzungen erfüllt sind und Sie aktiv eine Befreiung beantragen.
Grundregel: Für jede Wohnung muss grundsätzlich ein Rundfunkbeitrag gezahlt werden vzhh.deverbraucherfenster.hessen.de.
Ausnahme für Zweitwohnungen: Das Bundesverfassungsgericht hatte 2018 festgelegt, dass Inhaber von Nebenwohnungen den Beitrag nicht doppelt zahlen müssen rundfunkbeitrag.deverbraucherzentrale.de. Seit dem 23. Rundfunkänderungsstaatsvertrag (in Kraft seit 1. Juni 2020) gibt es dafür eine Befreiungsmöglichkeit rundfunkbeitrag.de.
Voraussetzungen laut Verbraucherzentrale Hamburg: Sie können eine Befreiung für die Zweitwohnung beantragen, wenn Sie
für Ihre erste Wohnung selbst angemeldet sind,
dort den Beitrag tatsächlich zahlen, und
einen Antrag auf Befreiung für die Zweitwohnung stellen vzhh.de.
Die Befreiung wird nicht automatisch erteilt – ohne Antrag zahlen Sie weiter für die Zweitwohnung. Der Antrag geht an den Beitragsservice (rundfunkbeitrag.de) verbraucherfenster.hessen.de.
Hinweis: Die genauen Antragsdetails und Formulare sind in den Suchauszügen nicht vollständig enthalten – die offizielle Seite rundfunkbeitrag.de (Abschnitt „Informationen zu Nebenwohnungen") wäre die beste Anlaufstelle dafür rundfunkbeitrag.de.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Grundsätzlich ja. Der Rundfunkbeitrag ist keine Kopfpauschale, sondern eine Abgabe pro Wohnung – unabhängig davon, wie viele Personen dort leben, ob Sie die Wohnung selten nutzen oder ob dort überhaupt Radio/TV empfangen wird. Eine Zweitwohnung in Deutschland gilt in der Regel als eigene Wohnung, für die ein eigener Beitrag anfällt.
Wann es anders aussehen kann:
Teil der Hauptwohnung: Als Wohnung gilt die Gesamtheit der zusammenhängenden Räume. Liegt die „Zweitwohnung" z. B. im selben Gebäude und wird als Einheit mit der Hauptwohnung genutzt, kann sie als Teil einer Wohnung gelten → nur ein Beitrag. Das entscheidet der Beitragsservice im Einzelfall.
Vermietete Zweitwohnung: Ist sie an Dritte vermietet, ist dort grundsätzlich der Bewohner (Mieter) Beitragszahler.
Ausland: Für Wohnungen außerhalb Deutschlands fällt kein deutscher Rundfunkbeitrag an.
Befreiung/Ermäßigung: Wer aus bestimmten Gründen befreit ist (z. B. bestimmte Sozialleistungen, Schwerbehinderung mit entsprechenden Merkzeichen), kann auch für die Zweitwohnung befreit oder ermäßigt sein – Voraussetzungen stehen im Gesetz.
Nur ein Zahler pro Wohnung: Leben in der Zweitwohnung mehrere Personen, fällt trotzdem nur ein Beitrag an.
Wichtig: Die Zweitwohnung ist beim Beitragsservice anmeldepflichtig; auch für die Frist dazu ist das Gesetz maßgeblich. Auch eine leerstehende Wohnung ist grundsätzlich beitragspflichtig.
Verbindlich prüfen können Sie das hier:
Rundfunkbeitragsstaatsvertrag (RBStV) auf gesetze-im-internet.de – insbesondere § 2 (Beitragspflicht) und § 10 (Anzeige-/Anmeldungspflicht)
ARD ZDF Germany Beitragsservice (rundfunkbeitrag.de) bzw. Ihre zuständige Landesrundfunkanstalt – dort gibt es auch eine FAQ zu Zweitwohnungen
Hinweis: Meine Angaben stammen aus Trainingsdaten ohne aktuelles Enddatum; Beträge und Einzelheiten können sich geändert haben. Soll ich das aktuelle Vorgehen (inkl. Betrag und Fristen) per Websuche für Sie nachprüfen?
~~~~~~

## 10. Q10 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Nach wie vielen Jahren verjährt eine normale offene Rechnung?
~~~~~~

**Reference for the scorer:**

- Fact: 3 Jahre (§ 195 BGB)
- Fact: Beginn am Ende des Jahres, in dem der Anspruch entstand (§ 199 BGB)

### Answer A

~~~~~~markdown
Bei einer gewöhnlichen offenen Rechnung (z. B. Kaufpreis, Handwerkerleistung, Dienstleistung) beträgt die regelmäßige Verjährungsfrist 3 Jahre (§ 195 BGB).
Wichtig für den Beginn:
Die Frist beginnt mit dem Ende des Jahres, in dem die Fälligkeit eintritt und der Gläubiger von den Umständen Kenntnis erlangt hat (§ 199 Abs. 1 BGB).
Beispiel: Rechnung vom 15. März 2023, fällig im April 2023 → Verjährung endet am 31. Dezember 2026.
Ohne Kenntnis gilt eine Höchstfrist von 10 Jahren ab Entstehung des Anspruchs.
Besonderheiten:
Bei Ansprüchen aus Kauf-/Werkverträgen von Unternehmen kann vertraglich eine kürzere Frist (z. B. 1–2 Jahre) vereinbart sein.
Handwerker haben teilweise längere Fristen (z. B. 4 Jahre für Bauarbeiten am Bauwerk, § 650k BGB).
Unterbrechende Maßnahmen wie Mahnung, Klage oder Vollstreckungsantrag setzen die Frist neu in Gang.
Hinweis: Ich bin kein Anwalt; bei einem konkreten Streitfall lohnt sich eine rechtliche Beratung, da die Details (Fälligkeit, Kenntnis, vereinbarte Fristen) den Ausschlag geben können.
~~~~~~

### Answer B

~~~~~~markdown
Bei einer normalen offenen Rechnung gilt in Deutschland grundsätzlich die regelmäßige Verjährungsfrist von 3 Jahren (§ 195 BGB).
Wichtig dabei:
Beginn: Die Frist beginnt erst mit Ende des Jahres, in dem die Fälligkeit eintritt und der Gläubiger von den Umständen Kenntnis erlangt hat (§ 199 BGB). Eine Rechnung von z. B. März 2024 verjährt also meist erst am 31.12.2027.
Kaufleute untereinander: Bei beidseitigen Handelsgeschäften verkürzt sich die Frist auf 2 Jahre (§ 196 HGB).
Unterbrechung: Eine Zahlungserinnerung, Mahnung oder Teilzahlung kann die Verjährung neu in Lauf setzen (neue Frist, mindestens 3 Monate bzw. je nach Grund neu).
Klage: Eine rechtshängige Klage hemmt die Verjährung.
Bitte beachten: Das ist eine allgemeine Information, keine Rechtsberatung – im konkreten Fall (z. B. bei AGB-Klauseln, anderen Vertragstypen oder gerichtlich festgestellten Ansprüchen, die bis zu 30 Jahre verjähren können) lohnt sich eine Beratung durch eine Anwältin/einen Anwalt.
~~~~~~

### Answer C

~~~~~~markdown
Bei einer normalen offenen Rechnung (Kaufpreis-/Werkleistungsforderung) gilt in Deutschland in der Regel die reguläre Verjährungsfrist von 3 Jahren (§ 195 BGB).
Wichtig dabei:
Beginn: Die Frist beginnt mit Ende des Jahres, in dem die Forderung entstanden ist und der Gläubiger von den Umständen Kenntnis erlangt hat (§ 199 BGB). Beispiel: Rechnung vom 15. März 2024 → Verjährung endet am 31. Dezember 2027.
Unterbrechung/Neubeginn: Eine Zahlungserinnerung, Mahnung, Teilzahlung oder gerichtliche Geltendmachung (z. B. Mahnbescheid, Klage) kann die Verjährung hemmen oder neu in Gang setzen.
Ausnahmen: Manche Forderungen verjähren abweichend – z. B. einige Handwerker- und Architektenforderungen in 2 Jahren, rückständiger Unterhalt oder Ansprüche aus Urteilen in 30 Jahren.
Hinweis: Das ist eine allgemeine Information und ersetzt keine Rechtsberatung – im konkreten Fall (z. B. Mahnverfahren, Verjährungsunterbrechung) lohnt der Blick auf die genauen Daten oder der Gang zu einem Anwalt.
~~~~~~

## 11. Q11 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Mir wurde gekündigt. Bis wann muss ich Kündigungsschutzklage einreichen?
~~~~~~

**Reference for the scorer:**

- Fact: innerhalb von 3 Wochen nach Zugang der schriftlichen Kündigung (§ 4 KSchG)

### Answer A

~~~~~~markdown
Das tut mir leid – und wichtig: Diese Frist ist kurz und verpasst sie, gilt die Kündigung in aller Regel als wirksam. Bitte kümmern Sie sich sofort darum.
Die Grundregel
Die Klage wird beim Arbeitsgericht eingereicht, in deren Bezirk der Betrieb liegt.
Die Frist beginnt mit dem Zugang der Kündigung – also dem Moment, in dem Ihnen das Kündigungsschreiben tatsächlich zugegangen ist (z. B. Unterschrift bei persönlicher Übergabe oder Einwurf-Einschreiben), nicht dem Datum auf dem Schreiben.
Es handelt sich um eine Ausschlussfrist: Nach Ablauf gilt die Kündigung im Nachhinein als wirksam, selbst wenn sie rechtlich fehlerhaft war.
Wie lang die Frist ist
Gesetzlich gilt – soweit ich das ohne Überprüfung sagen kann – eine Frist von drei Wochen ab Zugang der Kündigung (§ 4 KSchG, nach § 5 KSchG auch für Kündigungen außerhalb des allgemeinen Kündigungsschutzes; § 17 TzBfG für befristete Arbeitsverhältnisse). Diesen Wert bitte unbedingt selbst verifizieren, da ich hier keinen amtlichen Quelltext vorliegen habe.
Wo Sie das verlässlich prüfen
Gesetzestexte: gesetze-im-internet.de (KSchG §§ 4, 5; TzBfG § 17)
Ihr zuständiges Arbeitsgericht
Ein Fachanwalt/fachanwältin für Arbeitsrecht oder Ihre Gewerkschaft, falls Sie Mitglied sind – die Erstberatung ist oft kurzfristig möglich, und die Frist läuft weiter, während Sie beraten lassen.
Sofort-Checkliste
Datum und Uhrzeit des Zugangs notieren (Zeugen? Einschreiben?)
Anwalt/Gewerkschaft kontaktieren – noch heute oder morgen
Parallel bei der Agentur für Arbeit arbeitssuchend melden (auch dafür gelten Fristen, die Sie dort erfragen)
Soll ich für Sie eine Websuche nach der aktuellen Fassung des § 4 KSchG und zur Fristberechnung durchführen?
~~~~~~

### Answer B

~~~~~~markdown
Innerhalb von drei Wochen nach Zugang der schriftlichen Kündigung müssen Sie Kündigungsschutzklage beim Arbeitsgericht einreichen – das gilt laut § 4 KSchG unabhängig davon, ob die Kündigung ordentlich oder fristlos war gesetze-im-internet.deafa-anwalt.de.
Wichtige Punkte aus dem Gesetzestext gesetze-im-internet.de:
Die Frist beginnt mit dem Zugang der schriftlichen Kündigung, nicht mit dem Ausspruch.
Haben Sie Einspruch beim Betriebsrat eingelegt, sollten Sie der Klage die Stellungnahme des Betriebsrats beifügen.
Bedarf die Kündigung der Zustimmung einer Behörde, beginnt die Frist erst mit Bekanntgabe der Behördenentscheidung an Sie.
Die Bundesagentur für Arbeit bestätigt die 3-Wochen-Frist beim zuständigen Arbeitsgericht arbeitsagentur.de.
Achtung: Versäumen Sie die Frist, gilt die Kündigung in der Regel als wirksam. Die Quellen hier sagen nicht, ob und unter welchen Voraussetzungen eine nachträgliche Fristverlängerung möglich ist – das sollte eine Anwältin/ein Anwalt für Arbeitsrecht klären, zumal die Frist sehr knapp bemessen ist.
~~~~~~

### Answer C

~~~~~~markdown
Das Wichtigste zuerst: Sie haben nur drei Wochen ab Zugang der Kündigung.
Die Frist (§ 4 Satz 1 KSchG)
Die Kündigungsschutzklage muss innerhalb von drei Wochen nach Zugang der schriftlichen Kündigung beim Arbeitsgericht eingereicht werden wbs.legalafa-anwalt.dera-gottier.de.
Das gilt unabhängig davon, ob ordentlich oder fristlos gekündigt wurde afa-anwalt.de.
Fristbeginn und -ende
Die Frist beginnt mit dem Tag des Erhalts der Kündigung. Fällt dieser auf einen Werktag, endet die Frist um 24 Uhr des entsprechenden Wochentags drei Wochen später; fällt der Zugang auf Samstag, Sonntag oder Feiertag, endet die Frist am darauffolgenden Werktag um 24 Uhr wbs.legal.
Ausnahme: Muss die Kündigung zunächst von einer Behörde bestätigt werden (z. B. bei schwerbehinderten Arbeitnehmern), beginnt die Frist erst mit Bekanntgabe der Behördenentscheidung an Sie wbs.legal.
Wenn Sie die Frist versäumen
Gilt die Kündigung als von Anfang an rechtswirksam – auch wenn ein Gericht möglicherweise anders entschieden hätte wbs.legal.
Eine nachträgliche Zulassung der Klage ist nur in seltenen Ausnahmen möglich (§ 5 KSchG), z. B. bei unverschuldet verhinderter Einreichung wie schwerer Krankheit, oder wenn eine Frau erst nach Fristablauf von ihrer Schwangerschaft im Kündigungszeitpunkt erfährt wbs.legal. Nach einem weiteren Suchtreffer muss in solchen Fällen die Klage innerhalb von zwei Wochen nach Beseitigung des Hindernisses eingereicht und der Versäumnisgrund nachgewiesen werden advocado.de.
Hinweis: Alle Quellen hier sind Anwaltskanzlei-Ratgeber, keine offizielle Behörden- oder Gerichtsseite; die zitierte Gesetzeslage (§ 4, § 5, § 7 KSchG) ist aber konsistent dargestellt. Da die Frist sehr streng ist, empfehle ich dringend, zeitnah anwaltlichen Rat einzuholen – z. B. über eine Rechtsschutzversicherung, eine Beratungsstelle oder einen Fachanwalt für Arbeitsrecht.
~~~~~~

## 12. Q12 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie hoch ist der Arbeitnehmer-Pauschbetrag in der Steuererklärung?
~~~~~~

**Reference for the scorer:**

- Fact: amount per § 9a EStG for the tax year (1,230 EUR since 2023 unless changed)

### Answer A

~~~~~~markdown
Der Arbeitnehmer-Pauschbetrag ist ein pauschaler Abzug für Werbungskosten bei nichtselbständiger Arbeit (Anlage N). Die Grundregeln:
Automatischer Ansatz: Er wird vom Finanzamt immer angesetzt, auch wenn du keine Werbungskosten angibst.
Günstigerprinzip: Nachweist du höhere tatsächliche Werbungskosten (z. B. Fahrten zur Arbeit, Arbeitsmittel, Fortbildung, Homeoffice-Pauschale), setzt das Finanzamt stattdessen diese höheren Beträge an.
Geltungsbereich: Er gilt je Arbeitnehmer für das Kalenderjahr, unabhängig von der Anzahl der Dienstverhältnisse. Bei geringfügiger Beschäftigung ist er auf den Arbeitslohn begrenzt.
Rechtsgrundlage: Der Betrag steht in § 9a EStG und wurde in der Vergangenheit mehrfach angehoben.
Nach meinem (ungeprüften) Kenntnisstand liegt er seit 2022 bei 1.230 € pro Jahr – das kann veraltet sein, da sich der Betrag per Gesetz ändert. Den verbindlichen aktuellen Wert findest du in § 9a EStG auf gesetze-im-internet.de oder über dein Finanzamt bzw. das Bundesfinanzministerium.
Soll ich eine Websuche durchführen, um den aktuellen Betrag zu prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Der Arbeitnehmer-Pauschbetrag (Werbungskosten-Pauschbetrag) beträgt 1.230 € pro Jahr – für 2025 und 2026 steuertipps.desteuerbot.comsteuern.desteuererklaerung.finanzleser.de. Zuvor lag er bei 1.200 € steuern.de.
Wichtige Punkte:
Er wird automatisch angesetzt, wenn Sie keine oder nur geringere Werbungskosten nachweisen; höhere nachgewiesene Werbungskosten verdrängen den Pauschbetrag steuerbot.comsteuertipps.de.
Er wird bereits monatlich beim Lohnsteuerabzug berücksichtigt (Steuerklassen I–V) und darf vom Finanzamt nicht gekürzt werden, auch nicht bei unterjährigem Austritt oder nachgewiesenen geringeren Kosten steuertipps.de.
Bei mehreren Arbeitsverhältnissen gibt es ihn nur einmal; Mini-Jobs (pauschal versteuert) erhalten keinen Pauschbetrag steuertipps.de.
Ehepartner haben jeweils einen eigenen Anspruch steuertipps.de.
Liegt der Arbeitslohn unter 1.230 €, wird er auf 0 € reduziert, aber nicht negativ steuertipps.de.
Hinweis: Alle genannten Quellen sind kommerzielle Ratgeber-Seiten, keine offiziellen Quellen (z. B. BMF oder Gesetzestext). Der Betrag von 1.230 € ist über mehrere unabhängige Quellen konsistent, aber für Verbindliches prüfen Sie am besten das BMF oder Ihre Steuerberatung.
~~~~~~

### Answer C

~~~~~~markdown
Der Arbeitnehmer-Pauschbetrag beträgt 1.230 € pro Jahr (ab 2023) finanzamt.nrw.de.
Entwicklung laut FAQ des Landesamts für Steuern Niedersachsen: bis 2021 waren es 1.000 €, 2022 waren es 1.200 € und ab 2023 sind es 1.230 € lstn.niedersachsen.de.
Wichtig zu wissen:
Der Pauschbetrag wird automatisch abgezogen, auch ohne tatsächliche Werbungskosten – er muss nicht extra auf der Anlage N eingetragen werden finanzamt.nrw.de.
Höhere nachgewiesene Werbungskosten können geltend gemacht werden; das Finanzamt berücksichtigt automatisch das für Sie günstigere Ergebnis finanzamt.nrw.de.
Bei Ehepaaren/Lebenspartnerschaften wird der Pauschbetrag bei beiden berücksichtigt (Frage auf der NRW-Seite aufgeführt; Details dort nachlesen) finanzamt.nrw.de.
Hinweis: Die Quellen sind offizielle Seiten (Finanzamt NRW, Landesamt für Steuern Niedersachsen, BMF), aber es wurden nur Suchauszüge bzw. ein Seitenanfang abgerufen – für aktuelle Werte des Steuerjahres 2025/2026 lohnt ein Blick auf die genannten Seiten, da ich anhand dieser Auszüge keine Änderungen nach 2023 belegen kann.
~~~~~~

## 13. Q13 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wann ist die Grundsteuer fällig?
~~~~~~

**Reference for the scorer:**

- Fact: vierteljährlich zum 15.2., 15.5., 15.8. und 15.11.
- Fact: auf Antrag jährlich zum 1. Juli
- Fact: Beträge bis 15 EUR jährlich zum 15.8.

### Answer A

~~~~~~markdown
Die Grundsteuer ist eine Jahressteuer, die in der Regel in vier Viertel-Vorauszahlungen fällig wird: am 15. Februar, 15. Mai, 15. August und 15. November bayernportal.delohnsteuer-kompakt.de.
Einige Details:
Zahlung an die Gemeinde: Festsetzung und Erhebung der Grundsteuer erfolgen durch die Gemeinde, in der das Grundstück liegt – nicht durch das Finanzamt lstn.niedersachsen.de.
Jährliche Zahlung auf Antrag möglich: Auf Antrag kann die Steuer statt quartalsweise einmal jährlich gezahlt werden. In Bayern z. B. ist dieser Antrag bis zum 30. September des Vorjahres bei der Gemeinde zu stellen bayernportal.de; dass eine einmalige Zahlung bei geringen Summen bzw. auf Antrag möglich ist, bestätigt auch ein nicht-offizieller Quellenangabe baufi24.de.
Fälligkeitszeitpunkte konkret: Die genauen Fälligkeiten ergeben sich aus Ihrem Grundsteuerbescheid; die Bescheide über Grundsteuerwert und Messbetrag enthalten nur die Bemessungsgrundlagen berlin.de.
Hinweis: Die konkreten Fälligkeitstage und Ausnahmen (z. B. Einmalzahlung) können je nach Bundesland und Bescheid abweichen – maßgeblich ist Ihr Grundsteuerbescheid bzw. die Auskunft Ihrer Gemeinde.
~~~~~~

### Answer B

~~~~~~markdown
Die Grundsteuer ist in der Regel vierteljährlich fällig am 15. Februar, 15. Mai, 15. August und 15. November finanzen.bremen.de stadt.muenchen.de.
Einige Punkte dazu:
Jahreszahlung auf Antrag: Wenn Sie beantragen, die Steuer in einer Summe zu zahlen, ist sie am 1. Juli fällig. Die Umstellung gilt allerdings erst für das Folgejahr stadt.muenchen.de.
Fälligkeitszeitpunkte konkret: Welcher Betrag wann zu zahlen ist, ergibt sich aus Ihrem Grundsteuerbescheid – die Bescheide über Grundsteuerwert und Messbetrag enthalten nur die Bemessungsgrundlagen berlin.de.
Zahlungsempfänger: Festsetzung und Erhebung obliegen der Gemeinde, in der das Grundstück liegt lstn.niedersachsen.de.
Hinweis: Die Quellen sind überwiegend Suchauszüge; für Ihr Bundesland/Ihre Gemeinde lohnt ein Blick in den Bescheid oder auf die Website Ihrer Gemeinde, da Details (z. B. Erleichterungen bei geringen Beträgen) dort geregelt sein können.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Die Grundsteuer wird von deiner Gemeinde festgesetzt und ist in der Regel quartalsweise in vier Teilbeträgen fällig. Die gesetzlichen Standardtermine liegen jeweils Mitte der Quartalsmonane (üblicherweise 15. Februar, 15. Mai, 15. August und 15. November – unüberprüft, § 28 GrStG).
Wichtig zu wissen:
Der Grundsteuerbescheid ist maßgeblich – dort stehen die konkreten Fälligkeitstermine und Beträge.
Sehr kleine Jahresbeträge werden meist nur einmal jährlich fällig.
Gemeinden können per Satzung abweichen, z. B. jährliche, halbjährliche oder monatliche Zahlungstermine festlegen. Deshalb lohnt sich ein Blick in die Satzung deiner Gemeinde.
Wo du es verbindlich prüfst:
§ 28 Grundsteuergesetz (GrStG) auf gesetze-im-internet.de
Deine Gemeinde-/Stadtkasse bzw. der Steuerbescheid selbst
Soll ich das für dich genauer nachschlagen – etwa die aktuellen Termine oder die Regelung einer bestimmten Gemeinde?
~~~~~~

## 14. Q14 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie viel darf ich als BAföG-Empfänger nebenbei verdienen, ohne dass mir etwas abgezogen wird?
~~~~~~

**Reference for the scorer:**

- Fact: Hinzuverdienstgrenze per BAföG on the run day (orientated to the Minijob limit)

### Answer A

~~~~~~markdown
Als BAföG-Empfänger können Sie seit dem 1. Januar 2026 insgesamt 603 Euro im Monat hinzuverdienen, ohne dass das BAföG gekürzt wird magazin.minijob-zentrale.de. Das ergibt sich aus dem 29. BAföG-Änderungsgesetz, das den Freibetrag an die Verdienstgrenze von Minijobs angepasst hat magazin.minijob-zentrale.de.
Einige Punkte dazu:
Anpassung automatisch: Zukünftige Änderungen der Minijob-Verdienstgrenze wirken sich direkt auf den BAföG-Freibetrag aus magazin.minijob-zentrale.de.
Bewilligungszeitraum: Über einen Bewilligungszeitraum von 12 Monaten dürfen Nichtselbstständige insgesamt 6.672 Euro verdienen, ohne dass dieser Betrag bei der BAföG-Berechnung berücksichtigt wird stadt.muenchen.de.
Automatismus im Gesetz: Laut Bundesagentur für Arbeit sorgt eine Gesetzesänderung dafür, dass Verdienst innerhalb der Minijobgrenzen im BAföG grundsätzlich anrechnungsfrei bleibt arbeitsagentur.de.
Kurzfristige Beschäftigung: Alternativ ist eine auf drei Monate oder 70 Arbeitstage befristete Beschäftigung möglich, bei der die Verdiensthöhe keine Rolle spielt (in der Landwirtschaft: 15 Wochen oder 90 Arbeitstage) magazin.minijob-zentrale.de.
Werkstudenten: Während der Vorlesungszeit dürfen Werkstudierende nicht mehr als 20 Stunden pro Woche arbeiten; je nach Verdienst kann die Stelle als Midijob gelten magazin.minijob-zentrale.de.
Da die Berechnung im Einzelfall vom BAföG-Amt geprüft wird, empfiehlt sich bei Unsicherheiten eine Rücksprache mit dem zuständigen Amt magazin.minijob-zentrale.de.
~~~~~~

### Answer B

~~~~~~markdown
Als BAföG-Empfänger darfst du 2026 bis zu 603 € im Monat bzw. 7.236 € im Jahr dazuverdienen, ohne dass dein BAföG gekürzt wird mystipendium.debafoeg-rechner.destudysmarter.de.
Wichtig zu wissen:
Anrechnungsfrei: Ein Minijob bis 603 €/Monat bleibt komplett anrechnungsfrei studysmarter.de. Es gibt keine absolute Einkommensgrenze – du darfst mehr verdienen, aber der Betrag über dem Freibetrag wird vom BAföG abgezogen mlp-financify.demystipendium.de.
Steuerfreie Einnahmen: Zusätzlich bleiben steuerfreie Einnahmen (z. B. aus pflegenden, künstlerischen oder erzieherischen Tätigkeiten) bis 3.300 €/Jahr anrechnungsfrei mystipendium.de.
Mehrere Jobs: Einkommen aus mehreren Jobs und vergüteten Praktika werden zusammengerechnet mystipendium.de.
20-Stunden-Regel: Wer während der Vorlesungszeit regelmäßig mehr als 20 Stunden pro Woche arbeitet, verliert den Anspruch auf Studenten-BAföG mystipendium.de.
Ausnahme: Bei Pflichtpraktika ist die Grenze geringer bafoeg-rechner.de.
Überschreitest du den Freibetrag, wird der übersteigende Betrag über 12 Monate vom BAföG abgezogen mystipendium.de. Da die Quellen hier Suchauszüge und Ratgeberseiten (keine offiziellen Behördenangaben) sind, lohnt sich zur Sicherheit ein Blick beim BMBF oder deiner BAföG-Stelle.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Es gibt einen jährlichen Freibetrag für eigenes Einkommen aus Nebenjobs (§ 23 BAföG). Solange du darunter bleibst, wird nichts vom BAföG abgezogen.
Die wichtigsten Grundregeln:
Jahresbetrachtung: Das Einkommen wird für den gesamten Bewilligungszeitraum (meist 12 Monate) zusammengerechnet, nicht monatlich. Du kannst also in einem Monat mehr und im nächsten weniger verdienen.
Nur der Überschuss zählt: Was über dem Freibetrag liegt, mindert das BAföG in der Regel zur Hälfte (ca. 50 % des übersteigenden Betrags).
Zuflussprinzip: Es zählt, wann das Geld ausgezahlt wird, nicht wann du es verdienst. Eine Auszahlung, die in einen BAföG-Bezugsmonat fällt, wird angerechnet.
Brutto, nicht netto: Der Bruttolohn ist maßgeblich.
Anteilige Berechnung: Der Freibetrag wird nur für die Monate angesetzt, in denen du tatsächlich BAföG bekommst.
Besonderheiten: Für Schüler:innen gelten teils andere Beträge als für Studierende; bei Verheirateten zählt zusätzlich das Einkommen des Partners/der Partnerin gesondert, und bei Kindern gibt es zusätzliche Freibeträge.
Zur Höhe: Nach meinem Stand aus den Trainingsdaten (Enddatum unbekannt, kann veraltet sein) liegt der Freibetrag für Studierende seit der letzten Reform bei rund 6.660 € brutto im Jahr (ca. 555 € monatlich). Dieser Wert ist ungeprüft und könnte sich geändert haben.
Verbindlich prüfen kannst du das hier:
§ 23 BAföG samt Anlage auf gesetze-im-internet.de (dort steht der aktuelle Freibetrag)
Die offizielle BAföG-Website bafög.de
Dein BAföG-Amt (bei Studierenden meist beim Studentenwerk bzw. Amt für Ausbildungsförderung)
Soll ich eine Websuche nach dem aktuellen Freibetrag machen?
~~~~~~

## 15. Q15 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie viele Kinderkrankentage habe ich als gesetzlich versicherter Elternteil im Jahr?
~~~~~~

**Reference for the scorer:**

- Fact: days per child and parent per year as in § 45 SGB V on the run day (single parents double)

### Answer A

~~~~~~markdown
Als gesetzlich versicherter Elternteil haben Sie pro Kind und Jahr 10 Arbeitstage Anspruch auf Kinderkrankengeld (bei einem Kind).
Bei mehreren Kindern gilt:
Insgesamt maximal 25 Arbeitstage pro Jahr für alle Kinder zusammen
Pro Kind und Jahr maximal 10 Arbeitstage (auch wenn Sie z. B. zwei Kinder haben, können Sie nicht 20 Tage pro Kind nehmen, sondern insgesamt höchstens 25 Tage)
Wichtige Voraussetzungen:
Das Kind ist gesetzlich mitversichert
Das Kind ist unter 12 Jahre alt oder behindert und auf Hilfe angewiesen
Eine ärztliche Bescheinigung liegt vor, dass Sie das Kind beaufsichtigen, betreuen oder pflegen müssen
Eine andere Person im Haushalt kann das Kind nicht betreuen
Sie sind berufstätig (keine Teilzeit unter der Mindestarbeitszeit, die den Anspruch ausschließen würde)
Hinweis: Bei Alleinerziehenden verdoppelt sich der Anspruch in der Regel auf 20 Tage pro Kind (maximal 45 Tage insgesamt).
Da sich Regelungen zum Kinderkrankengeld (etwa während Pandemiezeiten) ändern können, lohnt sich ein Blick auf die aktuellen Angaben der Krankenkasse oder des Bundesgesundheitsministeriums.
~~~~~~

### Answer B

~~~~~~markdown
Als gesetzlich versicherter Elternteil hast du grundsätzlich 10 Arbeitstage pro Kind und Jahr Anspruch auf Kinderkrankengeld (Freistellung durch die Krankenkasse).
Wichtige Punkte dazu:
Maximal 25 Arbeitstage pro Jahr, wenn du mehrere Kinder hast (gilt bei mindestens zwei Kindern).
Bei alleinerziehenden Elternteilen verdoppelt sich der Anspruch: 20 Arbeitstage pro Kind, maximal 50 Arbeitstage bei mehreren Kindern.
Voraussetzung: Das Kind ist unter 12 Jahre (oder behindert und pflegebedürftig), du bist berufstätig, und eine ärztliche Bescheinigung liegt vor, dass du das Kind beaufsichtigen/pflegen musst und keine andere Person im Haushalt das übernehmen kann.
Die Tage müssen nicht am Stück genommen werden.
Hinweis: Die genauen Regelungen (z. B. Sonderregelungen während Pandemiezeiten) wurden in den letzten Jahren mehrfach geändert. Für verbindliche Angaben empfehle ich einen Blick auf die Website deiner Krankenkasse oder des Bundesgesundheitsministeriums, da sich Details ändern können.
~~~~~~

### Answer C

~~~~~~markdown
Als gesetzlich versicherter Elternteil haben Sie pro Kind und Kalenderjahr 10 Arbeitstage Anspruch auf Kinderkrankengeld, wenn Sie Ihr erkranktes Kind betreuen, weil Sie nicht arbeiten können [source: Sozialgesetzbuch V, § 45].
Wichtig zu wissen:
Bei mehreren Kindern haben Sie maximal 25 Arbeitstage pro Jahr insgesamt (nicht pro Kind).
Alleinerziehende haben einen erweiterten Anspruch: 20 Arbeitstage pro Kind, maximal 45 Arbeitstage bei mehreren Kindern.
Voraussetzung ist u. a., dass Ihr Kind unter 12 Jahren ist (bei Behinderung gibt es Ausnahmen), ein Arzt das Kind betreut und keine andere Person im Haushalt die Betreuung übernehmen kann.
Hinweis: Die genauen Details (z. B. Dauer bei besonderen Fällen, Anspruch bei mehreren Kindern) können sich durch Gesetzesänderungen ändern. Da sich mein Wissensstand auf Trainingsdaten bezieht und nicht tagesaktuell ist, empfehle ich, die aktuellen Regelungen auf der Seite der Deutschen Rentenversicherung oder Ihrer Krankenkasse zu prüfen. Möchten Sie, dass ich nach aktuellen Informationen suche?
~~~~~~

## 16. Q16 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Muss ich meinen Hund in Bayern überall an der Leine führen?
~~~~~~

**Reference for the scorer:**

- Fact: keine landesweite allgemeine Leinenpflicht; Gemeinden regeln es per Verordnung; besondere Regeln für Kampfhunde

### Answer A

~~~~~~markdown
Leinenpflicht für Hunde in Bayern
Nein, es gibt keine generelle Leinenpflicht überall in Bayern. Die Regeln hängen vom Ort ab:
Wo Leinenpflicht gilt (typischerweise):
In Ortslagen / bebauten Gebieten: Viele bayerische Gemeinden haben Verordnungen, die Hunde im Ortsinneren an die Leine setzen. Die Details unterscheiden sich von Gemeinde zu Gemeinde.
In Natur- und Landschaftsschutzgebieten, Nationalparks: Hunde müssen dort grundsätzlich angeleint oder dürfen sogar ganz verboten sein (Schilder beachten).
Auf Kinderspielplätzen, Schulhöfen und ähnlichen Flächen gilt oft ein Leinenzwang oder sogar Hundeverbot.
In landwirtschaftlich genutzten Flächen (z. B. Felder mit Wild): Hunde müssen angeleint sein – hier gilt das bayerische Jagdrecht, und Wilderern drohen bei Störungen des Wildes auch Bußgelder.
Wo es meist erlaubt ist:
Auf ausgewiesenen Hundewiesen oder in vielen Wäldern außerhalb von Schutzgebieten darf der Hund (unter Aufsicht) auch frei laufen – solange er nicht Wild jagt oder andere belästigt.
Wichtig:
Maßgeblich sind die kommunale Hundeverordnung und lokale Schilder – die Regeln sind sehr ortsabhängig.
Bei Verstößen drohen Bußgelder.
Ausnahmen gelten meist für Blinde-, Behinderten- und Diensthunde.
Für Ihren Wohnort lohnt ein Blick auf die Website Ihrer Gemeinde oder ein kurzer Anruf beim Ordnungsamt, da ich die lokalen Verordnungen nicht kenne.
~~~~~~

### Answer B

~~~~~~markdown
Nein, in Bayern gilt nicht überall Leinenpflicht, aber es gibt wichtige Ausnahmen:
Wo Leinenpflicht besteht:
Öffentliche Straßen, Wege und Plätze innerhalb von Ortschaften (im "bebuildeten Bereich"): Hunde müssen grundsätzlich angeleint sein.
Wald: In bayerischen Wäldern besteht ganzjährig Leinenpflicht (Waldgesetz).
Landwirtschaftliche Flächen: Beim Betreten angeleint.
Natur- und Landschaftsschutzgebiete, Nationalparks: Meist strenge Leinenpflicht, teils sogar Betretungsverbote.
Öffentliche Gebäude, Kirchen, Schulen, Kindergärten, Krankenhäuser, Märkte: Leinenpflicht bzw. teils Hundeverbot.
Badesee-/Strandbereiche: Oft lokale Regelungen, teils Verbot im Badestrand.
Wo die Leine meist nicht nötig ist:
Freiflächen außerhalb der genannten Bereiche (z. B. Feldwege außerhalb der Ortslage, wo kein Betretungsverbot gilt) – dort gilt die allgemeine "Sachkunde"-Pflicht: Der Hund muss unter Kontrolle sein.
Zusätzlich zu beachten:
Kommunale Verordnungen: Städte und Gemeinden können strengere Regeln haben, z. B. ausgewiesene Hundewiesen oder Auslaufzonen. Ein Blick in die örtliche Hundeverordnung lohnt sich.
Rassenspezifische Regeln: Für bestimmte Hunde (Listenhunde) gelten in Bayern strengere Vorschriften, u. a. Maulkorb- und Leinenpflicht an öffentlichen Orten.
Bußgelder bei Verstößen können je nach Kommune erheblich sein.
Kurz gesagt: Innerorts, im Wald und in Schutzgebieten: Leine. Außerhalb davon und auf ausgewiesenen Auslaufflächen: meist erlaubt, sofern der Hund zuverlässig gehorcht.
Da sich Vorschriften ändern können und Gemeinden eigene Regeln erlassen, empfehle ich, die aktuelle Hundeverordnung Ihrer Stadt/Gemeinde zu prüfen (z. B. auf der kommunalen Website) – meine Angaben können im Detail veraltet sein.
~~~~~~

### Answer C

~~~~~~markdown
Nein, in Bayern gilt nicht überall Leinenpflicht. Grobe Regeln:
Wo Leinenpflicht (meist kurze Leine) gilt:
In Ortsgebieten und auf öffentlichem Verkehrsraum – hier greift oft kommunale Leinenpflicht
In vielen Städten und Gemeinden per Verordnung, z. B. in Parks, Spielplätzen, auf Friedhöfen
In Naturschutzgebieten und Nationalparks (dort oft durchgehende Leinenpflicht)
Auf Kinderspielplätzen ist das Freilaufen in der Regel verboten
Wo Freilauf meist erlaubt ist:
Unbebautem Gelände außerhalb von Naturschutzgebieten, wenn der Hund unter Aufsicht bleibt
Wichtig: Die Details regeln in Bayern das Landesrecht (z. B. das Bayerische Hundegesetz) plus lokale Verordnungen, die sich von Gemeinde zu Gemeinde unterscheiden. Bei Jagdgebieten gilt zusätzlich: In der Zeit von 1. März bis 15. Oktober dürfen Hunde in der freien Natur grundsätzlich nicht unbeaufsichtigt laufen (Wildschutz).
Am besten prüfen Sie die Verordnung Ihrer Gemeinde (Website des Ortes oder Rathaus) – dort steht, wo genau Leinenpflicht besteht und ob Ausnahmen gelten. Für die genaue Rechtslage bin ich mir bei einzelnen Bestimmungen nicht sicher, verbindlich ist der aktuelle Gesetzestext bzw. die Auskunft der Gemeinde.
~~~~~~

## 17. Q17 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Welcher Mehrwertsteuersatz gilt 2026 für Essen im Restaurant?
~~~~~~

**Reference for the scorer:**

- Fact: rate for restaurant food (not drinks) in force in 2026 per the UStG on the run day

### Answer A

~~~~~~markdown
Das kann ich für 2026 nicht sicher sagen – hier der Stand aus meinen Trainingsdaten (mit unbekanntem Stichtag, also möglicherweise veraltet):
Grundregel seit 1.1.2024:
Speisen zum Verzehr im Restaurant: 19 %
Speisen zum Mitnehmen / Lieferung: 7 %
Alkoholische Getränke: 19 % (unverändert)
Nichtalkoholische Getränke an Ort und Stelle: 19 %
Mögliche Änderung: Die 2025 gebildete Bundesregierung hat im Koalitionsvertrag vereinbart, die Umsatzsteuer für Restaurantbesuche (Speisen) von 19 % auf 7 % zu senken; die Umsetzung wurde für 2026 angestrebt. Ob und ab welchem Datum das tatsächlich in Kraft getreten ist, kann ich nicht verlässlich bestätigen.
So überprüfst du den aktuellen Stand:
Website des Bundesfinanzministeriums (BMF) bzw. die Umsatzsteuer-Hinweise der IHK
Die Rechnung im Restaurant zeigt den ausgewiesenen Steuersatz
Sag gern Bescheid, wenn ich dazu eine aktuelle Websuche machen soll.
~~~~~~

### Answer B

~~~~~~markdown
Kurz: Das kann ich für 2026 nicht verlässlich sagen – hier besteht gerade politischer Änderungsdruck, und mein Wissen hat einen unbekannten Endzeitpunkt und kann veraltet sein.
Was als feste Regel gilt (Stand meiner Daten):
Speisen und nichtalkoholische Getränke beim Verzehr im Restaurant: 7 % (ermäßigter Satz, seit dem 1.1.2020 dauerhaft; davor 19 %).
Alkoholische Getränke: 19 % (unverändert).
Zum Vergleich: Juli 2020 bis Ende 2022 galt für Speisen übergangsweise sogar nur 5 %.
Warum für 2026 Unsicherheit besteht:
Im Koalitionsvertrag von 2025 war geplant, den Satz für Restaurantbesuche von 7 % wieder auf 19 % anzuheben (Haushaltsgründe). Ob und wann das umgesetzt wurde bzw. ob es kippte, kann ich nicht sicher bestätigen.
Wo Sie den verbindlichen Stand prüfen:
Umsatzsteuergesetz, § 12 Abs. 2 (gesetze-im-internet.de) – hier steht der aktuell geltende Satz
Bundesministerium der Finanzen (bmf.de)
Ihre Steuerberatung oder die IHK; praktisch sehen Sie den Satz auch direkt auf der Restaurantrechnung
Wenn Sie möchten, führe ich gerne eine Websuche durch, um den aktuellen Stand für 2026 zu klären.
~~~~~~

### Answer C

~~~~~~markdown
Kurz: 7 % auf Speisen, 19 % auf Getränke – so die Rechtslage seit 1. Januar 2024.
Details:
Der befristete Sonder-Steuersatz von 5 % für Speisen in der Gastronomie (Corona-Hilfe) lief zum 31.12.2023 aus.
Seither gilt wieder der reguläre ermäßigte Satz von 7 % für die Abgabe von Speisen (§ 12 Abs. 2 UStG).
Getränke waren von der 5 %-Regelung nie erfasst und unterliegen weiterhin dem Regelsteuersatz von 19 %.
Für Speisen zum Mitnehmen (Take-away/Lieferung) gilt ebenfalls 7 %, für Getränke 19 %.
Hinweis: Mein Wissensstand stammt aus Trainingsdaten und kann veraltet sein. Ob bis 2026 etwas geändert wurde (es gab immer wieder politische Diskussionen über eine Senkung der Gastronomie-Mehrwertsteuer), prüfst du am besten aktuell beim Bundesministerium der Finanzen (bmf.de) oder direkt im Umsatzsteuergesetz.
~~~~~~

## 18. Q18 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
In meiner Mietwohnung ist die Heizung kaputt. Bis wann muss ich das dem Vermieter melden?
~~~~~~

**Reference for the scorer:**

- Fact: unverzüglich (§ 536c BGB); keine feste Tagesfrist
- Fact: sonst Verlust von Minderungsrechten / Schadenersatzpflicht

### Answer A

~~~~~~markdown
Kurz gesagt
Es gibt keine feste Frist in Tagen. Nach dem Gesetz besteht eine Anzeigepflicht: Du musst einen Mangel dem Vermieter unverzüglich melden, also ohne schuldhaftes Zögern. Bei einer kaputten Heizung – gerade in der kalten Jahreszeit – heißt das praktisch: sofort, am besten noch am selben Tag.
Worauf es ankommt
Schriftlich melden (z. B. per E-Mail), damit du einen Nachweis hast.
Konkret beschreiben (z. B. „Heizkörper im Wohnzimmer bleibt kalt") und um baldige Reparatur bitten, idealerweise mit einer Frist.
Nicht eigenmächtig eine Reparatur in Auftrag geben, ohne den Vermieter vorher in Verzug zu setzen – nur im echten Notfall kann das anders aussehen.
Datum und Antwort des Vermieters dokumentieren.
Warum zügig? Wer einen Mangel verspätet meldet, kann je nach Einzelfall Rechte verlieren (z. B. Mietminderung) oder sogar für Folgeschäden haftbar gemacht werden. Ob und in welchem Umfang, hängt vom konkreten Fall ab – verbindliche Details stehen im Gesetz.
Wo du es offiziell nachlesen kannst
Die Regel findest du in § 536c BGB auf gesetze-im-internet.de. Bei konkretem Streit mit dem Vermieter hilft oft der örtliche Mieterverein – dort bekommst du verlässliche, fallbezogene Auskunft.
Meine Angaben sind ungeprüft und ersetzen keine Rechtsberatung. Soll ich eine Websuche machen, um die aktuelle Rechtslage und typische Fristen zu prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Sofort – sobald der Ausfall feststeht, sollten Sie den Vermieter informieren. Das ist keine feste Frist, sondern ergibt sich daraus, dass der Vermieter sonst gar nicht helfen kann und im Extremfall sogar Schaden (z. B. eingefrorene Rohre) von Ihnen verlangen kann test.de.
Empfehlenswert:
Sofort melden, möglichst schriftlich und per Einschreiben mit Rückschein, oder mit Zeugen bzw. über eine zuverlässige Vertrauensperson test.de
Frist für die Reparatur setzen, bis wann der Defekt behoben oder zumindest ein Fachbetrieb beauftragt sein muss t-online.de
Dokumentieren: Temperaturprotokoll über mehrere Tage, Reparaturprotokoll des Installateurs, ggf. defekte Teile als Nachweis buderus.de
Zu konkreten Reparaturfristen sagt die Stiftung Warentest im verfügbaren Auszug nichts Genaueres; andere Quellen nennen 24–72 Stunden in der Heizperiode bzw. "angemessene Fristen" reklamo.aimieterengel.det-online.de – das sind aber keine offiziellen gesetzlichen Vorgaben. Bei Nichtreagieren des Vermieters kann ein Eilantrag beim Amtsgericht helfen test.de.
~~~~~~

### Answer C

~~~~~~markdown
Schnell – am besten sofort. Rechtlich gibt es keine feste Frist, aber die Pflicht zur unverzüglichen Meldung ist wichtig, weil der Vermieter sonst nicht helfen kann und sogar Schadensersatz von Ihnen verlangen kann, wenn weitere Schäden entstehen (z. B. Rohre, die kaputtfrieren) test.de.
So gehen Sie am besten vor:
Sofort melden – telefonisch oder persönlich, möglichst mit Zeugen test.de
Zusätzlich schriftlich, am besten per Einschreiben mit Rückschein, damit Sie den Nachweis haben test.de
Frist setzen für die Reparatur t-online.de
Dokumentieren: Führen Sie ein Temperaturprotokoll über mehrere Tage und bewahren Sie ggf. ein Reparaturprotokoll des Installateurs auf buderus.de
Zur Reparaturfrist selbst: Eine gesetzlich festgelegte Frist gibt es nicht test.de. Manche Quellen nennen in der Heizperiode etwa 24–72 Stunden als angemessen reklamo.ai – das ist aber keine verbindliche Angabe, sondern eine Orientierung, die je nach Fall beurteilt wird.
Übrigens: Schafft die Heizung es nicht, mindestens 20 Grad zu ermöglichen, können Sie grundsätzlich die Miete mindern test.de – auch das setzt aber voraus, dass Sie den Mangel korrekt gemeldet haben.
~~~~~~

## 19. Q19 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie lange ist ein Kassenrezept gültig?
~~~~~~

**Reference for the scorer:**

- Fact: 28 Tage zur Einlösung zulasten der Kasse (auch E-Rezept)
- Fact: Privatrezept in der Regel 3 Monate

### Answer A

~~~~~~markdown
Ein Kassenrezept (auf rosa Formular) ist in der Regel 3 Monate gültig, gerechnet ab dem Ausstellungsdatum. Innerhalb dieser Frist können Sie es in jeder Apotheke einlösen.
Wichtige Ausnahmen:
Betäubungsmittel (BtM-Rezepte, gelbes Formular): nur 7 Tage gültig.
T-Rezepte (Fentanyl, Tilidin, grünes Formular): 7 Tage.
Die Apotheke darf auch innerhalb der Frist die Einlösung verweigern, wenn die Medikation nach ärztlicher Beurteilung nicht mehr aktuell oder vertretbar erscheint.
Praktisch heißt das: Am besten zeitnah einlösen – besonders bei Antibiotika oder Medikamenten, die auf aktuelle Befunde abgestimmt sind. Wenn Sie unsicher sind, ob das Rezept noch passt, fragen Sie kurz in der Apotheke oder bei der Praxis nach.
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt:
Normales Kassenrezept (GKV): In der Regel sollten Sie es innerhalb von 3 Monaten nach Ausstellung einlösen. Danach verweigern manche Apotheken die Abrechnung mit der Krankenkasse – Sie müssten dann ggf. selbst zahlen oder ein neues Rezept holen.
Betäubungsmittel-Rezept (z. B. starke Schmerzmittel): Muss deutlich schneller eingelöst werden – meist innerhalb von 7 Tagen nach Ausstellung.
Kostenübernahme/Quartal: Die Kasse erstattet im Rahmen des Quartals, in dem das Rezept ausgestellt wurde; bei Überschreitung kann es Komplikationen geben.
Da die genauen Fristen und Ausnahmen (z. B. bei Krankenhausaufenthalt oder rückwirkender Genehmigung) von Fall zu Fall unterschiedlich geregelt sein können, bin ich mir bei den Details nicht hundertprozentig sicher. Verbindliche Auskunft geben Ihre Apotheke oder Ihre Krankenkasse; offizielle Regelungen finden sich z. B. über den GKV-Spitzenverband oder die Kassenärztliche Bundesvereinigung.
~~~~~~

### Answer C

~~~~~~markdown
Ein Kassenrezept (gesetzliche Krankenversicherung) ist in der Regel 28 Tage gültig, gerechnet ab dem Ausstellungsdatum. Die Apotheke darf es innerhalb dieser Frist einlösen.
Ein paar Hinweise dazu:
Ausnahmen: Bei Bedarf kann der Arzt eine längere Gültigkeit festlegen (z. B. bei Dauermedikation, oft bis zu 12 Monate), etwa mit dem Vermerk „NB" (nicht wiederholbar) bzw. entsprechenden Angaben auf dem Rezept.
Betäubungsmittel: Rezepte für BTM sind deutlich kürzer gültig (BtM-Rezept in der Regel 7 Tage, die Apotheke darf es nur am Ausstellungstag oder am Folgetag einlösen).
Wichtig: Nach Ablauf der Frist muss die Apotheke das Rezept normalerweise ablehnen – dann hilft nur, die Praxis um ein neues Rezept zu bitten.
Falls du ein konkretes Rezept mit besonderem Vermerk hast, sagt dir die Apotheke am schnellsten, ob es noch eingelöst werden kann.
~~~~~~

## 20. Q20 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie lange vorher muss ich meinen Urlaub beim Arbeitgeber beantragen?
~~~~~~

**Reference for the scorer:**

- Fact: keine gesetzliche Frist; Arbeitsvertrag, Tarifvertrag oder Betriebsvereinbarung können sie festlegen; dringende betriebliche Belange (§ 7 BUrlG)

### Answer A

~~~~~~markdown
In Deutschland gibt es kein gesetzlich festgelegtes Mindestdatum, bis wann du Urlaub beantragen musst. Was gilt:
Arbeitsvertrag / Tarifvertrag / Betriebsvereinbarung: Oft stehen dort Fristen, z. B. „Urlaub ist mindestens X Wochen im Voraus zu beantragen". Das ist die wichtigste Anlaufstelle – schau zuerst in deinen Vertrag.
Gesetzliche Regelung: Nach § 7 BUrlG soll der Arbeitgeber die Urlaubswünsche des Arbeitnehmers berücksichtigen, außer dringende betriebliche Gründe oder Wünsche anderer Kolleginnen und Kollegen mit sozialem Vorrang sprechen dagegen.
Praxisüblich: Viele Arbeitgeber erwarten je nach Branche und Betriebsgröße etwa 2 Wochen bis mehrere Monate im Voraus – bei längeren Urlauben (z. B. 3 Wochen im Sommer) eher früher.
Betriebsrat: Falls es einen gibt, ist bei der Urlaubsplanung oft die Einigung zwischen Arbeitgeber und Betriebsrat relevant.
Tipp: Beantrage Urlaub so früh wie möglich, idealerweise schriftlich oder per E-Mail, damit du einen Nachweis hast. Wenn dein Arbeitgeber den Wunsch ablehnt, muss er das begründen und dir eine Alternative anbieten – Urlaub, der bis zum 31. März des Folgejahres nicht genommen wurde, verfällt in der Regel (es sei denn, der Arbeitgeber hat den Urlaub nicht gewährt).
Für genaue Fristen in deinem Fall: Arbeitsvertrag, Tarifvertrag oder ggf. Betriebsrat/Personalabteilung prüfen.
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gibt es dafür kein gesetzlich festgelegtes Zeitfenster – wann du Urlaub beantragen musst, hängt vor allem von deinem Arbeitsvertrag, Tarifvertrag oder betrieblichen Regelungen ab. Grob gilt:
Arbeitsvertrag / Tarifvertrag: Viele sehen vor, dass Urlaub z. B. „spätestens 2 Wochen“ oder „rechtzeitig“ vor Beginn anzumelden ist. Prüfe am besten zuerst dort.
Betriebliche Praxis: In vielen Firmen hat sich eingebürgert, Urlaub einige Wochen (oft 4–8 Wochen) im Voraus zu beantragen – besonders für längere oder in Ferienzeiten liegende Urlaube.
Sonderfälle: Manche Tarifverträge (z. B. im öffentlichen Dienst) sehen feste Fristen vor, bis wann der Arbeitgeber den Wunsch bestätigen oder ablehnen muss.
Wichtig zu wissen:
Der Arbeitgeber muss deine Urlaubswünsche berücksichtigen, kann sie aber aus dringenden betrieblichen Gründen ablehnen.
Lehnt er nicht rechtzeitig ab, kann der Urlaub unter Umständen als genehmigt gelten (Rechtsprechung dazu ist aber im Detail kompliziert).
Resturlaub, der zum Jahresende verfällt, sollte rechtzeitig geltend gemacht werden.
Kurz gesagt: Gibt es keine vertragliche Frist, ist „möglichst früh“ die sichere Variante – bei beliebten Terminen (Sommer, Weihnachten) oft mehrere Monate im Voraus. Für eine verbindliche Aussage zu deiner konkreten Frist lohnt ein Blick in deinen Arbeitsvertrag oder eine Nachfrage bei HR/Personalabteilung.
~~~~~~

### Answer C

~~~~~~markdown
In Deutschland gibt es kein gesetzlich festgelegtes Mindestzeitfenster, wann du Urlaub beantragen musst. Was gilt:
Arbeitsvertrag, Tarifvertrag oder Betriebsvereinbarung: Oft steht dort eine Frist, z. B. „mind. 2 Wochen im Voraus" oder Antragsfristen für bestimmte Zeiträume. Das ist dann bindend.
Ohne Regelung: Du solltest den Urlaub so früh wie möglich beantragen – üblich und fair sind einige Wochen Vorlauf. Grundsätzlich muss der Arbeitgeber deine Wünsche berücksichtigen, kann aber aus betrieblichen Gründen (z. B. Besetzungsplan, Saisonspitzen) ablehnen.
Wichtig bei Konflikten: Hält sich der Arbeitgeber nicht an betriebliche Fristen oder lehnt ohne Grund ab, kann der Urlaub trotzdem entstehen – dazu gibt es Rechtsprechung, die im Einzelfall prüft.
Praktischer Tipp: Schau zuerst in deinen Vertrag/Tarifvertrag und frag sonst kurz bei HR oder deiner Führungskraft nach der üblichen Frist in deinem Betrieb. Für lange Urlaube (Sommer, Weihnachten) lieber früh planen.
Ob in deinem Betrieb eine konkrete Frist gilt, kann ich nicht wissen – verbindlich ist dort die Regelung im Vertrag oder Tarifvertrag.
~~~~~~

## 21. Q21 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie viel dürfen Eltern ihrem Kind steuerfrei schenken?
~~~~~~

**Reference for the scorer:**

- Fact: 400.000 EUR Freibetrag je Elternteil und Kind alle 10 Jahre (§ 16 ErbStG)

### Answer A

~~~~~~markdown
In Deutschland gilt für Schenkungen von Eltern an ihr Kind ein Freibetrag von 20.000 € alle 10 Jahre (§ 16 ErbStG). Das heißt: Sie können Ihrem Kind alle 10 Jahre bis zu 20.000 € schenken, ohne dass Schenkungsteuer anfällt; der Betrag wird bei mehreren Schenkungen innerhalb des Zehnjahreszeitraums zusammengerechnet.
Zusätzlich gibt es einen sogenannten steuerfreien Anlassbetrag von 400 € pro Gelegenheit (z. B. zu Geburtstag, Weihnachten oder Hochzeit), der unabhängig vom 20.000-Euro-Freibetrag möglich ist.
Ein paar Hinweise:
Der Freibetrag gilt pro Elternteil – Vater und Mutter können jeweils 20.000 € nutzen, also insgesamt 40.000 € pro Kind alle 10 Jahre.
Auch Großeltern haben einen eigenen Freibetrag (20.000 € gegenüber Enkeln).
Die Freibeträge beginnen mit der Schenkung neu; eine spätere Erbschaft wird dann um die genutzten Beträge gekürzt.
Schenkungen müssen beim Finanzamt grundsätzlich angezeigt werden (Anzeigepflicht), auch wenn sie steuerfrei bleiben.
Da sich Steuersätze und Freibeträge ändern können, empfehle ich, die aktuellen Werte auf der Seite des Bundesfinanzministeriums zu prüfen oder kurz beim Finanzamt bzw. einer Steuerberatung nachzufragen.
~~~~~~

### Answer B

~~~~~~markdown
Kinder dürfen von ihren Eltern (und Großeltern) alle 10 Jahre Schenkungen bis 20.000 € steuerfrei erhalten (§ 16 ErbStG, Steuerklasse I). Das heißt:
Der Freibetrag gilt pro Schenker und pro Zehnjahreszeitraum – Vater und Mutter können dem Kind also zusammen bis zu 40.000 € steuerfrei schenken.
Werden mehrere Schenkungen innerhalb von 10 Jahren gemacht, werden sie zusammengerechnet; alles über 20.000 € pro Elternteil hinaus ist steuerpflichtig.
Auch Großeltern haben denselben 20.000-€-Freibetrag gegenüber Enkeln.
Andere Verwandte (z. B. Onkel, Tante) haben deutlich niedrigere Freibeträge (20.000 € gilt für Eltern/Kinder; z. B. Geschwister nur 20.000 € in Klasse I? – nein, Geschwister fallen in Steuerklasse II mit 20.000 €; entferntere Verwandte und Unbeteiligte in Klasse III nur 20.000 € bzw. früher weniger – hier lohnt ein Blick ins Gesetz).
Hinweis: Für Schenkungen unter 20.000 € muss grundsätzlich keine Steuererklärung abgegeben werden; trotzdem ist bei größeren Beträgen oder Immobilien eine Anmeldung beim Finanzamt möglich bzw. nötig. Mein Wissen hat ein unbestimmtes Stichtagsdatum – die aktuellen Freibeträge und Pflichten bitte auf gesetze-im-internet.de (https://www.gesetze-im-internet.de/erbstg/) oder beim Finanzamt prüfen.
~~~~~~

### Answer C

~~~~~~markdown
In Deutschland können Eltern jedem ihrer Kinder alle 10 Jahre steuerfrei bis zu 20.000 € schenken (Steuerklasse I). Das heißt, alle zehn Jahre fällt erneut ein Freibetrag an.
Einige Punkte dazu:
Zehnjahresfrist: Schenkst du z. B. 2026 den vollen Freibetrag, steht dir der nächste erst wieder ab 2036 zu. Teilschenkungen innerhalb der Frist werden zusammengerechnet.
Weitere Freibeträge: Auch Großeltern, Enkel, Geschwister usw. haben eigene Freibeträge (z. B. Großeltern für Enkel ebenfalls 20.000 €). Ehe-/eingetragene Partner haben deutlich höhere Freibeträge (500.000 €).
Über dem Freibetrag: Darüber hinaus greift der gestaffelte Steuersatz der Schenkungsteuer – bei Kindern beginnt er bei 7 % und steigt mit dem Wert.
Anzeigepflicht: Auch steuerfreie Schenkungen sollten beim Finanzamt angezeigt werden, damit die Zehnjahresfrist korrekt läuft. Das Formular dazu heißt „Erklärung zur Schenkungsteuer".
Trick bei größeren Beträgen: Viele verteilen größere Summen über mehrere Zehnjahreszeiträume, um Steuer zu sparen.
Hinweis: Ich kann nicht garantieren, dass diese Beträge aktuell sind – mein Wissensstand hat ein Stichtag und sich ändernde Freibeträge oder Gesetze kann ich nicht prüfen. Verlässliche Zahlen findest du beim Bundesministerium der Justiz (z. B. via gesetze-im-internet.de, § 16 ErbStG) oder direkt beim Finanzamt. Für größere Beträge lohnt sich oft ein Beratungsgespräch mit einer Steuerberatung oder Notarin/einem Notar.
~~~~~~

## 22. Q22 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie hoch ist der Sparer-Pauschbetrag für Kapitalerträge?
~~~~~~

**Reference for the scorer:**

- Fact: 1.000 EUR Alleinstehende, 2.000 EUR Verheiratete (seit 2023, § 20 Abs. 9 EStG)

### Answer A

~~~~~~markdown
Der Sparer-Pauschbetrag beträgt seit 2023 1.000 € pro Person (für Ehepaare/zusammen Veranlagte: 2.000 €) [Quelle: Einkommensteuergesetz § 20, Stand meines Trainings].
Kapitalerträge bis zu diesem Betrag bleiben steuerfrei; darüber hinaus fällt die Abgeltungsteuer von 25 % plus Soli (und ggf. Kirchensteuer) an.
Ein Hinweis: Falls Sie mehrere Banken nutzen, wird der Freibetrag nur einmal angerechnet – ein Freistellungsauftrag sollte auf alle Institute aufgeteilt werden. Für aktuelle Werte und Details empfehle ich einen Blick auf die Seiten des Bundesfinanzministeriums oder Ihrer Bank, da sich Regelungen ändern können.
~~~~~~

### Answer B

~~~~~~markdown
Der Sparer-Pauschbetrag beträgt seit 2023 1.000 € für Einzelpersonen und 2.000 € für gemeinsam veranlagte Ehepaare pro Jahr. Kapitalerträge bis zu diesem Betrag bleiben steuerfrei.
Hinweise:
Der Pauschbetrag ersetzt den früheren Sparer-Freibetrag (801/1.602 €).
Damit er angewendet wird, sollten Sie Ihrem Banken einen Freistellungsauftrag erteilen (können Sie auf mehrere Banken verteilen, insgesamt aber maximal 1.000 €).
Ohne Freistellungsauftrag können Sie den Betrag über die Steuererklärung (Anlage KAP) zurückholen.
Die Abgeltungsteuer beträgt 25 % plus Solidaritätszuschlag und ggf. Kirchensteuer auf Erträge über dem Pauschbetrag.
Ob der Betrag seit meinem Wissensstand geändert wurde, kann ich nicht garantieren – aktuelle Zahlen finden Sie beim Bundesfinanzministerium oder IHR Bank.
~~~~~~

### Answer C

~~~~~~markdown
Der Sparer-Pauschbetrag beträgt 1.000 € für Einzelpersonen bzw. 2.000 € für zusammen veranlagte Ehepaare pro Jahr (seit 2023, zuvor 801 €/1.602 €).
Kapitalerträge bis zu diesem Betrag bleiben von der Abgeltungsteuer (25 % plus Soli bzw. Kirchensteuer) verschont. Damit die Bank den Freibetrag berücksichtigt, sollte ein Freistellungsauftrag erteilt werden; ansonsten erfolgt die Verrechnung über die Steuererklärung.
Hinweis: Mein Wissensstand hat ein unbekanntes Enddatum und kann veraltet sein – aktuelle Werte und Änderungen finden Sie beim Bundesfinanzministerium (bmf.bund.de) oder IZV (izv.de).
~~~~~~

## 23. Q23 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wann muss ein neu zugelassenes Auto zum ersten Mal zur Hauptuntersuchung?
~~~~~~

**Reference for the scorer:**

- Fact: nach 36 Monaten, danach alle 24 Monate (StVZO Anlage VIII)

### Answer A

~~~~~~markdown
Ein Neuwagen muss drei Jahre nach der Erstzulassung erstmals zur Hauptuntersuchung (HU) adac.de. Danach gilt der Zweijahresrhythmus – die nächste HU ist jeweils 24 Monate nach der letzten fällig adac.de.
Ein paar ergänzende Punkte aus dem ADAC-Artikel:
Man kann die HU auch schon vor Fälligkeit machen lassen, z. B. vor einem Verkauf – die Frist verlängert sich dadurch aber nicht; ab der neuen Plakette beginnt der Zwei-Jahres-Turnus neu adac.de.
Seit dem 1. Juli 2012 wird bei Überschreitung der Fälligkeit nicht mehr „rückdatiert" adac.de.
Die Abgasuntersuchung (AU) ist seit 2010 Teil der HU; dafür wird eine separate Bescheinigung ausgestellt adac.de.
Hinweis: Die Quellen sind Suchauszüge bzw. ein seit 18.08.2026 aktualisierter ADAC-Artikel; verbindliche Rechtsgrundlage ist die StVZO – im Zweifel beim TÜV, DEKRA oder Ihrer Prüforganisation nachfragen.
~~~~~~

### Answer B

~~~~~~markdown
Ein neu zugelassenes Auto muss in der Regel erstmals drei Jahre nach Erstzulassung zur Hauptuntersuchung (HU). Danach gilt der Turnus alle zwei Jahre service-bw.detuvsud.com.
Hinweise:
Die genauen Fristen für alle Fahrzeugarten sind in der Anlage VIII der StVZO geregelt amt24.sachsen.degesetze-im-internet.de.
Bei einem Saisonkennzeichen gilt: Fällt die HU außerhalb des Betriebszeitraums, muss sie im ersten Monat des nächsten Betriebszeitraums erfolgen gesetze-im-internet.de.
Bei Fahrzeugen, die im Ausland erstmals in Betrieb gesetzt wurden, zählt der Nachweis der Erstinbetriebsetzung im EU-/Vertragsstaat für die Frist gesetze-im-internet.de.
Die Quellen sind Suchauszüge offizieller Portale (Sachsen, Baden-Württemberg, Hessen, gesetze-im-internet.de); verbindlich im Einzelfall ist die Anlage VIII StVZO bzw. die Zulassungsstelle.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Die erste HU richtet sich nach dem Monat der Erstzulassung – nicht nach dem Kaufdatum oder der Zulassung auf dich.
Die gängige Regel für Pkw (hier von mir nicht gegen die aktuelle Fassung geprüft): Die erste Hauptuntersuchung fällt drei Jahre nach Erstzulassung an, danach alle zwei Jahre. Für andere Fahrzeuge (z. B. Motorräder, Taxi/Zuber, Oldtimer mit H-Kennzeichen) gelten teils andere Friste.
Wo steht das verbindlich?
Die Untersuchungsfristen regelt § 29 StVZO mit Anlage VIII – nachlesbar auf gesetze-im-internet.de.
Den konkreten fälligen Monat deiner HU zeigt die runde Prüfplakette am hinteren Kennzeichen (Monat/Jahr der nächsten fälligen Untersuchung). Bei Fragen hilft auch die Zulassungsstelle oder die Prüfstelle (TÜV, DEKRA, GTÜ, KÜS).
Praktisch: Wenn du mir das Erstzulassungsdatum nennst, rechne ich dir den voraussichtlichen Monat aus – verbindlich ist aber die Plakette bzw. die aktuelle Fassung der StVZO. Alternativ kann ich gern eine Websuche zur aktuellen Fristregelung machen, falls sich etwas geändert hat.
~~~~~~

## 24. Q24 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Ab wie vielen Punkten in Flensburg ist der Führerschein weg?
~~~~~~

**Reference for the scorer:**

- Fact: ab 8 Punkten Entzug der Fahrerlaubnis

### Answer A

~~~~~~markdown
Das hängt vom Punktesystem im Fahreignungsregister (umgangssprachlich „Flensburg") ab, das gestuft wirkt:
Untere Schwellen: Warnschreiben mit Hinweis auf freiwillige Seminare bzw. verkehrspsychologische Beratung
Oberste Schwelle: Entziehung der Fahrerlaubnis (der Führerschein wird weggenommen), verbunden mit einer Sperrfrist für die Neuerteilung
Die 8 Punkte werden dabei häufig als die Schwelle für die Entziehung genannt – dieser Wert ist aber von mir ungeprüft. Die genauen Schwellen, Tilgungsfristen und Folgen stehen in § 4 StVG und der Fahrerlaubnis-Verordnung (FeV):
Nachzulesen auf gesetze-im-internet.de (StVG und FeV)
Zuständig ist das Kraftfahrt-Bundesamt (KBA) in Flensburg, das das Register führt
Hinweis: Mein Wissensstand stammt aus Trainingsdaten und kann veraltet sein – an dem System gab es schon mehrfach Reformen. Soll ich eine Websuche nach der aktuellen Schwelle durchführen?
~~~~~~

### Answer B

~~~~~~markdown
Ab 8 Punkten im Fahreignungsregister (Flensburg) wird der Führerschein entzogen – man darf also maximal 7 Punkte haben test.desos-verkehrsrecht.debussgeldkatalog.org.
Einordnung aus den Quellen:
Verstöße werden je nach Schwere mit 1 bis 3 Punkten bewertet kba.de.
Bußgelder ab 60 € bei verkehrssicherheitsbeeinträchtigenden Handlungen können mit bis zu 2 Punkten eingetragen werden rp-kassel.hessen.de.
Wie Punkte wieder wegfallen (Fristen/Tilgung), ist in den vorliegenden Auszügen nicht im Detail beschrieben – die Düsseldorfer Führerscheinstelle verweist dazu allgemein auf das Kraftfahrt-Bundesamt duesseldorf.de. Eine kostenlose Auskunft über Ihre eigenen Punkte können Sie beim KBA anfordern duesseldorf.de.
~~~~~~

### Answer C

~~~~~~markdown
Ab 8 Punkten in Flensburg wird der Führerschein entzogen – Sie können also bis zu 7 Punkte ansammeln, ohne den Entzug zu befürchten bussgeldkatalog.org.
Wichtig dazu:
1–3 Punkte: keine Maßnahmen bussgeldkatalog.org
4–5 Punkte: kostenpflichtige Ermahnung, Hinweis auf ein Fahreignungsseminar (Punkteabbau möglich – maximal 1 Punkt alle fünf Jahre) bussgeldkatalog.org
6–7 Punkte: kostenpflichtige Verwarnung, kein Punktabbau mehr möglich bussgeldkatalog.org
8 Punkte: Führerscheinentzug mit einer Sperrfrist von mindestens 6 Monaten; danach kann die Neuerteilung beantragt werden, ggf. mit MPU als Voraussetzung bussgeldkatalog.org
Beachte: Es handelt sich um einen Führerscheinentzug (Fahrerlaubnis wird entwertet), nicht um ein zeitlich begrenztes Fahrverbot bussgeldkatalog.org.
Hinweis: Die Quellen hier sind kommerzielle Ratgeberseiten, keine offizielle Behörde. Für eine verbindliche Auskunft lohnt ein Blick auf das Fahreignungsregister beim Kraftfahrt-Bundesamt (KBA) oder die Nachfrage bei der Fahrerlaubnisbehörde.
~~~~~~

## 25. Q25 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie lange dauert die Probezeit beim Führerschein?
~~~~~~

**Reference for the scorer:**

- Fact: 2 Jahre; Verlängerung auf 4 Jahre bei Aufbauseminar-Anordnung

### Answer A

~~~~~~markdown
Für den ersten Führerschein gilt nach dem Bestehen der Prüfung eine gesetzliche Probezeit. Die genaue Dauer steht im Gesetz – üblicherweise wird sie mit zwei Jahren ab Erteilung der Fahrerlaubnis angegeben, das ist aber ein unverifizierter Wert aus meinem Trainingswissen und könnte veraltet sein.
Worauf es ankommt:
Die Probezeit beginnt mit der Erteilung deiner ersten Fahrerlaubnis.
Begehst du in dieser Zeit bestimmte Verstöße (z. B. Alkohol am Steuer oder schwerwiegende Zuwiderhandlungen), kann das die Probezeit verlängern und zur Pflicht führen, ein Aufbauseminar zu besuchen. Die Folgen hängen von Art und Schwere des Verstoßes ab.
Offiziell nachprüfen kannst du das hier:
Die Gesetzestexte im Straßenverkehrsgesetz (StVG) und in der Fahrerlaubnis-Verordnung (FeV) auf gesetze-im-internet.de
Deine zuständige Fahrerlaubnisstelle (Führerscheinstelle)
Soll ich das im Web nachschlagen, um die aktuelle Dauer und die Regeln zu bestätigen?
~~~~~~

### Answer B

~~~~~~markdown
Die Probezeit dauert zwei Jahre. Sie beginnt mit der Erteilung der Fahrerlaubnis – also mit der Aushändigung des Führerscheindokuments; alternativ mit dem Tag, an dem man die befristete Prüfbescheinigung erhält (z. B. beim Begleiteten Fahren ab 17) adac.de.
Wichtig dazu:
Keine Probezeit gibt es für die Klassen AM, L und T. Wer bereits eine Probezeit hinter sich hat (z. B. Klasse A1 mit 16) und später eine weitere Klasse erwirbt, durchläuft keine neue Probezeit adac.de.
Verlängerung auf insgesamt vier Jahre bei einem A-Verstoß (schwerwiegender Verstoß, z. B. Tempo über 21 km/h zu schnell, Rotlicht, Handy am Steuer) oder zwei B-Verstößen adac.de.
Quelle ist der ADAC (Stand 27.10.2026) adac.de.
~~~~~~

### Answer C

~~~~~~markdown
Die Probezeit dauert zwei Jahre ab Erteilung der Fahrerlaubnis gesetze-im-internet.de. Sie gilt bei erstmaligem Erwerb, mit Ausnahme der Klassen AM, L und T stadt.muenchen.de.
Wichtig zu wissen:
Verlängerung: Wird die Teilnahme an einem Aufbauseminar angeordnet, verlängert sich die Probezeit um zwei Jahre [bcf09bc341f5, Abs. 2a].
Beginn: Sie beginnt mit dem Tag der Aushändigung des Führerscheins kba.de.
Anrechnung: Wer bereits eine ausländische oder EU/EWR-Fahrerlaubnis hat, dem wird die Zeit seit deren Erwerb auf die Probezeit angerechnet gesetze-im-internet.de.
Hemmung/Ende: Beschlagnahme oder Entziehung des Führerscheins hemmen den Ablauf; endet die Probezeit vorzeitig durch Entziehung oder Verzicht, beginnt mit einer neuen Fahrerlaubnis eine neue Probezeit – aber nur im Umfang der Restdauer gesetze-im-internet.de.
~~~~~~

## 26. Q26 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Welche Promillegrenze gilt für Fahranfänger?
~~~~~~

**Reference for the scorer:**

- Fact: 0,0 Promille in der Probezeit und unter 21 Jahren (§ 24c StVG)

### Answer A

~~~~~~markdown
Für Fahranfänger gilt die 0,0-Promillegrenze. Das gilt:
während der Probezeit (in der Regel zwei Jahre nach bestandener Fahrprüfung) bussgeldkatalog.org
zusätzlich für Fahrer unter 21 Jahren, unabhängig von der Probezeit – geregelt in § 24c Abs. 1 StVG bussgeldkatalog.org
Konsequenzen bei Verstoß: Ein Verstoß gegen die 0,0-Grenze in der Probezeit gilt als A-Verstoß. Die Probezeit wird dann um zwei Jahre verlängert, und es muss ein Aufbauseminar absolviert werden (auf eigene Kosten) bussgeldkatalog.org.
Zum Vergleich: Für erfahrene Fahrer ab 21 (außerhalb der Probezeit) gilt die 0,5-Promillegrenze; ab 0,3 Promille kann bei auffälliger Fahrweise eine Strafbarkeit drohen bussgeldkatalog.org.
Hinweis: Die Quellen sind kommerzielle Bußgeld-Portale, keine offiziellen Behördenseiten. Für verbindliche Angaben empfiehlt sich ein Blick auf die offiziellen Seiten (z. B. BMVI oder ADAC als Verkehrsclub).
~~~~~~

### Answer B

~~~~~~markdown
Für Fahranfänger gilt in Deutschland ein strengeres Alkoholverbot als für erfahrene Fahrer:
Betroffen sind: Fahrer unter 21 Jahren sowie alle Fahrer in der Probezeit – unabhängig vom Alter.
Die Regel: In diesen Fällen gilt grundsätzlich absolutes Alkoholverbot – vor der Fahrt darf praktisch gar kein Alkohol getrunken werden. Der dafür üblicherweise genannte Grenzwert ist 0,0 Promille (diesen Wert habe ich nicht amtlich geprüft).
Bei einem Verstoß können je nach Einzelfall Bußgeld, Eintrag im Fahreignungsregister („Flensburg“), ein Aufbauseminar und eine Verlängerung der Probezeit drohen. Die genauen Folgen hängen vom jeweiligen Verstoß ab.
Zum amtlichen Nachlesen: Die Regelung steht im Straßenverkehrsgesetz (§ 24c StVG) und in der Fahrerlaubnis-Verordnung (FeV), beides auf gesetze-im-internet.de; auskunftsberechtigt ist auch die zuständige Fahrerlaubnisbehörde.
Hinweis: Meine Angaben beruhen auf Trainingswissen ohne geprüfte Quelle und können veraltet sein. Soll ich eine Websuche nach den aktuellen Regeln machen?
~~~~~~

### Answer C

~~~~~~markdown
Für Fahranfänger gilt 0,0 Promille. Das gilt während der Probezeit nach dem Fahrerlaubniserwerb sowie bis zur Vollendung des 21. Lebensjahres polizei.bayern.de.
Hintergrund: § 24c StVG macht es bereits eine Ordnungswidrigkeit, in der Probezeit oder vor dem 21. Geburtstag alkoholische Getränke zu sich zu nehmen oder unter deren Wirkung zu fahren gesetze-im-internet.de.
Folgen eines ersten Verstoßes laut Bayerischer Polizei:
250 € Bußgeld und 1 Punkt
Verlängerung der Probezeit um 2 Jahre
Anordnung eines besonderen Aufbauseminars; der Verstoß zählt als schwerwiegend polizei.bayern.de
Zum Vergleich: Für alle anderen Kraftfahrzeugführer ab 21 bzw. nach der Probezeit gilt die 0,5-Promille-Grenze (§ 24a StVG: 0,25 mg/l Atemalkohol) gesetze-im-internet.depolizei.bayern.de.
~~~~~~

## 27. Q27 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Was kostet es, wenn ich beim Autofahren mit dem Handy in der Hand erwischt werde?
~~~~~~

**Reference for the scorer:**

- Fact: amount and points per the Bußgeldkatalog on the run day (with and without endangerment)

### Answer A

~~~~~~markdown
Handy am Steuer in Deutschland – Bußgeld (Stand meines Wissens)
Situation	Bußgeld	Punkte in Flensburg
Handy in der Hand / am Ohr, Tippen, Lesen	100 €	1
Mit Gefährdung anderer	150 €	1
Mit Unfall (Sachschaden)	200 €	2
Mit Unfall (Personenschaden)	240 €	2
Wichtig zu wissen:
Es zählt jede Benutzung in der Hand – auch als Navi, auch nur kurzes Aufnehmen, auch Schreiben auf einer Smartwatch.
Verboten ist es auch bei stehendem Auto (z. B. rote Ampel), solange der Motor läuft. Motor aus + gehalten = erlaubt.
Ein Punkt tilgt sich nach 2,5 Jahren, zwei Punkte nach 5 Jahren.
Bei einem Unfall kann ein Handy-Verstoß zusätzlich als Mitverschulden die Regulierung durch die Versicherung beeinflussen.
Vorbehalt: Meine Angaben stammen aus Trainingsdaten ohne veröffentlichtes Enddatum – der Bußgeldkatalog wird immer wieder angepasst, und ich bin mir bei den aktuellen Werten nicht sicher. Bitte prüfe den aktuellen Stand z. B. über den ADAC-Bußgeldrechner oder die offizielle Bußgeldkatalog-Verwaltungsvorschrift (Bundesanzeiger).
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gilt seit der Bußgeldreform 2021 (Stand meiner Trainingsdaten):
Bußgeld für Handynutzung am Steuer (§ 23 Abs. 1a StVO):
Grundverstoß: 100 € Bußgeld, 1 Punkt in Flensburg
Bei Gefährdung anderer: 150 €, 2 Punkte
Bei Sachbeschädigung (Unfall): 200 €, 2 Punkte, in der Regel zusätzlich 1 Monat Fahrverbot
Wichtig zu wissen:
Der Verstoß zählt auch, wenn das Fahrzeug steht, aber der Motor läuft (z. B. an der Ampel oder im Stau).
Es gilt für alle elektronischen Geräte, also auch Navi, Tablet, Smartwatch (aufgenommen/„in der Hand gehalten“).
Erlaubt ist die Nutzung über Freisprecheinrichtung oder Sprachsteuerung; kurze Bedienung (z. B. Anruf annehmen) ist nur erlaubt, wenn das Gerät in einer Halterung steckt.
Bei einem Unfall kann die Handy-Nutzung zudem zu einer Mitschuld führen und sich auf den Versicherungsschutz auswirken.
Hinweis: Diese Zahlen stammen aus meinen Trainingsdaten mit unbestimmtem Enddatum und könnten sich geändert haben. Verlässlich aktuell sind der offizielle Bußgeldkatalog (gesetze-im-internet.de, Anlage zur Bußgeldkatalog-Verordnung) oder der Bußgeldrechner des ADAC. Sag Bescheid, wenn ich dazu eine Websuche anbieten soll.
~~~~~~

### Answer C

~~~~~~markdown
Nach meinem Kenntnisstand kostet Handy am Steuer:
100 € Bußgeld und
1 Punkt im Fahreignungsregister („Flensburg").
Ein paar wichtige Hinweise dazu:
Es gilt schon als Verstoß, wenn das Handy in der Hand gehalten wird – auch bei roter Ampel oder stehendem Fahrzeug, solange der Motor läuft. Telefonieren ist nur mit Freisprecheinrichtung erlaubt.
In der Probezeit ist es teurer indirekt: Wegen des Bußgelds über 60 € drohen ein Aufbauseminar und die Verlängerung der Probezeit von 2 auf 4 Jahre.
Kommt es dadurch zu einem Unfall, kann die Versicherung Leistungen wegen Mitverschuldens kürzen.
Mein Wissensstand stammt aus Trainingsdaten und kann veraltet sein – es gab mehrfach Diskussionen über eine Erhöhung des Bußgelds. Den verbindlichen, aktuellen Betrag findest du im offiziellen Bußgeldkatalog (BKatV), z. B. auf gesetze-im-internet.de oder beim Bundesministerium für Digitales und Transport. Sag gern Bescheid, wenn ich für dich danach suchen soll.
~~~~~~

## 28. Q28 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Darf mein Chef Überstunden anordnen, ohne sie zu bezahlen?
~~~~~~

**Reference for the scorer:**

- Fact: hängt von Arbeits-/Tarifvertrag ab; pauschale Abgeltung nur in Grenzen wirksam; Arbeitszeitgesetz-Grenzen; Mindestlohn muss eingehalten sein

### Answer A

~~~~~~markdown
Kurze Antwort: Nein, Überstunden müssen grundsätzlich vergütet werden – entweder durch Bezahlung oder durch entsprechenden Freizeitausgleich. Unbezahlte Überstunden anzuordnen ist nicht zulässig.
Die Grundzüge:
Anordnung: Ob und inwieweit Ihr Chef Überstunden anordnen darf, hängt vom Arbeitsvertrag, Tarifvertrag oder Betriebsvereinbarung ab. Manche Verträge enthalten eine Überstundenklausel; auch dann gelten Grenzen (z. B. Zumutbarkeit, arbeitsschutzrechtliche Höchstarbeitszeiten: max. 8 Stunden/Tag, im Durchschnitt bis 10 Stunden/Tag möglich).
Vergütung: Überstunden müssen vergütet oder durch Freizeit ausgeglichen werden – sofern nichts anderes gilt. Ausnahmen gibt es z. B. für leitende Angestellte oder wenn Überstunden mit dem Gehalt „abgegolten" sind. Solche Pauschalklauseln sind aber nicht unbegrenzt zulässig; bei sehr umfangreichen Überstunden kann zusätzliches Geld fällig werden.
Tarifvertrag: Tarifliche Regelungen können Details (Sätze, Ausgleich) anders bestimmen und sind dann maßgeblich.
Wichtig zu wissen: Ansprüche auf Überstundenvergütung können verfallen (Verwirkung/Ausschlussfristen), wenn man sie nicht rechtzeitig geltend macht – deshalb sollte man Überstunden dokumentieren (Datum, Dauer) und zeitnah einfordern.
Da die Details stark von Ihrem Vertrag und Ihrer Branche abhängen: Prüfen Sie Arbeitsvertrag und Tarifvertrag. Bei einem konkreten Konflikt lohnt eine Beratung z. B. bei der Gewerkschaft, einem Fachanwalt für Arbeitsrecht oder der Betriebsratsmitgliedschaft. Für verbindliche Auskünfte zu Fristen und Regelungen empfehle ich offizielle Quellen wie das Bundesarbeitsministerium – bei Einzelheiten bin ich mir nicht sicher und möchte keine falschen Zahlen nennen.
~~~~~~

### Answer B

~~~~~~markdown
Kurze Antwort: Überstunden anordnen kann er oft ja – aber unbezahlte Überstunden grundsätzlich nein.
Anordnen (Mehrarbeit "angeordnet oder geduldet")
Ob Ihr Chef Überstunden überhaupt anordnen darf, hängt von mehreren Dingen ab:
Arbeitsvertrag: Viele Verträge enthalten eine Überstundenklausel, die Mehrarbeit erlaubt – oft begrenzt (z. B. "soweit zumutbar").
Tarifvertrag oder Betriebsvereinbarung: Können Überstunden regeln, begrenzen oder ausschließen. Bei einem Betriebsrat kann die Einführung von Überstunden sogar mitbestimmungspflichtig sein (§ 87 BetrVG).
Arbeitszeitgesetz: Auch angeordnete Überstunden müssen die gesetzlichen Grenzen einhalten (z. B. max. 8 Std./Tag, im Schnitt bis 10 Std./Tag, Ruhezeiten von 11 Std., Sonntagsruhe).
Bezahlung
Grundsätzlich gilt: angeordnete oder geduldete Überstunden müssen vergütet werden – entweder
über einen Stundensatz/Zuschlag aus Vertrag oder Tarifvertrag, oder
über ein Monatsgehalt, das Überstunden pauschal mit abgilt (bei höheren Gehältern und begrenztem Umfang kann eine Klausel Überstunden "mitabgelten").
Wichtig: Eine Klausel, die Überstunden komplett unentgeltlich macht, ist in der Regel unwirk­sam. Freizeitausgleich statt Geld ist aber oft möglich, wenn Vertrag oder Tarifvertrag das vorsehen.
Was Sie tun können
Prüfen Sie Arbeitsvertrag, Tarifvertrag und Betriebsvereinbarung auf Überstunden- und Vergütungsregeln.
Dokumentieren Sie geleistete Überstunden (Datum, Dauer, Anordnung).
Ansprechpartner: Betriebsrat (falls vorhanden), Gewerkschaft, oder eine Anwaltskanzlei für Arbeitsrecht. Die Arbeiterwohlfahrt/Verbraucherzentrale und die Arbeitsgerichte bieten teils Beratung; auch die Gewerkschaften beraten Nichtmitglieder oft erstmal.
Ich kenne Ihren Vertrag und Ihre Branche nicht – ob im Einzelfall etwas durchgesetzt werden kann, hängt stark von den konkreten Klauseln ab. Das hier ist eine allgemeine Einordnung und ersetzt keine Rechtsberatung im konkreten Fall.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt: Überstunden anordnen darf er meist – aber unbezahlt lassen darf er sie grundsätzlich nicht.
Anordnen:
Ob Ihr Chef Überstunden anordnen kann, hängt von Ihrem Arbeitsvertrag, Tarifvertrag oder Betriebsvereinbarung ab. Viele Verträge enthalten eine Überstundenklausel, die das erlaubt.
Ohne entsprechende Klausel ist er dazu grundsätzlich nicht berechtigt, und Sie dürfen auch nicht disziplinarisch sanktioniert werden, wenn Sie ablehnen (Grenze: Weisungsrecht nach § 106 GewO, das aber nicht unbegrenzt Überstunden verlangen darf).
Bezahlung:
Überstunden sind grundsätzlich zu vergüten – entweder durch den normalen Lohn (wenn er vertraglich „mitabgegolten" ist, z. B. bei einer Vertrauensarbeitszeit oder bestimmten Gehaltsgruppen) oder durch einen Zuschlag.
Achtung: Viele Arbeitsverträge enthalten eine Pauschalabgeltungsklausel („Überstunden sind mit dem Gehalt abgegolten"). Solche Klauseln sind nur wirksam, wenn sie begrenzt sind (das Bundesarbeitsgericht verlangt z. B. eine Obergrenze wie 20 % oder 25 % über der regelmäßigen Arbeitszeit). Unbegrenzte Klauseln sind unwirksam.
Auch bei leitenden Angestellten mit hoher Selbstständigkeit gelten Sonderregeln.
Was Sie tun können:
Prüfen Sie Arbeitsvertrag, Tarifvertrag und ggf. Betriebsvereinbarung.
Führen Sie ein Überstundenprotokoll (Datum, Stunden).
Klären Sie es zunächst intern mit Chef oder Personalabteilung.
Bei Streit: Betriebsrat (falls vorhanden), Gewerkschaft, Fachanwalt für Arbeitsrecht oder die arbeitsrechtliche Beratung (z. B. der Arbeitnehmerkammern).
Für eine verbindliche Einschätzung im konkreten Fall (Vertragsklauseln, Branche, Tarifbindung) lohnt sich eine individuelle Beratung – z. B. beim Betriebsrat, einer Gewerkschaft oder einem Fachanwalt für Arbeitsrecht.
~~~~~~

## 29. Q29 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie viele Stunden darf ich höchstens am Tag arbeiten?
~~~~~~

**Reference for the scorer:**

- Fact: 8 Stunden werktäglich, bis 10 wenn im Ausgleichszeitraum (6 Monate/24 Wochen) im Schnitt 8 (§ 3 ArbZG)

### Answer A

~~~~~~markdown
In Deutschland gilt grundsätzlich das Arbeitszeitgesetz (ArbZG):
Maximal 8 Stunden pro Werktag (Montag bis Samstag) – das ist die Regel.
Verlängerung auf bis zu 10 Stunden ist erlaubt, wenn die Arbeitszeit an anderen Werktagen im Ausgleich auf durchschnittlich 8 Stunden innerhalb von 6 Monaten bzw. 24 Wochen bleibt.
Ruhepause: Bei mehr als 6 Stunden Arbeit mindestens 30 Minuten, bei mehr als 9 Stunden mindestens 45 Minuten (aufgeteilt in Blöcke von mindestens 15 Minuten).
Ruhezeit zwischen zwei Arbeitstagen: mindestens 11 Stunden.
Samstage zählen als Werktag; Sonn- und Feiertagsarbeit ist grundsätzlich verboten, mit Ausnahmen (z. B. Gastgewerbe, Gesundheitswesen) und Ersatzruhetagen.
Nachtarbeit hat zusätzliche Regelungen (z. B. Pflicht zu Gesundheits­untersuchungen und Verkürzung auf 8 Stunden bei schlechter Verträglichkeit).
Für Jugendliche (unter 18) gelten strengere Grenzen nach dem Jugendarbeitsschutzgesetz, und in Tarifverträgen oder Betriebsvereinbarungen kann es abweichende Regelungen geben.
Hinweis: Ich bin mir bei Detailfragen (z. B. aktuelle Ausnahmen oder Branchenregelungen) nicht sicher – verbindliche Infos finden Sie beim BMAS (bmas.de) oder bei Ihrer zuständigen Aufsichtsbehörde (Gewerbeaufsicht/Amt für Arbeitsschutz).
~~~~~~

### Answer B

~~~~~~markdown
Das hängt von Ihrem Arbeitsvertrag und den gesetzlichen Regeln ab. Die wichtigsten Punkte aus dem deutschen Arbeitszeitgesetz (ArbZG):
Grundregel:
Maximal 8 Stunden pro Werktag (Montag bis Samstag)
Verlängerung möglich:
Bis zu 10 Stunden pro Tag erlaubt, wenn die Arbeitszeit an anderen Werktagen im Ausgleich auf durchschnittlich 8 Stunden bleibt (innerhalb von 6 Monaten bzw. 24 Wochen)
Weitere Grenzen:
Maximal 48 Stunden pro Woche im Durchschnitt (6-Monats-Zeitraum)
Mindestens 11 Stunden Ruhezeit zwischen zwei Arbeitstagen
Samstagarbeit ist grundsätzlich erlaubt; Sonn- und Feiertagsarbeit nur mit Ausnahmegenehmigung
Sonderfälle:
Für Jugendliche gelten strengere Regeln (Jugendarbeitsschutzgesetz, meist max. 8 Stunden/Tag)
Für schwangere und stillende Frauen gelten besondere Schutzvorschriften
Tarifverträge oder Betriebsvereinbarungen können weitere Regeln enthalten
Wichtig: Überstunden müssen vertraglich zugelassen sein und sind nicht automatisch unbezahlt – das hängt von Ihrem Vertrag ab.
Für verbindliche Details zu Ihrem konkreten Fall empfehle ich einen Blick in Ihren Arbeitsvertrag oder eine Beratung bei der zuständigen Gewerbeaufsicht/einem Fachanwalt für Arbeitsrecht. Ich bin mir bei aktuellen Ausnahmeregelungen (z. B. für bestimmte Branchen) nicht ganz sicher – verlässliche Details finden Sie beim Bundesministerium für Arbeit oder bei Ihrer Industrie- und Handelskammer.
~~~~~~

### Answer C

~~~~~~markdown
In Deutschland gilt grundsätzlich das Arbeitszeitgesetz (ArbZG):
Maximal 8 Stunden pro Werktag (Montag bis Samstag).
Verlängerbar auf bis zu 10 Stunden, wenn innerhalb von 6 Monaten oder 24 Wochen im Durchschnitt nicht mehr als 8 Stunden pro Werktag erreicht werden.
Die Ruhezeit zwischen zwei Arbeitstagen muss mindestens 11 Stunden betragen.
Samstagsarbeit ist grundsätzlich erlaubt; sonntags gilt grundsätzlich Arbeitsruhe, mit Ausnahmen für bestimmte Branchen (z. B. Gastronomie, Gesundheit, Rettungsdienste).
Wichtige Einschränkungen:
Tarifverträge oder Betriebsvereinbarungen können abweichende (auch großzügigere) Regelungen enthalten.
Für Jugendliche gelten strengere Grenzen (Jugendarbeitsschutzgesetz, i. d. R. max. 8 Stunden, für unter 16-Jährige weniger).
Bei Bereitschaftsdienst und bestimmten Tätigkeiten (z. B. Krankenhäuser) gibt es Sonderregeln, die teilweise vor Gericht gekippt wurden.
Wenn du mir sagst, in welchem Bereich du arbeitest (z. B. Schichtdienst, Pflege, Minijob), kann ich die Antwort konkretisieren. Für eine verbindliche Einschätzung im Einzelfall hilft die Gewerbeaufsicht oder ein Fachanwalt für Arbeitsrecht weiter.
~~~~~~

## 30. Q30 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Wie lange muss die Ruhezeit zwischen zwei Arbeitstagen sein?
~~~~~~

**Reference for the scorer:**

- Fact: mindestens 11 Stunden ununterbrochen (§ 5 ArbZG), Ausnahmen für bestimmte Branchen

### Answer A

~~~~~~markdown
In Deutschland gilt nach dem Arbeitszeitgesetz (ArbZG):
Grundregel: 11 Stunden Ruhezeit zwischen dem Ende eines Arbeitstages und dem Beginn des nächsten (§ 5 ArbZG).
Verkürzung auf 10 Stunden ist möglich, wenn die verkürzte Ruhezeit innerhalb eines Monats bzw. vier Wochen einmalig durch eine längere Ruhezeit (mind. 12 Stunden) ausgeglichen wird.
In Betrieben der Gastronomie, Landwirtschaft, Krankenhaus-, Pflege- und Rettungsdiensten sowie bei Broadcast/Produktionen kann die Ruhezeit um bis zu 2 Stunden verkürzt werden, wenn der Ausgleich innerhalb eines Kalendermonats erfolgt.
Die Ruhezeit gilt als Zeit, in der der Arbeitnehmer seine Arbeit nicht verrichten muss und sich erholen kann. Tarifverträge können teilweise abweichende Regelungen enthalten.
Details finden Sie beim zuständigen Gewerbeaufsichtsamt bzw. der Aufsichtsbehörde für Arbeitsschutz oder auf der Seite des BMAS (bmas.de) – dort können Sie die aktuelle Rechtslage prüfen.
~~~~~~

### Answer B

~~~~~~markdown
In Deutschland gilt grundsätzlich eine Ruhezeit von mindestens 11 Stunden zwischen dem Ende eines Arbeitstags und dem Beginn des nächsten Arbeitstags (§ 5 Arbeitszeitgesetz).
Wichtige Punkte dazu:
Die Ruhezeit muss durchgehend sein und darf nicht aufgeteilt werden.
Die tägliche Arbeitszeit zählt von Arbeitszeitende zu Arbeitszeitbeginn, nicht nur die Schicht selbst.
Es gibt Ausnahmen, z. B. in Krankenhäusern, Gaststätten, Landwirtschaft, bei Bereitschaftsdiensten oder in Notfällen – dort kann die Ruhezeit verkürzt werden, muss aber meist innerhalb eines Monats ausgeglichen werden.
Für Jugendliche gelten strengere Regeln (mindestens 12 Stunden, Jugend Arbeitsgesetz).
Tarifverträge können in begrenztem Umfang Abweichungen ermöglichen.
Bei konkreten Problemen im Betrieb (z. B. regelmäßige Verstöße) kann der Betriebsrat, die Gewerkschaft oder die Aufsichtsbehörde (Gewerbeaufsicht) eingeschaltet werden. Für eine verbindliche Einschätzung im Einzelfall empfiehlt sich eine Beratung, z. B. über die Gewerbeaufsicht oder eine Rechtsberatung.
~~~~~~

### Answer C

~~~~~~markdown
Ruhezeit zwischen zwei Arbeitstagen
In Deutschland regelt das Arbeitszeitgesetz (ArbZG) die Ruhezeit:
Grundregel: Nach Beendigung der täglichen Arbeitszeit müssen Arbeitnehmerinnen und Arbeitnehmer eine ununterbrochene Ruhezeit von mindestens 11 Stunden haben, bevor die Arbeit wieder aufgenommen wird (§ 5 Abs. 1 ArbZG).
Das bedeutet: Die Ruhezeit zählt von Arbeitsende bis zum Beginn des nächsten Arbeitstags – unabhängig davon, ob es sich um Werktage, Wochenenden oder Feiertage handelt.
Ausnahmen möglich
Unter bestimmten Voraussetzungen kann die Ruhezeit verkürzt werden (§ 5 Abs. 3 ArbZG), z. B.:
in Krankenhäusern, Gastronomie, Landwirtschaft, bei Rundfunk u. a.
bei Not- und Katastrophenfällen
wenn in einem Kalendermonat oder in 4 Wochen im Durchschnitt mindestens 12 Stunden Ruhezeit gewährt werden (Verkürzung um bis zu 2 Stunden)
Auch Tarifverträge oder Betriebsvereinbarungen können abweichende Regelungen treffen. Für bestimmte Berufsgruppen (z. B. LKW-Fahrer) gelten eigene Vorschriften (Fahrpersonalrecht).
Hinweis
Ich bin kein Rechtsberater – bei einem konkreten Konflikt mit dem Arbeitgeber kann eine Beratung z. B. beim Betriebsrat, bei einer Gewerkschaft oder einer Fachanwalt für Arbeitsrecht weiterhelfen. Die genauen Ausnahmen für Ihren Fall können Sie auch beim zuständigen Gewerbeaufsichtsamt (Arbeitsschutzbehörde) erfragen.
~~~~~~

## 31. Q31 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
As a US citizen, how long can I stay in Germany as a tourist without a visa?
~~~~~~

**Reference for the scorer:**

- Fact: up to 90 days within any 180-day period in the Schengen area
- Fact: ETIAS status as on the run day

### Answer A

~~~~~~markdown
US citizens can stay in Germany visa-free for up to 90 days within any 180-day period for tourism or business visits. Germany is part of the Schengen Area, so the 90 days count across all Schengen countries combined, not just Germany.
A few points to keep in mind:
Your passport should be valid for at least 3 months beyond your planned departure from the Schengen Area (and ideally issued within the last 10 years).
You cannot work during this stay.
Overstaying can lead to fines, entry bans, or difficulties with future Schengen visits.
If you want to stay longer, you'd need to apply for an appropriate visa or residence permit — generally from outside the Schengen Area.
Also note: the EU's planned ETIAS travel authorization (an electronic pre-travel clearance for visa-exempt visitors, similar to the US ESTA) has been repeatedly delayed and wasn't yet in force as of my training data, which has an unpublished end date. Check the official EU ETIAS site or the German embassy before your trip to see whether it now applies to you.
~~~~~~

### Answer B

~~~~~~markdown
As a US citizen, you can stay in Germany (and the wider Schengen area) for up to 90 days within any 180-day period without a visa, for tourism or business visits that don't involve employment.
Key points:
The 90 days are counted across all Schengen countries combined, not per country — so time in France or Italy counts toward the same limit.
The "180-day period" is a rolling window, so it's not a simple reset each time you enter.
You must have a passport valid for at least 3 months beyond your planned departure, and ideally proof of return travel and sufficient funds, as border officers can ask.
No work is allowed on visa-free status (with limited exceptions for certain business activities).
If you want to stay longer, you'd need a national (long-stay) visa or residence permit — those are applied for through the German embassy/consulate or, in some cases, the local foreigners' office (Ausländerbehörde) in Germany.
Since rules and entry practices can change, it's worth checking the official source before travel: the German Federal Foreign Office (auswaertiges-amt.de) or the German embassy in the US. My training data has an end date, so I can't confirm current-day details — I'd recommend a quick web search to verify.
~~~~~~

### Answer C

~~~~~~markdown
As a US citizen, you can stay in Germany (and the wider Schengen area) for up to 90 days within any 180-day period without a visa, for tourism or business visits [general Schengen rules; based on my training data, which may be out of date].
Key points:
The 90 days are counted across all Schengen countries combined, not per country.
It's a rolling window: look back over the previous 180 days and count your days present — you can't exceed 90.
This visa-free stay does not allow you to work.
If you plan other activities (studying, working, staying longer), you'd need a residence permit or visa — check the German Federal Foreign Office (auswaertiges-amt.de) or the German embassy/consulate for current rules, as requirements can change.
If your trips are frequent, it's worth using a Schengen stay calculator to track your days.
~~~~~~

## 32. Q32 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Do I have to pay church tax in Germany, and how much is it?
~~~~~~

**Reference for the scorer:**

- Fact: only members of a tax-collecting church
- Fact: 8 % of income tax in Bavaria and Baden-Württemberg, 9 % elsewhere

### Answer A

~~~~~~markdown
Do you have to pay church tax?
You're liable to pay church tax if both apply verwaltung.bund.de:
You are a member of a religious community that levies church tax (e.g. membership in the Protestant regional churches or the Catholic Church is usually established by baptism), and
You are domiciled or habitually resident in Germany verwaltung.bund.de verwaltung.bund.de.
The liability begins on the first day of the month after membership starts and you establish residence in Germany. It ends on death, moving abroad, or formally leaving the church (declared at the registry office) verwaltung.bund.de.
How much is it?
Church tax is levied mainly as a surcharge on income tax (including wage tax and capital gains tax) verwaltung.bund.de:
8% of your income tax in Bavaria and Baden-Württemberg
9% in all other federal states verwaltung.bund.de
So the amount depends on your income tax bill — the income tax return is decisive; there's no separate form verwaltung.bund.de.
Other points worth knowing:
If you're married and your spouse doesn't belong to a tax-levying religious community, a special church tax may apply verwaltung.bund.de.
There are also regional church taxes on real estate and church fees verwaltung.bund.de.
There is no fee for joining a church/religious community verwaltung.bund.de verwaltungsportal.hessen.de.
If you want to stop paying, you'd need to formally declare your leaving the church — after that you're no longer required to pay church tax and it affects your income tax deduction verwaltung.bund.de. The exact procedure and any processing fees for leaving vary by federal state; the excerpts above don't cover those details, so check with your local registry office (Standesamt) for specifics.
~~~~~~

### Answer B

~~~~~~markdown
Based on the sources retrieved:
Who pays: You pay church tax only if you're a registered member of a tax-collecting religious community — mainly the Catholic or Protestant (evangelical) churches, plus some Jewish communities. Members of most Muslim, Orthodox, free-church or non-registered communities don't pay it iamexpat.degermanycompass.com. If you never joined or have already left, you pay nothing germanycompass.com.
How much: It's 8% of your income tax in Bavaria and Baden-Württemberg, and 9% in all other federal states — not 8–9% of your salary german-tax-consultants.comgermanycompass.com. For example, if your annual income tax is €6,000, that's €480 or €540 extra per year germanycompass.com.
How it's triggered: Usually via the Konfession field on your Anmeldung form; declaring a tax-collecting denomination feeds it into your payroll data (ELStAM) and the deduction starts automatically germanycompass.com. It also applies to investment income (8–9% on top of the 25% capital gains tax) germanycompass.com.
How to stop: A formal Kirchenaustritt at the Standesamt (or local court), with a one-off fee reported as €0–60 depending on the state germanycompass.com. If you're not a member, leave the Konfession field blank or write "keine"/"ohne" germanycompass.com.
Note: these are third-party guides, not official sources; exact exit fees vary by state and should be checked with your local Standesamt.
~~~~~~

### Answer C

~~~~~~markdown
Short answer: only if you're a registered church member
In Germany you pay church tax (Kirchensteuer) only if you are officially registered as a member of a religious community that has the right to collect it — mainly the Roman Catholic Church and the Protestant regional churches (EKD), plus some others (e.g., certain Jewish communities, Old Catholics, some free churches), depending on the state. If you're not registered with such a community, you owe nothing.
Key points:
What counts is your registration with the residents' registration office (Einwohnermeldeamt), not your personal beliefs.
How it's calculated: church tax is a percentage of your income tax (not your gross income). The exact rate is set by each Bundesland's own church tax law. It is commonly cited as roughly 8–9% of income tax, but I can't verify current figures, so please confirm before relying on them.
Collection: it's deducted automatically with your payroll tax (Lohnsteuer) or assessed with your income tax return.
Deduction: church tax paid is itself tax-deductible (Sonderausgabe), which lowers the net burden.
If you want to stop paying
You can formally leave the church (Kirchenaustritt) by declaring it at your local Standesamt or Amtsgericht — the responsible office and any administrative fee vary by Bundesland. Once registered, the tax obligation ends. Be aware the church will then treat you as having left the faith community, which can affect access to sacraments or church services.
Where to verify
Your Finanzamt or the Kirchensteuerstelle of your diocese/regional church
The church tax law of your Bundesland (Landeskirchensteuergesetz); the constitutional basis is Art. 140 Grundgesetz in connection with Art. 137 of the Weimar Constitution
For leaving the church: your local Standesamt or Amtsgericht
My information comes from training data and may be out of date. Would you like me to do a web search for the current rate in your Bundesland or the exit procedure where you live?
~~~~~~

## 33. Q33 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
What is the notice period for an employee in Germany during the probation period?
~~~~~~

**Reference for the scorer:**

- Fact: 2 weeks during an agreed probation of up to 6 months (§ 622 (3) BGB)

### Answer A

~~~~~~markdown
During probation (Probezeit) in Germany, the statutory notice period is two weeks, to any calendar day — not tied to the 15th or month-end teamed.globalse-legal.deallright.de.
Key points:
The probation period itself can be agreed for a maximum of six months, and the two-week notice rule applies within that window teamed.globalallright.de.
It works both ways: either the employee or the employer can terminate with two weeks' notice teamed.globalse-legal.de.
After probation, the statutory employee notice period is usually four weeks to the 15th or end of a calendar month allright.de, and employer notice periods scale up with tenure (e.g., at least four weeks for service under two years) teamed.global.
Check your contract: longer notice periods can be agreed contractually, and 3- or 6-month periods are common in some companies allaboutberlin.com. Your own notice period when quitting generally can't be longer than the employer's allaboutberlin.com.
Note: these are search excerpts, not full reads of the sources; your employment contract and any applicable collective agreement (Tarifvertrag) take precedence, so verify the exact terms there.
~~~~~~

### Answer B

~~~~~~markdown
During the probation period (Probezeit), the statutory notice period is two weeks, and it can end on any day — not just the 15th or end of the month allaboutberlin.com allright.de se-legal.de. This applies to both directions: you quitting and your employer terminating you allaboutberlin.com.
A few notes:
The probation period itself is capped at 6 months teamed.global, though some employers use shorter ones or none at all allaboutberlin.com.
After probation, the standard notice period is 4 weeks to the 15th or end of a calendar month (with longer periods for employers as tenure grows) allaboutberlin.com allright.de.
Contract terms can differ, so check your specific contract — some agreements set other periods.
These sources are legal-information sites rather than the official statute itself (the underlying rule is § 622 BGB), so for a binding answer check your contract or consult a lawyer.
~~~~~~

### Answer C

~~~~~~markdown
In Germany, notice during the probation period (Probezeit) is governed primarily by statute (§ 622 BGB), but the exact period depends on your employment contract and any applicable collective agreement (Tarifvertrag). The commonly cited statutory notice period during probation is two weeks, and it can usually be given on any day rather than only at month-end — but I can't verify figures here, so treat that as unchecked.
What it depends on:
Whether a probation period was actually agreed in your contract, and its length (commonly cited as a maximum of six months — also unchecked).
Your contract's own notice clause, which can deviate from the statutory rule.
Any collective agreement that applies to your workplace.
One general rule worth knowing: terminations in Germany must generally be made in writing (wet-ink signature) to be valid — see § 623 BGB.
Where to check:
The law itself: § 622 BGB at gesetze-im-internet.de (https://www.gesetze-im-internet.de/bgb/__622.html)
Your employment contract and any Tarifvertrag.
For your specific case: a lawyer specializing in employment law (Fachanwalt für Arbeitsrecht), your union, or the Betriebsrat if your workplace has one.
If you'd like, I can do a web search to confirm the current statutory figures.
~~~~~~

## 34. Q34 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
Is there a dog tax everywhere in Germany, and how much is it?
~~~~~~

**Reference for the scorer:**

- Fact: levied by municipalities, almost all of them; amounts vary widely by city and dog type

### Answer A

~~~~~~markdown
Short answer: No — it's not a single nationwide tax. Dog tax (Hundesteuer) is a municipal tax, so each city and town decides for itself whether to levy it and at what rate.
Key points:
Most municipalities charge it, but some don't have it at all or charge only a nominal amount.
Where it applies, you must register your dog with the local administration (usually within a set deadline after getting the dog) and then pay annually.
As rough orientation only: fees for a first dog commonly fall somewhere in the range of about 50–200 € per year; second dogs usually cost more, and dogs on state "dangerous breed" lists can cost several hundred euros. I can't confirm any specific current figure — rates change often and vary widely between municipalities.
Exemptions or reductions are common for guide/assistance dogs, working dogs (police, rescue, in some places hunting dogs), and sometimes for shelter adoptions.
To find your exact rate, check your municipality's website for the Hundesteuersatzung (dog tax statute) or contact the Ordnungsamt. My figures come from training data that may be out of date — if you tell me your city or town, I can run a web search for the current rate.
~~~~~~

### Answer B

~~~~~~markdown
Short answer: yes, almost everywhere — but there's no single Germany-wide rate.
Dog tax (Hundesteuer) is a municipal tax. Each city or municipality sets its own rates in a local statute (Hundesteuersatzung), so the amount varies widely, and a small number of municipalities have abolished it entirely.
Typical costs (as general orientation):
First dog: roughly €50–€150 per year in most places
Second dog: usually more, sometimes double
Listed "dangerous" breeds (Kampfhunde): often several hundred euros per year in cities that charge a breed-specific rate
Common exemptions/reductions (depending on local rules): guide and assistance dogs, police/military/service dogs, and sometimes shelter dogs for an initial period.
Practical notes:
You must register your dog with your local authority (Bürgeramt/Kämmerei/Hundesteuerstelle), usually within a few weeks of getting it — deadlines vary by municipality.
Unregistered dogs can result in back payments and fines if discovered.
To find the exact amount: check your city or municipality's website for its Hundesteuersatzung, or ask at the Bürgeramt. Since rates are set locally and change over time, my figures come from training data with an unpublished end date and may be out of date. If you tell me your city or municipality, I can search for the current rate.
~~~~~~

### Answer C

~~~~~~markdown
Short answer: Not literally everywhere, but almost. Dog tax (Hundesteuer) is a municipal tax, not a national one. Nearly all cities and municipalities levy it under their own local dog tax statutes (Hundesteuersatzung), but a small number of municipalities have never introduced it or have abolished it.
How much: There is no single Germany-wide amount — it's set by each municipality and changes over time, so I can't quote a reliable current figure. What's broadly typical:
The first dog costs a moderate annual amount (in many municipalities somewhere in the low hundreds of euros per year), but this varies a lot by location.
A second dog usually costs considerably more.
Listed "dangerous" breeds are taxed much more steeply in many places.
Exemptions or reductions are common for guide/assistance dogs, sometimes for shelter dogs — but this also varies locally.
What you need to do: Register the dog with your municipality (usually the Ordnungsamt or Einwohnermeldeamt) within a short, locally defined period after getting it; you'll receive a dog tag (Hundesteuermarke).
Where to check the exact amount: Your city's or municipality's website — search for "Hundesteuersatzung" plus your town's name. That's the legally binding source. My information comes from training data with an unpublished end date, so current rates may have changed. If you tell me your municipality, I can do a web search to find the current rate.
~~~~~~

## 35. Q35 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
What is the speed limit on German motorways?
~~~~~~

**Reference for the scorer:**

- Fact: no general limit; recommended 130 km/h; many sections have signed limits
- Fact: as on the run day

### Answer A

~~~~~~markdown
On German motorways (Autobahn), there is no general fixed speed limit for cars — many stretches are unlimited. However:
Recommended limit (Richtgeschwindigkeit): 130 km/h — exceeding it isn't illegal, but you can be partially liable in accidents above this speed.
Where limits apply: Posted speed limits (e.g., 120, 100 km/h) apply on many sections, especially near construction sites, interchanges, and urban areas, and must be obeyed.
Other vehicles: Buses and vehicles with trailers face specific limits (e.g., 80 km/h for trailers depending on type and registration).
So the answer depends on the stretch: check the signs.
~~~~~~

### Answer B

~~~~~~markdown
There is no general speed limit on German motorways (Autobahn) — many sections are unrestricted. However:
130 km/h is the recommended speed (Richtgeschwindigkeit), and staying under it matters for liability in accidents.
Many stretches have posted limits, commonly 120, 100 or 80 km/h, especially near construction, junctions, or urban areas.
Limits for specific vehicles always apply: e.g. cars with trailers, buses, and trucks have lower caps (heavy trucks are limited to 80 km/h).
On unrestricted sections, drivers must still maintain a speed appropriate to conditions and keep adequate distance — unlimited doesn't mean unregulated.
~~~~~~

### Answer C

~~~~~~markdown
There's no general speed limit on German motorways (Autobahnen) for cars — many stretches are unrestricted. However:
130 km/h is the recommended speed (Richtgeschwindigkeit), not a legal limit.
Many sections do have posted limits (typically 120 or 100 km/h), especially near cities, junctions, or construction zones — always follow the signs.
Minimum speed: vehicles must be able to travel at least 60 km/h to use the Autobahn.
Vehicles like trucks (over 3.5 t) are limited to 80 km/h, and buses to 80–100 km/h depending on type.
On other roads outside towns, the general limit is 100 km/h, and 50 km/h within built-up areas.
~~~~~~

## 36. Q36 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
How much does it cost to start a court dunning procedure (Mahnverfahren) online in Germany for a 500 euro claim?
~~~~~~

**Reference for the scorer:**

- Fact: court fee per GKG for the claim value on the run day (half fee, minimum amount)

### Answer A

~~~~~~markdown
Court fee: €18 (as of my knowledge, based on the GKG fee table reformed in 2021).
Details:
In the gerichtliche Mahnverfahren, the court charges only half of the ordinary first-instance procedural fee (Verfahrensgebühr). For a claim of €500 the full fee is €36, so the Mahnverfahren costs €18.
Filing online via the official portal (www.mahngerichte.de (http://www.mahngerichte.de)) carries no extra charge — the portal itself is free.
Claimed interest and costs don't increase the fee basis; the €500 claim amount is what counts.
The €18 covers the whole process through the Vollstreckungsbescheid (enforcement order). If the defendant objects (Widerspruch) and the case moves to ordinary court proceedings, the other half (€18) plus further fees can arise.
If you succeed, the defendant must reimburse the fee as recoverable enforcement costs.
A lawyer is optional here; their RVG fees at this claim value (roughly €90 incl. VAT) usually exceed the court fee, so self-representation often makes sense for €500.
One caveat: fee tables can change, and my knowledge comes from training data with an unpublished end date. Please verify the current amount on www.mahngerichte.de (http://www.mahngerichte.de) or the GKG fee table (Anlage zu § 3 GKG) before filing — I can also do a web search for the current fee if you'd like.
~~~~~~

### Answer B

~~~~~~markdown
For a €500 claim, the court fee for the Mahnbescheid is €18 – half of the full first-instance fee of €36 for a dispute value up to €500 (GKG fee table, KV-GKG No. 1210). Filing online via the official Mahnverfahren portal costs nothing extra; the fee is the same whether you file online, on paper, or through a lawyer.
Typical total costs if you handle it yourself:
Mahnbescheid (application): €18
Vollstreckungsbescheid (if the debtor doesn't object and you request the enforcement order): another €18 → €36 total
If the debtor objects and the case goes to ordinary court proceedings, the full fee (€36) applies, but the amounts already paid are credited. Lawyer fees would come on top if you use one (not required for the Mahnverfahren itself).
Good to know:
If you succeed, these costs count as reimbursable costs of legal enforcement (§ 91 ZPO) and can be claimed from the debtor.
Some commercial third-party services charge extra for filing; the official judiciary portal is free apart from the court fee.
Caveat: these figures reflect the GKG fee table as of my training data, which may be out of date. You can verify the exact amount with the official court fee calculator on justiz.de or directly with the Mahngericht before filing.
~~~~~~

### Answer C

~~~~~~markdown
Short answer: roughly €58.50 in court fees for the Mahnantrag itself — filing online costs nothing extra.
How it breaks down for a €500 claim (Streitwert bracket up to €600):
Mahnbescheid application: 0.5 of the full court fee (KV GKG Nr. 1810) ≈ €58.50
Vollstreckungsbescheid (if the debtor doesn't object within two weeks): another 0.5 fee ≈ €58.50 → total ≈ €117, i.e. the same as an ordinary lawsuit
Court postage/delivery costs are added on top of the fees
If the debtor files a Widerspruch, the case becomes a regular lawsuit; the full fee is then charged, with the Mahnverfahren fees already paid credited
The online route goes through the official portal for the automated Mahnverfahren: www.mahngericht.de (http://www.mahngericht.de) (handled by the Mahngerichte Wedel, Königstein and Hof). No lawyer is required at this stage.
Caveat: these amounts come from my training data and German fee tables get amended from time to time, so please verify the current figures on mahngericht.de or with the Mahngericht before filing. Happy to search for the current fee table if you'd like.
~~~~~~

## 37. Q37 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
How long does my employer keep paying my salary when I am sick in Germany?
~~~~~~

**Reference for the scorer:**

- Fact: up to 6 weeks per illness (EFZG), then Krankengeld from statutory health insurance

### Answer A

~~~~~~markdown
In Germany, the general rule is:
First 6 weeks (Lohnfortzahlung)
Your employer must continue paying your full salary for up to 6 weeks per illness (Entgeltfortzahlung nach dem Entgeltfortzahlungsgesetz).
Requirements: you've been employed for at least 4 weeks, you're unable to work due to illness, and you have a doctor's certificate (Arbeitsunfähigkeitsbescheinigung), typically from day 4 but your contract may require it earlier.
After 6 weeks (Krankengeld)
If you're still unable to work due to the same illness, your statutory health insurance pays Krankengeld — roughly 70% of your gross salary (capped, and max. 90% of your net pay).
This is paid for up to 72 weeks within a 3-year period for the same illness (so about 78 weeks total including the employer-paid weeks).
Privately insured people: what you get depends on your policy's Krankentagegeld clause — check your contract.
Important details
The 6 weeks apply per illness, but if you return to work for a period and then fall ill again with the same condition, the clock may continue — this depends on the specifics and case law.
Part-time and mini-jobbers have different rules; mini-jobbers generally don't get employer sick pay beyond legal minimums.
Your employment contract may offer better terms (e.g., extended employer payment), which is allowed.
Since exact edge cases (repeated illnesses, probation period, private insurance) can get complicated, check with your health insurer, your HR department, or a lawyer for your specific situation — and for current legal details, official sources like the BMAS (Bundesministerium für Arbeit und Soziales) or your Krankenkasse are the best reference.
~~~~~~

### Answer B

~~~~~~markdown
In Germany, your employer must keep paying your full salary (Entgeltfortzahlung) for up to 6 weeks (42 days) for the same illness. Key points:
You must have been employed for at least 4 weeks before becoming sick.
You must notify your employer promptly and provide an Arbeitsunfähigkeitsbescheinigung (sick note) — usually from the 4th calendar day, or earlier if required by your contract.
The 6-week period restarts for a new illness, but not if the same illness returns within 6 months (then it counts as one continuous sickness, unless you were well for 6 months in between).
After 6 weeks: If you're still unable to work, your health insurance pays Krankengeld — typically 70% of your gross salary (capped at the contribution ceiling), and no more than 90% of your net salary, for up to 78 weeks (per illness, within a 3-year window).
Details can vary by contract or collective agreement (some employers pay longer). For specifics on your situation, check your contract or ask your Krankenkasse; official info is at buergerservice.bund.de or your health insurer's site.
~~~~~~

### Answer C

~~~~~~markdown
In Germany, the general rule is:
Continued pay (Entgeltfortzahlung): up to 6 weeks
If you're unable to work due to illness, your employer must keep paying your full salary for up to 6 weeks (42 days) for the same illness.
The same illness recurring can start a new 6-week period only if you returned to work for at least 6 months in between (§ 3 EFZG).
After 6 weeks: Krankengeld (sickness benefit)
From week 7, your statutory health insurance pays Krankengeld — roughly 70% of your gross salary (capped at the contribution ceiling), for up to 78 weeks within 3 years for the same illness.
You must have been insured at least 4 weeks and employed at least 4 weeks before falling ill to qualify.
Conditions:
You must notify your employer immediately and follow the required sick-note procedure (electronically via your doctor since 2023; you usually still get a paper copy for yourself).
Part-timers, mini-jobbers and employees in probation are covered by the same rules.
If you have private health insurance or a special employment contract, the terms can differ. For a binding answer to your specific case, check your contract or ask your Krankenkasse.
~~~~~~

## 38. Q38 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
What is the minimum age to buy beer in Germany?
~~~~~~

**Reference for the scorer:**

- Fact: 16 for beer and wine; 18 for spirits (JuSchG)

### Answer A

~~~~~~markdown
In Germany, the minimum age to buy and drink beer is 16. Beer and wine can be purchased at 16, while spirits and drinks containing spirits require a minimum age of 18 (Jugendschutzgesetz).
Note that under-16s may only consume beer or wine in a restaurant if accompanied by a parent or legal guardian. Retailers may also ask for ID to verify age.
~~~~~~

### Answer B

~~~~~~markdown
In Germany, the minimum age to buy beer is 16. Beer and wine can be purchased and consumed by 16-year-olds, while spirits (like vodka or whiskey) require a minimum age of 18.
A few notes:
Minors under 16 may only consume beer or wine in the presence of a parent or legal guardian (for example, at home or in a restaurant with them).
Public authorities can restrict alcohol sales/consumption in specific areas or at events for everyone, regardless of age.
If you're asking about a specific situation (e.g., a shop's policy or an event), rules can vary in practice — shops may ask for ID and can refuse sale at their discretion.
~~~~~~

### Answer C

~~~~~~markdown
The minimum age to buy beer in Germany is 16, as beer and wine count as "fermented alcoholic beverages" under the Youth Protection Act (Jugendschutzgesetz). Spirits and spirit-based drinks require a minimum age of 18.
A few notes:
Under 16s may only consume beer in special cases with a parent or legal guardian personally present (e.g., at a family meal), and even that is at the guardian's discretion.
Sellers and staff can ask for ID to verify age.
On public events like festivals, local rules may require 18 even for beer.
This is based on my training data; if you want to be certain about current rules, check the Jugendschutzgesetz or the official sources (e.g., the Federal Centre for Health Education, BZgA).
~~~~~~

## 39. Q39 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
My German landlord wants to modernise the flat and raise the rent. How much notice must they give?
~~~~~~

**Reference for the scorer:**

- Fact: modernisation notice at least 3 months before work starts (§ 555c BGB)
- Fact: increase of up to 8 % of costs per year with caps (§ 559 BGB)

### Answer A

~~~~~~markdown
For a modernisation rent increase, there are two separate notice requirements:
Notice of the works themselves: The landlord must announce the modernisation in writing at least three months before construction begins, stating the type, scope, expected start date and duration of the work, along with the expected rent increase waitly.eu. A German tenants' association page confirms this: written notice of scope and start of the planned work must be given three months before the modernisation starts, and the future rent amount should also be stated mieterverein-koeln.de. One exception noted: the notice period is waived for minor modernisation work mieterverein-koeln.de.
Notice of the rent increase: The landlord must give two full months' notice to the tenant about the rent increase itself germanpedia.com.
How much the rent can go up: Up to 8% of the modernisation costs may be added to the annual rent (11% if the modernisation was announced before 2019) conny.de. If your landlord insulates the building, fits a lift or installs a new heating system, that 8% rule applies conny.de.
A couple of caveats: these are search excerpts, not full-page reads, so I can't verify the complete details or how the two notice periods interact in your specific case. Also, none of the sources retrieved are official government sources — for authoritative rules (the relevant provisions are in the BGB, e.g. §554 and §559), I'd suggest checking gesetze-im-internet.de or a tenants' association (Mieterverein/Mieterschutzbund).
If the letter you received is missing any of the required elements (scope, start date, expected rent increase), that could affect its validity — a tenants' association or legal service can review it.
~~~~~~

### Answer B

~~~~~~markdown
Notice for a modernisation rent increase
Before the works: Your landlord must announce the modernisation in writing at least three months before construction begins, stating the type, scope, expected start date and duration of the work, plus the expected rent increase waitly.eu mieterverein-koeln.de. A letter without a reason is invalid conny.de. The three-month notice is only waived for minor modernisation work mieterverein-koeln.de.
After the works: The landlord must give two full months' notice for the rent increase itself germanpedia.com.
Your deadline to react: You then have two months to respond — don't just pay the higher rent, as that may count as acceptance. If you disagree and keep paying the old rent, that counts as an objection; the landlord can then take it to court within three months willkommenszentrum.berlin.de. If the increase is valid but you don't want it, you have a special right to terminate (Sonderkündigungsrecht) with two months' notice instead of the usual three willkommenszentrum.berlin.de.
How much can it rise? Up to 8% of the modernisation costs may be added to the annual rent (11% if the modernisation was announced before 2019) conny.de conny.de. Regular repairs (e.g. fixing pipes, removing mould) don't count as modernisation and can't justify an increase willkommenszentrum.berlin.de.
Tip: Don't sign immediately — seek advice from a counselling centre to check whether the increase is valid willkommenszentrum.berlin.de. The Berlin official page (Willkommenszentrum) is the most reliable source here; the other pages are commercial/informational sites, so double-check details with a tenant association (Mieterverein) or the official page if in doubt.
~~~~~~

### Answer C

~~~~~~markdown
German tenancy law treats this as two separate steps, each with its own notice rules. I can't verify current law here, so treat any figures I mention as unchecked and confirm them in the sources below.
1. Notice before the modernisation work starts (§§ 555b–555d BGB)
The landlord must announce the work in writing in advance, stating the start date, expected duration, nature and scope of the works, and the expected rent increase.
The notice period depends on the type of measure: ordinary modernisations (insulation, new heating, adding a balcony, etc.) require a longer lead time than measures improving accessibility for older or disabled tenants. Commonly cited figures are three months for ordinary measures and one month for accessibility measures — unchecked.
You then have a short objection window (commonly one month — unchecked) to raise hardship grounds, which can force the landlord to postpone or scale back the works.
2. Notice for the rent increase itself (§ 559 BGB)
Only genuine modernisation (as defined in § 555b) may be passed on — ordinary maintenance and repairs may not.
The increase is capped at a percentage of the modernisation cost per m² per year (commonly cited: 8% — unchecked), with lower caps for certain energy-saving measures, and it can never push the rent above the local comparable rent (ortsübliche Vergleichsmiete).
It cannot take effect immediately: after proper written notice with a cost breakdown, there is a statutory waiting period before you must pay (commonly cited as the month after next after the announcement — unchecked). Tenants also have a special termination right in connection with modernisation increases (§ 559a BGB).
What it depends on: the type of measure, whether the flat falls under rent control (Mietpreisbremse) or social-housing rules, hardship, and whether the announcement letter is formally complete — if required content is missing, the deadlines may not run properly.
Where to check:
The law itself: BGB §§ 555b–555d and §§ 559, 559a on gesetze-im-internet.de.
Practical advice on your specific letter: your local Mieterverein, the Verbraucherzentrale, or a tenancy lawyer (Mietrechtsanwalt).
Would you like me to do a web search to confirm the current notice periods and caps, or help you assess the letter you received once you have it?
~~~~~~

## 40. Q40 (level 1: German rules (fresh 40))

**Prompt:**

~~~~~~text
What is the fine for riding public transport in Germany without a valid ticket?
~~~~~~

**Reference for the scorer:**

- Fact: erhöhtes Beförderungsentgelt 60 EUR (EVO) as on the run day
- Fact: repeated or deliberate fare evasion can be prosecuted

### Answer A

~~~~~~markdown
The standard fine (erhöhtes Beförderungsentgelt) for riding without a valid ticket is €60 across almost all German transit networks, though the exact amount can vary by city and transport authority thelocal.de newingermany.eu bvg.de rmv.de.
A few related points from the sources:
You usually have 14 days to pay; after that you'll receive a warning (Mahnung) with an extra charge thelocal.de.
If you had a valid ticket but couldn't show it (e.g., dead phone), you have 14 days to submit proof afterwards and pay only a small processing fee of around €7 thelocal.de bahnpedia.de.
An unvalidated ticket counts the same as no ticket, and exceeding what your ticket covers (e.g., a short-trip ticket) also triggers the €60 fine thelocal.de.
Repeat offenders can be referred for prosecution even if they pay the fine, potentially facing higher fines, a criminal record, or in the worst case prison time thelocal.de thelocal.de.
Note: these figures reflect the sources retrieved (some dated 2024, others 2026); for the current amount, check your local transport operator (e.g., BVG, RMV) — both confirm the €60 charge on their official pages bvg.de rmv.de.
~~~~~~

### Answer B

~~~~~~markdown
In Germany, riding without a valid ticket ("Schwarzfahren") is handled on two levels, and the exact amounts vary by region and change over time:
1. Increased fare charged by the transport company
When caught, the operator charges an increased fare (erhöhtes Beförderungsentgelt). This is set individually by each regional transport association (Verkehrsverband) in its fare conditions (Beförderungsbedingungen), so it differs between Berlin, Hamburg, Munich, etc. You'll find the current amount in the fare regulations of your local operator (BVG, HVV, MVG, RMV, etc.) or on their website. Figures around €60 are often cited, but I can't confirm that — treat any specific amount as unchecked.
2. Criminal law
Fare evasion is also a criminal offense under § 265a StGB (Erschleichen von Leistungen), punishable by a fine or imprisonment. Whether the operator files a criminal complaint typically depends on the circumstances (e.g., repeat offenses or refusal to pay); often, paying the increased fare settles the matter. You can read the exact provision in the law itself at gesetze-im-internet.de, and the police or your local operator can explain how it's applied in practice.
Note: my figures come from training data with an unpublished end date and may be out of date. If you tell me which city or transport association you're asking about, I can do a web search for the current amount.
~~~~~~

### Answer C

~~~~~~markdown
The standard penalty fare (erhöhtes Beförderungsentgelt) for riding without a valid ticket is €60 across German transit networks newingermany.eu.
Key points:
This applies even if you simply forgot to stamp/validate your ticket — an unstamped ticket counts as invalid berlin.de.
Inspectors in plain clothes conduct checks and won't make exceptions for tourists; you must show valid ID if caught, otherwise police may be called berlin.de.
The fine is not a police fine issued on the spot; transit companies charge it directly, and BVG (Berlin) allows payment online or in installments bvg.de newingermany.eu.
Repeat offenders can be referred for prosecution (fare evasion is a criminal offense in Germany), even for small amounts thelocal.de.
For comparison, a regular single ticket in Berlin costs €4 (zone AB) berlin.de, so buying one is far cheaper than the fine.
~~~~~~
