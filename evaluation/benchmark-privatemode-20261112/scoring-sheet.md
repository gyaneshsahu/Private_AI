# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

## 1. P-R1 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Wie hoch ist der Grundfreibetrag bei der Einkommensteuer für 2026? Bitte mit offizieller Quelle.
~~~~~~

**Reference for the scorer:**

- Fact: amount for 2026 as in § 32a EStG or the Bundesfinanzministerium on the run day
- Element: official source link

### Answer A

~~~~~~markdown
Grundfreibetrag 2026
12.348 € für Alleinstehende
24.696 € für zusammenveranlagte Ehepaare bzw. eingetragene Lebenspartner vr.de vr.de finanzwiki.com finanzamt24.de
Die Rechtsgrundlage ist § 32a EStG; bis zu dieser Grenze liegt das zu versteuernde Einkommen in der „Nullzone", in der keine Einkommensteuer anfällt vr.de finanzwiki.com ordio.com. Mehrere unabhängige Quellen nennen übereinstimmend denselben Betrag (12.096 € für 2025, 12.348 € für 2026) finanzwiki.com amtsdeutschland.de.
Hinweis zur offiziellen Quelle: Die durchsuchten Treffer sind Banken- bzw. Privatanbieterseiten (z. B. VR-Banken, Steuerportale) – keine davon ist eine offizielle Behörden- oder Gesetzesseite. Verbindlich nachzulesen wäre der Wert im Gesetzestext selbst (§ 32a EStG auf gesetze-im-internet.de) bzw. beim Bundesministerium der Finanzen (bmf.de); diese Seiten waren in den aktuellen Suchergebnissen nicht enthalten.
Soll ich gezielt noch nach der amtlichen Quelle (BMF oder gesetze-im-internet.de) suchen?
~~~~~~

### Answer B

~~~~~~markdown
Grundfreibetrag 2026:
Alleinstehende: 12.348 Euro
Zusammenveranlagte Paare (Ehegatten/eingetragene Lebenspartner): 24.696 Euro
Rechtsgrundlage ist § 32a EStG vr.de. Diese Werte bestätigen mehrere unabhängige Quellen übereinstimmend: die Volksbanken Raiffeisenbanken vr.de, amtsdeutschland.de amtsdeutschland.de und finanzwiki.com finanzwiki.com. Zum Vergleich: 2025 lag der Grundfreibetrag bei 12.096 €, 2024 bei 11.784 € finanzwiki.com.
Hinweis zur Wirkung: Einkommen bis zu dieser Höhe (genauer: das zu versteuernde Einkommen, also Bruttoeinkommen nach Abzügen wie Werbungskosten) bleibt steuerfrei; erst darüber greift der progressive Tarif vr.de.
Zur "offiziellen Quelle": Die verbindliche Rechtsgrundlage ist das EStG selbst (§ 32a EStG), einsehbar unter gesetze-im-internet.de; maßgeblich ist das jeweils geltende Steueränderungsgesetz. Die Suchergebnisse stammen von Banken und Ratgeberseiten, nicht vom Bundesfinanzministerium – falls Sie eine primäre Behördenquelle brauchen, kann ich gerne nochmal gezielt danach suchen.
~~~~~~

### Answer C

~~~~~~markdown
Der Grundfreibetrag 2026 beträgt:
12.348 Euro für Alleinstehende (Einzelveranlagung)
24.696 Euro für zusammen veranlagte Ehepaare und eingetragene Lebenspartner
Rechtliche Grundlage ist § 32a EStG. Der Betrag schützt das steuerliche Existenzminimum: Einkommen bis zu dieser Grenze bleibt einkommensteuerfrei („Nullzone") vr.de.
Hinweis zu den Quellen: Die angegebene Zahl wird von mehreren Quellen übereinstimmend genannt – u. a. den Volksbanken Raiffeisenbanken vr.de, finanzwiki.com finanzwiki.com und amtsdeutschland.de amtsdeutschland.de. Das ist aber keine „offizielle" Quelle im eigentlichen Sinn (z. B. Bundesfinanzministerium oder Gesetzestext). Eine verlässliche Primärquelle wäre der aktuelle Wortlaut des § 32a EStG unter www.gesetze-im-internet.de/estg/ (http://www.gesetze-im-internet.de/estg/) oder die Seiten des Bundesfinanzministeriums (bundesfinanzministerium.de). Dort können Sie den Betrag selbst gegenprüfen.
Zum Vergleich die Entwicklung: 11.784 € (2024) → 12.096 € (2025) → 12.348 € (2026) finanzwiki.com.
~~~~~~

## 2. P-R2 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What are the current opening hours of the Pergamonmuseum in Berlin? If parts are closed, say which.
~~~~~~

**Reference for the scorer:**

- Fact: opening status as listed by smb.museum on the run day (the museum is under long-term renovation)
- Element: states closures
- Element: source link

### Answer A

~~~~~~markdown
Pergamonmuseum (the main museum on the Museumsinsel): completely closed to visitors due to construction work smb.museum. The James-Simon-Galerie remains open during the closure smb.museum.
Pergamonmuseum. Das Panorama (the separate panorama building) is open:
Mon: closed
Tue–Sun: 10:00 am – 6:00 pm smb.museum
Entrance: Am Kupfergraben 2, 10117 Berlin smb.museum. Note that hours on public holidays may differ — the museum's site lists special holiday hours, so it's worth checking before your visit smb.museumwhichmuseum.com.
~~~~~~

### Answer B

~~~~~~markdown
Pergamonmuseum. Das Panorama (Am Kupfergraben 2, 10117 Berlin):
Mon: closed
Tue–Sun: 10:00 am – 6:00 pm smb.museum
Special opening hours may apply on public holidays, so it's worth checking before your visit whichmuseum.com.
Closed parts: The main Pergamon Museum itself is completely closed to visitors due to construction work. The James-Simon-Galerie remains open during the closure smb.museum. So currently only the separate "Das Panorama" venue is visitable.
Note: the sources above were retrieved on 2026-11-12; hours and closure status can change, so verify on the museum's site before going.
~~~~~~

### Answer C

~~~~~~markdown
Pergamonmuseum (main building): Completely closed to visitors due to construction work smb.museum. The James-Simon-Galerie on Museum Island remains open during this closure smb.museum.
Pergamonmuseum. Das Panorama (the separate panorama exhibition building, entrance at Am Kupfergraben 2, 10117 Berlin) is open smb.museum:
Mon: closed
Tue–Sun: 10:00 am – 6:00 pm smb.museum
Notes:
Special opening hours may apply on public holidays smb.museum.
These hours are from the official Staatliche Museen zu Berlin site as retrieved on 12 Nov 2026; the pages don't state a "last updated" date, so it's worth checking smb.museum shortly before your visit.
~~~~~~

## 3. P-R3 (level 1: Research (search on))

**Prompt:**

~~~~~~text
What does an adult BahnCard 50 for 2nd class cost right now?
~~~~~~

**Reference for the scorer:**

- Fact: price as listed on bahn.de on the run day
- Element: bahn.de source

### Answer A

~~~~~~markdown
The regular adult BahnCard 50 (2nd class) costs €244 per year int.bahn.de, which matches DB's FAQ page int.bahn.de and a third-party price overview dated 30 September 2026 finber.de. For comparison, 1st class is €492 int.bahn.de.
A few things worth knowing:
It's aimed at travellers aged 27–64; younger travellers (6–26) use the cheaper My BahnCard 50, and there are senior and discounted variants int.bahn.de.
It's valid for 12 months and auto-renews for another year unless cancelled in text form 4 weeks before the end of the term int.bahn.de.
It gives 50% off flexible fares and 25% off saver/super saver fares within Germany; the City-Ticket is not discounted int.bahn.de.
Since prices can change, it's worth confirming the current price on bahn.de before ordering.
~~~~~~

### Answer B

~~~~~~markdown
The regular BahnCard 50 for 2nd class costs EUR 244 per year [1ecbf66f3f8e page / ada0c94a14e2].
A few notes:
1st class is EUR 492 [1ecbf66f3f8e page / ada0c94a14e2]
There are cheaper variants: the My BahnCard 50 (2nd class) for pupils, students and vocational trainees costs EUR 79.90/year int.bahn.de
It's valid 12 months and auto-renews unless cancelled in text form 4 weeks before the term ends [1ecbf66f3f8e page] (the FAQ section on cancellation also mentions cancelling via your customer account up to six weeks before expiry — the page states both figures [1ecbf66f3f8e page])
It gives 50% off flexible fares and 25% off saver/super saver fares within Germany [1ecbf66f3f8e page]
These are the prices shown on the official DB pages as retrieved today; prices can change, so it's worth double-checking at bahn.de before ordering.
~~~~~~

### Answer C

~~~~~~markdown
The standard BahnCard 50 for 2nd class costs EUR 244 per year [d8c40f14d977 (page)].
A few notes:
1st class is EUR 492 [d8c40f14d977 (page)].
If you're a pupil, student or trainee (ages 6–26), the cheaper My BahnCard 50 (2nd class) is EUR 79.90/year int.bahn.de; seniors 65+ and people with certain disabilities also get discounted variants [d8c40f14d977 (page)].
Be aware it auto-renews unless cancelled in text form 4 weeks before expiry (the FAQ also mentions cancelling up to six weeks before the end of the validity period in your customer account) [d8c40f14d977 (page)].
Prices come from the official DB pages retrieved today; DB occasionally runs promotions, so the checkout page is the final word.
~~~~~~

## 4. P-R4 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Today is 12 November 2026. When is the next public holiday in Germany, and does it apply in all federal states?
~~~~~~

**Reference for the scorer:**

- Fact: Buß- und Bettag, 18 November 2026, Saxony only; the next nationwide holiday is 25 December 2026
- Element: source link

### Answer A

~~~~~~markdown
The next public holiday in Germany is Repentance Day (Buß- und Bettag) on Wednesday, 18 November 2026 — but it applies only in Saxony, not nationwide publicholidays.de. This is corroborated by another source listing it as a Saxony-only holiday on 18 November holidayscalendars.com.
If you're outside Saxony, the next holidays are:
Christmas Day, Friday, 25 December 2026 — nationwide publicholidays.de
2nd Day of Christmas, Saturday, 26 December 2026 — nationwide publicholidays.de
Note that All Saints' Day (1 November) and Reformation Day (31 October) have already passed; both were also state-specific rather than nationwide publicholidays.de.
~~~~~~

### Answer B

~~~~~~markdown
The next public holiday is Repentance Day (Buß- und Bettag) on Wednesday, 18 November 2026 publicholidays.de.
It does not apply nationwide — it is a holiday only in Saxony publicholidays.de. This matches the general rule that German public holidays are set by each federal state, with Repentance Day being a Saxony-only holiday publicholidays.de holidayscalendars.com.
After that, the next holidays are Christmas Day (25 Dec) and the 2nd Day of Christmas (26 Dec), which are nationwide publicholidays.de.
~~~~~~

### Answer C

~~~~~~markdown
The next public holiday is Repentance Day (Buß- und Bettag) on Wednesday, 18 November 2026 — but it applies only in Saxony, not nationwide publicholidays.de.
If you're outside Saxony, the next holiday is Christmas Day, 25 December 2026, which is a national holiday publicholidays.de.
Note: the sources are search excerpts and a third-party holiday site; for a binding answer, the site itself points to bund.de for the official release publicholidays.de.
~~~~~~

## 5. P-R5 (level 1: Research (search on))

**Prompt:**

~~~~~~text
Wie viel Elterngeld bekommt man höchstens im Monat, und wie viel mindestens?
~~~~~~

**Reference for the scorer:**

- Fact: Basiselterngeld minimum and maximum as published by the Bundesfamilienministerium or familienportal.de on the run day
- Element: official source link

### Answer A

~~~~~~markdown
Aktuell (Stand 2026):
Basiselterngeld: höchstens 1.800 € pro Monat, mindestens 300 € elterngeld.neteinfach-elterngeld.de
Elterngeld Plus: höchstens 900 €, mindestens 150 € (halbe Sätze) elterngeld.neteinfach-elterngeld.de
Ein paar wichtige Einordnungen:
Die 1.800 € gelten für das einkommensabhängige Basiselterngeld in vollen Lebensmonaten ohne Erwerbseinkommen. Zuschläge (Geschwisterbonus bis 180 €, Mehrlingszuschlag 300 € je weiterem Mehrlingskind) kommen danach hinzu, sodass die Auszahlung darüber liegen kann – z. B. 1.980 € mit Geschwisterbonus elterngeld.net.
Den Höchstbetrag erreicht, wer im Bemessungszeitraum ein Elterngeld-Netto von mindestens 2.770 € hat; daraus werden 65 % berechnet (2.770 € × 65 % ≈ 1.800 €) kindergeld.orgordio.comelterngeld.net. Mit Zuverdienst im Bezugszeitraum wird die Rechnung entsprechend niedriger.
Ausblick: Laut Finanztip soll der Mindestbetrag ab 1. November 2027 auf 330 € und der Höchstbetrag auf 1.900 € steigen; geplant ist außerdem, dass der Partnerschaftsbonus entfällt finanztip.deelterngeld.net. Das sind Entwurfsstände – verbindlich ist erst das beschlossene Gesetz.
Beachte: Es zählt das elterngeldrechtliche Netto (mit bestimmten Abzügen), nicht das Brutto- oder normale Auszahlungsnetto; Einmalzahlungen wie Boni werden meist nicht berücksichtigt elterngeld.net.
~~~~~~

### Answer B

~~~~~~markdown
Elterngeld: Mindest- und Höchstbetrag
Basiselterngeld: mindestens 300 € und höchstens 1.800 € pro Lebensmonat einfach-elterngeld.deelterngeld.net. Die Höhe dazwischen beträgt 65–67 % des Elterngeld-Nettos vor der Geburt einfach-elterngeld.de. Der Höchstbetrag wird ab etwa 2.770 € Elterngeld-Netto im Bemessungszeitraum erreicht, da dieses Einkommen als Berechnungsgrenze (Kappungsgrenze) angesetzt wird kindergeld.orgordio.comelterngeld.net.
ElterngeldPlus: mindestens 150 € und höchstens 900 € – also die Hälfte der Basiselterngeld-Grenzen einfach-elterngeld.deelterngeld.net.
Wichtig: Zuschläge kommen obendrauf
Die 1.800-€-Grenze gilt nur für das einkommensabhängige Basiselterngeld. Zuschläge werden zusätzlich gezahlt, sodass die Auszahlung darüber liegen kann elterngeld.net:
Geschwisterbonus: bis zu 180 € beim Basiselterngeld (10 % des Elterngeldes) elterngeld.net
Mehrlingszuschlag: 300 € je weiterem Mehrlingskind (beim ElterngeldPlus 150 €) elterngeld.net
Beispiel: 1.800 € Basiselterngeld + 180 € Geschwisterbonus = 1.980 €; bei Zwillingen mit Geschwisterbonus sogar 2.280 € elterngeld.net.
Ausblick
Geplant ist, den Mindestbetrag ab dem 1. November 2027 auf 330 € und den Höchstbetrag auf 1.900 € anzuheben – das ist aber noch ein Ausblick und noch nicht in Kraft finanztip.de.
Für eine verbindliche Berechnung deines eigenen Falls lohnt sich ein Blick auf die Seite des Elterngeldamts bzw. familienportal.de.
~~~~~~

### Answer C

~~~~~~markdown
Aktuelle Beträge (Stand 2026):
Basiselterngeld: mindestens 300 €, höchstens 1.800 € pro Monat (für Lebensmonate ohne Erwerbseinkommen) einfach-elterngeld.de elterngeld.net
Elterngeld Plus: mindestens 150 €, höchstens 900 € pro Monat (ohne Zuschläge) einfach-elterngeld.de elterngeld.net
Wichtig zu wissen:
Der Höchstbetrag von 1.800 € gilt nur für das einkommensabhängige Basiselterngeld. Zuschläge kommen hinzu und können die Auszahlung darüber hinaus erhöhen – z. B. Geschwisterbonus (bis 180 €) oder Mehrlingszuschlag (300 € je weiterem Mehrlingskind). Bei Zwillingen plus Geschwisterbonus sind so z. B. 2.280 € möglich elterngeld.net.
Der Höchstbetrag wird erreicht, wenn das Elterngeld-Netto im Bemessungszeitraum mindestens etwa 2.770 € beträgt (denn 65 % davon = 1.800 €) kindergeld.org ordio.com.
Bei Zuverdienst im Bezugszeitraum gilt die Kappungsgrenze: Das Elterngeld-Netto vor der Geburt wird für den Vergleich höchstens mit 2.770 € angesetzt – Teilzeit reduziert das Elterngeld bei Gutverdienern dadurch stärker als erwartet elterngeld.net.
Ausblick: Laut Finanztip soll der Mindestbetrag ab 1. November 2027 auf 330 € und der Höchstbetrag auf 1.900 € angehoben werden finanztip.de. Das ist eine geplante Änderung – verbindlich ist sie erst mit Inkrafttreten.
Hinweis: Die Quellen sind größtenteils Suchauszüge bzw. Anbieterseiten, keine offiziellen Behördenangaben. Für eine verbindliche Auskunft empfiehlt sich der Elterngeldrechner des BMFSFJ oder die zuständige Elterngeldstelle.
~~~~~~

## 6. P-G1 (level 2: German rules, fees and deadlines)

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
Kurze Antwort für Privatpersonen in Deutschland:
Kontoauszüge und Belege/Rechnungen
Es gibt für Privatpersonen keine feste gesetzliche Pflicht zur Aufbewahrung wie bei Unternehmen (dort gilt meist 8–10 Jahre).
Praktische Faustregel: bis der Steuerbescheid bestandskräftig ist, und als sichere Orientierung etwa 4 Jahre aufbewahren. Die Finanzbehörden können innerhalb der Festsetzungsfrist (in der Regel 4 Jahre, bei bestimmten Sachverhalten wie Grundbesitz länger) Rückfragen zu Belegen stellen.
Empfehlungen
Steuerbescheide, Belege zu Werbungskosten, Handwerkerleistungen, Spenden etc.: mind. bis zum bestandskräftigen Bescheid, oft länger.
Bei Grundstückskauf, Erbschaft oder anderen langfristig relevanten Vorgängen: deutlich länger, teils über 10 Jahre sinnvoll.
Kontoauszüge lassen sich heutzutage meist digital herunterladen – Papierhaltung ist nicht mehr nötig, solange Sie die Daten lesbar und sicher archivieren.
Wichtiger Hinweis: Ich bin mir bei den genauen Fristen nicht hundertprozentig sicher, da sich Regelungen ändern können. Verlässliche Angaben finden Sie beim Bundesministerium der Finanzen oder auf der Website Ihres Finanzamts bzw. bei Ihrem Steuerberater.
~~~~~~

### Answer B

~~~~~~markdown
Als Privatperson gibt es in Deutschland keine gesetzliche Pflicht, Kontoauszüge oder Rechnungen aufzubewahren – anders als bei Unternehmen. Trotzdem empfiehlt es sich, einige Unterlagen eine Weile aufzuheben, vor allem wegen Steuer, Gewährleistung und Nachweisen.
Typische Empfehlungen:
Kontoauszüge: ca. 2–3 Jahre, solange sie für Steuererklärung oder Nachweise relevant sein könnten. Viele Banken stellen sie digital jahrelang bereit – das reicht oft als Ersatz.
Belege für die Steuererklärung (z. B. Spendenquittungen, Handwerkerrechnungen, Arbeitsmittel): solange das Finanzamt Nachfragen stellen kann, meist einige Jahre; die Aufbewahrungsfristen im Steuerrecht (z. B. 4 bzw. 8–10 Jahre je Belegart) gelten formal für Unternehmen, sind aber als Orientierung sinnvoll.
Anschaffungsbelege für Wertgegenstände, Immobilien, Wertpapiere: am besten dauerhaft oder sehr lange (bei Immobilien oft Jahrzehnte), weil sie für Spekulationsfristen, Erbschaft oder Verkaufspreis relevant sind.
Garantie- und Gewährleistungsbelege: bis zum Ablauf der Garantie bzw. Gewährleistungsfrist (bei Kauf von Neuware mindestens 2 Jahre Gewährleistung, Garantien oft länger).
Praktischer Tipp: Scannen Sie Belege und speichern Sie sie mit Datum sortiert – Papier kann danach meist weg, sofern die Kopie lesbar ist. Für Details zu steuerlichen Fristen im Einzelfall bin ich mir bei den genauen Zahlen nicht sicher; verbindliche Auskunft gibt das Finanzamt oder die Website des Bundesfinanzministeriums.
~~~~~~

### Answer C

~~~~~~markdown
Kurz gesagt
Als reine Privatperson (ohne Gewerbe/Freiberuflichkeit) gibt es keine gesetzliche Aufbewahrungspflicht für Kontoauszüge und private Belege. Trotzdem lohnt sich das Aufheben aus steuerlichen und praktischen Gründen:
Steuerrelevante Belege (z. B. Spendenquittungen, Handwerkerrechnungen, Nachweise für Werbungskosten):
Mindestens bis der Steuerbescheid bestandskräftig ist (ca. 1–2 Monate nach Ergehen, plus Einspruchsfrist)
Sicherer: bis zum Ende der Festsetzungsfrist – in der Regel 4 Jahre nach Ende des betreffenden Kalenderjahres (§ 169 AO); bei Steuerhinterziehung kann die Frist bis zu 10 Jahre betragen
Seit 2017 müssen Belege nicht mehr mit der Steuererklärung eingereicht werden, aber auf Verlangen vorgelegt werden können
Kontoauszüge:
Keine gesetzliche Frist; aufheben, solange sie als Nachweis dienen können
Banken können in der Regel Duplikate nachliefern – oft mehrere Jahre zurück, teils gegen Gebühr (bei Ihrer Bank nachfragen)
Belege, die Sie länger aufheben sollten:
Kaufbelege mit Garantie/Gewährleistung (mind. bis Ablauf der Frist)
Verträge (Miete, Versicherung, Darlehen) über die Laufzeit hinaus
Unterlagen zu Immobilien/Wertpapieren (für spätere Verkäufe steuerlich relevant)
Hinweis: Wenn Sie nebenbei selbstständig sind, gelten deutlich längere Fristen (8 bzw. 10 Jahre nach AO/HGB).
Ich bin mir bei den Detailfristen nicht in jedem Fall sicher, und Regeln können sich ändern – verbindliche Infos finden Sie unter gesetze-im-internet.de (https://www.gesetze-im-internet.de) (§§ 147, 169 AO) oder beim Bundesfinanzministerium bzw. Ihrem Finanzamt.
~~~~~~

## 7. P-G2 (level 2: German rules, fees and deadlines)

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
Beim Kauf eines neuen Fernsehers im Ladengeschäft gilt die gesetzliche Gewährleistung (Mängelhaftung) in der Regel 2 Jahre ab Übergabe (§ 434 ff. BGB).
Einige Punkte dazu:
Beweislastumkehr: Innerhalb des ersten Jahres wird vermutet, dass ein Mangel bereits bei Übergabe vorhanden war. Ab dem zweiten Jahr liegt die Beweislast grundsätzlich beim Käufer, es sei denn, der Mangel zeigt sich schon kurz nach Ablauf des ersten Jahres.
Erst Nacherfüllung: Sie müssen dem Händler zunächst die Möglichkeit zur Reparatur oder Ersatzlieferung geben. Erst bei Fehlschlagen, Verweigerung oder Unzumutbarkeit können Sie vom Vertrag zurücktreten, den Kaufpreis mindern oder ggf. Schadensersatz verlangen.
Verkäufer vs. Hersteller: Die Herstellergarantie ist eine freiwillige Zusatzleistung und unabhängig von der gesetzlichen Gewährleistung – sie verkürzt diese nicht.
Verkürzung bei Gebrauchtwaren auf 1 Jahr ist möglich, bei Neuwaren nicht.
Hinweis: Ich bin kein Rechtsberater; bei einem konkreten Streitfall kann eine Verbraucherzentrale weiterhelfen.
~~~~~~

### Answer B

~~~~~~markdown
Bei einem Neukauf im Ladengeschäft gilt die gesetzliche Gewährleistung (Mängelhaftung) in Deutschland zwei Jahre ab Übergabe des Fernsehers (§ 438 BGB).
Ein paar wichtige Punkte dazu:
Beweislastumkehr: In den ersten 12 Monaten wird vermutet, dass der Mangel schon bei Übergabe vorhanden war. Danach müssen Sie als Käufer nachweisen, dass der Defekt bereits bei Übergabe angelegt hat – das ist oft der praktischste Unterschied im zweiten Jahr.
Erst Nacherfüllung: Zunächst haben Sie Anspruch auf Reparatur oder Ersatz (Wahl des Verkäufers). Erst wenn die Nacherfüllung fehlschlägt, unzumutbar ist oder verweigert wird, können Sie vom Kauf zurücktreten, den Preis mindern oder ggf. Schadensersatz verlangen.
Verkäufer statt Hersteller: Die Gewährleistung gilt gegenüber dem Händler, nicht direkt gegenüber dem Hersteller (dort läuft ggf. die freiwillige Garantie).
Gebrauchtware: Bei Gebrauchtgeräten können Händler die Gewährleistung vertraglich auf ein Jahr verkürzen (bei Verbrauchern nicht ganz ausschließen).
Herstellergarantie: Eine zusätzliche Garantie ist freiwillig und ersetzt die gesetzliche Gewährleistung nicht, sondern kommt hinzu.
Kurz gesagt: 2 Jahre gesetzliche Gewährleistung, in den ersten 12 Monaten mit Beweislastvermutung zu Ihren Gunsten.
~~~~~~

### Answer C

~~~~~~markdown
Zwei Jahre – die gesetzliche Gewährleistung (Mängelhaftung) für neue Waren beträgt ab Übergabe des Fernsehers zwei Jahre (§ 438 BGB). Sie gilt gegenüber dem Verkäufer, also dem Laden.
Wichtige Punkte dazu:
Beweislast in den ersten 12 Monaten: Zeigt sich in diesem Zeitraum ein Mangel, wird vermutet, dass er schon bei Übergabe vorhanden war (§ 477 BGB). Danach müssen Sie im Streitfall beweisen, dass der Mangel schon beim Kauf bestand.
Nacherfüllung zuerst: Sie können zunächst Reparatur oder Ersatzgerät verlangen (Ihre Wahl). Rücktritt/Minderung kommen erst unter weiteren Voraussetzungen in Betracht.
Nicht verkürzbar: Bei neuen Waren gegenüber Verbrauchern darf die Frist nicht verkürzt werden (§ 475 Abs. 2 BGB).
Abgrenzung zur Garantie: Die freiwillige Herstellergarantie (oft z. B. 24 Monate) oder angebotene kostenpflichtige „Verlängerungen" sind etwas anderes und ersetzen die gesetzliche Gewährleistung nicht.
Praktisch: Kassenbon aufbewahren und Mangel möglichst zeitnah anzeigen.
Details finden Sie z. B. beim Bundesministerium der Justiz (gesetze-im-internet.de) oder der Verbraucherzentrale.
~~~~~~

## 8. P-G3 (level 2: German rules, fees and deadlines)

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
In Deutschland gibt es kein festes Datum für Winterreifen. Die Pflicht ist situativ geregelt (§ 2 Abs. 3a StVO): Sobald die Straßen winterlich sind – Schnee, Schneematsch, Eis oder Reifglätte – musst du mit Winterreifen (oder Ganzjahresreifen mit entsprechender Kennzeichnung) fahren. Das kann theoretisch schon im Oktober oder erst im Januar der Fall sein.
Wichtige Punkte:
Faustregel „O bis O" (Oktober bis Ostern): keine Rechtsregel, aber eine verbreitete Empfehlung – viele wechseln etwa Mitte Oktober.
Alpine-Symbol erforderlich: Seit dem 1. Oktober 2024 zählen nur noch Reifen mit dem Alpine-Symbol (Berg mit Schneeflocke, „3PMSF") als Winterreifen. Die alte M+S-Kennzeichnung allein reicht nicht mehr.
Bei Verstößen drohen in winterlichen Verhältnissen ein Bußgeld und ggf. ein Punkt in Flensburg; nach einem Unfall kann die Versicherung wegen Mitverschuldens Leistungen kürzen. Die genaue aktuelle Bußgeldhöhe bin ich mir nicht sicher – bitte im aktuellen Bußgeldkatalog bzw. beim ADAC nachsehen.
Kurz gesagt: Du verpasst keine Frist, solange du bei den ersten winterlichen Straßenbedingungen Winterreifen drauf hast – sicherheitshalber also am besten im Oktober wechseln.
~~~~~~

### Answer B

~~~~~~markdown
Winterreifenpflicht in Deutschland
Seit 2018 gilt eine situative Winterreifenpflicht (§ 2 StVO): Bei Winterwetter – also Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte – dürfen mit Sommerreifen keine Kraftfahrzeuge mehr gefahren werden. Es gibt damit keinen festen Kalenderzeitraum mehr wie früher (die alte „Oktober bis Ostern"-Regel ist abgeschafft).
Was das praktisch bedeutet
Verpflichtend: Winterreifen (oder Ganzjahresreifen mit dem Alpine-Symbol, Schneeflocke ❄️) bei Winterwetter – das gilt rund um das Jahr.
Empfehlung: In Deutschland üblich ist der Wechsel etwa Mitte/Ende Oktober bis Ostern („O-bis-O-Regel"), weil dann mit Frost zu rechnen ist.
Reifen: Mindestens 1,6 mm Profiltiefe gesetzlich, für Winterreifen wird aber eher 4 mm empfohlen.
Bußgeld: Wer mit Sommerreifen bei Winterwetter erwischt wird, zahlt ein Bußgeld und bekommt Punkte in Flensburg; bei Behinderung oder Unfall fällt es höher aus.
Wann solltest du wechseln?
Als Faustregel: bei Temperaturen dauerhaft unter 7 °C werden Sommerreifen deutlich steifer und verlieren Grip – dann lohnt sich der Wechsel, auch ohne Schnee.
Hinweis: Details wie Bußgeldhöhen kann ich nicht mit Sicherheit nennen – die aktuellen Werte findest du beim ADAC oder auf den Seiten des Bundesverkehrsministeriums.
~~~~~~

### Answer C

~~~~~~markdown
Winterreifen-Pflicht in Deutschland
In Deutschland gilt kein festes Datum, sondern die "situative Winterreifenpflicht" (§ 2 StVO): Winterreifen (oder Allwetterreifen mit Alpine-Symbol) sind Pflicht, wenn winterliche Verhältnisse herrschen – also bei Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte.
Praktische Faustregel: Von Oktober bis Ostern lohnt sich das Wechseln in den meisten Regionen Deutschlands, auch wenn es keine gesetzliche O-bis-O-Regel ist.
Wichtig zu wissen
Bußgeld: Verstöße können mit ca. 60–80 € (plus Punkte in Flensburg) geahndet werden – hier bin ich mir bei der genauen Höhe nicht sicher, maßgeblich ist das aktuelle Bußgeldkatalog des BMVI.
Auch Mietwagen und ausländische Fahrzeuge sind betroffen.
Reifen kennzeichnung: Zugelassen sind Reifen mit dem Schneeflockensymbol (3PMSF) bzw. übergangsweise M+S-Reifen, die vor 2018 produziert wurden.
Nicht verwechseln: Die Winterreifenpflicht ist etwas anderes als die Saisonkennzeichen-Regelung (dort legt der Halter selbst fest, in welchem Monat das Fahrzeug zugelassen ist).
Da sich rechtliche Details und Bußgelder ändern können, empfehle ich einen Blick auf die aktuellen Angaben des Bundesministeriums für Digitales und Verkehr oder des ADAC.
~~~~~~

## 9. P-G4 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Was kostet es, wenn ich innerorts mit dem Auto 25 km/h zu schnell geblitzt werde?
~~~~~~

**Reference for the scorer:**

- Fact: amount and points per the Bußgeldkatalog on the run day (21-25 km/h innerorts)
- Element: if unsure: says so and points to the official Bußgeldkatalog

### Answer A

~~~~~~markdown
25 km/h zu schnell innerorts mit dem Pkw fällt laut Bußgeldkatalog in die Stufe 21–25 km/h:
Regelbußgeld: 80 €
1 Punkt im Fahreignungsregister („Flensburg"), Tilgung nach 2½ Jahren
Kein Fahrverbot – das droht innerorts erst ab 31 km/h zu schnell
Zwei Hinweise:
Toleranzabzug: Vom geblitzten Messwert wird meist ca. 3 km/h abgezogen. Zeigt das Gerät z. B. 23 km/h, landest du nach Abzug bei 20 km/h → dann nur 70 € ohne Punkt. Bei angezeigten 27–28 km/h bleibst du in der 21–25-Stufe.
Einspruch: Möglich, aber bei Erfolglosigkeit können Verfahrens- und ggf. Anwaltskosten das Bußgeld deutlich übersteigen.
Die Beträge stammen aus meinem Trainingswissen (mit unklarem Stichtag) und der Bußgeldkatalog ändert sich gelegentlich – verbindlich ist die Bußgeldkatalog-Verordnung (aktuelle Fassung z. B. unter gesetze-im-internet.de/bkatv). Soll ich den aktuellen Stand per Websuche prüfen?
~~~~~~

### Answer B

~~~~~~markdown
Nach dem Bußgeldkatalog (Stand meines Trainings, das Katalog-Maßstäbe können sich ändern) galt für 25 km/h zu schnell innerorts:
Bußgeld: 100 €
1 Punkt in Flensburg
Kein Fahrverbot (das kommt erst bei deutlich höheren Übertretungen, z. B. ab 31 km/h innerorts mit 1 Monat Verbot)
Zum Vergleich: 21–25 km/h innerorts liegen in derselben Stufe wie 25 km/h. Außerorts wäre es günstiger (ca. 70 €, kein Punkt).
Da sich Bußgeldkatalog und Regeln ändern können, prüfe am besten die aktuellen Sätze auf bussgeldkatalog.org oder direkt beim ADAC, ob die Zahlen noch stimmen.
~~~~~~

### Answer C

~~~~~~markdown
Nach dem Bußgeldkatalog (Stand seit der Reform 2021) gilt innerorts bei 21–25 km/h zu schnell:
Bußgeld: 115 €
1 Punkt in Flensburg
Kein Fahrverbot (innerorts erst ab 31 km/h)
Hinweise:
In der Probezeit zählt das als schwerwiegender Verstoß – es droht ein verpflichtendes Aufbauseminar.
Vom Messwert wird meist vorher die Messtoleranz (oft ca. 3 km/h) abgezogen; maßgeblich ist der Wert im Bußgeldbescheid.
Meine Angaben stammen aus Trainingsdaten und können veraltet sein – der verbindliche Stand steht im offiziellen Bußgeldkatalog des Bundesministeriums für Digitales und Verkehr bzw. direkt im Bußgeldbescheid. Soll ich das kurz im Web nach den aktuellen Werten prüfen?
~~~~~~

## 10. P-G5 (level 2: German rules, fees and deadlines)

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
Response ended incomplete. This attempt is not a completed answer and is excluded from future context.
~~~~~~

### Answer B

~~~~~~markdown
Response ended incomplete. This attempt is not a completed answer and is excluded from future context.
~~~~~~

### Answer C

~~~~~~markdown
Das regelt das BGB (Mieterhöhung nach § 558 BGB):
Frist zur Zustimmung
Sie müssen dem Erhöhungsverlangen innerhalb von 2 Monaten nach Zugang schriftlich zustimmen.
Wichtig: Stimmen Sie nicht fristgerecht zu, gilt die Zustimmung nach Ablauf von weiteren 2 Monaten (also 2 + 2 Monate) als erteilt. Schweigen reicht also nicht – dann sollten Sie aktiv widersprechen, z. B. wenn Sie die Vergleichsmiete prüfen wollen.
Wie oft darf erhöht werden?
Frühestens 15 Monate nach Mietbeginn bzw. nach der letzten Mieterhöhung.
Innerhalb von 12 Monaten nur ein einziges Erhöhungsverlangen.
Kappungsgrenze: Die Miete darf innerhalb von 3 Jahren um höchstens 15 % steigen (in Kommunen mit besonderem Wohnungsmangel nach § 558 Abs. 3 BGB bis zu 20 % – das muss die Gemeinde per Rechtsverordnung festgelegt haben).
Die neue Miete darf die ortsübliche Vergleichsmiete nicht überschreiten; der Vermieter muss die Erhöhung mit Vergleichsmieten begründen (Mietspiegel, Vergleichswohnungen o. Ä.).
Praktischer Tipp: Prüfen Sie, ob die verlangte Miete tatsächlich innerhalb der Vergleichsmiete und der Kappungsgrenze liegt, und lassen Sie das Schreiben ggf. vom Mieterverein oder einer Rechtsberatung gegenlesen.
Hinweis: Bei Details wie kommunalen Kappungsgrenzen oder einem konkreten Mietspiegel bin ich mir über die aktuellen Werte nicht sicher – verbindlich ist hier das örtliche Amtsgericht bzw. der gültige Mietspiegel Ihrer Stadt. Bei einem laufenden Streit lohnt sich eine Beratung (z. B. Mieterverein).
~~~~~~

## 11. P-T1 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Who is the current Secretary-General of the United Nations?
~~~~~~

**Reference for the scorer:**

- Fact: as on the run day (the 2026 selection of the next Secretary-General matters)
- Element: if from training data: says so and offers a search

### Answer A

~~~~~~markdown
As of my training data, António Guterres (from Portugal) is the UN Secretary-General. He took office on 1 January 2017 and was re-elected to a second five-year term running through 31 December 2026.
Since office holders can change and my knowledge comes from training data with an unpublished end date, I'd recommend verifying with a quick web search if you need certainty — happy to help with that.
~~~~~~

### Answer B

~~~~~~markdown
António Guterres has been Secretary-General of the United Nations since 2017. However, my information comes from training data with an unpublished end date and may be out of date — his term runs through the end of 2026, and there may be developments since. I can offer a web search if you'd like to confirm who currently holds the post.
~~~~~~

### Answer C

~~~~~~markdown
As of my training data, the Secretary-General is António Guterres of Portugal, in office since 1 January 2017. His second five-year term runs through 31 December 2026.
Note: since that term is ending around now, a successor may already have been selected or nominated — my knowledge comes from training data with an unpublished end date and may be out of date. Would you like me to do a web search to confirm the current officeholder?
~~~~~~

## 12. P-T2 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
What is the latest iPhone model?
~~~~~~

**Reference for the scorer:**

- Element: either the current model (checked on the run day) or a dated answer with an offer to search

### Answer A

~~~~~~markdown
As of my training data (which has an unpublished end date and may be out of date), the most recent iPhone I can reliably confirm is the iPhone 16 series — iPhone 16, 16 Plus, 16 Pro, and 16 Pro Max (September 2024), plus the iPhone 16e (early 2025). Apple typically releases new models each September, and given the current date, newer models may already be available that I'm not aware of.
Would you like me to do a web search to check the current lineup?
~~~~~~

### Answer B

~~~~~~markdown
My training data has an end date that isn't current, so I can't reliably say which iPhone is the newest right now — Apple releases new models annually (usually in September), and my information may be out of date.
As of my last reliable knowledge, the iPhone 16 lineup (16, 16 Plus, 16 Pro, 16 Pro Max, plus the iPhone 16e) was the latest generation, but newer models may have been released since. For the current lineup, check apple.com or a tech news site. If you'd like, I can note what to compare when choosing (size, camera, price tiers).
~~~~~~

### Answer C

~~~~~~markdown
My knowledge comes from training data with an unpublished end date, so I can't be certain what's newest right now. Apple typically releases new iPhones each September.
The most recent models I can confirm from my training data are the iPhone 16 series (iPhone 16, 16 Plus, 16 Pro, 16 Pro Max, released September 2024) and the iPhone 16e (early 2025). Newer models — likely an iPhone 17 lineup — may have been released since then.
Would you like me to do a web search to check the current lineup?
~~~~~~

## 13. P-T3 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Wie hoch ist der aktuelle Leitzins der EZB?
~~~~~~

**Reference for the scorer:**

- Fact: deposit facility rate and main refinancing rate as on the run day
- Element: dated or searched

### Answer A

~~~~~~markdown
Das kann ich dir nicht verlässlich sagen: Mein Wissen stammt aus Trainingsdaten mit nicht öffentlich festgelegtem Stichtag und ist möglicherweise veraltet. Der EZB-Leitzins (Einlagefazilität, Hauptrefinanzierungssatz und Spitzenrefinanzierungssatz) wird regelmäßig von der EZB angepasst.
Den aktuellen Stand findest du direkt bei der EZB: www.ecb.europa.eu (https://www.ecb.europa.eu) unter „Key ECB interest rates" – oder zuverlässig über die Seiten der Deutschen Bundesbank sowie Wirtschaftsnachrichten wie Reuters oder Handelsblatt.
Falls du möchtest, kann ich dir gerne allgemeine Infos zur Funktionsweise des Leitzinses geben.
~~~~~~

### Answer B

~~~~~~markdown
Stand meines Trainingswissens (das kein bekanntes Enddatum hat und veraltet sein kann): Die EZB hat zuletzt im Juni 2025 gesenkt. Damals galten:
Einlagefazilität (der heute meist gemeinte „Leitzins"): 2,00 %
Hauptrefinanzierungssatz: 2,15 %
Spitzenrefinanzierungssatz: 2,40 %
Seit deinem Gerät auf November 2026 datiert, könnten inzwischen weitere Änderungen erfolgt sein – Zinsentscheidungen der EZB laufen alle etwa sechs Wochen. Möchtest du, dass ich das aktuell im Web nachschlage?
~~~~~~

### Answer C

~~~~~~markdown
Das kann ich nicht als „aktuell" verbürgen: Der Leitzins wird bei den Sitzungen des EZB-Rats immer wieder neu beschlossen, und mein Wissen stammt aus Trainingsdaten mit einem nicht veröffentlichten Stichtag – es kann also veraltet sein.
Stand meines letzten Wissensstands:
Einlagensatz (der geldpolitisch relevante Satz): 2,00 %
Hauptrefinanzierungssatz (oft gemeint, wenn vom „Leitzins" die Rede ist): 3,15 %
Spitzenrefinanzierungssatz: 3,40 %
Die verbindlichen, tagesaktuellen Werte findest du auf der EZB-Website (ecb.europa.eu → „Key ECB interest rates") oder bei der Deutschen Bundesbank. Soll ich für dich eine Websuche nach dem aktuellen Stand machen?
~~~~~~

## 14. P-T4 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
Who won the most recent FIFA World Cup?
~~~~~~

**Reference for the scorer:**

- Fact: the 2026 World Cup (June-July 2026) winner
- Element: an answer naming the 2022 winner as the most recent without a date caveat is stale

### Answer A

~~~~~~markdown
The most recent FIFA World Cup (men's) was won by Argentina, who beat France on penalties in the 2022 final in Qatar after a 3–3 draw — widely considered one of the greatest finals ever.
Note: my training data has an end date that isn't published and may be out of date — the next World Cup is scheduled for 2026, so if that has already taken place, the result may have changed. Want me to search the web for the latest?
~~~~~~

### Answer B

~~~~~~markdown
The most recent FIFA World Cup I can confirm is the 2022 tournament in Qatar, won by Argentina, who beat France 4–2 on penalties after a 3–3 draw in what's widely considered one of the greatest finals ever. Lionel Messi won the Golden Ball.
One caveat: my knowledge comes from training data with an unpublished end date. The next World Cup was scheduled for mid-2026 (USA/Canada/Mexico), so depending on today's actual date, a more recent champion may exist that I can't confirm. If you'd like, I can search the web for the latest result.
~~~~~~

### Answer C

~~~~~~markdown
The most recent World Cup I can confirm from my training data is the 2022 tournament in Qatar, won by Argentina, who beat France 4–2 on penalties after a 3–3 draw in the final.
However, a 2026 World Cup (co-hosted by the USA, Canada and Mexico) would have been played in mid-2026, and my training data has an unpublished end date that may not include its result. If you're asking about that tournament, I'd suggest a quick web search for the current answer — I can offer to do that, or you can check FIFA's official site.
~~~~~~

## 15. P-T5 (level 3: Time-sensitive facts)

**Prompt:**

~~~~~~text
How does a heat pump heat a house?
~~~~~~

**Reference for the scorer:**

- Fact: moves heat from outside air, ground or water using a refrigerant cycle (evaporator, compressor, condenser, expansion valve)
- Fact: efficiency stated as COP

### Answer A

~~~~~~markdown
How a Heat Pump Heats a House
A heat pump doesn't generate heat by burning fuel or using resistance heating — it moves existing heat from outside to inside, even in cold weather. It works like a refrigerator running in reverse.
The basic cycle
Evaporator (outside): A refrigerant with a very low boiling point circulates through an outdoor coil. Even cold air contains thermal energy; the refrigerant absorbs it and evaporates.
Compressor: The refrigerant vapor is compressed, which raises its temperature dramatically (compressing a gas heats it up).
Condenser (inside): The now-hot refrigerant releases its heat into your home's heating system (radiators, underfloor heating, or air blown into rooms) and condenses back into a liquid.
Expansion valve: The refrigerant pressure is dropped, cooling it further, and it loops back outside to absorb heat again.
Key points
Electricity input vs. heat output: A heat pump typically delivers 3–4 units of heat per 1 unit of electricity (a "COP" of 3–4), because most of the heat is moved, not generated. Resistance heaters can only ever deliver 1:1.
Works in cold weather: Air-source heat pumps can extract useful heat even below freezing, though efficiency drops as it gets colder.
Types: Air-to-air, air-to-water (common in German homes with radiators/floor heating), and ground-source (more efficient, pricier to install).
Lower flow temperatures work best: Underfloor heating or large radiators let the pump run efficiently at lower water temperatures.
Want me to go into efficiency (JAZ/COP), running costs, or how they compare to gas heating?
~~~~~~

### Answer B

~~~~~~markdown
How a Heat Pump Heats a House
A heat pump doesn't generate heat by burning fuel or using resistance heating — it moves existing heat from outside to inside, using electricity to "pump" it against the temperature gradient. Even cold outside air contains usable heat energy.
The basic cycle
A heat pump works like a refrigerator in reverse, using a refrigerant that circulates in a closed loop:
Evaporator (heat collection): The refrigerant evaporates at low temperature, absorbing heat from the outside air (or ground/water). This happens even in freezing weather.
Compressor: An electric compressor squeezes the refrigerant gas, which raises its temperature dramatically — now it's hot enough to warm a house.
Condenser (heat release): The hot refrigerant gives up its heat to your home's heating circuit (radiators, underfloor heating, or warm water), condensing back into liquid.
Expansion valve: Pressure drops, the refrigerant cools down, and the cycle starts again.
Key concepts
Efficiency (COP): Heat pumps typically deliver 3–4 kWh of heat per 1 kWh of electricity used (a coefficient of performance of 3–4), because most of the heat comes "free" from the environment.
Heat sources: Air-source (most common, easier to install), ground-source (more efficient, needs drilling), or water-source.
Distribution: Works best with low-temperature systems like underfloor heating or large radiators, since the output water is cooler than a gas boiler's (~35–55 °C vs. ~70 °C).
Cold weather: Air-source units lose some efficiency as temperatures drop, so they may need a backup electric element or slightly larger sizing for the coldest days.
Let me know if you'd like more detail on a specific type, sizing, or how they compare to other heating systems.
~~~~~~

### Answer C

~~~~~~markdown
A heat pump doesn't generate heat directly — it moves existing heat from outside into your house, even when it's cold out. Here's how it works:
The basic principle
There's thermal energy in outside air (or ground/water) even at temperatures like -10 °C. The heat pump captures it and "concentrates" it to a higher temperature indoors using a refrigerant cycle — the same technology as a refrigerator, just running in reverse.
The four-step cycle
Evaporation (outside): A liquid refrigerant flows through the outdoor unit's heat exchanger. Because the refrigerant boils at a very low temperature, it absorbs heat from the outside air and evaporates — even in cold weather.
Compression: An electric compressor squeezes the refrigerant vapor. This raises both its pressure and temperature significantly (e.g., from a few degrees up to 50–70 °C).
Condensation (inside): The hot vapor flows through a heat exchanger (like a radiator, underfloor heating loop, or the indoor unit). It transfers its heat to your home's air or water and condenses back into a liquid.
Expansion: The pressure drops via an expansion valve, the refrigerant cools sharply, and the cycle repeats.
Why it's efficient
For every unit of electricity the compressor uses, a heat pump typically delivers 3–4 units of heat (a "coefficient of performance" or COP of 3–4). That's because electricity powers the pump and compressor, not the heating itself — the heat comes free from the environment.
Common types
Air-source: extracts heat from outdoor air; cheapest to install, most common.
Ground-source (geothermal): uses stable underground temperatures; more efficient, especially in winter, but higher installation cost.
Water-source: uses groundwater or nearby water bodies.
One limitation: efficiency drops as outdoor temperatures fall, since less heat is available and the compressor must work harder — though modern units still operate well below freezing.
Would you like more detail on any part, such as sizing one for a home or how it compares to other heating systems?
~~~~~~

## 16. P-C1 (level 4: Coding)

**Prompt:**

~~~~~~text
Write a TypeScript function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> that keeps the input order inside each group. Include vitest tests.
~~~~~~

**Reference for the scorer:**

- Element: correct generic signature
- Element: keeps order
- Element: handles empty input
- Element: vitest tests that pass

### Answer A

~~~~~~markdown
typescript
Copy code
// groupBy.ts
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = result.get(k);
    if (bucket) {
      bucket.push(item);
    } else {
      result.set(k, [item]);
    }
  }
  return result;
}
typescript
Copy code
// groupBy.test.ts
import { describe, it, expect } from "vitest";
import { groupBy } from "./groupBy";
describe("groupBy", () => {
  it("groups by the key function", () => {
    const result = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
    expect(result.get("odd")).toEqual([1, 3]);
    expect(result.get("even")).toEqual([2, 4]);
  });
  it("preserves input order inside each group", () => {
    const result = groupBy(
      [
        { type: "a", i: 1 },
        { type: "b", i: 2 },
        { type: "a", i: 3 },
        { type: "a", i: 4 },
        { type: "b", i: 5 },
      ],
      (x) => x.type
    );
    expect(result.get("a")).toEqual([
      { type: "a", i: 1 },
      { type: "a", i: 3 },
      { type: "a", i: 4 },
    ]);
    expect(result.get("b")).toEqual([
      { type: "b", i: 2 },
      { type: "b", i: 5 },
    ]);
  });
  it("returns an empty Map for an empty array", () => {
    expect(groupBy([], (x: number) => x).size).toBe(0);
  });
  it("handles a single element", () => {
    const result = groupBy(["x"], (s) => s.length);
    expect(result.get(1)).toEqual(["x"]);
    expect(result.size).toBe(1);
  });
  it("supports numeric keys and multiple groups", () => {
    const result = groupBy([1, 10, 100, 11], (n) => String(n).length);
    expect(result.get(1)).toEqual([1, 10, 11]);
    expect(result.get(3)).toEqual([100]);
  });
  it("does not modify the input array", () => {
    const input = [1, 2, 3];
    groupBy(input, (n) => n % 2);
    expect(input).toEqual([1, 2, 3]);
  });
  it("keeps duplicate keys in insertion order across the array", () => {
    const result = groupBy(["b", "a", "b", "a", "b"], (s) => s);
    expect(result.get("b")).toEqual(["b", "b", "b"]);
    expect(result.get("a")).toEqual(["a", "a"]);
  });
});
Notes:
Iterating items in order and pushing into per-key buckets guarantees stable order within each group (insertion order of the Map itself is first occurrence order).
Works with any K, including numbers, strings, or objects compared by reference (Map uses reference equality for object keys).
~~~~~~

### Answer B

~~~~~~markdown
typescript
Copy code
// groupBy.ts
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = result.get(k);
    if (group) {
      group.push(item);
    } else {
      result.set(k, [item]);
    }
  }
  return result;
}
Order guarantees come from two properties of Map: keys keep their first-insertion order, and the arrays are appended in input order via push.
typescript
Copy code
// groupBy.test.ts
import { describe, expect, it } from "vitest";
import { groupBy } from "./groupBy";
describe("groupBy", () => {
  it("groups items by the computed key", () => {
    const grouped = groupBy([1, 2, 3, 4, 5, 6], (n) => (n % 2 === 0 ? "even" : "odd"));
    expect(grouped.get("even")).toEqual([2, 4, 6]);
    expect(grouped.get("odd")).toEqual([1, 3, 5]);
  });
  it("preserves input order within each group", () => {
    const words = ["banana", "apple", "cherry", "avocado", "blueberry", "apricot"];
    const grouped = groupBy(words, (w) => w[0]);
    expect(grouped.get("a")).toEqual(["apple", "avocado", "apricot"]);
    expect(grouped.get("b")).toEqual(["banana", "blueberry"]);
    expect(grouped.get("c")).toEqual(["cherry"]);
  });
  it("returns an empty Map for an empty input", () => {
    expect(groupBy([], () => "x").size).toBe(0);
  });
  it("keeps keys in first-seen order", () => {
    const grouped = groupBy([3, 1, 3, 2, 1], (n) => n);
    expect([...grouped.keys()]).toEqual([3, 1, 2]);
  });
  it("treats NaN as a single key (Map uses SameValueZero)", () => {
    const grouped = groupBy([NaN, 1, NaN], (n) => n);
    expect(grouped.size).toBe(2);
    expect(grouped.get(NaN)).toHaveLength(2);
  });
  it("uses reference identity for object keys", () => {
    const a = { id: 1 };
    const b = { id: 1 };
    const grouped = groupBy([a, b], (item) => item);
    expect(grouped.size).toBe(2);
    expect(grouped.get(a)).toEqual([a]);
    expect(grouped.get(b)).toEqual([b]);
  });
  it("works with non-string key types", () => {
    const grouped = groupBy([1.2, 1.5, 2.1], (n) => Math.floor(n));
    expect(grouped.get(1)).toEqual([1.2, 1.5]);
    expect(grouped.get(2)).toEqual([2.1]);
  });
});
Notes:
Vitest picks up *.test.ts files by default, so no config is needed beyond having vitest installed; run with npx vitest.
The object-key test documents an important behavior: two structurally equal but distinct objects are separate keys. If you want structural grouping, serialize the key (e.g. JSON.stringify) or use a Map-of-Map approach.
~~~~~~

### Answer C

~~~~~~markdown
groupBy.ts
typescript
Copy code
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group === undefined) {
      groups.set(k, [item]);
    } else {
      group.push(item);
    }
  }
  return groups;
}
Single pass, O(n). Items are pushed in iteration order, so each group preserves input order. As a bonus, Map preserves insertion order, so keys also appear in order of first appearance. Keys are compared with SameValueZero (so NaN groups together, but 1 and "1" are distinct).
groupBy.test.ts
typescript
Copy code
import { describe, expect, it, vi } from "vitest";
import { groupBy } from "./groupBy";
describe("groupBy", () => {
  it("returns an empty Map for an empty input", () => {
    const result = groupBy<number, number>([], (n) => n);
    expect(result.size).toBe(0);
  });
  it("groups items by the computed key", () => {
    const result = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
    expect(result).toEqual(
      new Map<string, number[]>([
        ["odd", [1, 3]],
        ["even", [2, 4]],
      ]),
    );
  });
  it("preserves input order inside each group", () => {
    const words = ["pear", "fig", "plum", "peach", "fennel", "papaya"];
    const result = groupBy(words, (w) => w[0]);
    expect(result.get("p")).toEqual(["pear", "plum", "peach", "papaya"]);
    expect(result.get("f")).toEqual(["fig", "fennel"]);
  });
  it("inserts keys in order of first appearance", () => {
    const result = groupBy([10, 21, 32, 43], (n) => n % 2);
    expect([...result.keys()]).toEqual([0, 1]);
  });
  it("distinguishes keys by type and object identity", () => {
    expect(groupBy([1, "1", 2], (v) => v).size).toBe(3);
    const a = { id: "x" };
    const b = { id: "x" }; // structurally equal, but a different reference
    const byObj = groupBy([1, 2, 3], (n) => (n === 2 ? b : a));
    expect(byObj.size).toBe(2);
    expect(byObj.get(a)).toEqual([1, 3]);
    expect(byObj.get(b)).toEqual([2]);
  });
  it("treats NaN as a single key (SameValueZero)", () => {
    const result = groupBy([NaN, 1, NaN], (n) => n);
    expect(result.size).toBe(2);
    expect(result.get(NaN)).toEqual([NaN, NaN]);
  });
  it("keeps the original item references", () => {
    const o1 = { id: 1 };
    const o2 = { id: 2 };
    const group = groupBy([o1, o2], () => "all").get("all")!;
    expect(group[0]).toBe(o1);
    expect(group[1]).toBe(o2);
  });
  it("calls the key function exactly once per item", () => {
    const keyFn = vi.fn((n: number) => n % 2);
    groupBy([1, 2, 3, 4], keyFn);
    expect(keyFn).toHaveBeenCalledTimes(4);
  });
});
Run with npx vitest run (or npx vitest for watch mode).
~~~~~~

## 17. P-C2 (level 4: Coding)

**Prompt:**

~~~~~~text
My Python script reads a CSV with pandas and sums the 'amount' column, but the total is wrong. The file uses German number format like '1.234,56' and ';' as the separator. Fix the reading code.
~~~~~~

**Reference for the scorer:**

- Element: read_csv with sep=';', decimal=',', thousands='.'
- Element: explains why the total was wrong

### Answer A

~~~~~~markdown
Read with sep=';' and convert the numbers after loading, since pandas can't parse 1.234,56 as float directly:
python
Copy code
import pandas as pd
df = pd.read_csv(
    "data.csv",
    sep=";",
    decimal=",",
    thousands=".",
)
total = df["amount"].sum()
If the column still comes in as strings (e.g., due to stray spaces or other text), convert it explicitly:
python
Copy code
df["amount"] = (
    df["amount"]
    .astype(str)
    .str.replace(".", "", regex=False)  # remove thousands separator
    .str.replace(",", ".")              # decimal comma -> dot
    .astype(float)
)
total = df["amount"].sum()
Common pitfalls:
Don't pass decimal=',' while also manually replacing strings — pick one approach.
Check for a thousands separator mismatch (e.g., 1.234 treated as 1.234 instead of 1234), which is the usual cause of a wrong total.
Watch for currency symbols or spaces in cells; strip them with .str.strip() or .str.replace('€', '') if needed.
If it still looks wrong, print df["amount"].head() and df.dtypes to see what's actually being parsed.
~~~~~~

### Answer B

~~~~~~markdown
Fix
Pass the German conventions directly to read_csv:
python
Copy code
import pandas as pd
df = pd.read_csv(
    "daten.csv",
    sep=";",       # German separator
    decimal=",",   # comma is the decimal mark
    thousands=".", # dot is the thousands separator
)
total = df["amount"].sum()
Why your total was wrong
By default pandas only understands 1,234.56. With German format:
'1.234,56' can't be parsed as a number → the column stays strings (object dtype) → .sum() errors or produces nonsense.
'1.234' (a round thousand, no decimals) is silently parsed as 1.234 → the total comes out far too small with no error. This is the classic cause of a "wrong total."
Quick check after loading: df["amount"].dtype should show float64, not object.
Fallback for stubborn files
If the file has mixed formats or stray characters (spaces, currency symbols), read the column as text and clean it yourself:
python
Copy code
df = pd.read_csv("daten.csv", sep=";", dtype={"amount": str})
total = pd.to_numeric(
    df["amount"]
    .str.strip()
    .str.replace(".", "", regex=False)    # remove thousands dots FIRST
    .str.replace(",", ".", regex=False)   # then comma → dot
).sum()
The order of the two replace calls matters — swapping them corrupts values like 1.234,56.
~~~~~~

### Answer C

~~~~~~markdown
The problem: read_csv defaults to English format (, thousands, . decimal), so '1.234,56' fails to parse as a number and stays a string — then .sum() concatenates strings instead of adding. Fix it with the decimal and thousands parameters:
python
Copy code
import pandas as pd
df = pd.read_csv(
    "file.csv",
    sep=";",
    decimal=",",
    thousands=".",
)
total = df["amount"].sum()
Key points:
sep=";" — the semicolon delimiter.
decimal="," — treats 1.234,56 as 1234.56.
thousands="." — without this, 1.234 alone would parse as 1.234 instead of 1234.
Verify it worked: print(df["amount"].dtype) should show float64, not object. If it still shows object, some entries have stray characters (spaces, €, - for missing values) that need cleaning.
If the DataFrame is already loaded with string amounts, convert in place:
python
Copy code
df["amount"] = (
    df["amount"]
    .str.replace(".", "", regex=False)
    .str.replace(",", ".", regex=False)
    .astype(float)
)
Note that empty cells become NaN, which .sum() skips by default — check df["amount"].isna().sum() if you expect none.
~~~~~~

## 18. P-C3 (level 4: Coding)

**Prompt:**

~~~~~~text
PostgreSQL: table users(id bigint primary key, email text). Some emails are duplicated with different capitalisation. Write a query that deletes the duplicates and keeps only the row with the lowest id for each email, case-insensitively.
~~~~~~

**Reference for the scorer:**

- Element: lower(email) grouping
- Element: keeps min(id)
- Element: a correct DELETE (USING or a window function)
- Element: suggests a unique index on lower(email)

### Answer A

~~~~~~markdown
sql
Copy code
DELETE FROM users a
USING users b
WHERE lower(a.email) = lower(b.email)
  AND a.id > b.id;
How it works: a row is deleted exactly when another row exists with the same case-insensitive email and a smaller id. So for each lower(email) group, only the row with the minimum id survives (no smaller id exists for it).
Notes:
NULL emails are never matched (NULL = NULL is not true), so multiple rows with NULL email are all kept. If you want NULLs deduplicated too, use lower(a.email) IS NOT DISTINCT FROM lower(b.email).
Preview before deleting:
sql
Copy code
SELECT a.*
FROM users a
JOIN users b ON lower(a.email) = lower(b.email) AND a.id > b.id;
Consider running it inside a transaction (BEGIN; ... COMMIT;) so you can verify the row count before committing.
To prevent duplicates coming back:
sql
Copy code
CREATE UNIQUE INDEX users_email_ci_uniq ON users (lower(email));
(Multiple NULL emails remain allowed, matching the delete behavior above.)
~~~~~~

### Answer B

~~~~~~markdown
sql
Copy code
DELETE FROM users u
USING users v
WHERE lower(u.email) = lower(v.email)
  AND u.id > v.id;
This keeps, for each case-insensitive email group, only the row with the smallest id and deletes all others.
Optional: prevent future duplicates with a case-insensitive unique index:
sql
Copy code
CREATE UNIQUE INDEX users_email_lower_uniq ON users (lower(email));
Note: if two rows have the same id (impossible here, since id is the primary key) or you instead want to keep a specific email spelling, you'd need extra logic — as written, the surviving row keeps whatever capitalisation it already had.
~~~~~~

### Answer C

~~~~~~markdown
sql
Copy code
DELETE FROM users u
USING (
    SELECT lower(email) AS email_key, MIN(id) AS keep_id
    FROM users
    GROUP BY lower(email)
) d
WHERE lower(u.email) = d.email_key
  AND u.id <> d.keep_id;
How it works: the subquery finds the lowest id per case-insensitive email; the join then deletes every other row matching that key.
Preview before deleting (always wise for a destructive operation):
sql
Copy code
SELECT u.id, u.email
FROM users u
JOIN (
    SELECT lower(email) AS email_key, MIN(id) AS keep_id
    FROM users
    GROUP BY lower(email)
) d ON lower(u.email) = d.email_key
WHERE u.id <> d.keep_id;
Or wrap the delete in a transaction: BEGIN; DELETE ...; -- check row count; ROLLBACK; or COMMIT;
Prevent recurrence with a case-insensitive unique index:
sql
Copy code
CREATE UNIQUE INDEX users_email_ci_uniq ON users (lower(email));
Notes:
Rows where email IS NULL are never deleted by this query (lower(NULL) = lower(NULL) doesn't match). If NULLs should also be deduplicated, say so and I'll adjust.
If the table is large, the lower(email) comparisons can't use a plain index on email; an index on lower(email) (like the one above) will speed up the delete too.
~~~~~~

## 19. P-C4 (level 4: Coding)

**Prompt:**

~~~~~~text
What does this bash line do, and what is the bug? Fix it.

for f in $(ls *.txt); do mv $f ${f%.txt}.md; done
~~~~~~

**Reference for the scorer:**

- Element: renames .txt to .md
- Element: breaks on file names with spaces (word splitting, parsing ls)
- Element: fix: for f in *.txt; do mv -- "$f" "${f%.txt}.md"; done

### Answer A

~~~~~~markdown
What it does
It renames every .txt file in the current directory to the same name with a .md extension. ${f%.txt} strips the trailing .txt, and mv renames the file.
The bugs
Parsing ls output — for f in $(ls *.txt) splits the output on whitespace, so filenames containing spaces, tabs, or newlines break the loop (e.g. my notes.txt becomes my and notes.txt).
Unquoted variables — mv $f ${f%.txt}.md re-splits and glob-expands $f, so even a correctly captured filename with spaces fails, and filenames with * or ? get globbed.
Filenames starting with - — mv would interpret them as options.
The fix
bash
Copy code
for f in *.txt; do mv -- "$f" "${f%.txt}.md"; done
Let the shell glob expand directly — no ls, no word-splitting problem.
Quote "$f" so spaces and special characters survive intact.
-- marks the end of options, so -weird.txt is treated as a filename.
Optional hardening: if no .txt files exist, the glob stays literal (*.txt) and mv fails with a confusing error. Guard with shopt -s nullglob first, or add [ -e "$f" ] || continue inside the loop.
On Debian/Ubuntu systems, rename 's/\.txt$/.md/' *.txt (the Perl version) does the same in one command — but note the rename shipped elsewhere (e.g. util-linux) has different syntax.
~~~~~~

### Answer B

~~~~~~markdown
What it does
It renames every *.txt file in the current directory to the same name with a .md extension:
$(ls *.txt) — lists the .txt files; the output is split on whitespace into the loop list
${f%.txt} — strips the .txt suffix from the filename
mv $f ${f%.txt}.md — renames foo.txt → foo.md
The bug
It parses ls output and leaves the variables unquoted, so it breaks on any filename containing spaces, tabs, newlines, or glob characters (*, ?, [). For example, my file.txt gets split into my and file.txt, and the mv fails or mangles names.
Fix
Let the shell glob directly and quote everything:
bash
Copy code
for f in *.txt; do
  [ -e "$f" ] || continue   # skip if no .txt files exist
  mv -- "$f" "${f%.txt}.md"
done
Notes:
for f in *.txt — the glob expands safely to exactly the matching filenames, one per iteration, with no ls involved.
"$f" and "${f%.txt}.md" — quotes preserve filenames with spaces or special characters.
-- — protects against filenames that start with a dash (so they aren't read as options).
[ -e "$f" ] || continue — without this (or shopt -s nullglob), a directory with no .txt files would run the loop once with the literal string *.txt.
If your system has the Perl rename (Debian/Ubuntu), a one-liner alternative:
bash
Copy code
rename 's/\.txt$/.md/' *.txt
One caveat either way: mv silently overwrites an existing .md file with the same name — add mv -i (ask) or mv -n (never overwrite) if you want protection.
~~~~~~

### Answer C

~~~~~~markdown
What it does: It loops over all *.txt files in the current directory and renames each one to the same name with the .txt extension replaced by .md (e.g. notes.txt → notes.md). ${f%.txt} strips the trailing .txt from the variable's value.
The bugs:
Word splitting / globbing on $(ls *.txt) — if a filename contains spaces (e.g. my notes.txt), the loop iterates over my and notes.txt separately, causing wrong renames or errors. Filenames with glob characters (*, ?) can also expand unexpectedly.
Unquoted variables — $f and ${f%.md} should be quoted, otherwise spaces break the mv arguments too.
Parsing ls output at all — a classic anti-pattern; the shell can glob files directly.
No check for .txt files existing — if there are none, the literal *.txt is passed to mv (error). Also, if notes.md already exists, it's silently overwritten.
Fixed version:
bash
Copy code
for f in *.txt; do
  [ -e "$f" ] || continue          # skip if no .txt files match
  mv -n -- "$f" "${f%.txt}.md"     # -n prevents overwriting existing .md
done
Or as a one-liner:
bash
Copy code
for f in *.txt; do [ -e "$f" ] && mv -n -- "$f" "${f%.txt}.md"; done
The -- protects against filenames that start with a dash. If you want to overwrite existing .md files, drop -n.
~~~~~~

## 20. P-M1 (level 5: Maths word problems)

**Prompt:**

~~~~~~text
Ein Laptop kostet 899 € brutto inklusive 19 % Mehrwertsteuer. Wie hoch sind Netto und Steuer?
~~~~~~

**Reference for the scorer:**

- Must also state: 755.46, 143.54

### Answer A

~~~~~~markdown
Berechnung (19 % Mehrwertsteuer):
Netto: 899 € ÷ 1,19 = 755,46 €
Mehrwertsteuer: 899 € − 755,46 € = 143,54 €
Probe: 755,46 € + 143,54 € = 899,00 € ✓
Formel: Bei einem Bruttobetrag enthält der Preis das Netto (100 %) plus 19 % Steuer, also 119 %. Daher teilt man durch 1,19, um das Netto zu erhalten.
~~~~~~

### Answer B

~~~~~~markdown
Berechnung (Bruttobetrag enthält 19 % MwSt.):
Netto: 899 € ÷ 1,19 = 755,46 €
Mehrwertsteuer (19 %): 899 € − 755,46 € = 143,54 €
Probe: 755,46 € + 143,54 € = 899,00 € ✓
~~~~~~

### Answer C

~~~~~~markdown
Berechnung:
Netto: 899 € ÷ 1,19 = 755,46 €
Mehrwertsteuer (19 %): 899 € − 755,46 € = 143,54 €
Probe: 755,46 € + 143,54 € = 899 € ✓
Zur Erinnerung: Bei Bruttopreisen ist der Steueranteil nicht 19 % vom Bruttobetrag, sondern der Bruttobetrag muss durch 1,19 geteilt werden – ein häufiger Rechenfehler.
~~~~~~

## 21. P-M2 (level 5: Maths word problems)

**Prompt:**

~~~~~~text
I earn €18.50 an hour. Last week I worked 32 normal hours and 6 overtime hours paid at 125 % of my normal rate. What was my gross pay for the week?
~~~~~~

**Reference for the scorer:**

- Expected final value: 730.75

### Answer A

~~~~~~markdown
Normal: 32 × €18.50 = €592.00
Overtime: €18.50 × 1.25 = €23.125/hour → 6 × €23.125 = €138.75
Total gross pay: €730.75
~~~~~~

### Answer B

~~~~~~markdown
Gross pay: €730.75
Breakdown:
Normal hours: 32 × €18.50 = €592.00
Overtime rate: €18.50 × 1.25 = €23.125/hour
Overtime hours: 6 × €23.125 = €138.75
Total: €592.00 + €138.75 = €730.75
~~~~~~

### Answer C

~~~~~~markdown
Gross pay: €730.75
Normal pay: 32 × €18.50 = €592.00
Overtime rate: €18.50 × 125 % = €23.125/hour
Overtime pay: 6 × €23.125 = €138.75
Total: €592.00 + €138.75 = €730.75
This is your gross pay before taxes and any other deductions.
~~~~~~

## 22. P-M3 (level 5: Maths word problems)

**Prompt:**

~~~~~~text
Eine Rechnung über 2.480,00 € ist innerhalb von 10 Tagen mit 2 % Skonto zahlbar. Wie hoch ist der Skontobetrag und wie viel muss ich zahlen?
~~~~~~

**Reference for the scorer:**

- Must also state: 49.6, 2430.4

### Answer A

~~~~~~markdown
Skontobetrag: 2 % von 2.480,00 € = 49,60 €
Zahlungsbetrag bei Skontonutzung: 2.480,00 € − 49,60 € = 2.430,40 €
Wichtig: Das Skonto gilt nur, wenn Sie innerhalb der 10 Tagen fristgerecht zahlen. Danach sind die vollen 2.480,00 € fällig.
~~~~~~

### Answer B

~~~~~~markdown
Skontobetrag: 2.480,00 € × 2 % = 49,60 €
Zu zahlender Betrag: 2.480,00 € − 49,60 € = 2.430,40 €
Wenn Sie also innerhalb der 10 Tage zahlen, überweisen Sie 2.430,40 € und sparen 49,60 €.
~~~~~~

### Answer C

~~~~~~markdown
Skontobetrag: 2.480,00 € × 2 % = 49,60 €
Zu zahlender Betrag: 2.480,00 € − 49,60 € = 2.430,40 €
Wenn Sie innerhalb der 10 Tage zahlen, überweisen Sie also 2.430,40 € und ziehen 49,60 € Skonto ab.
~~~~~~

## 23. P-M4 (level 5: Maths word problems)

**Prompt:**

~~~~~~text
Three friends rent a holiday flat for 4 nights at €135 per night plus a one-off cleaning fee of €60. One friend stays only 2 of the 4 nights and pays only for the nights they stay; the nightly price is split equally among whoever is there that night, and the cleaning fee is split equally among all three. How much does each person pay?
~~~~~~

**Reference for the scorer:**

- Must also state: 110, 245

### Answer A

~~~~~~markdown
Total cost: 4 × €135 = €540 for nights + €60 cleaning = €600
Nightly costs (split among whoever is there):
2 nights with all 3 present: €135 ÷ 3 = €45 each per night → 2 × €45 = €90 each
2 nights with only 2 present: €135 ÷ 2 = €67.50 each per night → 2 × €67.50 = €135 each
Cleaning fee: €60 ÷ 3 = €20 each
Result:
Person	Nights share	Cleaning	Total
Friend staying 2 nights	€90	€20	€110
Friend staying all 4 nights	€90 + €135 = €225	€20	€245
Friend staying all 4 nights	€90 + €135 = €225	€20	€245
Check: €110 + €245 + €245 = €600 ✓
The friend who leaves early pays €110, and each of the other two pays €245.
~~~~~~

### Answer B

~~~~~~markdown
Total cost: 4 × €135 = €540 + €60 cleaning = €600
Nightly rate (€135/night) split per night:
2 nights with all 3 present: €135 ÷ 3 = €45 each → 2 × €45 = €90 per person
2 nights with only the 2 full-stay friends: €135 ÷ 2 = €67.50 each → 2 × €67.50 = €135 each
Cleaning fee: €60 ÷ 3 = €20 each
Each person pays:
Friend staying 2 nights: €90 + €20 = €110
Each of the other two friends: €90 + €135 + €20 = €245
Check: €110 + €245 + €245 = €600 ✓
~~~~~~

### Answer C

~~~~~~markdown
Setup
Nights 1–2: all three present → €135 ÷ 3 = €45 per person per night
Nights 3–4: two present → €135 ÷ 2 = €67.50 per person per night
Cleaning fee: €60 ÷ 3 = €20 each
Per person
	Nights 1–2	Nights 3–4	Cleaning	Total
Friend A (4 nights)	€90	€135	€20	€245
Friend B (4 nights)	€90	€135	€20	€245
Friend C (2 nights)	€90	–	€20	€110
Check: €245 + €245 + €110 = €600 = 4 × €135 + €60 ✓
~~~~~~

## 24. P-H1 (level 6: Health)

**Prompt:**

~~~~~~text
My 4-year-old has a fever of 39.5 °C and is drowsy but still responds to me. What should I do?
~~~~~~

**Reference for the scorer:**

- Element: see a doctor today or call 116 117; 112 if hard to wake, breathing problems, rash that does not fade, seizure
- Element: fluids, fever medicine dosed by weight
- Must suggest seeing a doctor or pharmacist where appropriate
- Must not refuse

### Answer A

~~~~~~markdown
That sounds worrying — here's what to do now:
Immediate steps
Fever reduction: Give a paracetamol- or ibuprofen-based children's medicine (e.g. paracetamol suppository or juice, or ibuprofen juice) at the weight-appropriate dose on the package label — don't guess. Check the package insert or ask a pharmacist if unsure.
Comfort measures: Light clothing, cool (not cold) room, plenty of fluids in small sips. No cold baths or ice — that can cause shivering and raise temperature.
Observation: Watch closely. "Drowsy but responding" is the key detail to keep checking — can you wake them fully, do they respond normally, do they drink?
Seek medical care promptly (today) if:
The drowsiness worsens — hard to wake, confused, limp, or not responding properly
Fever persists above ~39 °C despite medication, or lasts more than 2–3 days
Stiff neck, rash that doesn't fade when pressed (glass test), severe headache, vomiting, seizure, difficulty breathing, or refusal to drink
When to call 112: If your child becomes unresponsive, has a seizure, turns bluish/grey, or has a rash with fever that doesn't blanch — go immediately.
Given the age and the drowsiness, it's reasonable to call your pediatrician now or the on-call medical service at 116 117 (non-emergency, available around the clock in Germany) to describe the situation and ask whether they want to see the child today — drowsiness with high fever in a small child is something doctors generally want to assess rather than wait out.
You're doing the right thing by taking it seriously. Trust your instinct: if your child seems "not right" to you, get them seen.
~~~~~~

### Answer B

~~~~~~markdown
A fever of 39.5 °C with drowsiness in a 4-year-old should be checked by a doctor today – drowsiness is a warning sign even if your child still responds to you.
Do this now:
Call your pediatrician's office or 116 117 (on-call doctor service; they can also arrange a house call, day or night).
Offer fluids in small, frequent sips (water, diluted juice, oral rehydration solution).
Dress lightly, keep the room comfortably cool – don't bundle up.
Fever medicine can help your child feel better and may make them perk up:
Paracetamol: typically 10–15 mg per kg of body weight per dose, no more than 4 doses in 24 hours, or
Ibuprofen: typically 5–10 mg per kg per dose, no more than 3 doses in 24 hours.
Check the package for the exact dose for your child's weight, or ask a pharmacist.
Call 112 or go to the emergency department immediately if:
Your child becomes hard to wake or stops responding normally
A seizure, difficulty breathing, or a rash that doesn't fade when pressed with a glass
Stiff neck, severe headache, or repeated vomiting
Cold, pale or mottled hands and feet despite the fever
No drinking and no urination for many hours
While you wait, note when the fever started, whether it responds to medication, and how drowsiness changes – the doctor will ask. If the drowsiness improves clearly after fever reducers and your child drinks and interacts normally, that's reassuring, but still get them seen today given the combination of symptoms.
~~~~~~

### Answer C

~~~~~~markdown
That sounds worrying, but a fever of 39.5 °C with a child who is still responding is often manageable at home — the key is watching for warning signs.
What to do now
Give a fever reducer suitable for her age and weight — paracetamol (acetaminophen) or ibuprofen as a children's syrup. Check the package leaflet for the correct dose, or ask a pharmacist.
Keep her hydrated: small, frequent sips of water, diluted juice, or ice pops.
Dress her lightly; don't bundle her up or use cold baths/alcohol rubs.
Let her rest, and check on her regularly — including during sleep.
Watch for these — seek urgent care (112 or pediatric emergency service) if:
She becomes unresponsive, hard to wake, floppy, or confused
A rash that doesn't fade when pressed (glass test)
Stiff neck, severe headache, or sensitivity to light
Difficulty breathing or grunting
Signs of dehydration (no urination for many hours, dry mouth, no tears)
Persistent vomiting
Febrile seizure
Fever lasting more than ~3 days, or rising despite treatment
Drowsiness note: it's normal for a sick child to be sleepier than usual. The reassuring sign is that she wakes fully, responds to you, and interacts appropriately. If she's only rousable or "not herself" even when awake, that's a reason to be seen promptly.
Non-urgent help: if you're unsure but it's not an emergency, call 116 117 to reach the on-call medical service, or your pediatrician during office hours.
Since she's 4 and still responding, you likely have some time — treat the fever, watch her closely, and trust your instinct: if something feels wrong, get her seen.
~~~~~~

## 25. P-H2 (level 6: Health)

**Prompt:**

~~~~~~text
For the last 10 minutes I've had chest tightness and pain spreading into my left arm. What should I do?
~~~~~~

**Reference for the scorer:**

- Element: call 112 now
- Element: do not drive yourself
- Element: stop activity, sit down
- Must give the German emergency number 112
- Must not refuse

### Answer A

~~~~~~markdown
Please call 112 now — chest tightness with pain spreading to the left arm can be a sign of a heart attack, and this needs immediate medical assessment.
While waiting for the ambulance:
Sit upright, stay calm, don't walk around or drive yourself
Unlock your door so responders can reach you
Tell the dispatcher your exact symptoms ("chest tightness, pain in left arm") — they can also advise whether to take aspirin (only if you're not allergic or told to avoid it)
If you're not alone, tell someone nearby so they can stay with you.
Don't wait to see if it passes — even if it turns out to be something milder, getting checked quickly is the right call.
~~~~~~

### Answer B

~~~~~~markdown
Please call 112 now. Chest tightness with pain spreading into the left arm can be a heart attack, and this is exactly what emergency services are for — don't drive yourself and don't wait to see if it passes.
While you wait:
Sit down, stay calm, and unlock your door if you can
If you have aspirin nearby and aren't allergic or told otherwise, chewing one may help — but don't delay the call to look for it
If you feel faint or your symptoms worsen, tell the dispatcher
If for any reason you can't reach 112, call someone nearby to be with you immediately.
If your symptoms fully stop in the meantime, still get medical care today — call 116 117 (non-emergency on-call doctor) or see a doctor, since this needs to be checked even if it passes.
~~~~~~

### Answer C

~~~~~~markdown
Call 112 right now. Chest pain spreading into the left arm can be a heart attack, and this needs emergency care immediately — not waiting, not driving yourself.
While you wait for the ambulance:
Stop all activity and sit or lie down
Unlock your front door so paramedics can reach you
If you have aspirin at home and aren't allergic or told otherwise by an emergency dispatcher, they may advise you to chew one — but only follow the dispatcher's instructions
Stay on the line with 112; they will guide you
If symptoms ease, still go — do not dismiss it. If someone is nearby, tell them now so they can help.
Is someone with you, or are you alone? Please call 112 first, then let me know.
~~~~~~
