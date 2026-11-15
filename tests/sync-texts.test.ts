// Recovery key typing help on the engine's own format (src/SyncRecoveryKey.tsx on src/sync/crypto.ts),
// and the sync texts in both languages.
import { expect, it } from "vitest";
import { formatRecoveryKey, normalizeRecoveryKey, recoveryKeyHint } from "../src/SyncRecoveryKey";
import { encodeRecoveryKey } from "../src/sync/crypto";
import { PAIRING_CODE_LENGTH, normalizePairingCode, pairingCodeGroups } from "../src/SyncPairing";
import { backupPartsText, syncText, vaultUnlockText } from "../src/text/sync";

const newKey = () => encodeRecoveryKey(crypto.getRandomValues(new Uint8Array(16)));

it("groups as the engine does (7 groups of 4) and reads O as 0, I and L as 1", () => {
  const key = newKey();
  expect(formatRecoveryKey(key.replaceAll("-", "").toLowerCase())).toBe(key);
  expect(formatRecoveryKey(key.replaceAll("-", "").slice(0, 9))).toBe(key.slice(0, 11));
  expect(normalizeRecoveryKey(" ab-c d O i l ")).toBe("ABCD011");
});

it("hints: short, long, a foreign character, a typo caught by the engine's check, ok", () => {
  const key = newKey();
  const plain = key.replaceAll("-", "");
  expect(recoveryKeyHint("")).toEqual({ kind: "empty" });
  expect(recoveryKeyHint(plain.slice(0, 20))).toEqual({ kind: "short", missing: 8 });
  expect(recoveryKeyHint(plain + "AB")).toEqual({ kind: "long", extra: 2 });
  expect(recoveryKeyHint("U" + plain.slice(1))).toEqual({ kind: "character", character: "U" });
  expect(recoveryKeyHint(key)).toEqual({ kind: "ok" });
  expect(recoveryKeyHint(key.toLowerCase().replaceAll("0", "o"))).toEqual({ kind: "ok" });
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const typo = alphabet[(alphabet.indexOf(plain[3]) + 1) % 32];
  expect(recoveryKeyHint(plain.slice(0, 3) + typo + plain.slice(4))).toEqual({ kind: "typo" });
});

it("pairing codes: one length constant, read forgivingly, shown in two halves", () => {
  expect(PAIRING_CODE_LENGTH).toBe(6);
  expect(normalizePairingCode(" 12-3 456 ")).toBe("123456");
  expect(normalizePairingCode("7k3p-q9xa")).toBe("7K3PQ9XA");
  expect(normalizePairingCode("oil")).toBe("011");
  expect(pairingCodeGroups("123456")).toEqual(["123", "456"]);
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
  expect(syncText.en.recoveryHint).toContain("28");
  expect(backupPartsText.de.downloadPart(2, 3)).toBe("Teil 2 von 3 herunterladen");
});
