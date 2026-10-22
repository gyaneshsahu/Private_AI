// Evaluates the authored `derivation` of each expected value in cases.json so
// the frozen numbers can be re-checked independently of how they were typed.
// Only for the repository's own frozen case file; never for model output.
import { D, type Dec, formatClock, parseClock } from "./numbers";

type Num = Dec | number | string;
const d = (x: Num) => new D(x as never);
const helpers = {
  add: (...xs: Num[]) => xs.reduce<Dec>((a, x) => a.plus(d(x)), d(0)),
  sub: (a: Num, b: Num) => d(a).minus(d(b)),
  mul: (...xs: Num[]) => xs.reduce<Dec>((a, x) => a.times(d(x)), d(1)),
  div: (a: Num, b: Num) => d(a).div(d(b)),
  pow: (a: Num, n: number) => d(a).pow(n),
  /** Commercial rounding, half away from zero (the rounding every case states). */
  round: (x: Num, places: number) => d(x).toDecimalPlaces(places, D.ROUND_HALF_UP),
  clock: (hhmm: string) => parseClock(hhmm),
  fmtClock: (minutes: Num) => formatClock(d(minutes).toNumber()),
  hm: (h: number, m: number) => h * 60 + m,
  addDays: (iso: string, n: number) => {
    const t = new Date(`${iso}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  },
  daysBetween: (a: string, b: string) =>
    Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000),
};

export function evaluateDerivation(expression: string): string {
  if (!/^[\w\s.,()"'+:-]*$/.test(expression)) throw Error(`Unsupported derivation ${expression}`);
  const names = Object.keys(helpers);
  const fn = new Function(...names, `"use strict"; return (${expression});`);
  const result = fn(...names.map((n) => helpers[n as keyof typeof helpers]));
  return typeof result === "string" ? result : d(result).toString();
}
