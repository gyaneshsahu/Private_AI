import { afterEach, expect, it, vi } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import { productionSocialProviders } from "../server/account-social";

const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const google = {
  clientId: "synthetic.apps.googleusercontent.com",
  clientSecret: "SYNTHETIC-secret-not-for-logs",
};
const apple = {
  clientId: "com.privateai.synthetic",
  teamId: "SYNTHETIC1",
  keyId: "SYNTHETIC2",
  privateKey: keys.privateKey
    .export({ format: "pem", type: "pkcs8" })
    .toString(),
};
const data = (provider: string) => ({
  code: "synthetic-code",
  codeVerifier: "synthetic-pkce",
  redirectURI: `https://app.cometrow.com/api/auth/callback/${provider}`,
});
const config = () =>
  productionSocialProviders({ google, apple }).plugin.options.config;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("bounds initial discovery and does not enable a provider from a late result", async () => {
  vi.useFakeTimers();
  let release!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    ),
  );
  const plugin = productionSocialProviders({ google }).plugin;
  const context = {
    socialProviders: [],
    logger: { error: vi.fn(), warn: vi.fn() },
  } as unknown as Parameters<typeof plugin.init>[0];
  const pending = plugin.init(context);
  await vi.advanceTimersByTimeAsync(10001);
  const result = await pending;
  expect(result.context.socialProviders).toEqual([]);
  expect(result.context.genericOAuthPendingDiscovery.size).toBe(0);
  release(
    Response.json({
      issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
      jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      id_token_signing_alg_values_supported: ["RS256"],
    }),
  );
  await vi.advanceTimersByTimeAsync(1);
  expect(result.context.socialProviders).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});

it("rejects malformed credentials and wrong Apple key types without exposing supplied secrets", () => {
  expect(() =>
    productionSocialProviders({
      google: { ...google, clientId: "untrusted.test" },
    }),
  ).toThrow("Invalid social sign-in configuration.");
  expect(() =>
    productionSocialProviders({
      apple: { ...apple, privateKey: "SYNTHETIC-SECRET".repeat(20) },
    }),
  ).toThrow("Invalid Apple sign-in signing key.");
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  expect(() =>
    productionSocialProviders({
      apple: {
        ...apple,
        privateKey: rsa.privateKey
          .export({ type: "pkcs8", format: "pem" })
          .toString(),
      },
    }),
  ).toThrow("Invalid Apple");
  expect(productionSocialProviders({ google }).providers).toEqual(["google"]);
  expect(productionSocialProviders({}).providers).toEqual([]);
});

it("signs a fresh five-minute Apple secret and sends identity-only code exchanges to fixed endpoints", async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return Response.json({
        id_token: "synthetic-identity",
        access_token: "synthetic-access",
        refresh_token: "must-discard",
        expires_in: 3600,
      });
    }),
  );
  const configs = config();
  for (const provider of configs) {
    const tokens = await provider.getToken!(data(provider.providerId));
    expect(tokens.idToken).toBe("synthetic-identity");
    expect(tokens.refreshToken).toBeUndefined();
    expect(provider.scopes).toEqual(["openid", "email"]);
    expect(provider.requireIdTokenVerification).toBe(true);
    expect(provider.pkce).toBe(true);
  }
  expect(requests.map((item) => item.url)).toEqual([
    "https://oauth2.googleapis.com/token",
    "https://appleid.apple.com/auth/token",
  ]);
  for (const { init } of requests) {
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(new URLSearchParams(String(init.body)).get("code_verifier")).toBe(
      "synthetic-pkce",
    );
  }
  const body = new URLSearchParams(String(requests[1].init.body));
  const token = body.get("client_secret")!;
  const [header, payload, signature] = token.split(".");
  expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject(
    { alg: "ES256", kid: apple.keyId },
  );
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  expect(claims).toMatchObject({
    iss: apple.teamId,
    sub: apple.clientId,
    aud: "https://appleid.apple.com",
  });
  expect(claims.exp - claims.iat).toBe(300);
  expect(
    verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: keys.publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    ),
  ).toBe(true);
  await expect(
    configs[0].getToken!({
      ...data("google"),
      redirectURI: "https://evil.test/callback",
    }),
  ).rejects.toThrow("Invalid social");
  expect(requests).toHaveLength(2);
});

it("rejects missing identity, oversized or failed token responses without retries or supplier error leakage", async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: "no-identity" }))
    .mockResolvedValueOnce(new Response("SYNTHETIC-SECRET".repeat(5000)))
    .mockResolvedValueOnce(
      Response.json({ error: "SYNTHETIC-SECRET" }, { status: 500 }),
    );
  vi.stubGlobal("fetch", read);
  const provider = config()[0];
  for (let i = 0; i < 3; i++)
    await expect(provider.getToken!(data("google"))).rejects.toThrow(
      "Social sign-in could not be confirmed.",
    );
  expect(read).toHaveBeenCalledTimes(3);
});

it("bounds a stalled token exchange and ignores a late success", async () => {
  vi.useFakeTimers();
  let complete!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  const read = vi.fn((_url: string, init: RequestInit) => {
    signal = init.signal as AbortSignal;
    return new Promise<Response>((resolve) => {
      complete = resolve;
    });
  });
  vi.stubGlobal("fetch", read);
  const attempt = config()[0].getToken!(data("google"));
  const rejected = expect(attempt).rejects.toThrow("could not be confirmed");
  await vi.advanceTimersByTimeAsync(10001);
  await rejected;
  expect(signal?.aborted).toBe(true);
  complete(Response.json({ id_token: "late-success" }));
  await vi.advanceTimersByTimeAsync(1);
  expect(read).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
