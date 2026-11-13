import type { RequestAllowance } from "../shared/contracts";
import type { Lang } from "./i18n";
import { usageText } from "./text/account";

/** Shown when the ledger has no allowance covering the current moment. */
export const noActivePlanMessage = usageText.en.noActivePlan;

/** Exact wording agreed for the cost figure; the provider bills interrupted requests too. */
export const costBasisSentence = usageText.en.costBasis;

export type ActiveAllowance = Exclude<RequestAllowance, { state: "unavailable" }>;

export function isActiveAllowance(
  allowance: RequestAllowance | undefined,
): allowance is ActiveAllowance {
  return !!allowance && allowance.state !== "unavailable";
}

const integer = {
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
  de: new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }),
};

export function formatCount(value: number, lang: Lang = "en"): string {
  return Number.isFinite(value) ? integer[lang].format(Math.max(0, value)) : "0";
}

/**
 * Renders a published-rate cost string as "USD 0.0123" (German: "0,0123 USD"). Tiny amounts keep
 * enough fraction digits to stay non-zero (up to six); nothing is rounded up
 * to a cent, and "0" renders as "USD 0".
 */
export function formatCostUsd(cost: string, lang: Lang = "en"): string {
  const usd = (amount: string) =>
    lang === "de" ? `${amount.replace(".", ",")} USD` : `USD ${amount}`;
  if (!/^\d{1,21}(\.\d{1,12})?$/.test(cost))
    return lang === "de" ? "USD-Betrag unbekannt" : "USD unknown";
  const [whole, fraction = ""] = cost.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  if (!trimmed) return usd(whole);
  const shown = trimmed.slice(0, 6).replace(/0+$/, "");
  if (!shown)
    return whole === "0"
      ? `${lang === "de" ? "weniger als" : "less than"} ${usd("0.000001")}`
      : usd(whole);
  return usd(`${whole}.${shown}`);
}

export function requestsRemainingHeading(allowance: ActiveAllowance, lang: Lang = "en"): string {
  return usageText[lang].remaining(formatCount(allowance.remaining, lang));
}

export function requestsUsedSentence(allowance: ActiveAllowance, lang: Lang = "en"): string {
  return usageText[lang].used(formatCount(allowance.used, lang), formatCount(allowance.limit, lang));
}

export function settlementSentence(allowance: ActiveAllowance, lang: Lang = "en"): string {
  return usageText[lang].settlement(
    formatCount(allowance.pending, lang),
    formatCount(allowance.uncertain, lang),
  );
}

export function meteredTokensSentence(allowance: ActiveAllowance, lang: Lang = "en"): string {
  // Zero metered requests means unknown token counts, not zero tokens (Privatemode never meters).
  if (allowance.meteredRequests === 0) return usageText[lang].noMetered;
  return usageText[lang].metered(
    formatCount(allowance.meteredRequests, lang),
    allowance.meteredRequests === 1,
    formatCount(allowance.promptTokens, lang),
    formatCount(allowance.completionTokens, lang),
  );
}

/** Cost line, or the honest absence when no metered request carried a published cost. */
export function publishedCostSentence(allowance: ActiveAllowance, lang: Lang = "en"): string {
  return allowance.costUsd === undefined
    ? usageText[lang].noCost
    : usageText[lang].cost(formatCostUsd(allowance.costUsd, lang));
}

export function unmeteredSentence(allowance: ActiveAllowance, lang: Lang = "en"): string {
  return usageText[lang].unmetered(
    formatCount(allowance.unmeteredRequests, lang),
    allowance.unmeteredRequests === 1,
  );
}

export function periodEndLabel(
  allowance: ActiveAllowance,
  locale?: string,
  lang: Lang = "en",
): string {
  const date = new Date(allowance.resetsAt);
  return Number.isNaN(date.getTime())
    ? usageText[lang].unknown
    : date.toLocaleString(locale, { timeZoneName: "short" });
}
