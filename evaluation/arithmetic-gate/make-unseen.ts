// Writes unseen-20261023.json: a second set never used for tuning (owner,
// 23 October 2026), in styles the practice set and the frozen gate do not
// use: Swiss and French number formats, numbers written in words, multi-step
// tax calculations, stated rounding rules including Swiss five-cent rounding,
// and date arithmetic. Expected values are computed here with decimal and
// calendar arithmetic; none is typed by hand. The set is kept apart from
// practice.json and cases.json and is run once per model and arm.
//   node --import tsx evaluation/arithmetic-gate/make-unseen.ts
import { writeFileSync } from "node:fs";
import { D, type Dec } from "../../src/arithmetic/numbers";
import type { GateCase } from "./scorer";

type Locale = "de" | "en";
type Expected = GateCase["expected"][number][number];
const d = (v: string | number | Dec) => new D(v);
const money = (
  v: Dec,
  label: string,
  currency?: "EUR" | "USD" | "GBP",
): Expected => ({
  label,
  kind: "money",
  value: v.toFixed(2),
  ...(currency ? { currency } : {}),
  rounding: { decimals: 2 },
  derivation: `unseen:${label}`,
});
const number = (
  v: Dec,
  label: string,
  decimals = 2,
  unit?: "days" | "months",
): Expected => ({
  label,
  kind: "number",
  value: v.toFixed(decimals),
  ...(unit ? { unit } : {}),
  rounding: { decimals },
  derivation: `unseen:${label}`,
});
const percent = (v: Dec, label: string): Expected => ({
  label,
  kind: "percent",
  value: v.toDecimalPlaces(2).toString(),
  rounding: { decimals: 2 },
  derivation: `unseen:${label}`,
});
const date = (iso: string, label: string): Expected => ({
  label,
  kind: "date",
  value: iso,
  derivation: `unseen:${label}`,
});
const time = (hhmm: string, label: string): Expected => ({
  label,
  kind: "time",
  value: hhmm,
  derivation: `unseen:${label}`,
});

const swiss = (v: Dec) => {
  const [int, frac] = v.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${frac}`;
};
const french = (v: Dec) => {
  const [int, frac] = v.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${frac}`;
};
const roundTo5Rappen = (v: Dec) =>
  v.div("0.05").toDecimalPlaces(0, D.ROUND_HALF_UP).mul("0.05");
const addDays = (iso: string, days: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );
const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const base = (
  id: string,
  category: string,
  locale: Locale,
  critical: boolean,
  turns: [string, string],
  expected: [Expected[], Expected[]],
  forbidden: GateCase["forbidden"] = [[], []],
): GateCase => ({
  id,
  family: "arithmetic",
  category,
  locale,
  critical,
  secondTurn: "correction",
  synthetic: true,
  query: `unseen ${id}`,
  turns,
  expected,
  forbidden,
  mandatoryFacts: ["", ""],
  forbiddenConclusions: [],
  sources: [],
  humanScores: null,
});

const cases: GateCase[] = [];
// 1. Swiss VAT with five-cent rounding (CHF, apostrophe grouping, dot decimal).
{
  const net = d("1234.50"),
    rate = d("8.1"),
    rate2 = d("2.6");
  const vat = roundTo5Rappen(net.mul(rate).div(100)),
    vat2 = roundTo5Rappen(net.mul(rate2).div(100));
  cases.push(
    base(
      "unseen-01",
      "swiss-vat-rounding",
      "en",
      true,
      [
        `Net amount CHF ${swiss(net)}, Swiss VAT ${rate} %. Calculate the VAT and the gross amount, each rounded to 5 Rappen (0.05) as is customary in Switzerland.`,
        `The reduced rate of ${rate2} % applies instead. Please recalculate both, again rounded to 0.05.`,
      ],
      [
        [money(vat, "VAT"), money(net.add(vat), "Gross")],
        [money(vat2, "VAT"), money(net.add(vat2), "Gross")],
      ],
    ),
  );
}
// 2. French formats (thin-space grouping, comma decimal, HT/TTC).
{
  const ht = d("1234.56"),
    ht2 = d("2345.67"),
    rate = d("20");
  const tva = ht.mul(rate).div(100).toDecimalPlaces(2),
    tva2 = ht2.mul(rate).div(100).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-02",
      "french-vat",
      "de",
      true,
      [
        `Montant HT : ${french(ht)} €, TVA à ${rate} %. Calculez la TVA et le montant TTC, arrondis au centime.`,
        `Correction : le montant HT est ${french(ht2)} €. Recalculez la TVA et le TTC.`,
      ],
      [
        [money(tva, "TVA", "EUR"), money(ht.add(tva), "TTC", "EUR")],
        [money(tva2, "TVA", "EUR"), money(ht2.add(tva2), "TTC", "EUR")],
      ],
    ),
  );
}
// 3. Numbers written in words, English.
{
  const net = d("3210.45"),
    rate = d("19"),
    net2 = d("3120.45");
  const vat = net.mul(rate).div(100).toDecimalPlaces(2),
    vat2 = net2.mul(rate).div(100).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-03",
      "words-en",
      "en",
      false,
      [
        `The net price is three thousand two hundred and ten euros and forty-five cents. Add nineteen percent VAT and give me the VAT and the gross price in figures, rounded to the cent.`,
        `Sorry, the net price is three thousand one hundred and twenty euros and forty-five cents. Please recalculate both.`,
      ],
      [
        [money(vat, "VAT", "EUR"), money(net.add(vat), "Gross", "EUR")],
        [money(vat2, "VAT", "EUR"), money(net2.add(vat2), "Gross", "EUR")],
      ],
    ),
  );
}
// 4. Numbers written in words, German.
{
  const net = d("4567.80"),
    rate = d("7"),
    net2 = d("4576.80");
  const vat = net.mul(rate).div(100).toDecimalPlaces(2),
    vat2 = net2.mul(rate).div(100).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-04",
      "words-de",
      "de",
      false,
      [
        `Der Nettobetrag lautet viertausendfünfhundertsiebenundsechzig Euro und achtzig Cent, der Steuersatz sieben Prozent. Bitte Umsatzsteuer und Bruttobetrag in Ziffern, kaufmännisch auf Cent gerundet.`,
        `Korrektur: viertausendfünfhundertsechsundsiebzig Euro und achtzig Cent netto. Bitte neu berechnen.`,
      ],
      [
        [
          money(vat, "Umsatzsteuer", "EUR"),
          money(net.add(vat), "Brutto", "EUR"),
        ],
        [
          money(vat2, "Umsatzsteuer", "EUR"),
          money(net2.add(vat2), "Brutto", "EUR"),
        ],
      ],
    ),
  );
}
// 5. Multi-step German capital-gains tax with allowance and solidarity surcharge.
{
  const gains = d("5000"),
    allowance = d("1000"),
    allowance2 = d("2000"),
    taxRate = d("25"),
    soli = d("5.5");
  const step = (a: Dec) => {
    const taxable = gains.sub(a);
    const tax = taxable.mul(taxRate).div(100).toDecimalPlaces(2);
    const s = tax.mul(soli).div(100).toDecimalPlaces(2);
    return [
      money(tax, "Abgeltungsteuer", "EUR"),
      money(s, "Solidaritätszuschlag", "EUR"),
      money(tax.add(s), "Gesamtabzug", "EUR"),
      money(gains.sub(tax).sub(s), "Netto", "EUR"),
    ];
  };
  cases.push(
    base(
      "unseen-05",
      "multi-step-tax-de",
      "de",
      true,
      [
        `Kapitalerträge ${gains.toFixed(0)} EUR im Jahr, Sparer-Pauschbetrag ${allowance.toFixed(0)} EUR, Abgeltungsteuer ${taxRate} % auf den Rest, Solidaritätszuschlag ${soli.toString().replace(".", ",")} % auf die Steuer (keine Kirchensteuer). Bitte Steuer, Soli, Gesamtabzug und den verbleibenden Nettoertrag, jeweils auf Cent gerundet.`,
        `Korrektur: der Pauschbetrag beträgt ${allowance2.toFixed(0)} EUR (Zusammenveranlagung). Bitte alle vier Werte neu berechnen.`,
      ],
      [step(allowance), step(allowance2)],
    ),
  );
}
// 6. Multi-step English: discount, then VAT, stated order.
{
  const list = d("1200"),
    disc = d("15"),
    disc2 = d("10"),
    rate = d("20");
  const step = (p: Dec) => {
    const net = list.mul(d(100).sub(p)).div(100).toDecimalPlaces(2);
    const vat = net.mul(rate).div(100).toDecimalPlaces(2);
    return [
      money(net, "net after discount", "EUR"),
      money(vat, "VAT", "EUR"),
      money(net.add(vat), "total", "EUR"),
    ];
  };
  cases.push(
    base(
      "unseen-06",
      "multi-step-en",
      "en",
      true,
      [
        `List price 1,200.00 EUR. Apply a ${disc}% discount first, then add ${rate}% VAT on the discounted amount. Give the net after discount, the VAT and the total, rounded to the cent.`,
        `The discount is ${disc2}%, not ${disc}%. Please recalculate all three.`,
      ],
      [step(disc), step(disc2)],
    ),
  );
}
// 7. Stated rounding rule: always round down to whole euros.
{
  const gross = d("3456.78"),
    pct = d("42"),
    gross2 = d("3999.99");
  const step = (g: Dec) => [
    money(
      g.mul(pct).div(100).toDecimalPlaces(0, D.ROUND_DOWN),
      "pfändbar",
      "EUR",
    ),
  ];
  cases.push(
    base(
      "unseen-07",
      "rounding-down-de",
      "de",
      false,
      [
        `Vom Nettoeinkommen ${gross.toFixed(2).replace(".", ",")} EUR sind ${pct} % pfändbar. Der Betrag ist immer auf volle Euro abzurunden. Wie hoch ist der pfändbare Betrag?`,
        `Das Nettoeinkommen ist ${gross2.toFixed(2).replace(".", ",")} EUR. Bitte neu berechnen, wieder auf volle Euro abgerundet.`,
      ],
      [step(gross), step(gross2)],
    ),
  );
}
// 8. Stated rounding rule: to the nearest 10 cents, half up.
{
  const price = d("17.26"),
    qty = d(7),
    qty2 = d(9);
  const step = (q: Dec) => [
    money(
      price.mul(q).div("0.1").toDecimalPlaces(0, D.ROUND_HALF_UP).mul("0.1"),
      "amount",
      "EUR",
    ),
  ];
  cases.push(
    base(
      "unseen-08",
      "rounding-10-cents-en",
      "en",
      false,
      [
        `Unit price 17.26 EUR, quantity ${qty}. The invoice total is rounded to the nearest 10 cents (halves up). What is the amount?`,
        `Quantity ${qty2} instead. Same rounding rule. What is the amount?`,
      ],
      [step(qty), step(qty2)],
    ),
  );
}
// 9. Payment due date: invoice date plus 30 days, across a month end.
{
  const issued = "2026-01-31";
  cases.push(
    base(
      "unseen-09",
      "date-due-en",
      "en",
      true,
      [
        `An invoice dated 31 January 2026 is payable within 30 days. On which date is it due? Give the date.`,
        `The terms are 14 days, not 30. New due date?`,
      ],
      [
        [date(addDays(issued, 30), "due date")],
        [date(addDays(issued, 14), "due date")],
      ],
    ),
  );
}
// 10. Days between dates across a leap day, German.
{
  const a = "2028-02-27",
    b = "2028-03-05",
    a2 = "2027-02-27",
    b2 = "2027-03-05";
  cases.push(
    base(
      "unseen-10",
      "date-span-de",
      "de",
      false,
      [
        `Wie viele Tage liegen zwischen dem 27.02.2028 und dem 05.03.2028 (Differenz der Daten)?`,
        `Und zwischen dem 27.02.2027 und dem 05.03.2027?`,
      ],
      [
        [number(d(daysBetween(a, b)), "Tage", 0, "days")],
        [number(d(daysBetween(a2, b2)), "Tage", 0, "days")],
      ],
    ),
  );
}
// 11. Contract duration in months.
cases.push(
  base(
    "unseen-11",
    "date-months-de",
    "de",
    false,
    [
      `Ein Vertrag läuft vom 15.03.2024 bis einschließlich 14.03.2027. Wie viele Monate sind das?`,
      `Das Vertragsende ist der 14.09.2027. Wie viele Monate jetzt?`,
    ],
    [
      [number(d(36), "Monate", 0, "months")],
      [number(d(42), "Monate", 0, "months")],
    ],
  ),
);
// 12. Swiss annual salary with thirteenth month.
{
  const monthly = d("6500");
  cases.push(
    base(
      "unseen-12",
      "swiss-salary",
      "en",
      false,
      [
        `Monthly salary CHF ${swiss(monthly).replace(".00", ".–")}, paid 13 times a year. What is the annual gross salary in CHF?`,
        `Only 12 payments a year, no 13th salary. Annual gross?`,
      ],
      [[money(monthly.mul(13), "annual")], [money(monthly.mul(12), "annual")]],
    ),
  );
}
// 13. French percentage change.
{
  const before = d("920"),
    after = d("980"),
    after2 = d("1012");
  const change = (x: Dec) => x.sub(before).div(before).mul(100);
  cases.push(
    base(
      "unseen-13",
      "french-percent",
      "de",
      false,
      [
        `Mon loyer passe de ${french(before)} € à ${french(after)} €. Quelle est la hausse en pourcentage (deux décimales) ?`,
        `Pardon, le nouveau loyer est de ${french(after2)} €. Recalculez le pourcentage.`,
      ],
      [[percent(change(after), "hausse")], [percent(change(after2), "hausse")]],
    ),
  );
}
// 14. Compound interest, annual, English.
{
  const p = d("10000"),
    r = d("3");
  const fv = (years: number) =>
    p.mul(d(1).add(r.div(100)).pow(years)).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-14",
      "compound-en",
      "en",
      false,
      [
        `10,000.00 EUR at 3% per year, compounded annually for 2 years. Final amount and total interest, rounded to the cent?`,
        `For 3 years instead. Final amount and total interest?`,
      ],
      [
        [money(fv(2), "final", "EUR"), money(fv(2).sub(p), "interest", "EUR")],
        [money(fv(3), "final", "EUR"), money(fv(3).sub(p), "interest", "EUR")],
      ],
    ),
  );
}
// 15. Thin-space grouping, French, quantity times price.
{
  const price = d("1500"),
    q = d(3),
    q2 = d(4);
  cases.push(
    base(
      "unseen-15",
      "french-multiply",
      "de",
      false,
      [
        `Trois mensualités de ${french(price)} € chacune. Quel est le total ?`,
        `Finalement quatre mensualités. Quel est le total ?`,
      ],
      [
        [money(price.mul(q), "total", "EUR")],
        [money(price.mul(q2), "total", "EUR")],
      ],
    ),
  );
}
// 16. Date and time together: be at the airport 2 h 30 min before departure.
{
  const dep = 6 * 60 + 45;
  cases.push(
    base(
      "unseen-16",
      "date-time-en",
      "en",
      true,
      [
        `My flight departs on 3 November 2026 at 06:45. I must be at the airport 2 hours 30 minutes before departure. At what time must I be there? Give the clock time.`,
        `Make that 1 hour 45 minutes before departure. At what time?`,
      ],
      [[time(clock(dep - 150), "arrive")], [time(clock(dep - 105), "arrive")]],
      [
        [
          {
            label: "wrong",
            kind: "time",
            value: clock(dep - 150 - 60),
            reason: "unseen",
          },
        ],
        [],
      ],
    ),
  );
}

// --- Calculation kinds absent from the gate and the practice set (owner, 23 October) ---
// 17. Day-count conventions: actual/360 versus 30/360 on the same loan.
{
  const principal = d("50000"),
    rate = d("4.5");
  const days = daysBetween("2026-03-01", "2026-06-15"); // actual days
  const interestAct360 = principal
    .mul(rate)
    .div(100)
    .mul(days)
    .div(360)
    .toDecimalPlaces(2);
  // 30/360: (Y2-Y1)*360 + (M2-M1)*30 + (D2-D1), with D=31 treated as 30.
  const d30 = 3 * 30 + 15 - (0 * 30 + 1); // 1 March to 15 June = 104 days under 30/360
  const interest30360 = principal
    .mul(rate)
    .div(100)
    .mul(d30)
    .div(360)
    .toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-17",
      "day-count-en",
      "en",
      true,
      [
        `A loan of 50,000.00 EUR at 4.5% per year runs from 1 March 2026 to 15 June 2026. How much interest accrues under the actual/360 convention (actual days elapsed divided by 360)? Give the number of days and the interest, rounded to the cent.`,
        `And under the 30/360 convention (each month counted as 30 days)? Give the day count and the interest.`,
      ],
      [
        [
          number(d(days), "days", 0, "days"),
          money(interestAct360, "interest", "EUR"),
        ],
        [
          number(d(d30), "days", 0, "days"),
          money(interest30360, "interest", "EUR"),
        ],
      ],
    ),
  );
}
// 18. Reverse-charge VAT (§13b UStG): the recipient computes, declares and deducts the VAT; the invoice shows none.
{
  const net = d("8400"),
    rate = d("19"),
    net2 = d("12600");
  const vat = net.mul(rate).div(100).toDecimalPlaces(2),
    vat2 = net2.mul(rate).div(100).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-18",
      "reverse-charge-de",
      "de",
      true,
      [
        `Ein Unternehmer in Deutschland erhält von einem Bauunternehmer eine Rechnung über ${net.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},00 EUR netto mit dem Vermerk "Steuerschuldnerschaft des Leistungsempfängers" (Reverse Charge, 19 %). Welche Umsatzsteuer muss der Empfänger anmelden, welchen Vorsteuerabzug hat er bei voller Vorsteuerberechtigung, und welchen Betrag überweist er an den Bauunternehmer?`,
        `Korrektur: der Nettobetrag ist ${net2.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},00 EUR. Bitte alle drei Beträge neu.`,
      ],
      [
        [
          money(vat, "anzumeldende Umsatzsteuer", "EUR"),
          money(vat, "Vorsteuer", "EUR"),
          money(net, "Überweisung", "EUR"),
        ],
        [
          money(vat2, "anzumeldende Umsatzsteuer", "EUR"),
          money(vat2, "Vorsteuer", "EUR"),
          money(net2, "Überweisung", "EUR"),
        ],
      ],
    ),
  );
}
// 19. Currency conversion at a stated rate, both directions.
{
  const eur = d("2350"),
    rate = d("0.9472"),
    chf = d("4100");
  cases.push(
    base(
      "unseen-19",
      "currency-en",
      "en",
      false,
      [
        `At a rate of 1 EUR = 0.9472 CHF, how many CHF do I get for 2,350.00 EUR, rounded to the cent (0.01)?`,
        `And how many EUR do I need to buy 4,100.00 CHF at the same rate, rounded to the cent?`,
      ],
      [[money(eur.mul(rate), "CHF")], [money(chf.div(rate), "EUR", "EUR")]],
    ),
  );
}
// 20. Weighted average purchase price.
{
  const lots: [number, string][] = [
    [120, "42.50"],
    [80, "45.10"],
    [200, "41.90"],
  ];
  const total = lots.reduce((a, [q, p]) => a.add(d(p).mul(q)), d(0)),
    qty = lots.reduce((a, [q]) => a + q, 0);
  const lots2: [number, string][] = [
    [120, "42.50"],
    [80, "45.10"],
    [300, "41.90"],
  ];
  const total2 = lots2.reduce((a, [q, p]) => a.add(d(p).mul(q)), d(0)),
    qty2 = lots2.reduce((a, [q]) => a + q, 0);
  cases.push(
    base(
      "unseen-20",
      "weighted-average-de",
      "de",
      false,
      [
        `Ich habe Aktien in drei Tranchen gekauft: 120 Stück zu 42,50 EUR, 80 Stück zu 45,10 EUR und 200 Stück zu 41,90 EUR. Wie hoch ist der durchschnittliche Kaufpreis je Aktie (gewichtet, auf Cent gerundet) und der Gesamteinsatz?`,
        `Korrektur: die dritte Tranche waren 300 Stück. Durchschnittspreis und Gesamteinsatz neu?`,
      ],
      [
        [
          money(total.div(qty), "Durchschnittspreis", "EUR"),
          money(total, "Gesamteinsatz", "EUR"),
        ],
        [
          money(total2.div(qty2), "Durchschnittspreis", "EUR"),
          money(total2, "Gesamteinsatz", "EUR"),
        ],
      ],
    ),
  );
}
// 21. Proportional split of a shared cost by share of days.
{
  const cost = d("1830"),
    a = 14,
    b = 9,
    c = 7;
  const share = (n: number, total: number) =>
    cost.mul(n).div(total).toDecimalPlaces(2);
  cases.push(
    base(
      "unseen-21",
      "proportional-split-en",
      "en",
      false,
      [
        `Three flatmates split a 1,830.00 EUR bill in proportion to the nights each stayed: Ana 14 nights, Ben 9 nights, Cem 7 nights. What does each pay, rounded to the cent?`,
        `Cem stayed 11 nights, not 7. Recalculate all three shares.`,
      ],
      [
        [
          money(share(a, 30), "Ana", "EUR"),
          money(share(b, 30), "Ben", "EUR"),
          money(share(c, 30), "Cem", "EUR"),
        ],
        [
          money(share(a, 34), "Ana", "EUR"),
          money(share(b, 34), "Ben", "EUR"),
          money(share(11, 34), "Cem", "EUR"),
        ],
      ],
    ),
  );
}
// 22. Linear depreciation with first-year pro rata by months.
{
  const cost = d("24000"),
    years = 6;
  const annual = cost.div(years);
  const firstYear = annual.mul(4).div(12).toDecimalPlaces(2); // bought 1 September: 4 months
  const firstYear2 = annual.mul(10).div(12).toDecimalPlaces(2); // bought 1 March: 10 months
  cases.push(
    base(
      "unseen-22",
      "depreciation-de",
      "de",
      true,
      [
        `Ein Firmenwagen für 24.000,00 EUR netto wird am 1. September 2026 angeschafft und linear über 6 Jahre abgeschrieben, im Anschaffungsjahr zeitanteilig nach Monaten. Wie hoch ist die Jahres-AfA und die AfA für 2026?`,
        `Korrektur: Anschaffung am 1. März 2026. AfA 2026?`,
      ],
      [
        [
          money(annual, "Jahres-AfA", "EUR"),
          money(firstYear, "AfA 2026", "EUR"),
        ],
        [money(firstYear2, "AfA 2026", "EUR")],
      ],
    ),
  );
}
// 23. Payroll deductions with stated rates (no table lookup).
{
  const gross = d("4200"),
    gross2 = d("4500");
  const pension = d("9.3"),
    health = d("7.3"),
    extra = d("0.85"),
    care = d("1.8"),
    unemp = d("1.3"),
    tax = d("18.5");
  const step = (g: Dec) => {
    const social = g
      .mul(pension.add(health).add(extra).add(care).add(unemp))
      .div(100)
      .toDecimalPlaces(2);
    const t = g.mul(tax).div(100).toDecimalPlaces(2);
    return [
      money(social, "social contributions", "EUR"),
      money(t, "income tax", "EUR"),
      money(g.sub(social).sub(t), "net", "EUR"),
    ];
  };
  cases.push(
    base(
      "unseen-23",
      "payroll-en",
      "en",
      true,
      [
        `Monthly gross salary 4,200.00 EUR. Employee contributions: pension 9.3%, health 7.3% plus 0.85% supplementary, long-term care 1.8%, unemployment 1.3%, all on the gross. Income tax 18.5% of the gross (assume no allowances). Give the total social contributions, the income tax and the net pay, rounded to the cent.`,
        `Gross is 4,500.00 EUR instead. Recalculate the three figures.`,
      ],
      [step(gross), step(gross2)],
    ),
  );
}
// 24. Multi-step: discount, then VAT, then early-payment discount on the gross.
{
  const list = d("3000"),
    disc = d("12"),
    rate = d("19"),
    skonto = d("2");
  const step = (sk: Dec) => {
    const net = list.mul(d(100).sub(disc)).div(100).toDecimalPlaces(2);
    const gross = net.mul(d(100).add(rate)).div(100).toDecimalPlaces(2);
    const pay = gross.mul(d(100).sub(sk)).div(100).toDecimalPlaces(2);
    return [
      money(net, "Netto nach Rabatt", "EUR"),
      money(gross, "Brutto", "EUR"),
      money(pay, "Zahlbetrag", "EUR"),
    ];
  };
  cases.push(
    base(
      "unseen-24",
      "multi-step-skonto-de",
      "de",
      true,
      [
        `Listenpreis 3.000,00 EUR, Rabatt 12 %, darauf 19 % Umsatzsteuer, bei Zahlung innerhalb von 10 Tagen 2 % Skonto auf den Bruttobetrag. Bitte Netto nach Rabatt, Brutto und Zahlbetrag bei Skonto, jeweils auf Cent gerundet.`,
        `Das Skonto beträgt 3 %. Zahlbetrag neu (die anderen Werte unverändert)?`,
      ],
      [step(skonto), [step(d(3))[2]]],
    ),
  );
}
// 25. Simple average and the change needed to reach a target average.
{
  const marks = [d("2.3"), d("1.7"), d("3.0"), d("2.0")];
  const avg = marks.reduce((a, b) => a.add(b), d(0)).div(marks.length);
  const target = d("2.0");
  const needed = target.mul(5).sub(marks.reduce((a, b) => a.add(b), d(0)));
  cases.push(
    base(
      "unseen-25",
      "average-de",
      "de",
      false,
      [
        `Meine Noten sind 2,3, 1,7, 3,0 und 2,0. Wie hoch ist der Durchschnitt (zwei Nachkommastellen)?`,
        `Welche Note brauche ich in einer fünften Prüfung, damit der Durchschnitt genau 2,0 beträgt?`,
      ],
      [[number(avg, "Durchschnitt", 2)], [number(needed, "Note", 1)]],
    ),
  );
}

const out = {
  status: "UNSEEN_NOT_GATE_NOT_PRACTICE",
  authoredOn: "2026-10-23",
  synthetic: true,
  note: "Second unseen set in styles the practice set and the frozen gate do not use; generated by make-unseen.ts; never used for tuning; run once per model and arm; never pooled with cases.json or practice.json.",
  cases,
};
writeFileSync(
  "evaluation/arithmetic-gate/unseen-20261023.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`wrote ${cases.length} unseen cases`);
