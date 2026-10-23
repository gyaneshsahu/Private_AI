/**
 * Turns the hand-written documents into scored samples: removes the markup
 * and records exact character spans. Promised kinds become ground truth;
 * names and addresses become `notCovered` spans, which the scorer only
 * counts (how many were left in clear) and never treats as misses.
 *
 * This file and the documents import nothing from the benchmark generator.
 */
import { createHash } from "node:crypto";
import { DOCUMENTS_PART_1, type HandDocument, type IndependentCategory } from "./documents";
import { DOCUMENTS_PART_2 } from "./documents-2";

/** The kinds the product promises to mask; the test checks this equals the detector's list. */
export const PROMISED_KINDS = [
  "IBAN",
  "CARD",
  "TAX-ID",
  "INSURANCE",
  "ID-NUMBER",
  "EMAIL",
  "PHONE",
  "BIRTH-DATE",
] as const;
export type PromisedKind = (typeof PROMISED_KINDS)[number];
export type NotCoveredKind = "NAME" | "ADDRESS";

const CODES: Record<string, PromisedKind | NotCoveredKind> = {
  IBAN: "IBAN",
  CARD: "CARD",
  TAX: "TAX-ID",
  INS: "INSURANCE",
  IDN: "ID-NUMBER",
  MAIL: "EMAIL",
  TEL: "PHONE",
  DOB: "BIRTH-DATE",
  NAME: "NAME",
  ADDR: "ADDRESS",
};

export interface IndependentSpan {
  kind: PromisedKind;
  start: number;
  end: number;
  variant: string;
}
export interface IndependentNotCovered {
  kind: NotCoveredKind;
  start: number;
  end: number;
}
export interface IndependentSample {
  id: string;
  category: IndependentCategory;
  layout: string;
  language: "de" | "en" | "mixed";
  ocr: boolean;
  note: string;
  text: string;
  spans: IndependentSpan[];
  notCovered: IndependentNotCovered[];
}
export interface IndependentCorpus {
  schemaVersion: 1;
  split: "independent";
  source: string;
  samples: IndependentSample[];
}

const MARK = /⟦([A-Z]+)(?:~([a-z0-9-]+))?\|([^⟦⟧]*)⟧/gu;

export function parseMarked(marked: string): {
  text: string;
  spans: IndependentSpan[];
  notCovered: IndependentNotCovered[];
} {
  let text = "";
  let last = 0;
  const spans: IndependentSpan[] = [];
  const notCovered: IndependentNotCovered[] = [];
  for (const match of marked.matchAll(MARK)) {
    const [whole, code, variant, value] = match;
    const kind = CODES[code];
    if (!kind) throw new Error(`unknown markup code ${code} in ${whole}`);
    if (!value.trim()) throw new Error(`empty span ${whole}`);
    text += marked.slice(last, match.index);
    const start = text.length;
    text += value;
    const end = text.length;
    last = match.index! + whole.length;
    if (kind === "NAME" || kind === "ADDRESS") notCovered.push({ kind, start, end });
    else spans.push({ kind, start, end, variant: variant ?? "plain" });
  }
  text += marked.slice(last);
  if (/[⟦⟧]/u.test(text)) throw new Error(`unbalanced markup near: ${text.slice(text.search(/[⟦⟧]/u) - 40, text.search(/[⟦⟧]/u) + 10)}`);
  return { text, spans, notCovered };
}

export const ALL_DOCUMENTS: HandDocument[] = [...DOCUMENTS_PART_1, ...DOCUMENTS_PART_2];

export function buildIndependentCorpus(): IndependentCorpus {
  const ids = new Set<string>();
  const samples = ALL_DOCUMENTS.map((doc) => {
    if (ids.has(doc.id)) throw new Error(`duplicate document id ${doc.id}`);
    ids.add(doc.id);
    const { text, spans, notCovered } = parseMarked(doc.marked);
    return {
      id: doc.id,
      category: doc.category,
      layout: doc.layout,
      language: doc.language,
      ocr: doc.ocr,
      note: doc.note,
      text,
      spans,
      notCovered,
    };
  });
  return {
    schemaVersion: 1,
    split: "independent",
    source: "hand-written for this check; evaluation/masking/independent/documents*.ts",
    samples,
  };
}

export function corpusSha256(corpus: IndependentCorpus): string {
  return createHash("sha256").update(JSON.stringify(corpus)).digest("hex");
}
