/**
 * Passage search for large documents, on this device (docs/large-documents-20261114.md).
 * A classic word-overlap ranking (BM25): no model, no network, no dependency. The whole document
 * stays on the device; only the passages chosen here are sent with a question.
 */

/** Longest passage. About a third of a dense A4 page, so a page gives two to four passages. */
export const PASSAGE_CHARACTERS = 1200;
/**
 * Most passage text sent with one question, over all large documents together. Fixed, so one
 * question costs the same whatever the document's size. With the 32,000-character input limit it
 * leaves room for the instructions (about 4,000) and about 12,000 for earlier messages.
 */
export const PASSAGE_BUDGET = 14000;

/** Cuts text into passages of at most `size` characters. Nothing but white space is dropped. */
export function splitPassages(text: string, size = PASSAGE_CHARACTERS): string[] {
  const passages: string[] = [];
  let rest = text.trim();
  while (rest.length > size) {
    const window = rest.slice(0, size);
    // The last paragraph break in the second half, else a line break, a sentence end, a space.
    let cut = -1;
    for (const boundary of [/\n\s*\n/g, /\n/g, /[.!?…:;]["»“”)]?\s/g, /\s/g]) {
      for (const match of window.matchAll(boundary))
        if (match.index >= size / 2) cut = match.index + match[0].length;
      if (cut > 0) break;
    }
    if (cut < 0)
      // No white space at all: cut at the limit, but not through a surrogate pair.
      cut = /[\uD800-\uDBFF]/.test(window[size - 1]) ? size - 1 : size;
    passages.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) passages.push(rest);
  return passages;
}

// Words that say nothing about the topic, German and English, after folding (see `terms`).
const STOP_WORDS = new Set(
  (
    "aber alle allem allen aller als also am an auch auf aus bei bin bis bitte da damit dann das dass dem den denn der des dessen die dies diese diesem diesen dieser dieses doch dort du durch ein eine einem einen einer eines er es etwas fur gegen gibt hat hatte haben hier ich ihm ihn ihr ihre im in ins ist ja kann kein keine konnen man mehr mein mit muss nach nicht noch nun nur ob oder ohne sehr sein seine sich sie sind so soll uber um und uns unter vom von vor wann war waren warum was wegen weil welche welchem welchen welcher welches wenn wer werden wie wieder wir wird wo wurde wurden zu zum zur zwischen " +
    "a about all also am an and any are as at be been but by can could did do does for from had has have he her his how i if in into is it its may me more most my no not of on or our shall she should so some such than that the their them then there these they this those to under up us was we were what when where which who why will with would you your"
  ).split(" "),
);

/**
 * The search words of a text. Case, accents and umlauts are folded (ä and ae both become a, ß
 * becomes ss), so "Kuendigung" finds "Kündigung" and "Verträge" finds "Vertrag"; one common ending
 * is removed. Crude on purpose: both the question and the document go through the same steps.
 */
export function terms(text: string): string[] {
  const words =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss")
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const result: string[] = [];
  for (let word of words) {
    word = word.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
    if (STOP_WORDS.has(word) || (word.length < 2 && !/\d/.test(word))) continue;
    const stem = word.replace(/(ern|ing|em|en|er|es|ed|e|n|s)$/, "");
    result.push(stem.length >= 4 ? stem : word);
  }
  return result;
}

type Counted = { counts: Map<string, number>; length: number };
// Counting the words of a passage is the slow part; a passage object never changes, so once is enough.
const counted = new WeakMap<object, Counted>();
function count(passage: { text: string }): Counted {
  let entry = counted.get(passage);
  if (!entry) {
    const counts = new Map<string, number>();
    const words = terms(passage.text);
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    counted.set(passage, (entry = { counts, length: words.length }));
  }
  return entry;
}

/**
 * Chooses the passages that best match the question and fit the budget.
 * Returns their positions in document order. `matched` is false when no passage shares a word
 * with the question; then the start of the document is returned, and the caller must say so.
 * Words from the question before (`earlier`) count half, so a short follow-up keeps its topic.
 */
export function choosePassages(
  passages: readonly { text: string }[],
  question: string,
  earlier = "",
  budget = PASSAGE_BUDGET,
): { chosen: number[]; matched: boolean } {
  const weights = new Map<string, number>();
  for (const word of terms(earlier)) weights.set(word, 0.5);
  for (const word of terms(question)) weights.set(word, 1);
  // shortcut: a pasted page as a question would make ranking slow; only its first 48 distinct
  // words are used. Raise if users ask with long quotations.
  const asked = [...weights].slice(-48);
  const entries = passages.map(count);
  const average =
    entries.reduce((sum, entry) => sum + entry.length, 0) / (entries.length || 1) || 1;
  const scores = new Array<number>(passages.length).fill(0);
  for (const [word, weight] of asked) {
    // German compounds: "Frist" also finds "Kündigungsfrist" and the reverse, at half strength.
    const strengths = new Map<string, number>();
    const strength = (other: string) => {
      let value = strengths.get(other);
      if (value === undefined) {
        const [short, long] = other.length < word.length ? [other, word] : [word, other];
        value = other === word ? 1 : short.length >= 5 && long.includes(short) ? 0.5 : 0;
        strengths.set(other, value);
      }
      return value;
    };
    const frequency = entries.map((entry) => {
      let sum = 0;
      for (const [other, times] of entry.counts) sum += times * strength(other);
      return sum;
    });
    const containing = frequency.filter((value) => value > 0).length;
    if (!containing) continue;
    // BM25 with the usual constants (k1 = 1.2, b = 0.75).
    const rarity = Math.log(1 + (passages.length - containing + 0.5) / (containing + 0.5));
    frequency.forEach((value, index) => {
      if (value > 0)
        scores[index] +=
          (weight * rarity * value * 2.2) /
          (value + 1.2 * (0.25 + (0.75 * entries[index].length) / average));
    });
  }
  const best = Math.max(0, ...scores);
  const chosen: number[] = [];
  let left = budget;
  if (best > 0) {
    // A passage far weaker than the best one is noise: it costs tokens and distracts the model.
    const ranked = scores
      .map((score, index) => ({ score, index }))
      .filter((entry) => entry.score >= best * 0.2)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    for (const { index } of ranked)
      if (passages[index].text.length <= left) {
        chosen.push(index);
        left -= passages[index].text.length;
      }
  } else
    for (let index = 0; index < passages.length; index++) {
      if (passages[index].text.length > left) break;
      chosen.push(index);
      left -= passages[index].text.length;
    }
  return { chosen: chosen.sort((a, b) => a - b), matched: best > 0 };
}
