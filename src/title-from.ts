/**
 * A chat's title from its first message: the first line, cut at a word boundary at or before
 * `max` characters, then "…". A single word longer than `max` is cut inside the word.
 */
export function titleFrom(text: string, max = 60): string {
  const line = text.trim().split("\n")[0].trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  const end = /\s/.test(line[max]) ? max : cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : cut).trimEnd()}…`;
}
