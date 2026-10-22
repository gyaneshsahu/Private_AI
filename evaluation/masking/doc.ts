/**
 * Document builder for the masking benchmark. A document is a list of parts;
 * identifier parts carry their kind, so ground-truth spans stay exact through
 * PDF-style wrapping, invisible characters and the OCR noise model.
 */
import type { IdentifierKind } from "../../src/identifier-masking";
import {
  type CardBrand,
  type DocumentKind,
  type Person,
  type PhoneType,
  Rng,
  formatBirthDate,
  formatCard,
  groupsOf4,
  makeCard,
  makeDocumentNumber,
  makeEmail,
  makeHealthInsuranceNumber,
  makeIban,
  makePensionNumber,
  makePhone,
  makeSteuernummer,
  makeTaxId,
  makeVatId,
} from "./values";

export type Lang = "de" | "en";
export type NotCoveredKind = "NAME" | "ADDRESS";

export interface Part {
  text: string;
  kind?: IdentifierKind;
  variant?: string;
  nc?: NotCoveredKind;
}

export interface Ctx {
  rng: Rng;
  lang: Lang;
  /** Text as a scan or screenshot would reach masking after OCR. */
  ocr: boolean;
  /** PDF text layer: pdfjs may break an identifier at a line end. */
  pdf: boolean;
  /** Copied from HTML: zero-width and soft-hyphen characters may sit inside values. */
  html: boolean;
  /** Typed by a person in a chat: lower case and compact forms are common. */
  chat: boolean;
}

export type Item = string | Part;
export type KvStyle = "colon" | "tab" | "dots" | "nextline" | "columns";

export class Doc {
  parts: Part[] = [];
  constructor(public ctx: Ctx) {}

  get r() {
    return this.ctx.rng;
  }
  get de() {
    return this.ctx.lang === "de";
  }
  /** Picks the German or English string for the document language. */
  t(de: string, en: string) {
    return this.de ? de : en;
  }

  add(...items: Item[]) {
    for (const item of items)
      this.parts.push(typeof item === "string" ? { text: item } : item);
    return this;
  }
  line(...items: Item[]) {
    return this.add(...items, "\n");
  }

  name(text: string): Part {
    return { text, nc: "NAME" };
  }
  address(text: string): Part {
    return { text, nc: "ADDRESS" };
  }
  fullName(p: Person): Part {
    return this.name(`${p.first} ${p.last}`);
  }

  iban(compact = makeIban(this.r)): Part {
    const r = this.r;
    let style = r.weighted<string>([
      ["grouped", 65],
      ["compact", 25],
      ["grouped-lower", this.ctx.chat ? 25 : 0],
      ["double-space", this.ctx.chat ? 0 : 5],
    ]);
    let text =
      style === "compact"
        ? compact
        : style === "double-space"
          ? compact.match(/.{1,4}/g)!.join("  ")
          : groupsOf4(compact);
    if (style === "grouped-lower") text = text.toLowerCase();
    if (style === "compact" && this.ctx.chat && r.chance(0.4)) {
      text = text.toLowerCase();
      style = "compact-lower";
    }
    return { text, kind: "IBAN", variant: `iban:${compact.slice(0, 2)}:${style}` };
  }

  card(brand?: CardBrand): Part {
    const r = this.r;
    const b =
      brand ??
      r.weighted<CardBrand>([
        ["visa", 50],
        ["mastercard", 40],
        ["amex", 10],
      ]);
    const style = r.weighted<string>([
      ["space", 60],
      ["dash", 10],
      ["compact", 30],
    ]);
    return {
      text: formatCard(makeCard(r, b), style),
      kind: "CARD",
      variant: `card:${b}:${style}`,
    };
  }

  taxId(): Part {
    const value = makeTaxId(this.r);
    const style = this.r.weighted<string>([
      ["2-3-3-3", 60],
      ["compact", 35],
      ["3-3-3-2", 5],
    ]);
    const text =
      style === "compact"
        ? value
        : style === "2-3-3-3"
          ? `${value.slice(0, 2)} ${value.slice(2, 5)} ${value.slice(5, 8)} ${value.slice(8)}`
          : `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 9)} ${value.slice(9)}`;
    return { text, kind: "TAX-ID", variant: `taxid:${style}` };
  }

  steuernummer(): Part {
    const { value, variant } = makeSteuernummer(this.r);
    return { text: value, kind: "TAX-ID", variant };
  }

  vatId(): Part {
    const value = makeVatId(this.r);
    const style = this.r.weighted<string>([
      ["compact", 70],
      ["spaced", 20],
      ["space-after-prefix", 10],
    ]);
    const text =
      style === "compact"
        ? value
        : style === "spaced"
          ? `DE ${value.slice(2, 5)} ${value.slice(5, 8)} ${value.slice(8)}`
          : `DE ${value.slice(2)}`;
    return { text, kind: "TAX-ID", variant: `vat:${style}` };
  }

  pension(p: Person): Part {
    const n = makePensionNumber(this.r, p.birth, p.last);
    const style = this.r.weighted<"spaced" | "compact" | "mixed">([
      ["spaced", 55],
      ["compact", 30],
      ["mixed", 15],
    ]);
    return { text: n[style], kind: "INSURANCE", variant: `pension:${style}` };
  }

  health(): Part {
    return {
      text: makeHealthInsuranceNumber(this.r),
      kind: "INSURANCE",
      variant: "health:compact",
    };
  }

  docNumber(kind: DocumentKind): Part {
    return {
      text: makeDocumentNumber(this.r, kind),
      kind: "ID-NUMBER",
      variant: `doc:${kind}`,
    };
  }

  email(p: Person | string, domain?: string): Part {
    const local = typeof p === "string" ? p : p.emailLocal;
    return {
      text: makeEmail(this.r, local, domain),
      kind: "EMAIL",
      variant: "email:plain",
    };
  }

  phone(type: PhoneType): Part {
    const { value, variant } = makePhone(this.r, type);
    return { text: value, kind: "PHONE", variant };
  }

  birth(p: Person): Part {
    const { value, variant } = formatBirthDate(this.r, p.birth, this.ctx.lang);
    return { text: value, kind: "BIRTH-DATE", variant };
  }

  /**
   * Label/value block. In OCR documents the reader may emit the label column
   * first and the value column after it, as tesseract does on two-column forms.
   */
  kv(rows: [string, ...Item[]][], allowed: KvStyle[] = ["colon"]) {
    const r = this.r;
    let style = r.pick(allowed);
    if (this.ctx.ocr && r.chance(0.25)) style = "columns";
    if (style === "columns") {
      for (const [label] of rows) this.line(label);
      this.line();
      for (const [, ...value] of rows) this.line(...value);
      return this;
    }
    for (const [label, ...value] of rows) {
      if (style === "colon") this.line(`${label}: `, ...value);
      else if (style === "tab") this.line(`${label}\t`, ...value);
      else if (style === "dots")
        this.line(`${label} ${".".repeat(Math.max(3, 24 - label.length))} `, ...value);
      else this.line(label, "\n", ...value);
    }
    return this;
  }
}
