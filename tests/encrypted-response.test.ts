import { it, expect } from "vitest";
import { Identity } from "ehbp";
// Locked SDK internals used only to construct an explicitly synthetic peer.
import {
  deriveResponseKeys,
  encryptChunk,
  bytesToHex,
  EXPORT_LABEL,
  EXPORT_LENGTH,
} from "../node_modules/ehbp/dist/esm/derive.js";

it("real SDK crypto accepts a synthetic response and rejects tampering, truncation, a wrong nonce and a different request context", async () => {
  const identity = await Identity.generate();
  const makeRequest = () =>
    identity.encryptRequestWithContext(
      new Request("https://fixture.invalid/chat", {
        method: "POST",
        body: "SYNTHETIC PRIVATE CANARY",
      }),
    );
  const encrypted = await makeRequest();
  expect(await encrypted.request.text()).not.toContain(
    "SYNTHETIC PRIVATE CANARY",
  );
  const context = encrypted.context!;
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const secret = await context.senderContext.Export(
    new TextEncoder().encode(EXPORT_LABEL),
    EXPORT_LENGTH,
  );
  const keys = await deriveResponseKeys(secret, context.requestEnc, nonce);
  const ciphertext = await encryptChunk(
    keys,
    0,
    new TextEncoder().encode("SYNTHETIC RESPONSE"),
  );
  const framed = new Uint8Array(4 + ciphertext.length);
  new DataView(framed.buffer).setUint32(0, ciphertext.length, false);
  framed.set(ciphertext, 4);
  const response = (body = framed, responseNonce = nonce) =>
    new Response(new Uint8Array(body).buffer, {
      headers: { "Ehbp-Response-Nonce": bytesToHex(responseNonce) },
    });
  const read = async (
    body = framed,
    responseNonce = nonce,
    requestContext = context,
  ) =>
    (
      await identity.decryptResponseWithContext(
        response(body, responseNonce),
        requestContext,
      )
    ).text();
  await expect(read()).resolves.toBe("SYNTHETIC RESPONSE");
  const altered = framed.slice();
  altered[altered.length - 1] ^= 1;
  await expect(read(altered)).rejects.toThrow();
  await expect(read(framed.slice(0, -1))).rejects.toThrow();
  await expect(
    read(framed, crypto.getRandomValues(new Uint8Array(32))),
  ).rejects.toThrow();
  const other = await makeRequest();
  await expect(read(framed, nonce, other.context!)).rejects.toThrow();
});
