"""Answer language per interface for the live check (13 November 2026).
usage: python evaluation/answer-language-20261113/check.py
Reads .local/answer-language-20261113/<de-DE|en-US>/fast/A*.json and prompts.json; a reply's language
is decided by common function words (German vs English), code blocks removed."""
import json, os, re

D = "evaluation/answer-language-20261113"
L = ".local/answer-language-20261113"
DE = set("der die das und ist nicht ein eine einer mit zu den dem im für auf sie es wird werden auch oder wenn wie bei von aus".split())
EN = set("the and is not a an with to of in for on it you this that are or if how by from be".split())

def language(text: str) -> str:
    prose = re.sub(r"```.*?```", " ", text, flags=re.S)
    words = re.findall(r"[a-zäöüß]+", prose.lower())
    de, en = sum(w in DE for w in words), sum(w in EN for w in words)
    if de + en < 3:
        return "unclear"
    return "de" if de > en else "en"

prompts = {p["id"]: p for p in json.load(open(f"{D}/prompts.json", encoding="utf-8"))["prompts"]}
ok = total = 0
for locale, ui in (("de-DE", "de"), ("en-US", "en")):
    for pid, p in prompts.items():
        path = f"{L}/{locale}/fast/{pid}.json"
        if not os.path.exists(path):
            print(f"{locale} {pid} missing")
            continue
        text = json.load(open(path, encoding="utf-8")).get("text", "")
        got, want = language(text), p["expected"][ui]
        total += 1
        ok += got == want
        print(f"{locale} {pid} {p['level']:<42} expected {want} got {got:<7} {'ok' if got == want else 'MISMATCH'} | {text[:70]!r}")
print(f"{ok}/{total} as expected")
