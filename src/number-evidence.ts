const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = [
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
const values = new Map([
  ...small.map((word, i) => [word, i] as const),
  ...tens.map((word, i) => [word, (i + 2) * 10] as const),
]);
const numberWords = new Set([
  ...values.keys(),
  "hundred",
  "thousand",
  "million",
  "billion",
  "trillion",
  "point",
  "minus",
  "negative",
  "and",
  "half",
  "quarter",
  "quarters",
  "halves",
  "third",
  "thirds",
  "fourth",
  "fourths",
  "fifth",
  "fifths",
  "sixth",
  "sixths",
  "seventh",
  "sevenths",
  "eighth",
  "eighths",
  "ninth",
  "ninths",
  "tenth",
  "tenths",
  "dozen",
  "dozens",
]);

// Narrow lexical normalization, not semantic extraction. Unsupported numeric
// phrases are rejected whole, so “one hundred” cannot supply an operand of 1.
export function evidenceNumberTokens(quote: string): string[] {
  const tokens = (quote.match(/[-+]?\d[\d.,eE+-]*/g) ?? []).map((t) =>
    t.replace(/[.,]+$/, ""),
  );
  const words = [...quote.toLowerCase().matchAll(/[a-z]+/g)];
  for (let i = 0; i < words.length; i++) {
    if (!numberWords.has(words[i][0]) || words[i][0] === "and") continue;
    const run = [words[i][0]];
    while (
      i + 1 < words.length &&
      numberWords.has(words[i + 1][0]) &&
      /^[\s-]+$/.test(
        quote.slice(words[i].index! + words[i][0].length, words[i + 1].index),
      )
    )
      run.push(words[++i][0]);
    while (run.at(-1) === "and") run.pop();
    if (run.length === 1 && values.has(run[0]))
      tokens.push(String(values.get(run[0])));
    else if (
      run.length === 2 &&
      tens.includes(run[0]) &&
      small.slice(1, 10).includes(run[1])
    )
      tokens.push(String(values.get(run[0])! + values.get(run[1])!));
  }
  return tokens;
}
