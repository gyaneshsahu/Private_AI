// The sync key scheme (src/sync/crypto.ts, docs/vault-sync-20261115.md): vectors and tamper checks.
import { describe, expect, it } from "vitest";
import * as k from "../src/sync/crypto";
import { pairingCode as serverPairingCode } from "../server/vault-sync";

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

describe("pairing code", () => {
  it("is 6 digits from the new device's public key, the same in browser and server; another key gives another code", async () => {
    const a = await k.exportPublicKey((await k.newDeviceKeyPair()).publicKey);
    const code = await k.pairingCode(account, a);
    expect(code).toMatch(/^\d{6}$/);
    expect(serverPairingCode(account, Buffer.from(a))).toBe(code);
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) codes.add(await k.pairingCode(account, await k.exportPublicKey((await k.newDeviceKeyPair()).publicKey)));
    expect(codes.size).toBeGreaterThan(18);
    expect(codes.has(code)).toBe(false);
    // Fixed vector: the formula is pinned.
    expect(await k.pairingCode(account, new Uint8Array(65).fill(4))).toBe("453773");
  });
});
