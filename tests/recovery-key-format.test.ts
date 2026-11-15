// Recovery key display and typing hints (src/recovery-key-format.ts), and the sync texts in both languages.
import { expect, it } from "vitest";
import {
  formatRecoveryKey,
  makeRecoveryKey,
  normalizeRecoveryKey,
  recoveryKeyChecks,
  recoveryKeyGroups,
  recoveryKeyHint,
} from "../src/recovery-key-format";
import { backupPartsText, syncText, vaultUnlockText } from "../src/text/sync";

it("makes 26-character keys that pass their own check and carry 128 random bits", () => {
  for (let i = 0; i < 200; i++) {
    const key = makeRecoveryKey();
    expect(key).toMatch(/^[A-Z2-7]{26}$/);
    expect(recoveryKeyChecks(key)).toBe(true);
  }
  // 25 x 5 bits plus the top 3 bits of the last character.
  const all = new Uint8Array(26).fill(255);
  expect(makeRecoveryKey(all).slice(0, 25)).toBe("7".repeat(25));
});

it("groups as 4, 4, 4, 4, 4, 6 when complete, without jumping while typing, and keeps the engine's groups", () => {
  const key = makeRecoveryKey();
  expect(recoveryKeyGroups(key).map((g) => g.length)).toEqual([4, 4, 4, 4, 4, 6]);
  expect(formatRecoveryKey(key.slice(0, 9))).toBe(`${key.slice(0, 4)}-${key.slice(4, 8)}-${key[8]}`);
  expect(recoveryKeyGroups("ABCDE-FGHIJ")).toEqual(["ABCDE", "FGHIJ"]);
});

it("normalizes case, spaces, dashes and the never-used 0, 1 and 8", () => {
  expect(normalizeRecoveryKey(" ab-c d 0 1 8 ")).toBe("ABCDOIB");
  const key = makeRecoveryKey();
  expect(recoveryKeyChecks(formatRecoveryKey(key).toLowerCase())).toBe(true);
});

it("hints: short, long, a foreign character, a typo caught by the check, ok", () => {
  const key = makeRecoveryKey();
  expect(recoveryKeyHint("")).toEqual({ kind: "empty" });
  expect(recoveryKeyHint(key.slice(0, 20))).toEqual({ kind: "short", missing: 6 });
  expect(recoveryKeyHint(key + "AB")).toEqual({ kind: "long", extra: 2 });
  expect(recoveryKeyHint("9" + key.slice(1))).toEqual({ kind: "character", character: "9" });
  expect(recoveryKeyHint(key)).toEqual({ kind: "ok" });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  // A change by one step always breaks the check (odd weight, mod 4).
  const typo = alphabet[(alphabet.indexOf(key[0]) + 1) % 32] + key.slice(1);
  expect(recoveryKeyHint(typo)).toEqual({ kind: "typo" });
  // Over all single-character changes in the first 25, the check catches 24 of 31 (odd weights, mod 4).
  let caught = 0,
    total = 0;
  for (let i = 0; i < 25; i++)
    for (const c of alphabet) {
      if (c === key[i]) continue;
      total++;
      if (!recoveryKeyChecks(key.slice(0, i) + c + key.slice(i + 1))) caught++;
    }
  expect(caught / total).toBeCloseTo(24 / 31, 5);
});

it("translates every sync text and keeps its numbers", () => {
  const numbers = (text: string) => (text.match(/\d[\d.,]*\d|\d/g) ?? []).map((n) => n.replace(/[.,]/g, "")).sort();
  const same = new Set(["stateOffline", "statusHeading"]);
  for (const [name, block] of Object.entries({ syncText, vaultUnlockText, backupPartsText }))
    for (const [key, en] of Object.entries(block.en)) {
      if (typeof en !== "string") continue;
      const de = (block.de as Record<string, unknown>)[key] as string;
      if (!same.has(key)) expect(de, `${name}.${key}`).not.toBe(en);
      expect(numbers(de), `${name}.${key}`).toEqual(numbers(en));
      expect(en + de, `${name}.${key}`).not.toContain("—");
    }
  expect(syncText.de.hintShort(3)).toContain("3");
  expect(backupPartsText.de.downloadPart(2, 3)).toBe("Teil 2 von 3 herunterladen");
});
