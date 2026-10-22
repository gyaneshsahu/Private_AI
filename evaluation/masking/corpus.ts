/**
 * Deterministic synthetic corpus for the identifier-masking benchmark.
 *
 * `generateSplit(seed, perCategory)` builds documents from the layouts in
 * `layouts.ts`, then applies the PDF wrap, invisible-character and OCR noise
 * models while keeping every ground-truth span exact. Ground truth covers the
 * kinds the product promises to mask (`IDENTIFIER_KINDS`); names and
 * addresses are carried separately as `notCovered` and are never counted as
 * misses of a promised kind.
 */
import type { IdentifierKind } from "../../src/identifier-masking";
import { Doc, type NotCoveredKind, type Part } from "./doc";
import {
  type BaseCategory,
  CATEGORIES,
  type Category,
  LAYOUTS,
  type Layout,
  SCAN_ONLY_LAYOUTS,
} from "./layouts";
import { Rng } from "./values";

export const CORPUS_SCHEMA_VERSION = 1;
/** Seed of the development split. The held-out seed lives only in write-heldout.ts. */
export const DEV_SEED = 20261022;
export const DEV_PER_CATEGORY = 60;

export interface TruthSpan {
  kind: IdentifierKind;
  start: number;
  end: number;
  variant: string;
}
export interface NotCoveredSpan {
  kind: NotCoveredKind;
  start: number;
  end: number;
}
export interface Sample {
  id: string;
  category: Category;
  layout: string;
  language: "de" | "en";
  ocr: boolean;
  /** OCR quality bucket for scans: clean, medium or poor. */
  ocrQuality?: "clean" | "medium" | "poor";
  text: string;
  spans: TruthSpan[];
  notCovered: NotCoveredSpan[];
}
export interface Corpus {
  schemaVersion: number;
  split: "dev" | "heldout";
  seed: number;
  perCategory: number;
  /** Scans get twice the documents: they reuse every other layout under noise. */
  scanPerCategory: number;
  samples: Sample[];
}

const INVISIBLES = ["​", "­", "‌", "﻿"];

/** Lower-case letters an English-only OCR model returns for German characters. */
const FOLD: Record<string, string> = {
  ä: "a",
  ö: "o",
  ü: "u",
  Ä: "A",
  Ö: "O",
  Ü: "U",
  ß: "B",
};
/** Character confusions typical of OCR on printed text (not calibrated on tesseract output). */
const CONFUSE: Record<string, string[]> = {
  "0": ["O", "o", "D"],
  "1": ["l", "I", "|"],
  "5": ["S"],
  "8": ["B"],
  "2": ["Z"],
  "6": ["b"],
  O: ["0"],
  I: ["1", "l"],
  l: ["1", "I"],
  S: ["5"],
  B: ["8"],
};

const OCR_LEVEL = { clean: 0.3, medium: 1, poor: 2.5 } as const;

function noisePart(part: Part, rng: Rng, level: number): string {
  let out = "";
  const identifier = part.kind !== undefined;
  for (let i = 0; i < part.text.length; i++) {
    const ch = part.text[i];
    if (FOLD[ch] && rng.chance(0.6)) {
      out += FOLD[ch];
      continue;
    }
    if (ch === " " && rng.chance((identifier ? 0.06 : 0.03) * level)) continue;
    if (identifier) {
      if (CONFUSE[ch] && rng.chance(0.012 * level)) {
        out += rng.pick(CONFUSE[ch]);
        continue;
      }
      if (ch === "." && rng.chance(0.05 * level)) {
        out += ",";
        continue;
      }
      if (ch === "/" && rng.chance(0.05 * level)) {
        out += rng.pick(["l", "1", "|"]);
        continue;
      }
      if (ch === "@" && rng.chance(0.03 * level)) {
        out += rng.pick(["©", "(a)", "&"]);
        continue;
      }
      if (/[0-9A-Za-z]/.test(ch) && part.text[i + 1] && /[0-9A-Za-z]/.test(part.text[i + 1]) && rng.chance(0.004 * level)) {
        out += ch + " ";
        continue;
      }
    } else {
      if (ch === "m" && rng.chance(0.015 * level)) {
        out += "rn";
        continue;
      }
      if (ch === ":" && rng.chance(0.1 * level)) continue;
      if (ch === "<" && rng.chance(0.03 * level)) {
        out += rng.pick(["«", "K", "<<"]);
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/** Breaks long lines at spaces, replacing a space by a newline (length-preserving). */
function wrapLines(text: string, width: number): string {
  const chars = [...text];
  let column = 0;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "\n") column = 0;
    else if (chars[i] === " " && column >= width) {
      chars[i] = "\n";
      column = 0;
    } else column++;
  }
  return chars.join("");
}

function finalize(
  doc: Doc,
  meta: Omit<Sample, "text" | "spans" | "notCovered">,
): Sample {
  const rng = doc.ctx.rng;
  let parts = doc.parts.map((part) => ({ ...part }));
  let quality: Sample["ocrQuality"];
  if (doc.ctx.ocr) {
    quality = rng.weighted<"clean" | "medium" | "poor">([
      ["clean", 40],
      ["medium", 40],
      ["poor", 20],
    ]);
    const level = OCR_LEVEL[quality];
    parts = parts.map((part) => ({ ...part, text: noisePart(part, rng, level) }));
  } else {
    for (const part of parts) {
      if (!part.kind) continue;
      if (doc.ctx.pdf && part.text.includes(" ") && rng.chance(0.1)) {
        const spaces = [...part.text.matchAll(/ /g)].map((m) => m.index!);
        const at = rng.pick(spaces);
        part.text = part.text.slice(0, at) + "\n" + part.text.slice(at + 1);
        part.variant += "+pdf-wrap";
      }
      if (doc.ctx.html && part.text.length > 4 && rng.chance(0.3)) {
        const at = rng.int(1, part.text.length - 2);
        part.text = part.text.slice(0, at) + rng.pick(INVISIBLES) + part.text.slice(at);
        part.variant += "+invisible";
      }
    }
  }
  let text = "";
  const spans: TruthSpan[] = [];
  const notCovered: NotCoveredSpan[] = [];
  for (const part of parts) {
    const start = text.length;
    text += part.text;
    if (part.kind)
      spans.push({ kind: part.kind, start, end: text.length, variant: part.variant ?? part.kind });
    else if (part.nc) notCovered.push({ kind: part.nc, start, end: text.length });
  }
  if (doc.ctx.ocr && rng.chance(0.5)) text = wrapLines(text, rng.int(30, 80));
  return { ...meta, ocrQuality: quality, text, spans, notCovered };
}

function build(layout: Layout, rng: Rng, ocr: boolean): Doc {
  const doc = new Doc({
    rng,
    lang: layout.lang,
    ocr,
    pdf: Boolean(layout.pdf),
    html: Boolean(layout.html),
    chat: Boolean(layout.chat),
  });
  layout.build(doc);
  return doc;
}

export function generateSplit(
  split: "dev" | "heldout",
  seed: number,
  perCategory: number,
): Corpus {
  const rng = new Rng(seed);
  const samples: Sample[] = [];
  for (const category of CATEGORIES) {
    const pool =
      category === "scan-ocr"
        ? [...LAYOUTS, ...SCAN_ONLY_LAYOUTS, ...SCAN_ONLY_LAYOUTS]
        : LAYOUTS.filter((layout) => layout.category === (category as BaseCategory));
    let round: Layout[] = [];
    const count = category === "scan-ocr" ? perCategory * 2 : perCategory;
    for (let i = 0; i < count; i++) {
      // Cycle through layouts so each one is represented, in shuffled order per round.
      if (round.length === 0) round = rng.shuffle([...pool]);
      const layout = round.pop()!;
      const ocr = category === "scan-ocr";
      const doc = build(layout, rng, ocr);
      const sample = finalize(doc, {
        id: `${split}-${category}-${String(i + 1).padStart(3, "0")}`,
        category,
        layout: ocr ? `ocr:${layout.name}` : layout.name,
        language: layout.lang,
        ocr,
      });
      if (!ocr) delete sample.ocrQuality;
      samples.push(sample);
    }
  }
  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    split,
    seed,
    perCategory,
    scanPerCategory: perCategory * 2,
    samples,
  };
}

/** Canonical serialisation: LF line endings, two-space indent, trailing newline. */
export function serializeCorpus(corpus: Corpus): string {
  return JSON.stringify(corpus, null, 2) + "\n";
}
