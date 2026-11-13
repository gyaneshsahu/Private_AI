# Blind benchmark: scoring sheet

Each prompt's answers carry random labels; the labels are shuffled separately for every prompt and the key is kept outside the repository. Score every answer from 1 to 5 in `scoring-sheet-searchfirst.csv` (5 = could not be better, 4 = good with a minor flaw, 3 = usable but clearly weaker, 2 = poor or partly wrong, 1 = wrong, refused or harmful). Set `hallucination` to `yes` when the answer states anything false or invented as fact (a wrong number, an invented source, an invented detail not in the document). Use the reference under each prompt; for research prompts check the facts on the day you score. `speedNote` and `comment` are free text. Do not look up which label is which until every row is filled.

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

### Answer B

~~~~~~markdown
Nach einem Umzug musst du die neue Adresse im Fahrzeugschein (Zulassungsbescheinigung Teil I) bei der Kfz-Zulassungsstelle deines neuen Wohnorts eintragen lassen. Das Kennzeichen kannst du dabei in der Regel behalten, auch wenn du in einen anderen Zulassungsbezirk ziehst.
Frist: Die Fahrzeug-Zulassungsverordnung (FZV) verlangt, dass du die Änderung unverzüglich anzeigst – also ohne schuldhaftes Zögern, sobald du dich am neuen Wohnort angemeldet hast. Eine feste Wochenfrist steht meines Wissens nicht im Gesetz; den verbindlichen Wortlaut findest du in der FZV auf gesetze-im-internet.de, und deine Zulassungsstelle bestätigt dir die Praxis. Zögere es nicht hinaus – verspätete Anzeigen können Folgen haben, was genau hängt vom Einzelfall ab.
Kosten: Die Gebühren legt die Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt) fest. Ungeprüft und unverbindlich: für die Umschreibung werden oft etwa 10–15 € genannt. Verbindlich ist nur die aktuelle GebOSt bzw. die Auskunft deines Amts. Bei neuem/Wunschkennzeichen kommen Schilder- und Zuteilungsgebühren dazu.
Übliche Unterlagen: Personalausweis mit neuer Meldeadresse, Zulassungsbescheinigung Teil I und II, teils ein SEPA-Mandat für die Kfz-Steuer. Viele Ämter verlangen einen Online-Termin. Informiere außerdem deine Kfz-Versicherung.
Soll ich per Websuche die genauen Fristen und Gebühren für deine Stadt heraussuchen?
~~~~~~

### Answer C

~~~~~~markdown
Kurz zusammengefasst:
Frist
Eine feste gesetzliche Frist gibt es laut Allianz Direct nicht; Zulassungsstellen nennen als Faustregel etwa vier Wochen, bei Versäumnis droht ein Verwarnungsgeld von bis zu 70 € allianzdirect.de.
umziehen.de nennt als Orientierung einen Monat nach dem Umzug umziehen.de.
Verti weist darauf hin, dass die Fristen regional unterschiedlich sind und etwa ein bis vier Wochen betragen verti.de.
Eine Quelle (Zulassungsstellen Deutschland) spricht von „unverzüglich“ zulassungsstellen-deutschland.de.
Die Angaben widersprechen sich teilweise – am sichersten fragen Sie direkt bei Ihrer (neuen) Zulassungsstelle nach. Praktisch gilt: eher früher als später erledigen.
Kosten (Größenordnungen, je nach Zulassungsbezirk und Kennzeichen unterschiedlich)
Allgemeine Spanne: meist 10–30 € umziehen.de; eine andere Quelle nennt etwa 20–50 € verti.de.
Nur Adressänderung im selben Zulassungsbezirk: ca. 10–15 €; mit Halterwechsel 25–30 € umziehen.de.
Neue Kennzeichen (mit Prägung): ca. 20–30 €, ggf. plus neue Feinstaubplakette (5–10 €) umziehen.de.
Wunschkennzeichen: Reservierung ca. 10–15 €, Extragebühr ca. 15–20 € umziehen.de.
Eine Quelle nennt eine Festgebühr von 23,60 € (online 9,90 €) zzgl. Auslagen zulassungsstellen-deutschland.de.
Praktische Hinweise
Vorher müssen Sie sich beim Einwohnermeldeamt gemeldet haben (neue Adresse im Ausweis oder Meldebescheinigung) umziehen.de.
Kennzeichen behalten: Seit 2015 bundesweit möglich umziehen.de; Online-Ummeldung per i-Kfz ist seit 2019 möglich (neuer Personalausweis mit Online-Funktion nötig) adac.de.
Typische Unterlagen: Zulassungsbescheinigung Teil I und II, Ausweis mit Meldebescheinigung, HU-Nachweis, eVB-Nummer der Versicherung, SEPA-Mandat für die Kfz-Steuer umziehen.de.
Die genaue Gebühr erfahren Sie bei Ihrer zuständigen Zulassungsstelle umziehen.de.
~~~~~~

### Answer D

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

## 2. G-02 (level 2: German rules, fees and deadlines)

**Prompt:**

~~~~~~text
Ich bin Arbeitnehmerin, zur Abgabe einer Steuererklärung verpflichtet und habe keinen Steuerberater. Bis wann muss die Steuererklärung für 2025 beim Finanzamt sein?
~~~~~~

**Reference for the scorer:**

- Fact: 31. Juli 2026 (ohne Steuerberater); mit Steuerberater später

### Answer A

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

### Answer B

~~~~~~markdown
Als pflichtveranlagte Arbeitnehmerin ohne steuerliche Beratung müssen Sie die Steuererklärung für 2025 bis zum 31. Juli 2026 beim Finanzamt einreichen finanzamt.nrw.de.
Das bestätigen auch mehrere andere Quellen für den Fall ohne Beratung smartsteuer.de vlh.de.
Zur Einordnung:
Mit Steuerberater/Lohnsteuerhilfeverein: Frist verlängert sich auf den 1. März 2027 finanzamt.nrw.de vr.de. (Eine Quelle nennt den 2. März 2027 volksbank-kassel-goettingen.de – der offizielle NRW-Finanzamt-Text und die Volksbanken-Raiffeisenbanken nennen den 1. März 2027.)
Freiwillige Abgabe (ohne Pflicht): möglich bis zum 31. Dezember 2029, also vier Jahre vr.de.
Hinweis: Das Finanzamt fordert nicht automatisch zur fristgerechten Abgabe auf – Sie müssen selbst auf die Frist achten finanzamt.nrw.de. Bei Fristverlängerungsbedarf können Sie beim Finanzamt eine Fristverlängerung beantragen; dazu sagt das abgerufene Material nichts Weiteres.
~~~~~~

### Answer C

~~~~~~markdown
31. Juli 2026 – das gilt für Pflichtveranlagungen ohne steuerliche Beratung smartsteuer.definanzamt.nrw.devlh.de.
Hinweise:
Fällt der Stichtag auf ein Wochenende, reicht der darauffolgende Montag smartsteuer.de. Der 31.07.2026 ist ein Freitag.
Mit Steuerberater oder Lohnsteuerhilfeverein würde sich die Frist verlängern (auf den 1./2. März 2027 – die Quellen nennen hier leicht abweichende Daten vr.devolksbank-kassel-goettingen.desmartsteuer.de), für Sie ohne Beratung aber nicht relevant.
Bei Fristversäumnis drohen u. a. Verspätungszuschlag, Zwangsgeld oder eine Steuerschätzung smartsteuer.de.
~~~~~~

### Answer D

~~~~~~markdown
Abgabefrist für die Steuererklärung 2025
Die Frist für verpflichtete Abgeberinnen regelt § 149 Abgabenordnung (AO). Sie bemisst sich in Monaten nach dem Ende des Steuerjahres und wurde per Gesetz in der Vergangenheit mehrfach geändert – hier bin ich mir beim konkreten Datum nicht sicher.
Ungeprüfter Richtwert: In den letzten Jahren galt für Pflichtfälle ohne Steuerberater der 31. Juli des Folgejahres – für das Steuerjahr 2025 also der 31.07.2026. Diesen Wert bitte nicht ungeprüft übernehmen, da mein Wissensstand veraltet sein kann.
Wovon die Frist abhängt:
Ohne Steuerberater/Lohnsteuerhilfeverein (dein Fall): allgemeine Frist nach § 149 AO
Mit Beratung: deutlich spätere Frist (§ 149 Abs. 3 AO)
Sonderfälle (z. B. Einkünfte aus Land- und Forstwirtschaft): abweichende Fristen möglich
Verlängerung: vor Fristablauf beim Finanzamt beantragbar (§ 109 AO)
Falls die Frist bereits abgelaufen sein sollte: Die Erklärung möglichst zeitnah abgeben. Bei Verspätung kann das Finanzamt einen Verspätungszuschlag festsetzen (§ 152 AO); dessen Höhe hängt u. a. von Verspätungsdauer und Steuerschuld ab. Bei nachvollziehbaren Gründen lohnt ein Antrag auf Fristverlängerung oder das direkte Gespräch mit dem Finanzamt.
Verbindlich prüfen kannst du die Frist hier:
§ 149 AO auf gesetze-im-internet.de (https://www.gesetze-im-internet.de/ao_1977/__149.html)
Dein Finanzamt bzw. ELSTER – die Frist steht meist auch auf dem Hauptvordruck
Soll ich eine Websuche durchführen, um die aktuell geltende Frist für 2025 zu prüfen?
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
Der Rundfunkbeitrag ist eine feste Pauschale pro Wohnung (unabhängig davon, wie viele Geräte oder Bewohner es gibt) und ist im Rundfunkbeitragsstaatsvertrag (§ 5) geregelt. Er wird meist quartalsweise im Voraus abgebucht. Der Betrag ändert sich immer wieder, wenn die Länder – auf Grundlage der Empfehlung der KEF (Kommission zur Ermittlung des Finanzbedarfs) – eine neue Höhe beschließen.
Eine verlässliche, tagesaktuelle Zahl kann ich daher nicht als Fakt nennen. Nach meinem (möglicherweise veralteten) Kenntnisstand lag er ab 2025 bei 18,94 € pro Monat (vorher 17,50 €) – diese Angabe ist aber ungeprüft und kann inzwischen wieder geändert worden sein.
Verbindlich prüfen kannst du den aktuellen Betrag hier:
Gesetzestext: Rundfunkbeitragsstaatsvertrag auf gesetze-im-internet.de
Zuständige Stelle: der ARD ZDF Deutschlandradio Beitragsservice (rundfunkbeitrag.de)
Soll ich für dich das Web nach der aktuellen Höhe durchsuchen?
~~~~~~

### Answer B

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

### Answer C

~~~~~~markdown
Aktuell beträgt der Rundfunkbeitrag 18,36 Euro pro Monat pro Wohnung – das ist der offiziell geregelt Betrag laut Beitragsservice rundfunkbeitrag.de.
Zur Einordnung:
Dreimonatszeitraum: 55,08 Euro
Halbjährlich: 110,16 Euro
Jährlich im Voraus: 220,32 Euro rundfunkbeitrag.de
Hinweis zu einer möglichen Erhöhung: Ein Quelle (Verbraucherzentrale-Blog) berichtet von einer Erhöhung auf 18,94 € monatlich verbraucherzentrale.alleaktien.com, während die offizielle Seite des Beitragsservice und andere Quellen weiterhin 18,36 € nennen rundfunkbeitrag.definanztip.de. Es handelt sich bei der Erhöhungsmeldung um einen Suchauszug ohne Datum der tatsächlichen Änderung – ich kann hier nicht mit Sicherheit sagen, ob und wann eine Erhöhung in Kraft getreten ist. Für den verbindlichen aktuellen Betrag empfehle ich einen Blick auf rundfunkbeitrag.de.
Wichtig: Der Beitrag gilt pro Wohnung, unabhängig davon, wie viele Personen dort wohnen oder ob ein Radio/TV vorhanden ist. Er ist gesetzlich geregelt und muss auch ohne Zahlungsaufforderung gezahlt werden rundfunkbeitrag.de.
~~~~~~

### Answer D

~~~~~~markdown
Der Rundfunkbeitrag beträgt derzeit 18,36 Euro pro Monat für eine Wohnung rundfunkbeitrag.de. Das entspricht 55,08 Euro für drei Monate bzw. 220,32 Euro pro Jahr, je nach gewähltem Zahlungsrhythmus rundfunkbeitrag.de.
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
Als Mieter gilt bei einem unbefristeten Mietvertrag die gesetzliche Kündigungsfrist von drei Monaten – unabhängig davon, wie lange Sie schon in der Wohnung wohnen immobilienscout24.deimmobilienscout24.deallianz.de.
Wichtig für die Berechnung (§ 573c Abs. 1 BGB):
Die Kündigung muss spätestens am dritten Werktag eines Kalendermonats beim Vermieter eingehen, damit dieser Monat noch mitzählt. Werktage sind Montag bis Samstag; Sonn- und Feiertage zählen nicht immobilienscout24.de.
Beispiel: Wollen Sie zum 30. Juni ausziehen, muss die Kündigung spätestens am dritten Werktag im April zugegangen sein. Wird die Frist verpasst, verschiebt sich das Mietende um einen Monat immobilienscout24.de.
Ausnahmen:
Eine im Vertrag vereinbarte kürzere Frist (z. B. ein Monat) ist wirksam, wenn sie zu Ihren Gunsten gilt immobilienscout24.de.
Bei einem befristeten (Zeit-)Mietvertrag ist eine vorzeitige ordentliche Kündigung nicht möglich immobilienscout24.de.
Enthält der Vertrag einen Kündigungsverzicht für eine bestimmte Zeit, greift die normale Frist erst nach Ablauf dieser Zeitspanne immobilienscout24.de.
Tipp: Senden Sie die Kündigung so, dass Sie den Zugang nachweisen können – z. B. per Einwurf-Einschreiben oder persönlich mit Zeugen immobilienscout24.de.
~~~~~~

### Answer B

~~~~~~markdown
Kurz: Als Mieter gilt bei einem unbefristeten Mietvertrag in der Regel eine Kündigungsfrist von drei Monaten zum Ende eines Kalendermonats – unabhängig davon, wie lange du schon in der Wohnung wohnst (§ 573c BGB). Längere Fristen gelten nur für den Vermieter; sie steigen dort mit der Mietdauer. Diese Angabe ist ungeprüft – bitte verlass dich nicht allein darauf.
Worauf du achten solltest:
Mietvertrag prüfen: Es können abweichende Vereinbarungen gelten, z. B. ein bestimmter Kündigungstermin (etwa der 15. eines Monats). Zum Nachteil des Mieters darf die Frist aber nicht verlängert werden.
Form: Die Kündigung muss in der Regel schriftlich im gesetzlichen Sinne erfolgen – E-Mail oder WhatsApp genügen meist nicht.
Zugang zählt: Die Frist beginnt mit dem Zugang der Kündigung beim Vermieter, nicht mit dem Datum auf dem Brief.
Offizielle Quelle zum Nachlesen: § 573c BGB auf gesetze-im-internet.de (dort auch die Regeln für den Vermieter und mögliche Ausnahmen). Bei konkretem Streit hilft ein Mieterverein oder eine Mietrechtsberatung.
Soll ich das für dich im Web suchen und die aktuelle Fassung des § 573c BGB prüfen?
~~~~~~

### Answer C

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

### Answer D

~~~~~~markdown
Kurz zur Regel: Bei einem unbefristeten Wohnraummietvertrag haben Sie als Mieter jederzeit ein ordentliches Kündigungsrecht. Die Frist ist gesetzlich geregelt und hängt für Sie – anders als für den Vermieter – nicht von der Dauer des Mietverhältnisses ab. Nach meiner (hier ungeprüften) Erinnerung beträgt sie drei Monate zum Ende eines Kalendermonats; die Kündigung muss dem Vermieter dazu spätestens am dritten Werktag eines Monats zugehen.
Wovon es im Einzelfall abhängt:
Vertragliche Vereinbarung: Es können kürzere Fristen vereinbart sein. Bei Wohnraum darf Ihre Frist vertragisch aber nicht über die gesetzliche hinaus verlängert werden (ungeprüft).
Wohnraum oder Gewerbe: Bei Gewerbe-/Praxisräumen gelten andere, frei verhandelbare Regeln.
Form: Die Kündigung muss schriftlich zugehen – mündlich oder per E-Mail ist unwirksam.
Wo Sie es verbindlich nachprüfen können: die §§ 542 und 573c BGB auf gesetze-im-internet.de. Im Zweifel helfen auch Mieterverein oder Verbraucherzentrale.
Soll ich eine Websuche machen, um die aktuelle Frist und den genauen Wortlaut zu bestätigen?
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
Bei einer Fünf-Tage-Woche haben Sie gesetzlich mindestens 20 Urlaubstage pro Jahr. Das ergibt sich aus § 3 Abs. 1 Bundesurlaubsgesetz (BUrlG), der 24 Werktage bei einer Sechs-Tage-Woche vorsieht; auf 5 Tage pro Woche heruntergerechnet sind es 20 Tage juraforum.dejuraforum.deverdi.de.
Merkformel: 4 Wochen × Arbeitstage pro Woche = Mindesturlaub admiraldirekt.de. Das entspricht in jedem Fall vier Wochen Urlaub – bei 4 Arbeitstagen wären es z. B. 16 Tage tabelle.net.
Ein paar Hinweise:
Stunden zählen nicht: Entscheidend ist nur die Anzahl der Arbeitstage pro Woche, nicht die Wochenstunden admiraldirekt.de.
Teilzeit und Minijobber haben denselben Anspruch nach derselben Formel admiraldirekt.de.
Mehrurlaub ist üblich: Viele Arbeits- oder Tarifverträge sehen 30 Tage oder mehr vor; weniger als 20 darf der Vertrag nicht vorsehen admiraldirekt.de.
Erhöhter Anspruch: Schwerbehinderte erhalten bei einer 5-Tage-Woche 5 zusätzliche Tage (§ 208 SGB V); Jugendliche haben je nach Alter 25–30 Werktage (§ 19 JArbSchG) admiraldirekt.de.
~~~~~~

### Answer B

~~~~~~markdown
Bei einer Fünf-Tage-Woche haben Sie gesetzlich mindestens 20 Urlaubstage pro Kalenderjahr juraforum.de.
Hintergrund: Das Bundesurlaubsgesetz (§ 3 Abs. 1 BUrlG) garantiert 24 Werktage, ausgehend von einer Sechs-Tage-Woche. Bei fünf Arbeitstagen pro Woche wird das rechnerisch umgestellt: 24 × 5/6 = 20 Tage. Das entspricht vier vollen Urlaubswochen – Wochenenden und arbeitsfreie Feiertage zählen nicht als Urlaubstage juraforum.de.
Wichtig zu wissen:
Teilzeit: Entscheidend ist die Zahl der Arbeitstage pro Woche, nicht die tägliche Stundenzahl. Wer z. B. fünf Tage à vier Stunden arbeitet, hat ebenfalls Anspruch auf 20 Urlaubstage juraforum.de.
Mehrurlaub: Tarif- oder Arbeitsvertrag können mehr Urlaub gewähren, aber den gesetzlichen Mindesturlaub nicht unterschreiten juraforum.de.
Fristen: Der volle Anspruch entsteht nach sechs Monaten Betriebszugehörigkeit; Urlaub ist grundsätzlich bis zum 31. Dezember des Jahres zu nehmen (§ 7 Abs. 3 BUrlG) juraforum.de.
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
Nach § 3 Bundesurlaubsgesetz (BUrlG) bemisst sich der Mindesturlaub in Werktagen (Montag bis Samstag), also ausgehend von einer Sechs-Tage-Woche. Bei weniger Arbeitstagen pro Woche wird der Anspruch anteilig umgerechnet.
Für eine Fünf-Tage-Woche ergibt sich daraus rechnerisch der übliche Wert von 20 Tagen – diese Zahl ist hier von mir allerdings ungeprüft.
Zu beachten:
Das Gesetz regelt nur den Mindestanspruch; Tarif- oder Arbeitsverträge sehen häufig mehr Urlaub vor.
Maßgeblich sind die konkret vereinbarten Arbeitstage (z. B. bei Teilzeit entsprechend anteilig).
„Urlaubstage" im Vertrag meinen meist nur Arbeitstage, „Werktage" hingegen auch den Samstag – das kann zu Verwirrung führen.
Offizielle Quelle zum Nachlesen: Bundesurlaubsgesetz auf gesetze-im-internet.de (insbesondere § 3). Bei konkreten Streitfällen ist zudem die für Ihr Bundesland zuständige Arbeitsschutzbehörde Ansprechpartnerin.
Soll ich eine Websuche durchführen, um die aktuelle Regelung zu prüfen?
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

### Answer B

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

### Answer C

~~~~~~markdown
Was du jetzt tun solltest
Verlust melden: Geh zur Pass- und Ausweisbehörde (Bürgeramt, Einwohnermeldeamt oder Bürgerbüro) und melde den Verlust. Der alte Ausweis wird dort für ungültig erklärt, damit er nicht missbraucht werden kann.
Neuen Personalausweis beantragen: Das geht nur persönlich (Termin meist online buchbar). Bring ein aktuelles biometrisches Foto mit. Wenn du kein weiteres Ausweisdokument (z. B. Reisepass) hast, frag vorher bei der Behörde nach, welche Unterlagen zur Identitätsfeststellung nötig sind.
Bei Verdacht auf Diebstahl: Erstatte zusätzlich Anzeige bei der Polizei – das hilft, falls jemand den Ausweis missbraucht.
Falls der alte Ausweis wieder auftaucht: Nicht mehr benutzen, sondern bei der Behörde abgeben – er ist gesperrt.
eID-Funktion: Ist mit dem gesperrten Ausweis nicht mehr nutzbar; beim neuen Ausweis ggf. neu aktivieren lassen.
Gut zu wissen:
Die Bearbeitung dauert in der Regel einige Wochen. Wenn du schneller etwas brauchst, frag nach einem vorläufigen Personalausweis oder einer Express-Fertigung (beides kostet extra).
Beantragen kannst du seit der Reform des Personalausweisgesetzes grundsätzlich bei jeder Pass- und Ausweisbehörde in Deutschland – außerhalb deines Wohnorts fällt aber eine höhere Gebühr an.
Was es kostet
Die Gebühren sind in der Personalausweisverordnung (PAuswV) geregelt und richten sich u. a. nach Alter, Gültigkeitsdauer und ob es ein Express- oder vorläufiger Ausweis ist. Zuletzt bekannt waren rund 37 € für Erwachsene und 22,80 € für unter 24-Jährige – das ist aber ungeprüft und kann sich geändert haben.
Verbindlich findest du die aktuellen Beträge:
auf gesetze-im-internet.de (Personalausweisverordnung), oder
direkt bei deiner Stadt-/Gemeindeverwaltung, wo du auch den Termin buchst.
Soll ich eine Websuche nach den aktuellen Gebühren machen? Wenn du mir deine Stadt nennst, kann ich auch schauen, welche Behörde bei dir zuständig ist.
~~~~~~

### Answer D

~~~~~~markdown
Das Wichtigste in Kürze:
1. Online-Ausweisfunktion (eID) sperren
Sobald der Ausweis weg ist, lassen Sie die eID-Funktion rund um die Uhr über den Sperrnotruf 116 116 sperren amtsdeutschland.de. Das verhindert, dass jemand Ihre Online-Funktionen missbraucht.
2. Verlust beim Bürgeramt melden
Melden Sie den Verlust umgehend beim Bürgeramt Ihres Wohnorts und lassen Sie das Dokument als verloren registrieren buergerservice.info. Die Verlustanzeige selbst ist grundsätzlich kostenfrei allrecht.de.
3. Neuen Ausweis beantragen
Einen neuen Personalausweis müssen Sie beantragen, wenn Sie über 16 Jahre alt sind, kein anderes gültiges Passdokument (z. B. Reisepass) besitzen und in Deutschland gemeldet sind verwaltung.bund.de. Das geht über das Bundesportal oder direkt beim Amt verwaltung.bund.de.
Zu den Kosten eines neuen Ausweises:
Es fallen Gebühren für die Neuausstellung an allrecht.de, aber die genaue Höhe (bzw. ob ein Aufpreis wegen Verlust gilt) ist in den Suchergebnissen nicht angegeben. Die Gebühren hängen auch von der Bearbeitungsdauer und Ihrem Bundesland ab. Die aktuellen Sätze finden Sie auf der Seite Ihres Bürgeramts oder im Bundesportal verwaltung.bund.de.
Hinweis: Falls der Ausweis im Ausland verloren ging, gelten zum Teil andere Meldewege – dazu sagen die Quellen hier nichts Konkretes. Soll ich dazu noch einmal suchen?
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
Aufbewahrungsfristen für Privatpersonen
Kontoauszüge: Es gibt keine gesetzliche Pflicht für Privatpersonen. Empfohlen wird aber, sie mindestens 3 Jahre aufzubewahren, um Zahlungen (z. B. Miete, Versicherung, Versandhändler) im Streitfall nachweisen zu können sparkasse.de.
Ausnahmen laut Sparkasse:
Handwerker- und Dienstleistungsrechnungen, die ein Grundstück betreffen: mindestens 2 Jahre (gesetzliche Vorschrift) sparkasse.de. Ein weiterer Artikel nennt hier ebenfalls 2 Jahre und verweist auf § 14b ordnungsgenie.de.
Haushaltsnahe Dienstleistungen, die Sie von der Steuer absetzen (z. B. Gärtner, Reinigungskraft): Kontoauszüge bis zum Eingang des Steuerbescheids und Ablauf der Einspruchsfrist aufbewahren sparkasse.de.
Bei positiven Einkünften über 500.000 €/Jahr (z. B. aus Arbeit, Kapitalvermögen, Vermietung): 6 Jahre sparkasse.de.
Rechnungen: Hier kann sich die dreijährige Regelverjährungsfrist orientieren; die gesetzliche Frist beginnt grundsätzlich mit Ende des Kalenderjahres, in dem das Dokument ausgestellt wurde vr.de. Die Sparkasse nennt als Faustregel ebenfalls 3 Jahre für Kontoauszüge als Zahlungsnachweis sparkasse.de.
Hinweise:
Für Selbstständige gelten andere Regeln: Geschäftskonto-Auszüge müssen 10 Jahre aufbewahrt werden sparkasse.de; ein weiterer Artikel nennt für Unternehmen 8 Jahre bei Buchungsbelegen finom.co — die Quellen unterscheiden sich hier leicht, im Zweifel gilt für Sie das nur, wenn Sie selbstständig sind.
Elektronisch im Online-Banking Postfach abgelegte Auszüge können dort unbefristet abgerufen werden sparkasse.de.
Die Quellen sind Suchauszüge bzw. Ratgeberseiten, keine amtliche Rechtsberatung — im Zweifel lohnt ein Blick auf aktuelle Angaben des Finanzamts oder bei Ihrer Bank.
~~~~~~

### Answer B

~~~~~~markdown
Kurz gesagt: Für Privatpersonen gibt es keine allgemeine gesetzliche Aufbewahrungspflicht wie für Unternehmen und Selbstständige (deren Pflichten sich aus AO/HGB ergeben). Sie sollten Unterlagen aber trotzdem so lange aufheben, wie sie für Sie rechtlich oder steuerlich nützlich sein können.
Wovür Belege wichtig sind:
Verjährung / Beweislast: Ansprüche (z. B. Gewährleistung, Rückforderung) verjähren nach den Fristen im BGB – die regelmäßige Verjährungsfrist liegt, soweit ich weiß, bei drei Jahren, beginnend meist mit dem Jahresende (§§ 195, 199 BGB) – un geprüft. Solange eine Frist laufen kann, sollten Sie den Beleg behalten.
Gewährleistung bei Handwerkerleistungen: Rechnungen hierfür können wichtig sein, falls Mängel auftreten – Fristen können deutlich länger sein als die regelmäßige Verjährung.
Steuern: Auch ohne Aufbewahrungspflicht können Belege nötig sein, z. B. als Nachweis von Anschaffungskosten oder Werbungskosten. Bei Immobilien kann der Zeitraum bis zu einem möglichen steuerpflichtigen Verkauf relevant sein (§ 23 EStG nennt dort, soweit ich mich erinnere, eine zehnjährige Frist – un geprüft).
Erbschaftsfall: Belege über größere Vermögenswerte helfen den Erben.
Praktische Faustregel (unverbindlich):
Alltagsbelege (Einkäufe, normale Kontoauszüge): bis zum Ablauf möglicher Verjährungsfristen.
Größere Anschaffungen, Handwerkerrechnungen, Immobilien- und Kapitalanlagen-Unterlagen: deutlich länger aufheben, solange das Produkt/Investment relevant ist.
Wo Sie es verbindlich prüfen:
BGB (§§ 195 ff.): gesetze-im-internet.de (https://www.gesetze-im-internet.de) → „BGB"
EStG (§ 23) für Veräußerungsgeschäfte: gleiche Seite → „EStG"
Bei konkreten Steuerfragen: Ihr Finanzamt oder ein Steuerberater; für Verbraucherfragen auch die Verbraucherzentrale.
Fristen und Regeln können sich ändern – meine Angaben stammen aus Trainingsdaten ohne garantierten Endzeitpunkt. Soll ich eine Websuche nach den aktuellen Fristen durchführen?
~~~~~~

### Answer C

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

### Answer D

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
Beim Kauf eines neuen Fernsehers im Laden gilt regelmäßig eine gesetzliche Gewährleistung von 2 Jahren ab Ablieferung (also Übergabe/Zustellung des Geräts) – § 438 Abs. 1 Nr. 3, Abs. 2 BGB juraforum.de. Maßgeblich ist der Zeitpunkt der Übergabe, nicht das Rechnungsdatum oder die erste Inbetriebnahme juraforum.de.
Wichtig dazu:
Voraussetzung: Der Mangel muss rechtlich ein Sachmangel sein und grundsätzlich bereits bei Übergabe angelegt gewesen sein. Spätere Schäden durch Sturz, Feuchtigkeit, falsche Wandmontage, Überspannung oder unsachgemäße Reinigung fallen in der Regel nicht darunter juraforum.de.
Beweisvermutung: In den ersten 12 Monaten gilt bei Verbrauchsgüterkäufen die Vermutung des § 477 BGB, dass ein Mangel bereits bei Übergabe vorhanden war juraforum.de.
Anspruchsgegner ist der Verkäufer, nicht automatisch der Hersteller juraforum.de.
Gebrauchtgeräte vom Händler: grundsätzlich ebenfalls 2 Jahre, eine Verkürzung auf 1 Jahr ist unter bestimmten Voraussetzungen möglich juraforum.dechip.de.
Davon zu unterscheiden ist die freiwillige Herstellergarantie – die kann kürzer, länger oder anders ausgestaltet sein und ersetzt die gesetzlichen Mängelrechte nicht juraforum.de.
~~~~~~

### Answer B

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

### Answer C

~~~~~~markdown
Bei einem neuen Fernseher, den Sie im Laden (vom Händler) kaufen, gilt regelmäßig eine gesetzliche Mängelhaftung (Gewährleistung) von 2 Jahren ab Ablieferung – also ab Übergabe oder Zustellung, nicht ab Rechnungsdatum oder erster Inbetriebnahme (§ 438 Abs. 1 Nr. 3, Abs. 2 BGB) juraforum.de.
Wichtig dazu:
Kein Garantie-, sondern ein Gewährleistungsanspruch: Die gesetzlichen Rechte richten sich gegen den Verkäufer, nicht gegen den Hersteller juraforum.de.
Voraussetzung: Der Mangel muss rechtlich ein Sachmangel sein und grundsätzlich bereits bei Übergabe angelegt gewesen sein. Spätere Schäden durch Sturz, Feuchtigkeit, falsche Montage oder Überspannung fallen in der Regel nicht darunter juraforum.de.
Beweislast: In den ersten 12 Monaten gilt bei Verbrauchsgüterkäufen die Vermutung, dass ein Mangel schon bei Übergabe vorhanden war (§ 477 BGB) juraforum.de.
Herstellergarantie ist zusätzlich und freiwillig; ihre Dauer und Bedingungen stehen in den Garantiebedingungen (§ 443 BGB). Sie ersetzt die gesetzlichen Rechte nicht – diese bleiben nebenbei bestehen juraforum.de.
Nützliche Unterlagen: Rechnung/Kaufbeleg, Lieferschein, Seriennummer, Fotos und Fehlerbeschreibung juraforum.de.
Hinweis: Die Quellen sind Suchauszüge bzw. eine nur teilweise geladene Seite; für Ihren konkreten Fall (z. B. Sonderaktionen, Gebrauchtkauf oder Garantiebedingungen Ihres Herstellers) lohnt ein Blick in die Originalquellen oder eine Rechtsberatung.
~~~~~~

### Answer D

~~~~~~markdown
Kurz zur Einordnung – das ist eine Rechtsfrage, und ich kann Fristen nicht als gesichert nennen, solange kein offizieller Text vorliegt. Die Grundsätze sind aber diese:
Beginn: Die gesetzliche Gewährleistung beginnt mit der Übergabe der Ware (nicht mit dem Kaufdatum oder der Herstellung).
Dauer bei neuen Sachen: Üblicherweise gelten zwei Jahre ab Übergabe – diese Angabe ist von mir ungeprüft. Die maßgebliche Regel steht in § 438 BGB (Verjährung der Mängelansprüche), einsehbar auf gesetze-im-internet.de.
Wobei: Sie deckt nur Mängel ab, die bereits bei Übergabe vorhanden waren (auch wenn sie erst später auffallen). Innerhalb des ersten Jahres besteht typischerweise eine Vermutung dafür, dass der Mangel schon bei Übergabe vorlag – auch das bitte im BGB nachprüfen.
Abgrenzung: Die gesetzliche Gewährleistung gilt gegenüber dem Verkäufer (Händler) und ist nicht identisch mit einer freiwilligen Herstellergarantie, die eigene (teils längere) Bedingungen haben kann.
Soll ich eine Websuche durchführen, um die aktuelle Frist und die Beweislast-Regelung zu verifizieren?
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

### Answer B

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

### Answer C

~~~~~~markdown
In Deutschland gibt es kein festes Datum und keine generelle Winterreifenpflicht – es gilt eine situative Pflicht adac.dendr.de:
Bei winterlichen Straßenverhältnissen (Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte) darf nur mit Winterreifen gefahren werden adac.dedieversicherer.de.
Die bekannte Faustregel „von O bis O" (Oktober bis Ostern) ist nur ein grober Hinweis und hat rechtlich keine Bedeutung adac.deautobild.de. Es gibt auch keine Mindesttemperatur, ab der die Pflicht greift dieversicherer.de.
Wichtig zu wissen:
Die Pflicht gilt nur, wenn alle vier Räder mit Winterreifen ausgestattet sind adac.de.
Reifen brauchen das Alpine-Symbol (Bergpiktogramm mit Schneeflocke); reine M+S-Reifen sind bei winterlichen Verhältnissen nicht mehr zugelassen adac.de. Ganzjahresreifen gelten rechtlich als Winterreifen, wenn sie das Alpine-Symbol haben adac.de.
Mindestprofiltiefe: 1,6 mm gesetzlich, der ADAC empfiehlt mindestens 4 mm und Wechsel nach spätestens 6 Jahren adac.de.
Bei Verstoß drohen 60 € Bußgeld (80 €, wenn andere behindert werden) plus 1 Punkt in Flensburg; dem Halter drohen 75 € und ebenfalls ein Punkt adac.de.
Ausnahmen gelten z. B. für Motorräder sowie Land- und Forstwirtschaftsfahrzeuge (dann mit Sonderregeln wie max. 50 km/h) adac.de.
Praktisch: Da winterliche Verhältnisse plötzlich auftreten können, lohnt es sich, bereits im Oktober auf Winterreifen zu wechseln – nicht erst beim ersten Schnee.
~~~~~~

### Answer D

~~~~~~markdown
In Deutschland gibt es kein festes gesetzliches Datum für den Wechsel auf Winterreifen. Es gilt die situative Winterreifenpflicht (§ 2 Abs. 3a StVO):
Pflicht besteht immer dann, wenn winterliche Straßenverhältnisse herrschen – also Schnee, Schneematsch, Eis oder Reif-/Glatteis.
Wer bei solchen Bedingungen mit Sommerreifen fährt, riskiert Bußgeld und Nachteile bei Haftung und Versicherung. Konkrete Beträge und Punkte nenne ich nicht als gesicherte Zahlen – bitte beim zuständigen Verkehrsministerium oder ADAC aktuell prüfen.
Faustregel: Umgangssprachlich heißt es „von O bis O" (Oktober bis Ostern). Das ist eine Empfehlung, keine gesetzliche Vorgabe – maßgeblich ist allein das tatsächliche Wetter.
Wichtig zur Kennzeichnung: Als Winterreifen gelten nur Reifen mit dem Alpin-Symbol (Berg mit Schneeflocke, „3PMSF"). Eine reine „M+S"-Kennzeichnung genügt bei neueren Reifen nicht mehr; Übergangsfristen für Altreifen sind nach meinem Kenntnisstand abgelaufen – das solltest du aber aktuell prüfen, da sich Regeln ändern können.
Offizielle Quelle: § 2 Abs. 3a StVO auf gesetze-im-internet.de.
Mein Wissen stammt aus Trainingsdaten ohne verlässliches Enddatum und kann veraltet sein. Soll ich eine Websuche machen, um die aktuell gültigen Regeln zu bestätigen?
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
Innerorts 21–25 km/h zu schnell (Pkw) kostet laut ADAC-Tabelle 115 € Bußgeld und 1 Punkt in Flensburg – kein Fahrverbot bei diesem ersten Verstoß adac.de. Dazu kommen Verwaltungsgebühren von 28,50 €, sobald es ein Bußgeld ab 60 € ist, also insgesamt rund 143,50 € adac.de.
Ein Fahrverbot droht innerorts erst ab 31 km/h zu schnell, oder wenn Sie binnen eines Jahres zweimal um mehr als 25 km/h zu schnell geblitzt werden adac.de.
~~~~~~

### Answer B

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

### Answer C

~~~~~~markdown
Kurz gesagt: Die genaue Summe steht im Bußgeldbescheid und richtet sich nach dem Bußgeldkatalog (Bußgeldkatalog-Verordnung, BKatV) – ohne aktuelle amtliche Quelle kann ich verlässliche Zahlen nicht garantieren.
Worauf es ankommt:
Toleranzabzug: Vom Messwert wird ein Messfehler abgezogen (unter 100 km/h meist einige km/h, darüber ein kleiner Prozentsatz). Aus „25 zu schnell" kann nach dem Abzug eine niedrigere Stufe bleiben – die Stufe bestimmt Bußgeld, Punkte und ggf. Fahrverbot.
Innerorts zählt strenger als außerorts.
Punkte/Fahrverbot: Ab bestimmten Stufen gibt es einen Punkt im Fahreignungsregister (KBA) und „in der Regel" ein Fahrverbot; ob und wie es verhängt wird, hängt von der Stufe und den Umständen ab (z. B. Vorbelastungen, Augenblicksversagen).
Probezeit: Dort kann eine solche Zuwiderhandlung zusätzlich Aufbauseminar und Verlängerung der Probezeit auslösen.
Ungeprüfte Größenordnung (aus meinem Trainingswissen, kann veraltet sein): Innerorts 21–25 km/h netto wird üblicherweise mit einem Bußgeld im niedrigen dreistelligen Bereich, einem Punkt und oft einem einmonatigen Fahrverbot geahndet – bitte nicht als verlässlich ansehen.
Offiziell prüfen:
Bußgeldkatalog: Anlage zur BKatV auf gesetze-im-internet.de
Zuständig ist die Bußgeldstelle der Stadt/des Landkreises, die den Bescheid erlässt; dort kannst du auch nachfragen.
Einspruch ist nur innerhalb der im Bescheid genannten Frist möglich.
Soll ich eine aktuelle Websuche zu den heutigen Bußgeldsätzen durchführen?
~~~~~~

### Answer D

~~~~~~markdown
Innerorts 21–25 km/h zu schnell (Pkw) drohen laut ADAC:
Bußgeld: 115 € adac.de
1 Punkt in Flensburg adac.de
Zusätzlich 28,50 € Verwaltungsgebühren, da ab 60 € Bußgeld das formelle Bußgeldverfahren durchlaufen wird – insgesamt also 143,50 € adac.de
Ein Fahrverbot droht in dieser Stufe noch nicht; das kommt innerorts erst ab 31 km/h – oder, wenn Sie binnen eines Jahres ein zweites Mal mit mehr als 25 km/h erwischt werden adac.de.
Hinweis: Eine andere Quelle (bussgeldkatalog.net) nennt für exakt 25 km/h innerorts 80 € und einen Punkt bussgeldkatalog.net; die Angaben in Suchauszügen sind aber nur Teilzitate. Die vollständige ADAC-Tabelle (115 € für 21–25 km/h innerorts) ist die belastbarere Grundlage – im Zweifel lohnt ein Blick in den konkreten Bußgeldbescheid.
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

### Answer B

~~~~~~markdown
Frist zur Zustimmung
Nach der Rechtsprechung haben Mieter in der Regel etwa drei Monate ab Zugang des Erhöhungsverlangens Zeit, zuzustimmen. Die Suchergebnisse bestätigen hierzu nur, dass Mieter „bis zu zwölf Wochen Zeit" haben können und dass bei verspäteter Zustimmung entgangene Zahlungen als Verzugsschaden ersetzt werden müssen test.de. Die genaue Frist hängt vom Einzelfall ab – im Zweifel prüfen lassen.
Wichtig: Einfach weiter die bisherige (zu niedrige) Miete zahlen reicht nicht, wenn man nicht rechtzeitig reagiert test.de.
Wie oft darf der Vermieter erhöhen?
Aus § 558 BGB ergibt sich:
Jahressperrfrist: Das Erhöhungsverlangen kann frühestens ein Jahr nach der letzten Mieterhöhung geltend gemacht werden gesetze-im-internet.de. Erhöhungen nach §§ 559–560 BGB (Modernisierung, Betriebskosten-Anpassung) zählen dabei nicht mit gesetze-im-internet.dejuraforum.de.
15-Monate-Frist: Die Miete muss in dem Zeitpunkt, zu dem die Erhöhung eintreten soll, seit 15 Monaten unverändert sein gesetze-im-internet.de. Die 15 Monate beziehen sich auf den Zeitpunkt, zu dem die höhere Miete geschuldet wird; die zwölf Monate auf den Zeitpunkt, zu dem das Verlangen erklärt wird bundesverbraucherhilfe.de.
Grenze der Erhöhung (Kappungsgrenze)
Innerhalb von drei Jahren darf die Miete um maximal 20 % steigen (Kappungsgrenze) gesetze-im-internet.desparkasse.de.
In Gebieten, in denen die Versorgung mit Mietwohnungen besonders gefährdet ist (per Landesverordnung bestimmt), liegt die Grenze bei 15 % gesetze-im-internet.de.
Die Kappungsgrenze gilt nicht in Sonderfällen nach § 558 Abs. 4 (z. B. Wegfall öffentlicher Bindung mit Ausgleichszahlung) gesetze-im-internet.de.
Kurz zusammengefasst
Er darf frühestens nach einem Jahr ein neues Verlangen stellen, die erhöhte Miete darf frühestens nach 15 unveränderten Monaten fällig werden, und innerhalb von drei Jahren sind max. 20 % (bzw. 15 % in bestimmten Gebieten) drin.
Hinweis: Prüfen Sie, ob das Verlangen die geforderte Begründung (z. B. Mietspiegel) enthält – das steht so in den Auszügen nicht drin, wäre aber der nächste Prüfschritt. Bei Unsicherheit können Mieterverein oder eine Mieterberatung helfen.
~~~~~~

### Answer C

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

### Answer D

~~~~~~markdown
Kurzantwort (bitte Fristen im Gesetz selbst nachprüfen)
Zustimmungsfrist: Sie müssen nicht sofort reagieren. Nach dem Erhöhungsverlangen läuft eine Frist, bis zu deren Ende (meist: Ende des zweiten Kalendermonats nach Zugang des Verlangens) Sie zustimmen müssen – dies ist eine ungeprüfte Angabe, die genaue Regel steht in § 558b BGB. Stimmen Sie nicht zu, muss der Vermieter innerhalb einer Klagefrist (drei Monate, ungeprüft, § 561 BGB) Klage auf Ihre Zustimmung erheben. Erst mit Ihrer Zustimmung oder einem rechtskräftigen Urteil darf er die höhere Miete verlangen – bis dahin zahlen Sie weiter die alte Miete.
Häufigkeit: Zwischen zwei Erhöhungen muss die Miete eine Mindestzeit unverändert geblieben sein (derzeit 15 Monate, ungeprüft, § 558 Abs. 3 BGB). Zusätzlich gilt eine Kappungsgrenze: Innerhalb von drei Jahren darf die Miete nur um einen begrenzten Prozentsatz steigen (Grundregel 15 %; in vom Bundesland per Rechtsverordnung festgelegten „angespannten Wohnungsmärkten" bis 20 %, § 560d BGB – ungeprüft).
Voraussetzungen für ein wirksames Verlangen
Muss in Textform gestellt werden und die konkrete neue Miete benennen
Muss begründet sein, z. B. durch Verweis auf den Mietspiegel, drei Vergleichswohnungen oder eine Mietdatenbank – ohne Begründung ist es in der Regel unwirksam
Die geforderte Miete darf die ortsübliche Vergleichsmiete nicht überschreiten
Was Sie prüfen sollten
Ist die Begründung schlüssig (z. B. Mietspiegel richtig angewendet, Ihre Wohnung korrekt eingestuft)?
Ist die Kappungsgrenze eingehalten? War die letzte Erhöhung lange genug her?
Liegt die geforderte Miete wirklich nur auf der Vergleichsmiete?
Ein Mieterverein oder ein Anwalt für Mietrecht kann das Verlangen günstig prüfen – das lohnt sich fast immer, bevor Sie zustimmen. Widersprechen Sie schriftlich und begründet innerhalb der Frist.
Offizielle Quelle
Alle Details stehen in den §§ 558–561 BGB auf gesetze-im-internet.de. Meine Angaben stammen aus Trainingsdaten mit unveröffentlichtem Enddatum und können veraltet sein – insbesondere die 20-%-Regelung hängt von aktuellen Landesverordnungen ab. Soll ich eine Websuche zu den aktuellen Fristen und zur Kappungsgrenze in Ihrem Bundesland durchführen?
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
Checkliste: Behördengänge nach dem Umzug
1. Wohnsitz ummelden (wichtigste Pflicht)
Frist: 14 Tage nach Einzug – laut § 17 Bundesmeldegesetz wegenerumzuege.dehausmann-umzug.de
Beim Bürgeramt/Einwohnermeldeamt deiner neuen Stadt oder Gemeinde wegenerumzuege.de
Mitbringen: Personalausweis/Reisepass, Wohnungsgeberbestätigung des Vermieters (zwingend erforderlich) wegenerumzuege.de
Tipp: rechtzeitig einen Termin vereinbaren wegenerumzuege.de
Die Adressänderung im Personalausweis (neuer Aufkleber auf der Rückseite) erfolgt meist im selben Termin wegenerumzuege.de
Nach der Ummeldung erhältst du eine Meldebescheinigung – brauchst du z. B. für Bankkonto, Anbieterwechsel oder Fahrzeuganmeldung wegenerumzuege.de
2. Kfz ummelden
Frist: meist vier Wochen wegenerumzuege.de
Unterlagen: Personalausweis, Zulassungsbescheinigung Teil II (Fahrzeugbrief), Teil I (Fahrzeugschein), eVB-Nummer der Versicherung, TÜV-Nachweis, Meldebescheinigung wegenerumzuege.de
Kennzeichen kannst du bei einem Umzug innerhalb Deutschlands oft behalten; die Adresse muss trotzdem in den Papieren geändert werden – auch für die Kfz-Steuer relevant wegenerumzuege.de
3. Weitere Behörden informieren
Finanzamt, Krankenkasse, Rentenversicherung, Arbeitsagentur/Jobcenter, Familienkasse, BAföG-Amt, Versorgungsämter wegenerumzuege.de
4. Private Stellen
Arbeitgeber, Versicherungen, Banken, Mobilfunk, Strom-/Internetanbieter, Streamingdienste, Vereine, Abos wegenerumzuege.de
5. Sonstiges
GEZ/Rundfunkbeitrag: Adresse ändern wegenerumzuege.de
ggf. Nachsendeauftrag bei der Post wegenerumzuege.de
Hund ummelden (bei Halterwechsel) wegenerumzuege.de
Kinder bei Schule/Kindergarten anmelden wegenerumzuege.de
Empfehlung: Behördliche Ummeldungen idealerweise in den ersten 7–14 Tagen nach dem Einzug erledigen; vieles lässt sich auch schon vor dem Umzugstermin vorbereiten wegenerumzuege.de.
Hinweis zu Fristen: Die 14-Tage-Frist für die Wohnsitzanmeldung steht so in den Quellen (§ 17 BMG) wegenerumzuege.dehausmann-umzug.de. Zu Bußgeldern bei Versäumnis heißt es nur allgemein, dass ein Versäumnis mit Bußgeldern geahndet werden kann wegenerumzuege.de – konkrete Höhen nennt keine der Quellen. Für verbindliche Fristen und Gebühren deiner neuen Gemeinde solltest du die dortige Meldebehörde bzw. deren Website prüfen.
~~~~~~

### Answer B

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

### Answer C

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

### Answer D

~~~~~~markdown
Kurz vorab: Konkrete Fristen und Gebühren können sich ändern – ich gebe sie nur unverbindlich wieder. Verlässliche Quellen sind das Bundesmeldegesetz auf gesetze-im-internet.de (https://www.gesetze-im-internet.de) und deine Bürgerämter. Mein Wissensstand kann veraltet sein; am Ende biete ich dir eine Websuche an.
Vor dem Umzug
 Termin beim Bürgeramt der neuen Gemeinde buchen (Termine oft knapp – früh buchen, mancherorts online möglich)
 Wohnungsgeberbestätigung vom Vermieter besorgen (muss kostenlos ausgestellt werden)
 Nachsendeauftrag bei der Deutschen Post einrichten (kostenpflichtig, online möglich)
 Falls du Bürgergeld beziehst: Umzug braucht in der Regel vorher die Zustimmung des Jobcenters (Ausnahme z. B. innerhalb desselben Gemeindegebiets) – Details im SGB II, § 22, auf gesetze-im-internet.de
 Verträge prüfen (Strom, Gas, Internet): Kündigungsfristen stehen im Vertrag, nicht im Gesetz
Nach dem Einzug – die wichtigsten Behördengänge
 Wohnsitz an-/ummelden beim Einwohnermeldeamt/Bürgeramt. Nötig: Personalausweis oder Reisepass + Wohnungsgeberbestätigung. Frist laut Bundesmeldegesetz: zwei Wochen nach Einzug (unverbindlich – bitte in § 17 BMG nachschlagen). Verspätung kann als Ordnungswidrigkeit mit Bußgeld geahndet werden.
Innerhalb Deutschlands ist keine separate Abmeldung nötig (außer du gibst z. B. einen Zweitwohnsitz auf). Auch bei Umzug innerhalb derselben Stadt: ummelden.
Personalausweis/Reisepass brauchen keine neue Adresse (steht nicht drauf).
 Kfz ummelden (Zulassungsstelle): Adresse in der Zulassungsbescheinigung aktualisieren; das Kennzeichen darf in der Regel behalten werden. Frist: baldmöglich – verbindliche Angabe bei der Zulassungsstelle erfragen. Führerschein: meist keine Änderung nötig.
 Rundfunkbeitrag: neue Adresse dem Beitragsservice melden (online möglich)
 Krankenkasse und ggf. Rentenversicherung neue Adresse mitteilen
 Familienkasse (Kindergeld) und ggf. Elterngeldstelle informieren
 Falls du Leistungen beziehst (Jobcenter, Agentur für Arbeit, Sozialamt): sofort melden
 Hundesteuer: in alter und neuer Gemeinde ab-/anmelden
 Falls selbstständig/gewerblich: Finanzamt informieren bzw. Gewerbe ummelden
Sonstiges (keine Behörde, aber wichtig)
 Arbeitgeber, Bank, Versicherungen, Abos informieren
 Kita/Schule ab- und anmelden
Kurz gesagt: Die einzige harte gesetzliche Frist ist die Anmeldung (zwei Wochen, unverbindlich) – alles andere ist „baldmöglich" oder vertraglich geregelt.
Soll ich per Websuche die aktuellen Fristen und Gebühren für deine Stadt heraussuchen? Dann nenne mir die Stadt bzw. den neuen Wohnort.
~~~~~~
