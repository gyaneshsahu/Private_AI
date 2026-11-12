# privatemode-glm (rerun of unseen-v3, 12 November 2026): glm-5.3, retry 1, 3 repetition(s), set unseen-v3

Requests 370, input tokens 431988, output tokens 353440, cost USD 0.0000

**All cases**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| repetition 1 | 30 | 27 (90.0 %; 74.4-96.5 %) | 1 | 2 | 0 (0.0-11.4 %) | 0 |
| repetition 2 | 30 | 26 (86.7 %; 70.3-94.7 %) | 1 | 1 | 2 (1.8-21.3 %) | 0 |
| repetition 3 | 30 | 28 (93.3 %; 78.7-98.2 %) | 0 | 1 | 1 (0.6-16.7 %) | 0 |
| pooled | 90 | 81 (90.0 %; 82.1-94.6 %) | 2 | 4 | 3 (1.1-9.3 %) | 0 |

**Critical cases (reported separately; any silent wrong or no-answer is a fail)**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| repetition 1 | 16 | 14 (87.5 %; 64.0-96.5 %) | 1 | 1 | 0 (0.0-19.4 %) | 0 |
| repetition 2 | 16 | 12 (75.0 %; 50.5-89.8 %) | 1 | 1 | 2 (3.5-36.0 %) | 0 |
| repetition 3 | 16 | 15 (93.8 %; 71.7-98.9 %) | 0 | 0 | 1 (1.1-28.3 %) | 0 |
| pooled | 48 | 41 (85.4 %; 72.8-92.8 %) | 2 | 2 | 3 (2.1-16.8 %) | 0 |
**Per kind (pooled over repetitions)**

| Group | n | Verified by recomputation | False flag | Wrong, flagged | Silent wrong | No answer |
| --- | --- | --- | --- | --- | --- | --- |
| compound-interest | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| date-time | 12 | 12 (100.0 %; 75.8-100.0 %) | 0 | 0 | 0 (0.0-24.2 %) | 0 |
| instalments-simple-interest | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| multi-step | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| net-gross | 6 | 5 (83.3 %; 43.6-97.0 %) | 0 | 0 | 1 (3.0-56.4 %) | 0 |
| overtime-rate | 9 | 5 (55.6 %; 26.7-81.1 %) | 0 | 4 | 0 (-0.0-29.9 %) | 0 |
| percent-change | 12 | 12 (100.0 %; 75.8-100.0 %) | 0 | 0 | 0 (0.0-24.2 %) | 0 |
| proration | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| skonto | 3 | 3 (100.0 %; 43.9-100.0 %) | 0 | 0 | 0 (0.0-56.1 %) | 0 |
| surcharge | 6 | 6 (100.0 %; 61.0-100.0 %) | 0 | 0 | 0 (0.0-39.0 %) | 0 |
| swiss-vat | 6 | 4 (66.7 %; 30.0-90.3 %) | 2 | 0 | 0 (0.0-39.0 %) | 0 |
| table-sum | 6 | 5 (83.3 %; 43.6-97.0 %) | 0 | 0 | 1 (3.0-56.4 %) | 0 |
| vat | 6 | 5 (83.3 %; 43.6-97.0 %) | 0 | 0 | 1 (3.0-56.4 %) | 0 |


**Measures against the bar (THRESHOLD-v3.md, C1)**

| Measure | Bar | Result | Met |
| --- | --- | --- | --- |
| Silent wrong | 0 of 90 | 3 of 90 | NO |
| Verified by recomputation | at least 60 of 90 | 81 of 90 | yes |
| Flagged (false flag plus wrong, flagged) | at most 27 of 90 | 6 of 90 | yes |
| No answer | at most 9 of 90 | 0 of 90 | yes |
| Critical cases: silent wrong or no-answer | none of 48 | 3 silent wrong, 0 no answer of 48 | NO |

**Verdict: FAIL (silent wrong or critical case fail)**

**Wrong-flagged, silent-wrong and no-answer conversations**

- unseen3-20 r1: wrong-flagged (critical)
  - turn 1: answer "**Pay for 8 night hours: 468.00 EUR** (not cross-checked) Method (from the model): First multiply the hourly rate by the number of night hours to get the base pay, then increase that base by the night shift percentage. **Please check:** two independent readings of this question gave different figure"; flags: two independent readings of this question gave different figures for Pay for 8 night hours; the first reading's figure is shown and is not cross-checked | method mismatch: "125 % of the rate" means the rate multiplied by 125 % (percent_of); this program adds or deducts 125 % instead (rule: rate multiplier)
  - turn 2: answer "**Pay for 8 night hours at 175 %: 364.00 EUR** (recomputed and matches) Method (from the model): Multiply the hourly rate by the night hours to get the base pay, then take the night shift percentage of that base. Figures marked "recomputed and matches" were computed by this software from two indepen"
- unseen3-23 r1: wrong-flagged
  - turn 1: answer "**Gross pay: 1053.50 EUR** (recomputed and matches) Method (from the model): Hours up to the threshold are paid at the base rate; the extra hours are paid at the stated percentage of the base rate; gross pay is the sum of regular and overtime pay. Figures marked "recomputed and matches" were compute"
  - turn 2: answer "**Gross pay: 913.75 EUR** (not cross-checked) Method (from the model): Hours above the threshold are overtime; regular hours are paid at the base rate and overtime hours at the stated percentage uplift of the base rate; gross pay is the sum of both parts. **Please check:** two independent readings o"; flags: two independent readings of this question gave different figures for Gross pay; the first reading's figure is shown and is not cross-checked | method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier)
- unseen3-10 r2: wrong-silent (critical)
  - turn 1: answer "**Summe: 1965,75 EUR** (recomputed and matches) Method (from the model): Summe aller vier Zeilenbeträge; danach der Betrag der zweiten Zeile ins Verhältnis zur Summe gesetzt und als Prozentwert auf eine Nachkommastelle gerundet. Figures marked "recomputed and matches" were computed by this software "
  - turn 2: answer "**Summe: 1515,75 EUR** (recomputed and matches) **Anteil von Zeile 2: 69,0 %** (recomputed and matches) Method (from the model): Summe der vier Zeilenbeträge, wobei der vierte Betrag durch den korrigierten Wert ersetzt wird; anschließend der Betrag der zweiten Zeile ins Verhältnis zur neuen Summe ge"
- unseen3-16 r2: wrong-silent (critical)
  - turn 1: answer "**VAT (19 %): 731.50 EUR** (recomputed and matches) **Total (gross): 4581.50 EUR** (recomputed and matches) Method (from the model): The VAT is calculated as nineteen percent of the net amount. The total is the sum of the net amount and the VAT. Figures marked "recomputed and matches" were computed "
  - turn 2: answer "**VAT (7 %): 269.50 EUR** (recomputed and matches) Method (from the model): The VAT is the corrected rate applied to the net amount; the total is the net amount plus that VAT. Figures marked "recomputed and matches" were computed by this software from two independent readings of your message that ag"
- unseen3-20 r2: wrong-flagged (critical)
  - turn 1: answer "**Night shift pay: 468.00 EUR** (not cross-checked) Method (from the model): Night hours are paid at 125 percent of the hourly rate, so first apply the percentage to the normal rate, then multiply by the number of night hours. **Please check:** two independent readings of this question gave differen"; flags: two independent readings of this question gave different figures for Night shift pay; the first reading's figure is shown and is not cross-checked | method mismatch: "125 % of the rate" means the rate multiplied by 125 % (percent_of); this program adds or deducts 125 % instead (rule: rate multiplier)
  - turn 2: answer "**Pay for 8 night hours at 175%: 364.00 EUR** (recomputed and matches) Method (from the model): Take the stated percentage of the normal hourly rate to get the night rate, then multiply by the number of night hours. Figures marked "recomputed and matches" were computed by this software from two inde"
- unseen3-17 r3: wrong-silent (critical)
  - turn 1: answer "**Net amount: 220.00 GBP** (recomputed and matches) Method (from the model): The bill is gross, so divide it by the VAT-inclusive factor to obtain the net; the VAT is then the difference between the gross bill and the net. Figures marked "recomputed and matches" were computed by this software from t"
  - turn 2: answer "**Net amount: 15.00 GBP** (recomputed and matches) Method (from the model): The receipt total is VAT-inclusive, so divide it by one plus the VAT rate to get the net; the VAT is the difference between the total and the net. Figures marked "recomputed and matches" were computed by this software from t"
- unseen3-23 r3: wrong-flagged
  - turn 1: answer "**Gross pay: 1182.50 EUR** (not cross-checked) Method (from the model): Overtime hours are total hours minus standard hours; standard hours paid at the normal rate, overtime hours at the normal rate increased by the stated percentage, then both amounts summed. **Please check:** two independent readi"; flags: two independent readings of this question gave different figures for Gross pay; the first reading's figure is shown and is not cross-checked | method mismatch: "150 % of the rate" means the rate multiplied by 150 % (percent_of); this program adds or deducts 150 % instead (rule: rate multiplier)
  - turn 2: answer "**Gross pay: 892.25 EUR** (recomputed and matches) Method (from the model): Overtime hours are the total hours minus the standard hours. The overtime rate is the stated percentage of the normal rate, so the rate is multiplied by that percentage. Gross pay is the standard pay plus the overtime pay. F"
