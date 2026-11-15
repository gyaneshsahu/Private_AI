// Display and typing help for the sync recovery key (docs/vault-sync-screens-20261115.md). Only for
// the screen: whether a key opens anything is decided by unlockWithRecoveryKey in src/sync/.
// Format (proposed to the core, see the doc): 26 characters of RFC 4648 base32 (A to Z, 2 to 7);
// 128 random bits fill the first 25 characters and the top 3 bits of the last; the last 2 bits are
// a check: (sum of (2 x position + 1) x value over the first 25 characters) mod 4. Odd weights make the check catch every single-character change except one that moves the value by a multiple of 4 (24 of 31 changes).
export const RECOVERY_KEY_LENGTH = 26;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Upper case, no spaces or dashes; 0, 1 and 8 (never used) read as O, I and B. */
export function normalizeRecoveryKey(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/8/g, "B");
}

/**
 * Groups of 4; in a complete key the short tail joins the last group (26: 4, 4, 4, 4, 4, 6), so
 * nothing jumps while typing. Keeps the engine's own groups when it sends them.
 */
export function recoveryKeyGroups(key: string): string[] {
  if (/[\s-]/.test(key.trim())) return key.trim().split(/[\s-]+/).filter(Boolean);
  const groups = key.match(/.{1,4}/g) ?? [];
  if (key.length >= RECOVERY_KEY_LENGTH && groups.length > 1 && groups.at(-1)!.length < 4)
    groups.splice(-2, 2, groups.at(-2)! + groups.at(-1)!);
  return groups;
}

export const formatRecoveryKey = (input: string) => recoveryKeyGroups(normalizeRecoveryKey(input)).join("-");

const check = (body: string) =>
  [...body].reduce((sum, character, index) => sum + (2 * index + 1) * ALPHABET.indexOf(character), 0) % 4;

/** Whether the last character's check bits fit the rest. */
export function recoveryKeyChecks(key: string): boolean {
  const value = normalizeRecoveryKey(key);
  if (value.length !== RECOVERY_KEY_LENGTH || [...value].some((c) => !ALPHABET.includes(c))) return false;
  return (ALPHABET.indexOf(value.at(-1)!) & 3) === check(value.slice(0, -1));
}

/** A new key in this format (for the stub and tests; the core makes the real one). */
export function makeRecoveryKey(random: Uint8Array = crypto.getRandomValues(new Uint8Array(26))): string {
  const body = Array.from(random.subarray(0, 25), (b) => ALPHABET[b & 31]).join("");
  return body + ALPHABET[((random[25] & 7) << 2) | check(body)];
}

export type RecoveryKeyHint =
  | { kind: "empty" }
  | { kind: "short"; missing: number }
  | { kind: "long"; extra: number }
  | { kind: "character"; character: string }
  | { kind: "typo" }
  | { kind: "ok" };

export function recoveryKeyHint(input: string): RecoveryKeyHint {
  const value = normalizeRecoveryKey(input);
  if (!value) return { kind: "empty" };
  const bad = [...value].find((c) => !ALPHABET.includes(c));
  if (bad) return { kind: "character", character: bad };
  if (value.length < RECOVERY_KEY_LENGTH) return { kind: "short", missing: RECOVERY_KEY_LENGTH - value.length };
  if (value.length > RECOVERY_KEY_LENGTH) return { kind: "long", extra: value.length - RECOVERY_KEY_LENGTH };
  return recoveryKeyChecks(value) ? { kind: "ok" } : { kind: "typo" };
}
