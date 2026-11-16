// Usage meter (docs/usage-metering-20261115.md): the account's requests this week and today, per
// feature, its last requests, and the cost line under a calculation with code. Allowance units are
// called "requests", as everywhere else in the app. German has the same keys.
import { defineText } from "./core";
import type { Feature } from "../../shared/usage-config";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const featuresEn: Record<Feature, string> = {
  "chat-fast": "Fast message",
  "chat-thinking": "Thinking message",
  "code-followup": "Calculation step",
  retry: "Retry after a refusal",
  image: "Picture question",
  voice: "Voice recording",
  "research-plan": "Deep research: plan",
  "research-answer": "Deep research: answer",
  "background-run": "Background task",
  search: "Web search",
  "page-fetch": "Web page read",
};
const featuresDe: Record<Feature, string> = {
  "chat-fast": "Nachricht in „Schnell“",
  "chat-thinking": "Nachricht in „Gründlich“",
  "code-followup": "Rechenschritt",
  retry: "Neuer Versuch nach einer Ablehnung",
  image: "Frage zu einem Bild",
  voice: "Sprachaufnahme",
  "research-plan": "Tiefe Recherche: Plan",
  "research-answer": "Tiefe Recherche: Antwort",
  "background-run": "Hintergrundaufgabe",
  search: "Websuche",
  "page-fetch": "Webseite gelesen",
};

export const usageMeterText = defineText({
  en: {
    heading: "Your usage",
    label: "Usage this week and today",
    loading: "Loading your usage…",
    unavailable: "Your usage cannot be shown right now. It does not affect your chats.",
    week: (used: number, limit: number) => `This week: ${used} of ${limit} requests used`,
    left: (n: number) => `${n} left`,
    resets: (date: string) => `New requests from ${date}.`,
    today: (used: number, limit: number) => `Today (last 24 hours): ${used} of ${limit} requests used`,
    todayNoLimit: (used: number) => `Today (last 24 hours): ${used} requests used`,
    noPeriod: "No request allowance is active for this account.",
    compact: (left: number, limit: number) => `${left} of ${limit} requests left this week`,
    compactToday: (left: number) => `${left} left today`,
    byFeature: "This week by feature",
    feature: "Feature",
    requests: "Requests",
    charged: "Counted",
    tokens: "Tokens",
    tokensUnknown: "not reported",
    voiceMeasured: "counted by length",
    caps: "Daily limits",
    pictures: (used: number, cap: number) => `Picture questions: ${used} of ${cap}`,
    researchRuns: (used: number, cap: number) => `Deep research runs: ${used} of ${cap}`,
    searches: (used: number, cap: number) => `Web searches: ${used} of ${cap}`,
    recent: "Latest requests",
    none: "No requests yet in this period.",
    counted: (n: number) => `${n} ${plural(n, "request", "requests")}`,
    calculation: (units: number, steps: number) =>
      `Calculation with code: ${units} ${plural(units, "request", "requests")}, ${steps} ${plural(steps, "follow-up", "follow-ups")} at no charge`,
    tokensCount: (n: string) => `${n} tokens`,
    weights: (version: number) => `Weights version ${version}.`,
    fastCost: "A Fast message counts as 1 request.",
    costs: (thinking: number, image: number, research: number) =>
      `A Thinking message counts as ${thinking}, a picture question as ${image}, a deep research run as ${research}.`,
    voiceCost: (units: number, seconds: number) =>
      `Each voice part of up to ${seconds} seconds of your speech counts as ${units} ${plural(units, "request", "requests")}. Only your own speaking time counts toward the daily voice limit, not the processing or the AI speaking.`,
    tokensNote:
      "Tokens are the size of a question and its answer as the AI service counts them. Your browser reads them from the encrypted answer and tells our server the numbers only, never the text.",
    codeCost: (units: number, steps: number) =>
      `Used ${units} ${plural(units, "request", "requests")}; the calculation needed ${steps} more ${plural(steps, "step", "steps")} at no charge.`,
    codeCostCharged: (units: number, free: number, charged: number, extra: number) =>
      `Used ${units + extra} requests; the calculation needed ${free + charged} more steps: ${free} at no charge, ${charged} counted as a new message.`,
    ...featuresEn,
  },
  de: {
    heading: "Ihre Nutzung",
    label: "Nutzung in dieser Woche und heute",
    loading: "Ihre Nutzung wird geladen…",
    unavailable: "Ihre Nutzung kann gerade nicht angezeigt werden. Ihre Chats sind davon nicht betroffen.",
    week: (used: number, limit: number) => `Diese Woche: ${used} von ${limit} Anfragen genutzt`,
    left: (n: number) => `${n} übrig`,
    resets: (date: string) => `Neue Anfragen ab ${date}.`,
    today: (used: number, limit: number) => `Heute (letzte 24 Stunden): ${used} von ${limit} Anfragen genutzt`,
    todayNoLimit: (used: number) => `Heute (letzte 24 Stunden): ${used} Anfragen genutzt`,
    noPeriod: "Für dieses Konto ist kein Anfragekontingent aktiv.",
    compact: (left: number, limit: number) => `${left} von ${limit} Anfragen diese Woche übrig`,
    compactToday: (left: number) => `heute ${left} übrig`,
    byFeature: "Diese Woche nach Funktion",
    feature: "Funktion",
    requests: "Anfragen",
    charged: "Gezählt",
    tokens: "Tokens",
    tokensUnknown: "nicht gemeldet",
    voiceMeasured: "nach Länge gezählt",
    caps: "Tageslimits",
    pictures: (used: number, cap: number) => `Fragen zu Bildern: ${used} von ${cap}`,
    researchRuns: (used: number, cap: number) => `Tiefe Recherchen: ${used} von ${cap}`,
    searches: (used: number, cap: number) => `Websuchen: ${used} von ${cap}`,
    recent: "Letzte Anfragen",
    none: "In diesem Zeitraum noch keine Anfragen.",
    counted: (n: number) => `${n} ${plural(n, "Anfrage", "Anfragen")}`,
    calculation: (units: number, steps: number) =>
      `Berechnung mit Code: ${units} ${plural(units, "Anfrage", "Anfragen")}, ${steps} ${plural(steps, "Folgeschritt", "Folgeschritte")} ohne Anrechnung`,
    tokensCount: (n: string) => `${n} Tokens`,
    weights: (version: number) => `Gewichtung Version ${version}.`,
    fastCost: "Eine Nachricht in „Schnell“ zählt als 1 Anfrage.",
    costs: (thinking: number, image: number, research: number) =>
      `Eine Nachricht in „Gründlich“ zählt als ${thinking}, eine Frage zu einem Bild als ${image}, eine tiefe Recherche als ${research}.`,
    voiceCost: (units: number, seconds: number) =>
      `Jeder Sprachteil mit bis zu ${seconds} Sekunden Ihrer Sprache zählt als ${units} ${plural(units, "Anfrage", "Anfragen")}. Auf das tägliche Sprachlimit zählt nur Ihre eigene Sprechzeit, nicht die Verarbeitung und nicht die Sprachausgabe der KI.`,
    tokensNote:
      "Tokens sind die Größe einer Frage und ihrer Antwort, wie der KI-Dienst sie zählt. Ihr Browser liest sie aus der verschlüsselten Antwort und teilt unserem Server nur die Zahlen mit, nie den Text.",
    codeCost: (units: number, steps: number) =>
      `${units} ${plural(units, "Anfrage", "Anfragen")} genutzt; die Berechnung brauchte ${steps} ${plural(steps, "weiteren Schritt", "weitere Schritte")} ohne Anrechnung.`,
    codeCostCharged: (units: number, free: number, charged: number, extra: number) =>
      `${units + extra} Anfragen genutzt; die Berechnung brauchte ${free + charged} weitere Schritte: ${free} ohne Anrechnung, ${charged} als neue Nachricht gezählt.`,
    ...featuresDe,
  },
});
