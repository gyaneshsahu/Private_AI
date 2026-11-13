"""Joins the blind grades (scoring-sheet.csv, or the graders' part1-4.csv in a folder) with the key,
the run records and the offline checks, and prints the measures of BARS.md: confident errors with and
without each change. The key and run records are local (.local/), as for every blind sheet.
usage: python evaluation/german-rules-40-20261113/analyse.py [<grades_dir>]"""
import csv, json, os, sys

D = "evaluation/german-rules-40-20261113"
L = ".local/german-rules-40-20261113"
grades_dir = sys.argv[1] if len(sys.argv) > 1 else None
key = json.load(open(f"{L}/key.json"))["labels"]
slot = {"auto": "U", "fast": "S", "thinking": "G"}
off = json.load(open(f"{D}/offline-checks.json", encoding="utf-8"))["byPrompt"]

G = {}  # (prompt, run) -> grade row
files = [os.path.join(grades_dir, f"part{i}.csv") for i in range(1, 5)] if grades_dir else [f"{D}/scoring-sheet.csv"]
for path in files:
    for r in csv.DictReader(open(path, encoding="utf-8", newline="")):
        run = slot[key[r["promptId"].strip()][r["label"].strip()]]
        G[(r["promptId"].strip(), run)] = r
ids = sorted({p for p, _ in G})
assert len(ids) == 40 and len(G) == 120, (len(ids), len(G))

def rec(p, run):
    return json.load(open(f"{L}/run-{run}/auto/{p}.json", encoding="utf-8"))

yes = lambda v: str(v).strip().lower().startswith("y")
cw = {k: yes(v["confidentWrong"]) for k, v in G.items()}
score = {k: int(v["score1to5"]) for k, v in G.items()}
official = {k: yes(v["officialSource"]) for k, v in G.items()}
detected = {p: bool(rec(p, "S").get("choiceShown")) for p in ids}  # question detector fired (the choice appeared)

def summary(name, pick):
    rows = [(p, pick(p)) for p in ids]
    errs = [p for p, run in rows if cw[(p, run)]]
    mean = sum(score[(p, run)] for p, run in rows) / len(rows)
    off_cited = sum(official[(p, run)] for p, run in rows)
    print(f"{name:58s} confident errors {len(errs):2d}/40  mean {mean:.2f}  official cited {off_cited:2d}/40  {' '.join(errs)}")
    return set(errs)

print("== Runs as answered")
eU = summary("U  unsearched (Answer without checking)", lambda p: "U")
eS = summary("S  searched where the choice appeared, Goggles off", lambda p: "S")
eG = summary("G  searched where the choice appeared, Goggles on", lambda p: "G")
print()
print("== Goggles, on the 20 searched questions only")
for run in ("S", "G"):
    sub = [p for p in ids if detected[p]]
    errs = [p for p in sub if cw[(p, run)]]
    mean = sum(score[(p, run)] for p in sub) / len(sub)
    tier = sum(1 for p in sub if (rec(p, run).get("research") or {}).get("topPage", {}).get("tier") == "official")
    print(f"{run}: confident errors {len(errs)}/{len(sub)}  mean {mean:.2f}  page read official {tier}/{len(sub)}  {' '.join(errs)}")
print()
print("== Answer-side check, on U's confident errors")
det_warn = {p: bool(off[p].get("detectorWarns")) for p in ids}
ans_warn = {p: bool(off[p].get("answerSideWarns")) for p in ids}
missed_by_detector = [p for p in eU if not det_warn[p]]
caught_after = [p for p in missed_by_detector if ans_warn[p]]
unwarned_before = [p for p in eU if not det_warn[p]]
unwarned_after = [p for p in eU if not (det_warn[p] or ans_warn[p])]
print(f"U confident errors: {len(eU)}; warned before (question detector) {len(eU) - len(unwarned_before)}; warned after (+ answer-side) {len(eU) - len(unwarned_after)}")
print(f"errors the question detector missed: {len(missed_by_detector)}; the answer-side check warns on {len(caught_after)} of them {' '.join(caught_after)}")
print(f"unwarned confident errors: before {len(unwarned_before)} -> after {len(unwarned_after)} {' '.join(unwarned_after)}")
print()
print("== 'Always search' (detected questions searched without the choice; undetected stay unsearched)")
for name, srun in (("with current search", "S"), ("with Goggles", "G")):
    errs = [p for p in ids if cw[(p, srun if detected[p] else "U")]]
    print(f"always-search on, {name}: confident errors {len(errs)}/40 (default 'without checking' U: {len(eU)}/40)")
print()
print("== Everything on (always-search + Goggles + answer-side check): confident errors a user sees with no warning")
final_unwarned = [p for p in ids if (cw[(p, "G")] if detected[p] else (cw[(p, "U")] and not (det_warn[p] or ans_warn[p])))]
print(f"{len(final_unwarned)}/40 {' '.join(final_unwarned)}  (default today, user picks 'without checking', detector-only warning: {len(unwarned_before)}/40)")
final_unwarned_s = [p for p in ids if (cw[(p, "S")] if detected[p] else (cw[(p, "U")] and not (det_warn[p] or ans_warn[p])))]
print(f"same with current search instead of Goggles: {len(final_unwarned_s)}/40 {' '.join(final_unwarned_s)}")
print(f"question detector recall on the fresh 40: {sum(detected.values())}/40")
