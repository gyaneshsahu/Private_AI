# Writes rounding-v1-20261114.json: 24 NEW two-turn conversations about rounding rules stated in
# words (Swiss 5-centime rounding of the total only, each line versus the sum, whole euros, 10 cents,
# kaufmaennisch, aufrunden/abrunden, half up versus half to even, percentages to one decimal, whole
# packs). Written on 14 November 2026 BEFORE any change to the code-tool instruction, then FROZEN by
# the SHA-256 in tests/arithmetic-rounding-v1.test.ts. Never tune an instruction on it.
#
# Every expected value is computed here with Python's decimal module. Each item also carries a
# written derivation that the test re-evaluates with evaluation/arithmetic-gate/derivation.ts, so
# each value is computed twice, independently.
#
# No item carries the scorer's `rounding` field on purpose: the scorer would round the model's
# figure half up before comparing, so an unrounded 355.50 would pass for "356 on whole euros".
# Every expected value is exact, and the model must state the rounded figure.
#
#   python -I evaluation/arithmetic-gate/make-rounding-v1.py
import json
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal, getcontext
from pathlib import Path

getcontext().prec = 50
D = Decimal
MODES = {"half-up": ROUND_HALF_UP, "half-even": ROUND_HALF_EVEN, "up": ROUND_CEILING, "down": ROUND_FLOOR}


def rnd(x, step="0.01", mode="half-up"):
    s = D(step)
    return (x / s).quantize(D(1), rounding=MODES[mode]) * s


def fmt(value, style, places=None):
    """de: 1.234,56  en: 1,234.56  ch: 1'234.56. Keeps the decimals of the value unless places is given."""
    v = D(value)
    if places is not None:
        v = v.quantize(D(1).scaleb(-places))
    sign, text = ("-", str(-v)) if v < 0 else ("", str(v))
    whole, _, frac = text.partition(".")
    sep = {"de": ".", "en": ",", "ch": "'"}[style]
    groups = []
    while len(whole) > 3:
        groups.insert(0, whole[-3:])
        whole = whole[:-3]
    whole = sep.join([whole, *groups])
    point = "," if style == "de" else "."
    return sign + whole + (point + frac if frac else "")


def money(label, value, derivation, currency=None):
    return {"label": label, "kind": "money", "value": value, "derivation": derivation, "currency": currency}


def pct(label, value, derivation):
    return {"label": label, "kind": "percent", "value": value, "derivation": derivation}


def num(label, value, derivation):
    return {"label": label, "kind": "number", "value": value, "derivation": derivation}


def bad(label, kind, value, reason, currency=None):
    return {"label": label, "kind": kind, "value": value, "reason": reason, "currency": currency}


def case(category, locale, style, critical, second, source, inputs, turns, expected, forbidden):
    return locals()


CASES = []
add = CASES.append

# ---------------------------------------------------------------- German (12)
i = {"a": "1248.35", "b": "86.40", "c": "512.95", "vat": "8.1", "paid": "2000.00"}
a, b, c, vat, paid = (D(i[k]) for k in ("a", "b", "c", "vat", "paid"))
net = a + b + c
tax = rnd(net * vat / 100)
total = rnd(net + tax, "0.05")
deriv_net = "add(1248.35, 86.40, 512.95)"
deriv_tax = f"round(mul({deriv_net}, 0.081), 2)"
deriv_total = f'roundTo(add({deriv_net}, {deriv_tax}), 0.05, "half-up")'
add(case("swiss-total-only", "de", "ch", True, "follow-up", "Basel invoice, three lines", i,
    ["Rechnung aus Basel, drei Positionen netto: CHF {a}, CHF {b} und CHF {c}. MwSt {vat} %. Die MwSt bitte auf den Rappen genau, und nur das Rechnungstotal auf 5 Rappen runden. Nettosumme, MwSt und Total?",
     "Der Kunde zahlt bar mit CHF {paid}. Wie viel Rückgeld bekommt er?"],
    [[money("Nettosumme", net, deriv_net), money("MwSt", tax, deriv_tax), money("Total", total, deriv_total)],
     [money("Rückgeld", paid - total, f"sub(2000, {deriv_total})")]],
    [[bad("MwSt", "money", rnd(net * vat / 100, "0.05"), "MwSt auf 5 Rappen gerundet, obwohl nur das Total so gerundet wird")],
     [bad("Rückgeld", "money", paid - (net + tax), "Rückgeld vom ungerundeten Total")]]))

i = {"w1": "1.37", "p1": "23.90", "w2": "0.62", "p2": "48.50", "w1b": "1.71"}
w1, p1, w2, p2, w1b = (D(i[k]) for k in ("w1", "p1", "w2", "p2", "w1b"))
l1, l2, l1b = rnd(w1 * p1), rnd(w2 * p2), rnd(w1b * p1)
add(case("swiss-lines-then-total", "de", "ch", True, "correction", "Lucerne market stall", i,
    ["Marktstand in Luzern, Preise inkl. MwSt: {w1} kg Bergkäse zu CHF {p1} pro kg und {w2} kg Trockenfleisch zu CHF {p2} pro kg. Jede Position auf den Rappen runden, nur den Endbetrag auf 5 Rappen. Beide Positionen und Endbetrag?",
     "Korrektur: es waren {w1b} kg Bergkäse. Käseposition und Endbetrag?"],
    [[money("Bergkäse", l1, "round(mul(1.37, 23.90), 2)"), money("Trockenfleisch", l2, "round(mul(0.62, 48.50), 2)"),
      money("Endbetrag", rnd(l1 + l2, "0.05"), 'roundTo(add(round(mul(1.37, 23.90), 2), round(mul(0.62, 48.50), 2)), 0.05, "half-up")')],
     [money("Bergkäse", l1b, "round(mul(1.71, 23.90), 2)"),
      money("Endbetrag", rnd(l1b + l2, "0.05"), 'roundTo(add(round(mul(1.71, 23.90), 2), round(mul(0.62, 48.50), 2)), 0.05, "half-up")')]],
    [[bad("Bergkäse", "money", rnd(w1 * p1, "0.05"), "Position auf 5 Rappen gerundet statt auf den Rappen")],
     [bad("Bergkäse", "money", rnd(w1b * p1, "0.05"), "Position auf 5 Rappen gerundet statt auf den Rappen")]]))

i = {"km": "412", "rate": "0.30", "days": "3", "per": "14.00", "hotel": "189.90", "km2": "438"}
km, rate, days, per, hotel, km2 = (D(i[k]) for k in ("km", "rate", "days", "per", "hotel", "km2"))
s1, s2 = km * rate + days * per + hotel, km2 * rate + days * per + hotel
add(case("whole-euros-half-up", "de", "de", True, "correction", "travel expenses", i,
    ["Reisekosten: {km} km zu {rate} EUR pro km, {days} Tage Verpflegung zu je {per} EUR und Hotel {hotel} EUR. Den Gesamtbetrag kaufmännisch auf volle Euro runden. Wie viel wird erstattet?",
     "Korrektur: es waren {km2} km. Erstattung nach derselben Regel?"],
    [[money("Erstattung", rnd(s1, "1"), 'roundTo(add(mul(412, 0.30), mul(3, 14), 189.90), 1, "half-up")', "EUR")],
     [money("Erstattung", rnd(s2, "1"), 'roundTo(add(mul(438, 0.30), mul(3, 14), 189.90), 1, "half-up")', "EUR")]],
    [[bad("Erstattung", "money", rnd(s1, "1", "down"), "abgerundet statt kaufmännisch gerundet", "EUR")],
     [bad("Erstattung", "money", rnd(s2, "1", "up"), "aufgerundet statt kaufmännisch gerundet", "EUR")]]))

i = {"l1": "43.87", "p1": "1.749", "l2": "51.12", "p2": "1.689"}
L1, P1, L2, P2 = (D(i[k]) for k in ("l1", "p1", "l2", "p2"))
b1, b2 = rnd(L1 * P1, "0.10"), rnd(L2 * P2, "0.10")
add(case("ten-cents-each-receipt", "de", "de", True, "follow-up", "fuel receipts", i,
    ["Tankbeleg: {l1} Liter zu {p1} EUR pro Liter. In unserer Reisekostenabrechnung wird jeder Beleg kaufmännisch auf 10 Cent gerundet. Welcher Betrag wird abgerechnet?",
     "Zweiter Beleg: {l2} Liter zu {p2} EUR pro Liter. Auch diesen einzeln auf 10 Cent runden, dann beide abgerechneten Beträge addieren. Betrag des zweiten Belegs und Summe?"],
    [[money("Betrag", b1, 'roundTo(mul(43.87, 1.749), 0.10, "half-up")', "EUR")],
     [money("Zweiter Beleg", b2, 'roundTo(mul(51.12, 1.689), 0.10, "half-up")', "EUR"),
      money("Summe", b1 + b2, 'add(roundTo(mul(43.87, 1.749), 0.10, "half-up"), roundTo(mul(51.12, 1.689), 0.10, "half-up"))', "EUR")]],
    [[bad("Betrag", "money", rnd(L1 * P1, "0.10", "up"), "auf 10 Cent aufgerundet statt kaufmännisch", "EUR")],
     [bad("Summe", "money", rnd(L1 * P1 + L2 * P2, "0.10"), "Summe der ungerundeten Beträge gerundet statt Summe der gerundeten Belege", "EUR")]]))

i = {"bill": "24.69", "bill2": "31.47"}
add(case("half-even-vs-half-up", "de", "de", True, "follow-up", "splitting app", i,
    ["Wir teilen eine Rechnung über {bill} EUR zu zweit. Unsere Abrechnungs-App rundet den Anteil pro Person auf Cent, und zwar mathematisch: bei genau einer halben Stelle zur geraden Ziffer. Welchen Anteil zeigt die App?",
     "Nächste Rechnung: {bill2} EUR, wieder zu zweit, diesmal kaufmännisch auf Cent gerundet. Anteil pro Person?"],
    [[money("Anteil", rnd(D("24.69") / 2, "0.01", "half-even"), 'roundTo(div(24.69, 2), 0.01, "half-even")', "EUR")],
     [money("Anteil", rnd(D("31.47") / 2), "round(div(31.47, 2), 2)", "EUR")]],
    [[bad("Anteil", "money", rnd(D("24.69") / 2), "kaufmännisch gerundet statt zur geraden Ziffer", "EUR")],
     [bad("Anteil", "money", rnd(D("31.47") / 2, "0.01", "down"), "abgerundet statt kaufmännisch", "EUR")]]))

i = {"q1": "184250.00", "q2": "197830.00"}
q1, q2 = D(i["q1"]), D(i["q2"])
add(case("percent-one-decimal", "de", "de", False, "follow-up", "quarterly revenue", i,
    ["Umsatz im ersten Quartal {q1} EUR, im zweiten Quartal {q2} EUR. Um wie viel Prozent ist der Umsatz gestiegen, auf eine Nachkommastelle gerundet?",
     "Welchen Anteil hat das zweite Quartal an der Summe beider Quartale, ebenfalls auf eine Nachkommastelle?"],
    [[pct("Anstieg", rnd((q2 - q1) / q1 * 100, "0.1"), "round(mul(div(sub(197830, 184250), 184250), 100), 1)")],
     [pct("Anteil", rnd(q2 / (q1 + q2) * 100, "0.1"), "round(mul(div(197830, add(184250, 197830)), 100), 1)")]],
    [[bad("Anstieg", "percent", rnd((q2 - q1) / q1 * 100, "0.1", "down"), "abgeschnitten statt gerundet")],
     [bad("Anteil", "percent", rnd(q2 / (q1 + q2) * 100, "0.1", "down"), "abgeschnitten statt gerundet")]]))

i = {"area": "23.4", "waste": "8", "cover": "1.44", "price": "32.90"}
packs_raw = D("23.4") * D("1.08") / D("1.44")
packs = rnd(packs_raw, "1", "up")
add(case("whole-packs", "de", "de", True, "follow-up", "floor tiles", i,
    ["Badezimmer: {area} m² Boden, dazu {waste} % Verschnitt. Ein Paket Fliesen reicht für {cover} m². Wie viele Pakete muss ich kaufen? Es gibt nur ganze Pakete.",
     "Ein Paket kostet {price} EUR. Was kosten die Pakete zusammen?"],
    [[num("Pakete", packs, 'roundTo(div(mul(23.4, 1.08), 1.44), 1, "up")')],
     [money("Kosten", packs * D("32.90"), 'mul(roundTo(div(mul(23.4, 1.08), 1.44), 1, "up"), 32.90)', "EUR")]],
    [[bad("Pakete", "number", rnd(packs_raw, "1", "down"), "abgerundet: zu wenige Pakete")],
     [bad("Kosten", "money", rnd(packs_raw, "1", "down") * D("32.90"), "Preis für abgerundete Paketzahl", "EUR")]]))

i = {"bill": "67.40", "tip": "10", "tip2": "13"}
t1, t2 = D("67.40") * D("1.10"), D("67.40") * D("1.13")
add(case("round-up-whole-euros", "de", "de", True, "follow-up", "restaurant tip", i,
    ["Restaurantrechnung {bill} EUR. Ich gebe {tip} % Trinkgeld und runde den Gesamtbetrag auf volle Euro auf. Was zahle ich?",
     "Und mit {tip2} % Trinkgeld, wieder auf volle Euro aufgerundet?"],
    [[money("Zahlbetrag", rnd(t1, "1", "up"), 'roundTo(mul(67.40, 1.10), 1, "up")', "EUR")],
     [money("Zahlbetrag", rnd(t2, "1", "up"), 'roundTo(mul(67.40, 1.13), 1, "up")', "EUR")]],
    [[bad("Zahlbetrag", "money", rnd(t1, "1", "down"), "abgerundet statt aufgerundet", "EUR")],
     [bad("Zahlbetrag", "money", rnd(t2, "1"), "kaufmännisch gerundet statt aufgerundet", "EUR")]]))

i = {"rate": "23.47", "h1": "7.5", "h2": "6.5", "h3": "8.5", "h2b": "5.5"}
R = D("23.47")
pa, pb, pc, pbb = (rnd(D(i[k]) * R) for k in ("h1", "h2", "h3", "h2b"))
add(case("each-line-then-sum", "de", "de", True, "correction", "timesheet pay", i,
    ["Stundenzettel, Stundensatz {rate} EUR: Anna {h1} Stunden, Ben {h2} Stunden, Cem {h3} Stunden. Lohn je Person auf Cent runden, dann die gerundeten Beträge addieren. Lohn je Person und Summe?",
     "Korrektur: Ben hatte {h2b} Stunden. Bens Lohn und die neue Summe?"],
    [[money("Anna", pa, "round(mul(7.5, 23.47), 2)", "EUR"), money("Ben", pb, "round(mul(6.5, 23.47), 2)", "EUR"),
      money("Cem", pc, "round(mul(8.5, 23.47), 2)", "EUR"),
      money("Summe", pa + pb + pc, "add(round(mul(7.5, 23.47), 2), round(mul(6.5, 23.47), 2), round(mul(8.5, 23.47), 2))", "EUR")],
     [money("Ben", pbb, "round(mul(5.5, 23.47), 2)", "EUR"),
      money("Summe", pa + pbb + pc, "add(round(mul(7.5, 23.47), 2), round(mul(5.5, 23.47), 2), round(mul(8.5, 23.47), 2))", "EUR")]],
    [[bad("Summe", "money", rnd((D("7.5") + D("6.5") + D("8.5")) * R), "Summe aus ungerundeten Beträgen", "EUR")],
     [bad("Summe", "money", rnd((D("7.5") + D("5.5") + D("8.5")) * R), "Summe aus ungerundeten Beträgen", "EUR")]]))

i = {"list": "12470.00", "disc": "3", "vat": "8.1", "disc2": "5"}


def swiss_quote(lst, dp, vt):
    disc = rnd(lst * dp / 100)
    tax = rnd((lst - disc) * vt / 100)
    return disc, tax, rnd(lst - disc + tax, "0.05"), rnd((lst - disc) * vt / 100, "0.05")


def swiss_quote_derivation(lst, dp, vt):
    disc = f"round(mul({lst}, {dp}), 2)"
    tax = f"round(mul(sub({lst}, {disc}), {vt}), 2)"
    return disc, tax, f'roundTo(add(sub({lst}, {disc}), {tax}), 0.05, "half-up")'


qa, qb = swiss_quote(D("12470"), D("3"), D("8.1")), swiss_quote(D("12470"), D("5"), D("8.1"))
da, db = swiss_quote_derivation("12470", "0.03", "0.081"), swiss_quote_derivation("12470", "0.05", "0.081")
add(case("swiss-discount-vat-total", "de", "ch", True, "correction", "Winterthur quote", i,
    ["Offerte aus Winterthur: CHF {list} netto, {disc} % Rabatt, danach {vat} % MwSt auf den rabattierten Betrag. Rabatt und MwSt auf den Rappen, nur den Endbetrag auf 5 Rappen. Rabatt, MwSt und Endbetrag?",
     "Der Rabatt beträgt {disc2} %, nicht {disc} %. Rabatt, MwSt und Endbetrag?"],
    [[money("Rabatt", qa[0], da[0]), money("MwSt", qa[1], da[1]), money("Endbetrag", qa[2], da[2])],
     [money("Rabatt", qb[0], db[0]), money("MwSt", qb[1], db[1]), money("Endbetrag", qb[2], db[2])]],
    [[bad("MwSt", "money", qa[3], "MwSt auf 5 Rappen gerundet, obwohl nur der Endbetrag so gerundet wird")],
     [bad("MwSt", "money", qb[3], "MwSt auf 5 Rappen gerundet, obwohl nur der Endbetrag so gerundet wird")]]))

i = {"n": "63", "a": "50", "b": "41"}
add(case("percent-half-up-vs-down", "de", "de", False, "follow-up", "answered requests", i,
    ["Von {n} Anfragen wurden {a} beantwortet. Quote in Prozent, kaufmännisch auf eine Nachkommastelle gerundet?",
     "Im Folgemonat waren es {b} von {n}. Laut Vorgabe diesmal auf eine Nachkommastelle abrunden. Quote?"],
    [[pct("Quote", rnd(D(50) / 63 * 100, "0.1"), "round(mul(div(50, 63), 100), 1)")],
     [pct("Quote", rnd(D(41) / 63 * 100, "0.1", "down"), 'roundTo(mul(div(41, 63), 100), 0.1, "down")')]],
    [[bad("Quote", "percent", rnd(D(50) / 63 * 100, "0.1", "down"), "abgeschnitten statt kaufmännisch")],
     [bad("Quote", "percent", rnd(D(41) / 63 * 100, "0.1"), "kaufmännisch statt abgerundet")]]))

i = {"area": "87", "coats": "2", "cov": "7.5", "bucket": "2.5", "price": "26.50"}
litres = D(87) * 2 / D("7.5")
buckets = rnd(litres / D("2.5"), "1", "up")
add(case("whole-buckets", "de", "de", True, "follow-up", "wall paint", i,
    ["Ich streiche {area} m² Wand mit {coats} Anstrichen. Ein Liter Farbe reicht für {cov} m². Farbe gibt es nur in Eimern zu {bucket} Litern. Wie viele Liter brauche ich, und wie viele Eimer muss ich kaufen?",
     "Ein Eimer kostet {price} EUR. Was kosten die Eimer zusammen?"],
    [[num("Liter", litres, "div(mul(87, 2), 7.5)"), num("Eimer", buckets, 'roundTo(div(div(mul(87, 2), 7.5), 2.5), 1, "up")')],
     [money("Kosten", buckets * D("26.50"), 'mul(roundTo(div(div(mul(87, 2), 7.5), 2.5), 1, "up"), 26.50)', "EUR")]],
    [[bad("Eimer", "number", rnd(litres / D("2.5"), "1", "down"), "abgerundet: zu wenig Farbe")],
     [bad("Kosten", "money", rnd(litres / D("2.5"), "1", "down") * D("26.50"), "Preis für abgerundete Eimerzahl", "EUR"),
      bad("Kosten", "money", rnd(litres / D("2.5") * D("26.50")), "Preis für eine gebrochene Eimerzahl", "EUR")]]))

# ---------------------------------------------------------------- English (12)
i = {"net": "2365.70", "vat": "8.1", "vat2": "2.6"}


def swiss_vat(nt, vt):
    tax = rnd(nt * vt / 100)
    return tax, rnd(nt + tax, "0.05"), rnd(nt * vt / 100, "0.05")


va, vb = swiss_vat(D("2365.70"), D("8.1")), swiss_vat(D("2365.70"), D("2.6"))
add(case("swiss-total-only", "en", "ch", True, "follow-up", "Zurich supplier invoice", i,
    ["Invoice from a Zurich supplier: CHF {net} net, VAT {vat}%. VAT to the centime; only the invoice total is rounded to the nearest 5 centimes. VAT and total?",
     "What if the reduced rate of {vat2}% applies instead?"],
    [[money("VAT", va[0], "round(mul(2365.70, 0.081), 2)"), money("total", va[1], 'roundTo(add(2365.70, round(mul(2365.70, 0.081), 2)), 0.05, "half-up")')],
     [money("VAT", vb[0], "round(mul(2365.70, 0.026), 2)"), money("total", vb[1], 'roundTo(add(2365.70, round(mul(2365.70, 0.026), 2)), 0.05, "half-up")')]],
    [[bad("VAT", "money", va[2], "VAT rounded to 5 centimes although only the total is")],
     [bad("VAT", "money", vb[2], "VAT rounded to 5 centimes although only the total is")]]))

i = {"w1": "0.784", "p1": "31.60", "w2": "1.215", "p2": "8.90"}
m1, m2 = D("0.784") * D("31.60"), D("1.215") * D("8.90")
add(case("swiss-lines-vs-till", "en", "ch", True, "follow-up", "Geneva market stall", i,
    ["Market stall in Geneva, prices include VAT: {w1} kg of cheese at CHF {p1} per kg and {w2} kg of olives at CHF {p2} per kg. Round each line to the centime, then round only the total to 5 centimes. Each line and the total?",
     "The till actually rounds each line to 5 centimes before adding them. What total does it print?"],
    [[money("cheese", rnd(m1), "round(mul(0.784, 31.60), 2)"), money("olives", rnd(m2), "round(mul(1.215, 8.90), 2)"),
      money("total", rnd(rnd(m1) + rnd(m2), "0.05"), 'roundTo(add(round(mul(0.784, 31.60), 2), round(mul(1.215, 8.90), 2)), 0.05, "half-up")')],
     [money("till total", rnd(m1, "0.05") + rnd(m2, "0.05"), 'add(roundTo(mul(0.784, 31.60), 0.05, "half-up"), roundTo(mul(1.215, 8.90), 0.05, "half-up"))')]],
    [[bad("cheese", "money", rnd(m1, "0.05"), "line rounded to 5 centimes instead of the centime"),
      bad("olives", "money", rnd(m2, "0.05"), "line rounded to 5 centimes instead of the centime")],
     []]))

i = {"q1": "37", "p1": "1.235", "q2": "112", "p2": "0.4475", "q3": "18", "p3": "12.6625"}
n1, n2, n3 = D(37) * D("1.235"), D(112) * D("0.4475"), D(18) * D("12.6625")
add(case("each-line-vs-sum", "en", "en", True, "follow-up", "invoice lines", i,
    ["Invoice lines: {q1} units at ${p1}, {q2} units at ${p2}, {q3} units at ${p3}. Round each line amount to the cent (half up), then add the rounded lines. Each line and the invoice total?",
     "Our new ERP instead adds the unrounded line amounts and rounds only the total to the cent. What total does it show?"],
    [[money("line 1", rnd(n1), "round(mul(37, 1.235), 2)", "USD"), money("line 2", rnd(n2), "round(mul(112, 0.4475), 2)", "USD"),
      money("line 3", rnd(n3), "round(mul(18, 12.6625), 2)", "USD"),
      money("total", rnd(n1) + rnd(n2) + rnd(n3), "add(round(mul(37, 1.235), 2), round(mul(112, 0.4475), 2), round(mul(18, 12.6625), 2))", "USD")],
     [money("ERP total", rnd(n1 + n2 + n3), "round(add(mul(37, 1.235), mul(112, 0.4475), mul(18, 12.6625)), 2)", "USD")]],
    # No forbidden value: the wrong turn-1 total is the right turn-2 answer, and the reply may restate it.
    [[], []]))

i = {"bill": "48.69", "rate": "1.25", "amt": "739.60"}
add(case("half-even-explicit", "en", "en", True, "follow-up", "ledger with banker's rounding", i,
    ["Our ledger rounds to the cent using round-half-to-even (banker's rounding). We split ${bill} equally between two accounts. What amount does the ledger post to each?",
     "Same ledger: interest of {rate}% on ${amt}. What does it post?"],
    [[money("each account", rnd(D("48.69") / 2, "0.01", "half-even"), 'roundTo(div(48.69, 2), 0.01, "half-even")', "USD")],
     [money("interest", rnd(D("739.60") * D("0.0125"), "0.01", "half-even"), 'roundTo(mul(739.60, 0.0125), 0.01, "half-even")', "USD")]],
    [[bad("each account", "money", rnd(D("48.69") / 2), "rounded half up instead of half to even", "USD")],
     [bad("interest", "money", rnd(D("739.60") * D("0.0125")), "rounded half up instead of half to even", "USD")]]))

i = {"n": "3", "night": "142.50", "miles": "287", "mrate": "0.67", "miles2": "301"}
e1 = 3 * D("142.50") + 287 * D("0.67")
e2 = 3 * D("142.50") + 301 * D("0.67")
add(case("whole-dollars-half-up", "en", "en", True, "correction", "expense claim", i,
    ["Expense claim: {n} hotel nights at ${night} and {miles} miles at ${mrate} per mile. The policy pays the total rounded to whole dollars, half up. How much is paid?",
     "Correction: it was {miles2} miles. Amount paid?"],
    [[money("paid", rnd(e1, "1"), 'roundTo(add(mul(3, 142.50), mul(287, 0.67)), 1, "half-up")', "USD")],
     [money("paid", rnd(e2, "1"), 'roundTo(add(mul(3, 142.50), mul(301, 0.67)), 1, "half-up")', "USD")]],
    [[bad("paid", "money", rnd(e1, "1", "down"), "rounded down instead of half up", "USD")],
     [bad("paid", "money", rnd(e2, "1", "up"), "rounded up instead of half up", "USD")]]))

i = {"hours": "37.5", "rate": "18.37", "hours2": "22.25"}
v1, v2 = D("37.5") * D("18.37"), D("22.25") * D("18.37")
add(case("round-down-vs-up", "en", "en", True, "follow-up", "volunteer stipend", i,
    ["A volunteer stipend is {hours} hours at ${rate} an hour, always rounded down to the whole dollar. What is paid?",
     "For a second volunteer with {hours2} hours the rule is rounded up to the whole dollar instead. Amount?"],
    [[money("stipend", rnd(v1, "1", "down"), 'roundTo(mul(37.5, 18.37), 1, "down")', "USD")],
     [money("stipend", rnd(v2, "1", "up"), 'roundTo(mul(22.25, 18.37), 1, "up")', "USD")]],
    [[bad("stipend", "money", rnd(v1, "1"), "rounded half up instead of down", "USD")],
     [bad("stipend", "money", rnd(v2, "1", "down"), "rounded down instead of up", "USD")]]))

i = {"s": "389", "v": "5212", "s2": "431", "v2": "5630"}
add(case("percent-one-decimal", "en", "en", False, "follow-up", "conversion rate", i,
    ["Last week we had {s} sign-ups from {v} visits. What is the conversion rate as a percentage, rounded to one decimal place?",
     "This week {s2} sign-ups from {v2} visits. Same rounding?"],
    [[pct("conversion rate", rnd(D(389) / 5212 * 100, "0.1"), "round(mul(div(389, 5212), 100), 1)")],
     [pct("conversion rate", rnd(D(431) / 5630 * 100, "0.1"), "round(mul(div(431, 5630), 100), 1)")]],
    [[bad("conversion rate", "percent", rnd(D(389) / 5212 * 100, "0.1", "down"), "truncated instead of rounded")],
     [bad("conversion rate", "percent", rnd(D(431) / 5630 * 100, "0.1", "down"), "truncated instead of rounded")]]))

i = {"need": "1350", "box": "200", "price": "8.95", "tax": "7"}
boxes = rnd(D(1350) / 200, "1", "up")
few = rnd(D(1350) / 200, "1", "down")


def order(bx):
    sub = bx * D("8.95")
    return sub + rnd(sub * D("0.07"))


add(case("whole-boxes", "en", "en", True, "follow-up", "screws in boxes", i,
    ["I need {need} screws and they come in boxes of {box}. How many boxes must I buy?",
     "A box costs ${price}, plus {tax}% sales tax on the order, tax rounded to the cent. Order total?"],
    [[num("boxes", boxes, 'roundTo(div(1350, 200), 1, "up")')],
     [money("order total", order(boxes), 'add(mul(roundTo(div(1350, 200), 1, "up"), 8.95), round(mul(mul(roundTo(div(1350, 200), 1, "up"), 8.95), 0.07), 2))', "USD")]],
    [[bad("boxes", "number", few, "rounded down: too few screws")],
     [bad("order total", "money", order(few), "priced for the rounded-down box count", "USD")]]))

i = {"cost": "0.83", "markup": "35", "cost2": "1.27"}
x1, x2 = D("0.83") * D("1.35"), D("1.27") * D("1.35")
add(case("up-to-ten-cents", "en", "en", False, "follow-up", "vending price", i,
    ["Vending price: cost ${cost} plus {markup}% markup, rounded up to the next 10 cents. Selling price?",
     "Cost ${cost2}, same rule?"],
    [[money("price", rnd(x1, "0.10", "up"), 'roundTo(mul(0.83, 1.35), 0.10, "up")', "USD")],
     [money("price", rnd(x2, "0.10", "up"), 'roundTo(mul(1.27, 1.35), 0.10, "up")', "USD")]],
    [[bad("price", "money", rnd(x1, "0.10"), "rounded to the nearest 10 cents instead of up", "USD")],
     [bad("price", "money", rnd(x2, "0.10"), "rounded to the nearest 10 cents instead of up", "USD")]]))

i = {"list": "6840.00", "disc": "4", "vat": "8.1", "disc2": "7"}
ea, eb = swiss_quote(D("6840"), D("4"), D("8.1")), swiss_quote(D("6840"), D("7"), D("8.1"))
fa, fb = swiss_quote_derivation("6840", "0.04", "0.081"), swiss_quote_derivation("6840", "0.07", "0.081")
add(case("swiss-discount-vat-total", "en", "ch", True, "correction", "Lausanne quote", i,
    ["Quote from Lausanne: CHF {list} net, {disc}% discount, then {vat}% VAT on the discounted amount. Discount and VAT to the centime, only the total rounded to 5 centimes. Discount, VAT and total?",
     "The discount is {disc2}%, not {disc}%. Discount, VAT and total?"],
    [[money("discount", ea[0], fa[0]), money("VAT", ea[1], fa[1]), money("total", ea[2], fa[2])],
     [money("discount", eb[0], fb[0]), money("VAT", eb[1], fb[1]), money("total", eb[2], fb[2])]],
    [[bad("VAT", "money", ea[3], "VAT rounded to 5 centimes although only the total is")],
     [bad("VAT", "money", eb[3], "VAT rounded to 5 centimes although only the total is")]]))

i = {"a": "13", "n": "80", "b": "29", "n2": "400"}
add(case("percent-half-even", "en", "en", False, "follow-up", "escalated tickets", i,
    ["{a} of {n} tickets were escalated. Give the share as a percentage to one decimal place; our style guide rounds exact halves to the even digit.",
     "And {b} of {n2}?"],
    [[pct("share", rnd(D(13) / 80 * 100, "0.1", "half-even"), 'roundTo(mul(div(13, 80), 100), 0.1, "half-even")')],
     [pct("share", rnd(D(29) / 400 * 100, "0.1", "half-even"), 'roundTo(mul(div(29, 400), 100), 0.1, "half-even")')]],
    [[bad("share", "percent", rnd(D(13) / 80 * 100, "0.1"), "rounded half up instead of half to even")],
     [bad("share", "percent", rnd(D(29) / 400 * 100, "0.1"), "rounded half up instead of half to even")]]))

i = {"g": "137", "seat": "8", "tray": "12", "more": "22"}
g2 = D(137 + 22)
add(case("whole-tables-trays", "en", "en", False, "follow-up", "event catering", i,
    ["Event for {g} guests. Tables seat {seat} and each catering tray serves {tray}. How many tables and how many trays, whole units only?",
     "{more} more guests confirmed. Tables and trays now?"],
    [[num("tables", rnd(D(137) / 8, "1", "up"), 'roundTo(div(137, 8), 1, "up")'), num("trays", rnd(D(137) / 12, "1", "up"), 'roundTo(div(137, 12), 1, "up")')],
     [num("tables", rnd(g2 / 8, "1", "up"), 'roundTo(div(add(137, 22), 8), 1, "up")'), num("trays", rnd(g2 / 12, "1", "up"), 'roundTo(div(add(137, 22), 12), 1, "up")')]],
    [[bad("tables", "number", rnd(D(137) / 8, "1", "down"), "rounded down: guests without a seat"), bad("trays", "number", rnd(D(137) / 12, "1", "down"), "rounded down: too little food")],
     [bad("tables", "number", rnd(g2 / 8, "1", "down"), "rounded down: guests without a seat"), bad("trays", "number", rnd(g2 / 12, "1", "down"), "rounded down: too little food")]]))


# ---------------------------------------------------------------- output
def value_text(item):
    v = D(item["value"])
    if item["kind"] == "money":
        return str(v.quantize(D("0.01")))
    return str(v.quantize(D(1))) if v == v.to_integral() else str(v)


def fact(item, locale):
    v = D(value_text(item))
    if item["kind"] == "percent":
        return f"{item['label']}: {fmt(v, locale)}{' %' if locale == 'de' else '%'}"
    unit = f" {item['currency']}" if item.get("currency") else ""
    return f"{item['label']}: {fmt(v, locale)}{unit}"


def build():
    out = []
    for n, c in enumerate(CASES, 1):
        values = {k: fmt(v, c["style"]) for k, v in c["inputs"].items()}
        turns = [t.format(**values) for t in c["turns"]]
        inputs = {D(v) for v in c["inputs"].values()}
        expected_values = {D(e["value"]) for e in sum(c["expected"], [])}
        for f in sum(c["forbidden"], []):
            # A forbidden value must never be a figure a correct answer could state or echo.
            assert D(f["value"]) not in expected_values | inputs, (n, f)
        for turn, items in zip(turns, c["expected"]):
            assert not all(fmt(D(value_text(e)), c["locale"]) in turn for e in items), n  # an echo cannot pass
        expected = [[{k: v for k, v in {**e, "value": value_text(e)}.items() if v is not None} for e in t] for t in c["expected"]]
        forbidden = [[{k: v for k, v in {**f, "value": value_text(f)}.items() if v is not None} for f in t] for t in c["forbidden"]]
        out.append({
            "id": f"round1-{n:02d}",
            "family": "arithmetic",
            "category": c["category"],
            "locale": c["locale"],
            "critical": c["critical"],
            "secondTurn": c["second"],
            "synthetic": True,
            "query": c["source"],
            "source": c["source"],
            "turns": turns,
            "expected": [[{"label": e["label"], "kind": e["kind"], "value": e["value"], **({"currency": e["currency"]} if "currency" in e else {}), "derivation": e["derivation"]} for e in t] for t in expected],
            "forbidden": [[{"label": f["label"], "kind": f["kind"], "value": f["value"], **({"currency": f["currency"]} if "currency" in f else {}), "reason": f["reason"]} for f in t] for t in forbidden],
            "mandatoryFacts": ["; ".join(fact(e, c["locale"]) for e in t) for t in expected],
            "forbiddenConclusions": [],
            "sources": [],
            "humanScores": None,
        })
    return {
        "status": "ROUNDING SET v1. Written 14 November 2026 before any change to the code-tool instruction; FROZEN by SHA-256 in tests/arithmetic-rounding-v1.test.ts; never used to tune an instruction.",
        "authoredOn": "2026-11-14",
        "synthetic": True,
        "note": "Generated once by make-rounding-v1.py with Python's decimal module; every value is re-derived by the test. 24 cases, 12 German and 12 English, about rounding rules stated in words. No item uses the scorer's rounding field: rounded figures must be stated exactly.",
        "cases": out,
    }


if __name__ == "__main__":
    path = Path(__file__).with_name("rounding-v1-20261114.json")
    path.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {path} ({len(CASES)} cases)")
