# Fresh benchmark results, 2026-11-12-run2

Bars: `BARS.md` (frozen 12 November 2026). Graded scores are blind model-grader scores unless the owner section says otherwise.

## Per mode

### auto: BELOW BAR

| Level | Mean | Hallucinations | Extra |
| --- | --- | --- | --- |
| 1 Research (search on) | 4.14 | 1 | official source 4/7 |
| 2 German rules, fees and deadlines | 3.50 | 2 |  |
| 3 Time-sensitive facts | 4.00 | 0 |  |
| 4 Coding | 3.25 | 3 | code fails 2 |
| 5 Health regression | 4.50 | 0 |  |

Deterministic: raw codes 0, "no browsing" 0, word counts 0, level-1 links 7/7, page address shown 7/7, suggestion 6/6 time-sensitive and 0/2 controls, health 2/2. Speed (report only): median first token 1.3 s, whole reply 2.6 s.

Below bar because: level 1: mean 4.14, 1 hallucination(s), official 4/7; level 2: 2 hallucination(s), mean 3.50; level 4: mean 3.25, code fails 2.

### fast: BELOW BAR

| Level | Mean | Hallucinations | Extra |
| --- | --- | --- | --- |
| 1 Research (search on) | 4.14 | 1 | official source 4/7 |
| 2 German rules, fees and deadlines | 3.33 | 2 |  |
| 3 Time-sensitive facts | 3.50 | 1 |  |
| 4 Coding | 3.75 | 3 | code fails 1 |
| 5 Health regression | 5.00 | 0 |  |

Deterministic: raw codes 0, "no browsing" 0, word counts 0, level-1 links 7/7, page address shown 7/7, suggestion 6/6 time-sensitive and 0/2 controls, health 2/2. Speed (report only): median first token 1.3 s, whole reply 2.7 s.

Below bar because: level 1: mean 4.14, 1 hallucination(s), official 4/7; level 2: 2 hallucination(s), mean 3.33; level 3: 1 stale or false, mean 3.50; level 4: mean 3.75, code fails 1.

### thinking: BELOW BAR

| Level | Mean | Hallucinations | Extra |
| --- | --- | --- | --- |
| 1 Research (search on) | 4.14 | 1 | official source 5/7 |
| 2 German rules, fees and deadlines | 3.83 | 1 |  |
| 3 Time-sensitive facts | 4.50 | 0 |  |
| 4 Coding | 4.75 | 1 | code fails 0 |
| 5 Health regression | 4.50 | 0 |  |

Deterministic: raw codes 0, "no browsing" 0, word counts 0, level-1 links 7/7, page address shown 7/7, suggestion 6/6 time-sensitive and 0/2 controls, health 2/2. Speed (report only): median first token 6.6 s, whole reply 8.8 s.

Below bar because: level 2: 1 hallucination(s), mean 3.83.

## Owner sample against the graders

Pending: `owner-sample.csv` is not filled yet.
