# privatemode-glm-low (rerun of unseen-v3, 12 November 2026): glm-5.3, retry 1, 3 repetition(s), set unseen-v3

Requests 410, input tokens 487701, output tokens 89186, cost USD 0.0000

**All cases**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| repetition 1 | 30 | 17 (56.7 %; 39.2-72.6 %) | 4 | 3 | 5 (7.3-33.6 %) | 1 |
| repetition 2 | 30 | 18 (60.0 %; 42.3-75.4 %) | 6 | 5 | 1 (0.6-16.7 %) | 0 |
| repetition 3 | 30 | 15 (50.0 %; 33.2-66.8 %) | 2 | 5 | 8 (14.2-44.4 %) | 0 |
| pooled | 90 | 50 (55.6 %; 45.3-65.4 %) | 12 | 13 | 14 (9.5-24.4 %) | 1 |

**Critical cases (reported separately; any silent wrong or no-answer is a fail)**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| repetition 1 | 16 | 7 (43.8 %; 23.1-66.8 %) | 4 | 1 | 4 (10.2-49.5 %) | 0 |
| repetition 2 | 16 | 9 (56.3 %; 33.2-76.9 %) | 4 | 2 | 1 (1.1-28.3 %) | 0 |
| repetition 3 | 16 | 8 (50.0 %; 28.0-72.0 %) | 1 | 1 | 6 (18.5-61.4 %) | 0 |
| pooled | 48 | 24 (50.0 %; 36.4-63.6 %) | 9 | 4 | 11 (13.3-36.5 %) | 0 |
**Per kind (pooled over repetitions)**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| compound-interest | 6 | 0 (0.0 %; 0.0-39.0 %) | 1 | 3 | 1 (3.0-56.4 %) | 1 |
| date-time | 12 | 11 (91.7 %; 64.6-98.5 %) | 1 | 0 | 0 (0.0-24.2 %) | 0 |
| instalments-simple-interest | 6 | 4 (66.7 %; 30.0-90.3 %) | 0 | 1 | 1 (3.0-56.4 %) | 0 |
| multi-step | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| net-gross | 6 | 3 (50.0 %; 18.8-81.2 %) | 1 | 1 | 1 (3.0-56.4 %) | 0 |
| overtime-rate | 9 | 1 (11.1 %; 2.0-43.5 %) | 2 | 6 | 0 (-0.0-29.9 %) | 0 |
| percent-change | 12 | 10 (83.3 %; 55.2-95.3 %) | 1 | 1 | 0 (0.0-24.2 %) | 0 |
| proration | 6 | 4 (66.7 %; 30.0-90.3 %) | 1 | 1 | 0 (0.0-39.0 %) | 0 |
| skonto | 3 | 2 (66.7 %; 20.8-93.9 %) | 0 | 0 | 1 (6.1-79.2 %) | 0 |
| surcharge | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| swiss-vat | 6 | 0 (0.0 %; 0.0-39.0 %) | 4 | 0 | 2 (9.7-70.0 %) | 0 |
| table-sum | 6 | 1 (16.7 %; 3.0-56.4 %) | 1 | 0 | 4 (30.0-90.3 %) | 0 |
| vat | 6 | 2 (33.3 %; 9.7-70.0 %) | 0 | 0 | 4 (30.0-90.3 %) | 0 |


**Measures against the bar (THRESHOLD-v3.md, C1)**

| Measure | Bar | Result | Met |
| --- | --- | --- | --- |
| Silent wrong | 0 of 90 | 14 of 90 | NO |
| Verified by recomputation | at least 60 of 90 | 50 of 90 | NO |
| Flagged (false flag plus wrong, flagged) | at most 27 of 90 | 25 of 90 | yes |
| No answer | at most 9 of 90 | 1 of 90 | yes |
| Critical cases: silent wrong or no-answer | none of 48 | 11 silent wrong, 0 no answer of 48 | NO |

**Verdict: FAIL (silent wrong or critical case fail)**

**Wrong-flagged, silent-wrong and no-answer conversations**

- unseen3-01 r1: wrong-silent (critical)
  - turn 1: answer "**Umsatzsteuer: 1219,80 EUR** (recomputed and matches) **Brutto: 7639,80 EUR** (recomputed and matches) Method (from the model): Die Umsatzsteuer wird als Prozentsatz des Nettobetrags berechnet und zum Bruttobetrag addiert. Figures marked "recomputed and matches" were computed by this software from "; attempts: EMPTY
  - turn 2: answer "**Umsatzsteuer Bücheranteil: 84,00 EUR** (recomputed and matches) Method (from the model): Steuer als Prozentsatz des Bücher-Nettobetrags, dann Netto plus Steuer für den Bruttobetrag. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message"
- unseen3-02 r1: wrong-flagged (critical)
  - turn 1: answer "**Netto: 33,95 EUR** (not cross-checked) **Umsatzsteuer: 2,56 EUR** (not cross-checked) Method (from the model): Bruttobetrag um die Umsatzsteuer von 7 Prozent reduzieren ergibt das Netto; die Differenz ist die Steuer; beide auf Cent gerundet. **Please check:** two independent readings of this quest"; flags: two independent readings of this question gave different figures for Netto, Umsatzsteuer; the first reading's figure is shown and is not cross-checked; attempts: FORWARD_REFERENCE
  - turn 2: answer "**Netto: 200,00 EUR** (recomputed and matches) **Umsatzsteuer: 14,00 EUR** (recomputed and matches) Method (from the model): Bruttobetrag durch den um die Umsatzsteuer erhöhten Faktor teilen ergibt das Netto; die Differenz zum Bruttobetrag ist die Steuer; beide auf Cent gerundet. Figures marked "rec"; attempts: FORWARD_REFERENCE, FORWARD_REFERENCE
- unseen3-08 r1: wrong-silent
  - turn 1: answer "**Zinsen: 875,00 EUR** (recomputed and matches) **Rückzahlungsbetrag: 15.875,00 EUR** (recomputed and matches) Method (from the model): Jahreszinsen über percent_of berechnen, mit der Laufzeit in Monaten geteilt durch zwölf auf die Laufzeit umrechnen, dann zum Darlehen addieren. Figures marked "reco"
  - turn 2: answer "**Zinsen: 1312,50 EUR** (recomputed and matches) Method (from the model): Jahreszinsen berechnen, auf die Laufzeit in Monaten umrechnen und zum Darlehen addieren. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message that agree; a figure"
- unseen3-09 r1: no-answer
  - turn 1: answer "**Endbetrag: 3714,77 EUR** (recomputed and matches) Method (from the model): Zinssatz als Wachumsfaktor, vier Jahre lang potenziert, mit dem Kapital multipliziert und auf Cent gerundet. Figures marked "recomputed and matches" were computed by this software from two independent readings of your messa"; attempts: FORWARD_REFERENCE
  - turn 2: answer ""; attempts: EVALUATION, EVALUATION
- unseen3-10 r1: wrong-silent (critical)
  - turn 1: answer "**Summe: 1965,75 EUR** (recomputed and matches) **Anteil Zeile 2 in Prozent: 53,2 %** (recomputed and matches) Method (from the model): Alle vier Zeilenbeträge werden addiert. Danach wird Zeile 2 durch die Summe geteilt und in Prozent ausgedrückt, auf eine Nachkommastelle kaufmännisch gerundet. Figu"
  - turn 2: answer "**Summe: 1515,75 EUR** (recomputed and matches) Method (from the model): Zeile 4 wird mit dem korrigierten Betrag verwendet. Summe aller vier Zeilen; dann Zeile 2 durch die Summe geteilt und in Prozent mit einer Nachkommastelle gerundet. Figures marked "recomputed and matches" were computed by this "
- unseen3-16 r1: wrong-silent (critical)
  - turn 1: answer "**VAT (19 %): 731.50 EUR** (recomputed and matches) **Total (gross): 4581.50 EUR** (recomputed and matches) Method (from the model): VAT is 19 percent of the net amount; total is net plus VAT. Figures marked "recomputed and matches" were computed by this software from two independent readings of you"
  - turn 2: answer "**VAT (7 %): 269.50 EUR** (recomputed and matches) Method (from the model): VAT is 7 percent of the net amount; total is net plus VAT. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message that agree; a figure marked "not cross-checked" "; attempts: CANNOT_ANSWER
- unseen3-23 r1: wrong-flagged
  - turn 1: answer "**Gross pay: 1053.50 EUR** (recomputed and matches) Method (from the model): Regular hours paid at the hourly rate, overtime hours paid at the stated percentage of the hourly rate, then both parts summed. Figures marked "recomputed and matches" were computed by this software from two independent rea"; attempts: FORWARD_REFERENCE
  - turn 2: answer "**Gross pay: 913.75 EUR** (not cross-checked) Method (from the model): Regular hours paid at the hourly rate, overtime hours paid at the stated percentage of the hourly rate, then both parts summed. **Please check:** two independent readings of this question gave different figures for Gross pay; the"; flags: two independent readings of this question gave different figures for Gross pay; the first reading's figure is shown and is not cross-checked | method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier); attempts: FORWARD_REFERENCE
- unseen3-25 r1: wrong-flagged
  - turn 1: answer "**Final amount: 7247.16 EUR** (not cross-checked) Method (from the model): Compound interest: annual growth factor is one plus the rate, raised to the number of years, then multiplied by the principal and rounded to the cent. **Please check:** two independent readings of this question gave different"; flags: two independent readings of this question gave different figures for Final amount; the first reading's figure is shown and is not cross-checked
  - turn 2: answer "**Final amount: 44,129,449.00 EUR** (not cross-checked) Method (from the model): Compound interest: annual growth factor is one plus the rate, raised to two years, multiplied by the principal, rounded to the cent. **Please check:** two independent readings of this question gave different figures for"; flags: two independent readings of this question gave different figures for Final amount; the first reading's figure is shown and is not cross-checked
- unseen3-26 r1: wrong-silent (critical)
  - turn 1: answer "**Gesamt: 79.00 EUR** (recomputed and matches) **Durchschnitt: 15.80 EUR** (recomputed and matches) Method (from the model): Summiere alle Belege und runde auf den Cent; teile die Summe durch die Anzahl Belege und runde ebenfalls auf den Cent. Figures marked "recomputed and matches" were computed by"
  - turn 2: answer "**Gesamtsumme: 48.00 EUR** (recomputed and matches) Method (from the model): Summiere die vier verbleibenden Belege und runde auf den Cent; dividiere die Summe durch die Anzahl Belege und runde ebenfalls auf den Cent. Figures marked "recomputed and matches" were computed by this software from two in"; attempts: FORWARD_REFERENCE
- unseen3-04 r2: wrong-flagged
  - turn 1: answer "**Prozentuale Veränderung: 0,0 %** (not cross-checked) Method (from the model): Relative Änderung als Differenz der Erhöhung zum Ausgangsbetrag, in Prozent ausgedrückt und auf eine Nachkommastelle gerundet. **Please check:** two independent readings of this question gave different figures for Prozen"; flags: two independent readings of this question gave different figures for Prozentuale Veränderung; the first reading's figure is shown and is not cross-checked | method mismatch for "Prozentuale Veränderung": a percentage change is (new - old) / old x 100; this program divides without subtracting (rule: percent change)
  - turn 2: answer "**Änderung in Prozent: -5,0 %** (recomputed and matches) Method (from the model): Differenz aus neuem und altem Betrag, dividiert durch den alten Betrag, in Prozent ausgedrückt und auf eine Nachkommastelle gerundet. Figures marked "recomputed and matches" were computed by this software from two inde"; attempts: EMPTY
- unseen3-05 r2: wrong-flagged (critical)
  - turn 1: answer "**Lohn für Sonntagsstunden: 157,50 EUR** (recomputed and matches) Method (from the model): Stundensatz mit dem Sonntagszuschlag multiplizieren und das Ergebnis mit der Anzahl Stunden multiplizieren. Figures marked "recomputed and matches" were computed by this software from two independent readings "
  - turn 2: answer "**Lohn für Feiertagsstunden: 315,00 EUR** (not cross-checked) Method (from the model): Der Stundensatz wird um zweihundert Prozent erhöht und mit der Anzahl Feiertagsstunden multipliziert. **Please check:** two independent readings of this question gave different figures for Lohn für Feiertagsstunde"; flags: two independent readings of this question gave different figures for Lohn für Feiertagsstunden; the first reading's figure is shown and is not cross-checked | method mismatch: "200 % of the rate" means the rate multiplied by 200 % (percent_of); this program adds or deducts 200 % instead (rule: rate multiplier)
- unseen3-20 r2: wrong-flagged (critical)
  - turn 1: answer "**Nachtshift Vergütung: 260.00 EUR** (recomputed and matches) Method (from the model): Zuerst den Nachtarbeitslohn als Prozentsatz des Grundlohns berechnen, dann mit der Anzahl der Nachtstunden multiplizieren. Figures marked "recomputed and matches" were computed by this software from two independen"
  - turn 2: answer "**Bezahlung für 8 Nachtstunden bei 175 %: 572.00 EUR** (not cross-checked) Method (from the model): Zuerst den Nachtarbeitslohn als Prozentsatz des Grundlohns berechnen (175 % von 26.00 EUR), dann mit der Anzahl der Nachtstunden multiplizieren. **Please check:** two independent readings of this ques"; flags: two independent readings of this question gave different figures for Bezahlung für 8 Nachtstunden bei 175 %; the first reading's figure is shown and is not cross-checked | method mismatch: "175 % of the rate" means the rate multiplied by 175 % (percent_of); this program adds or deducts 175 % instead (rule: rate multiplier)
- unseen3-23 r2: wrong-flagged
  - turn 1: answer "**Gross pay: 1182.50 EUR** (not cross-checked) Method (from the model): Overtime hours are hours beyond the regular threshold, paid at the given percentage of the hourly rate; regular hours at the normal rate plus overtime pay gives gross pay. **Please check:** two independent readings of this quest"; flags: two independent readings of this question gave different figures for Gross pay; the first reading's figure is shown and is not cross-checked | method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier); attempts: FORWARD_REFERENCE
  - turn 2: answer "**Gross pay: 892.25 EUR** (recomputed and matches) Method (from the model): Regular hours up to the threshold are paid at the normal hourly rate; the one hour beyond it is paid at the stated percentage of that rate; the two amounts add up to gross pay. Figures marked "recomputed and matches" were co"
- unseen3-25 r2: wrong-flagged
  - turn 1: answer "**Final amount: 7247.16 EUR** (not cross-checked) Method (from the model): Compound interest: principal times one plus the annual rate, raised to the number of years, then rounded to the cent. **Please check:** two independent readings of this question gave different figures for Final amount; the fi"; flags: two independent readings of this question gave different figures for Final amount; the first reading's figure is shown and is not cross-checked
  - turn 2: answer "**Final amount: 44,129,449.00 EUR** (not cross-checked) Method (from the model): Compound interest: principal multiplied by one plus the annual rate, raised to the number of years, then rounded to the cent. **Please check:** two independent readings of this question gave different figures for Final "; flags: two independent readings of this question gave different figures for Final amount; the first reading's figure is shown and is not cross-checked
- unseen3-26 r2: wrong-silent (critical)
  - turn 1: answer "**Total: 79.00 EUR** (recomputed and matches) **Average: 15.80 EUR** (recomputed and matches) Method (from the model): Sum all five receipts, then divide by the number of receipts; both rounded to the cent with commercial rounding. Figures marked "recomputed and matches" were computed by this softwa"
  - turn 2: answer "**Total: 48.00 EUR** (recomputed and matches) Method (from the model): Sum the four remaining receipts and divide by their count; both rounded to the cent with commercial rounding. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message th"
- unseen3-01 r3: wrong-silent (critical)
  - turn 1: answer "**Umsatzsteuer: 1219,80 EUR** (recomputed and matches) **Brutto: 7639,80 EUR** (recomputed and matches) Method (from the model): Die Umsatzsteuer wird als Prozentsatz des Netto­betrags berechnet und zum Bruttobetrag addiert. Figures marked "recomputed and matches" were computed by this software from"; attempts: EMPTY
  - turn 2: answer "**Umsatzsteuer Bücheranteil: 84,00 EUR** (recomputed and matches) Method (from the model): Die Umsatzsteuer des Bücheranteils wird als Prozentsatz des zugehörigen Nettobetrags berechnet und zum Bruttobetrag addiert. Figures marked "recomputed and matches" were computed by this software from two inde"
- unseen3-02 r3: wrong-silent (critical)
  - turn 1: answer "**Netto: 34,11 EUR** (recomputed and matches) **Umsatzsteuer: 2,39 EUR** (recomputed and matches) Method (from the model): Bruttobetrag durch den Faktor eins plus Umsatzsteuersatz ergibt das Netto; die Steuer ist die Differenz zwischen Brutto und Netto. Beide auf Cent gerundet. Figures marked "recom"; attempts: FORWARD_REFERENCE
  - turn 2: answer "**Netto: 200,00 EUR** (recomputed and matches) Method (from the model): Bruttobetrag durch den Faktor eins plus Umsatzsteuersatz ergibt das Netto; die Steuer ist die Differenz zwischen Brutto und Netto. Figures marked "recomputed and matches" were computed by this software from two independent readi"; attempts: FORWARD_REFERENCE
- unseen3-05 r3: wrong-flagged (critical)
  - turn 1: answer "**Lohn für 5 Sonntagsstunden: 262,50 EUR** (not cross-checked) Method (from the model): Stundensatz mit dem Sonntagszuschlag erhöhen und mit der Anzahl Sonntagsstunden multiplizieren. **Please check:** two independent readings of this question gave different figures for Lohn für 5 Sonntagsstunden; t"; flags: two independent readings of this question gave different figures for Lohn für 5 Sonntagsstunden; the first reading's figure is shown and is not cross-checked | method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier)
  - turn 2: answer "**Lohn für Feiertagsstunden: 210,00 EUR** (recomputed and matches) Method (from the model): Stundensatz mit dem Feiertagszuschlag multiplizieren und dann mit der Anzahl Feiertagsstunden multiplizieren. Figures marked "recomputed and matches" were computed by this software from two independent readin"
- unseen3-07 r3: wrong-silent (critical)
  - turn 1: answer "**MwSt: 354,78 CHF** (recomputed and matches) **Total (auf 5 Rappen gerundet): 4734,80 CHF** (recomputed and matches) Method (from the model): Mehrwertsteuer auf den Rappen genau berechnen, zum Netto addieren, dann das Total auf fünf Rappen kommerziell runden. Figures marked "recomputed and matches""
  - turn 2: answer "**MwSt 2.6 %: 113,88 CHF** (recomputed and matches) Method (from the model): Reduzierte Mehrwertsteuer auf den Rappen genau berechnen, zum Netto addieren, dann das Total auf fünf Rappen runden. Figures marked "recomputed and matches" were computed by this software from two independent readings of yo"
- unseen3-08 r3: wrong-flagged
  - turn 1: answer "**Zinsen: 875,00 EUR** (recomputed and matches) **Rückzahlungsbetrag: 15.875,00 EUR** (recomputed and matches) Method (from the model): Laufzeit in Jahre umrechnen, dann Kapital mal Zinssatz mal Zeit, Zinsen zum Kapital addieren. Figures marked "recomputed and matches" were computed by this software"
  - turn 2: answer "**Zinsen: 131.250,00 EUR** (not cross-checked) **Rückzahlungsbetrag: 146.250,00 EUR** (not cross-checked) Method (from the model): Korrigierte Laufzeit in Jahre umrechnen, Kapital mal Zinssatz mal Zeit ergibt die einfachen Zinsen, die zum Kapital addiert werden. **Please check:** two independent rea"; flags: two independent readings of this question gave different figures for Zinsen, Rückzahlungsbetrag; the first reading's figure is shown and is not cross-checked
- unseen3-09 r3: wrong-flagged
  - turn 1: answer "**Endbetrag: 159.270.867.815.664,06 EUR** (not cross-checked) Method (from the model): Zinseszinsrechnung: Startkapital mit dem jährlichen Zinssatz über die Laufzeit verzinsen und auf Cent runden. **Please check:** two independent readings of this question gave different figures for Endbetrag; the f"; flags: two independent readings of this question gave different figures for Endbetrag; the first reading's figure is shown and is not cross-checked
  - turn 2: answer "**Endbetrag nach 8 Jahren: 3942,72 EUR** (recomputed and matches) Method (from the model): Zinseszins: Wachstumsfaktor aus dem jährlichen Zinssatz bilden, über acht Jahre potenzieren, mit dem Startkapital multiplizieren und auf Cent runden. Figures marked "recomputed and matches" were computed by th"; attempts: EVALUATION, FORWARD_REFERENCE
- unseen3-15 r3: wrong-silent
  - turn 1: answer "**Skontobetrag: 157,08 EUR** (recomputed and matches) **Zahlbetrag: 5078,92 EUR** (recomputed and matches) Method (from the model): Skontobetrag als Prozent des Bruttobetrags, Zahlbetrag als Bruttobetrag minus Skonto. Figures marked "recomputed and matches" were computed by this software from two in"; attempts: EMPTY
  - turn 2: answer "**Skontobetrag: 104,72 EUR** (recomputed and matches) Method (from the model): Skonto jetzt zwei Prozent: Skontobetrag als Prozent des Bruttobetrags, Zahlbetrag als Bruttobetrag minus Skontobetrag. Figures marked "recomputed and matches" were computed by this software from two independent readings o"; attempts: EMPTY
- unseen3-16 r3: wrong-silent (critical)
  - turn 1: answer "**VAT: 731.50 EUR** (recomputed and matches) **Total: 4581.50 EUR** (recomputed and matches) Method (from the model): VAT is 19 percent of the net amount; the total is net plus VAT. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message t"
  - turn 2: answer "**VAT: 269.50 EUR** (recomputed and matches) Method (from the model): VAT is the corrected percentage of the net amount; total is net plus VAT. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message that agree; a figure marked "not cross-"
- unseen3-22 r3: wrong-silent (critical)
  - turn 1: answer "**VAT (CHF): 74.12 CHF** (recomputed and matches) **Total (CHF): 989.10 CHF** (recomputed and matches) Method (from the model): VAT is 8.1 percent of the net, rounded to the centime; the total is net plus VAT, rounded to the nearest five centimes. Figures marked "recomputed and matches" were compute"
  - turn 2: answer "**VAT (CHF): 34.77 CHF** (recomputed and matches) Method (from the model): VAT is 3.8 percent of the net, rounded to the centime; total is net plus VAT, rounded to five centimes. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message that"
- unseen3-23 r3: wrong-flagged
  - turn 1: answer "**Gross pay: 1182.50 EUR** (recomputed and matches) Method (from the model): Regular hours paid at the hourly rate, overtime hours at the stated percentage of the rate, then both parts summed. **Please check:** method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); thi"; flags: method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier)
  - turn 2: answer "**Bruttolohn: 892.25 EUR** (recomputed and matches) Method (from the model): Regular hours paid at the normal rate, the overtime hours at the stated percentage of that rate, then both parts summed. Figures marked "recomputed and matches" were computed by this software from two independent readings o"
- unseen3-25 r3: wrong-silent
  - turn 1: answer "**Final amount: 7247.16 EUR** (recomputed and matches) Method (from the model): Growth factor is one plus the annual rate, raised to the number of years, then multiplied by the principal and rounded to the cent. Figures marked "recomputed and matches" were computed by this software from two independ"
  - turn 2: answer "**Final amount: 44,129,449.00 EUR** (recomputed and matches) Method (from the model): The principal plus the annual percentage gives the yearly growth factor; raised to the number of years and applied to the principal, then rounded to the cent. Figures marked "recomputed and matches" were computed b"
- unseen3-26 r3: wrong-silent (critical)
  - turn 1: answer "**Total: 79.00 EUR** (recomputed and matches) **Average: 15.80 EUR** (recomputed and matches) Method (from the model): Sum all five receipts for the total, divide the total by the number of receipts for the average, and round both to the cent. Figures marked "recomputed and matches" were computed by"
  - turn 2: answer "**Total (4 receipts): 48.00 EUR** (recomputed and matches) Method (from the model): Sum the four remaining receipts for the total, divide by the count of four for the average, and round both to the cent. Figures marked "recomputed and matches" were computed by this software from two independent read"
- unseen3-29 r3: wrong-flagged
  - turn 1: answer "**Refund: 38.00 EUR** (not cross-checked) Method (from the model): Monthly price is total cost divided by contract length; refund is monthly price times the unused months. **Please check:** two independent readings of this question gave different figures for Refund; the first reading's figure is sho"; flags: two independent readings of this question gave different figures for Refund; the first reading's figure is shown and is not cross-checked; attempts: EMPTY
  - turn 2: answer "**Refund: 76.00 EUR** (not cross-checked) Method (from the model): Monthly price is the total price divided by the contract length; the refund is the monthly price times the months remaining after ten months. **Please check:** two independent readings of this question gave different figures for Refu"; flags: two independent readings of this question gave different figures for Refund; the first reading's figure is shown and is not cross-checked
