// The sync key scheme (src/sync/crypto.ts, docs/vault-sync-20261115.md): vectors and tamper checks.
import { describe, expect, it } from "vitest";
import * as k from "../src/sync/crypto";

const account = "0b6a3f9e-2c51-4d7e-9a10-5f2e8c7d1b34";
const device = "6f1d2b3a-8c4e-4f5a-9b6c-7d8e9f0a1b2c";

describe("recovery key", () => {
  it("encodes 16 bytes as 7 groups of 4 with 2 check characters (test vector)", () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => i);
    const text = k.encodeRecoveryKey(bytes);
    expect(text).toBe("000G-40R4-0M30-E209-185G-R38E-1W73");
    expect(k.decodeRecoveryKey(text)).toEqual(bytes);
    // Lower case, spaces, and the look-alikes O, I, L are accepted.
    expect(k.decodeRecoveryKey(text.toLowerCase().replaceAll("-", " "))).toEqual(bytes);
  });
  it("the check catches every single-character typo and every adjacent swap", () => {
    for (let round = 0; round < 20; round++) {
      const { text, bytes } = k.newRecoveryKey();
      expect(k.decodeRecoveryKey(text)).toEqual(bytes);
      const clean = text.replaceAll("-", "");
      const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
      for (let i = 0; i < clean.length; i++) {
        for (const c of alphabet) {
          if (c === clean[i]) continue;
          expect(k.decodeRecoveryKey(clean.slice(0, i) + c + clean.slice(i + 1)), `typo at ${i}`).toBeNull();
        }
        if (i < clean.length - 1 && clean[i] !== clean[i + 1])
          expect(k.decodeRecoveryKey(clean.slice(0, i) + clean[i + 1] + clean[i] + clean.slice(i + 2)), `swap at ${i}`).toBeNull();
      }
      expect(k.decodeRecoveryKey(clean.slice(1))).toBeNull();
      expect(k.decodeRecoveryKey(`${clean}0`)).toBeNull();
    }
  });
  it("wraps AK; a wrong recovery key or another account cannot unwrap it", async () => {
    const ak = k.newAccountKey();
    const rk = k.newRecoveryKey();
    const blob = await k.wrapWithRecovery(ak, rk.bytes, account);
    expect(await k.unwrapWithRecovery(blob, rk.bytes, account)).toEqual(ak);
    await expect(k.unwrapWithRecovery(blob, k.newRecoveryKey().bytes, account)).rejects.toThrow();
    await expect(k.unwrapWithRecovery(blob, rk.bytes, "another-account")).rejects.toThrow();
  });
});

describe("device wrapper", () => {
  it("wraps AK to a non-extractable device key; another device, account or a flipped bit fails", async () => {
    const ak = k.newAccountKey();
    const pair = await k.newDeviceKeyPair();
    expect(pair.privateKey.extractable).toBe(false);
    const pub = await k.exportPublicKey(pair.publicKey);
    expect(pub).toHaveLength(65);
    const blob = await k.wrapToDevice(ak, pub, account, device);
    expect(await k.unwrapWithDevice(blob, pair.privateKey, account, device)).toEqual(ak);
    const other = await k.newDeviceKeyPair();
    await expect(k.unwrapWithDevice(blob, other.privateKey, account, device)).rejects.toThrow();
    await expect(k.unwrapWithDevice(blob, pair.privateKey, account, crypto.randomUUID())).rejects.toThrow();
    const raw = k.fromBase64(blob);
    raw[raw.length - 1] ^= 1;
    await expect(k.unwrapWithDevice(k.toBase64(raw), pair.privateKey, account, device)).rejects.toThrow();
    // A fresh ephemeral key per wrap: the same AK never gives the same blob.
    expect(await k.wrapToDevice(ak, pub, account, device)).not.toBe(blob);
  });
});

describe("items", () => {
  it("binds the ciphertext to account, item and version (AAD); tampering fails", async () => {
    const ak = k.newAccountKey();
    const id = await k.itemIdFor(ak, "conversation", "local-1");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await k.itemIdFor(ak, "conversation", "local-1")).toBe(id);
    expect(await k.itemIdFor(k.newAccountKey(), "conversation", "local-1")).not.toBe(id);
    const payload = { kind: "memories", data: [{ text: "secret canary" }] };
    const ct = await k.encryptItem(ak, account, id, 3, payload);
    expect(atob(ct)).not.toContain("canary");
    expect(await k.decryptItem(ak, account, id, 3, ct)).toEqual(payload);
    await expect(k.decryptItem(ak, account, id, 2, ct)).rejects.toThrow(); // an old version replayed as new
    await expect(k.decryptItem(ak, account, crypto.randomUUID(), 3, ct)).rejects.toThrow(); // swapped between items
    await expect(k.decryptItem(ak, "another-account", id, 3, ct)).rejects.toThrow();
    await expect(k.decryptItem(k.newAccountKey(), account, id, 3, ct)).rejects.toThrow();
    const raw = k.fromBase64(ct);
    raw[20] ^= 1;
    await expect(k.decryptItem(ak, account, id, 3, k.toBase64(raw))).rejects.toThrow();
  });
  it("labels and the account proof are bound to the account and device", async () => {
    const ak = k.newAccountKey();
    const label = await k.encryptLabel(ak, account, device, "Anna's phone");
    expect(await k.decryptLabel(ak, account, device, label)).toBe("Anna's phone");
    await expect(k.decryptLabel(ak, account, crypto.randomUUID(), label)).rejects.toThrow();
    expect(await k.accountProof(ak, account)).toBe(await k.accountProof(ak, account));
    expect(await k.accountProof(ak, account)).not.toBe(await k.accountProof(ak, "other"));
  });
});

describe("pairing (review H1)", () => {
  const pairingId = "3c1a9d2e-7b4f-4e6a-8c5d-9f0e1a2b3c4d";
  it("shows 40 random bits as 8 Crockford characters; reads them back forgiving case, spaces, hyphens, O, I and L (test vector)", () => {
    const bytes = Uint8Array.of(0, 1, 2, 3, 4);
    // The same bits as the start of the recovery-key vector below the 0..15 bytes: "000G-40R4".
    expect(k.encodePairingCode(bytes)).toBe("000G40R4");
    expect(k.formatPairingCode("7K3M9QXR")).toBe("7K3M-9QXR");
    expect(k.PAIRING_CODE_LENGTH).toBe(8);
    for (let i = 0; i < 20; i++) {
      const { bytes: secret, code } = k.newPairingSecret();
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(k.decodePairingCode(code)).toEqual(secret);
      expect(k.decodePairingCode(`${code.slice(0, 4).toLowerCase()} - ${code.slice(4)}`)).toEqual(secret);
    }
    expect(k.decodePairingCode("0OIL-0000")).toEqual(k.decodePairingCode("0011-0000"));
    for (const bad of ["1234567", "123456789", "UUUU-UUUU", "12345678!", ""]) expect(k.decodePairingCode(bad), bad).toBeNull();
  });
  it("commits without revealing the tag key: a swapped key gives another commitment; the tag checks only with the secret", async () => {
    const pub = await k.exportPublicKey((await k.newDeviceKeyPair()).publicKey);
    const other = await k.exportPublicKey((await k.newDeviceKeyPair()).publicKey);
    const { bytes: secret } = k.newPairingSecret();
    const mine = await k.pairingKeys(secret, account, pairingId, pub);
    expect(k.fromBase64(mine.commitment)).toHaveLength(32);
    // Deterministic for the same inputs; any change gives another commitment.
    expect((await k.pairingKeys(secret, account, pairingId, pub)).commitment).toBe(mine.commitment);
    expect((await k.pairingKeys(secret, account, pairingId, other)).commitment).not.toBe(mine.commitment);
    expect((await k.pairingKeys(secret, account, crypto.randomUUID(), pub)).commitment).not.toBe(mine.commitment);
    expect((await k.pairingKeys(secret, "another-account", pairingId, pub)).commitment).not.toBe(mine.commitment);
    expect((await k.pairingKeys(k.newPairingSecret().bytes, account, pairingId, pub)).commitment).not.toBe(mine.commitment);
    const wrapper = await k.wrapToDevice(k.newAccountKey(), pub, account, device);
    const tag = await k.pairingTag(mine.tagKey, pairingId, pub, wrapper);
    expect(await k.verifyPairingTag(mine.tagKey, pairingId, pub, wrapper, tag)).toBe(true);
    // Another wrapper, key or pairing under the same tag fails; so do junk tags.
    expect(await k.verifyPairingTag(mine.tagKey, pairingId, pub, await k.wrapToDevice(k.newAccountKey(), pub, account, device), tag)).toBe(false);
    expect(await k.verifyPairingTag(mine.tagKey, pairingId, other, wrapper, tag)).toBe(false);
    expect(await k.verifyPairingTag(mine.tagKey, crypto.randomUUID(), pub, wrapper, tag)).toBe(false);
    for (const junk of ["", "not base64!", k.toBase64(new Uint8Array(31))]) expect(await k.verifyPairingTag(mine.tagKey, pairingId, pub, wrapper, junk)).toBe(false);
    // What the server stores (the commitment) does not give the tag key: a tag keyed by HKDF of
    // the commitment, the derivation first proposed, does not verify.
    const fromCommitment = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("cometrow-sync-v1"), info: new TextEncoder().encode("cometrow-pair-tag-v1") },
          await crypto.subtle.importKey("raw", k.fromBase64(mine.commitment), "HKDF", false, ["deriveBits"]),
          256,
        ),
      ),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const forged = k.toBase64(new Uint8Array(await crypto.subtle.sign("HMAC", fromCommitment, new TextEncoder().encode(`result|${pairingId}|${k.toBase64(pub)}|${wrapper}`))));
    expect(await k.verifyPairingTag(mine.tagKey, pairingId, pub, wrapper, forged)).toBe(false);
  });
});

describe("tombstones (review H4)", () => {
  it("open only under the item key with the tombstone AAD: not as content, not at another version, item or account", async () => {
    const ak = k.newAccountKey();
    const id = await k.itemIdFor(ak, "conversation", "local-1");
    const t = await k.encryptTombstone(ak, account, id, 4, { kind: "conversation", at: "2026-11-15T10:00:00.000Z" });
    expect(await k.decryptTombstone(ak, account, id, 4, t)).toEqual({ kind: "conversation", at: "2026-11-15T10:00:00.000Z" });
    await expect(k.decryptItem(ak, account, id, 4, t)).rejects.toThrow(); // a tombstone is never content
    await expect(k.decryptTombstone(ak, account, id, 4, await k.encryptItem(ak, account, id, 4, { kind: "conversation", data: {} }))).rejects.toThrow();
    await expect(k.decryptTombstone(ak, account, id, 5, t)).rejects.toThrow();
    await expect(k.decryptTombstone(ak, account, crypto.randomUUID(), 4, t)).rejects.toThrow();
    await expect(k.decryptTombstone(ak, "another-account", id, 4, t)).rejects.toThrow();
    await expect(k.decryptTombstone(k.newAccountKey(), account, id, 4, t)).rejects.toThrow();
  });
});