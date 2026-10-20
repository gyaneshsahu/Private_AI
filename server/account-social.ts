import { createPrivateKey, sign } from "node:crypto";
import { genericOAuth } from "better-auth/plugins";
import { google, apple } from "better-auth/social-providers";
import { authorizationCodeRequest, getOAuth2Tokens } from "better-auth/oauth2";
import { z } from "zod";
import {
  accountCallbackPaths,
  productionAccountTarget,
} from "../shared/account-design";

const credentialsSchema = z
  .object({
    google: z
      .object({
        clientId: z
          .string()
          .regex(/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/),
        clientSecret: z.string().min(16).max(4096),
      })
      .strict()
      .optional(),
    apple: z
      .object({
        clientId: z
          .string()
          .regex(/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/)
          .max(255),
        teamId: z.string().regex(/^[A-Z0-9]{10}$/),
        keyId: z.string().regex(/^[A-Z0-9]{10}$/),
        privateKey: z.string().min(100).max(8192),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ProductionSocialCredentials = z.infer<typeof credentialsSchema>;
/** Validate secret-file contents without exposing invalid values in diagnostics. */
export function parseSocialCredentials(
  input: unknown,
): ProductionSocialCredentials {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) throw Error("Invalid social sign-in configuration.");
  if (!parsed.data.google && !parsed.data.apple)
    throw Error("Social sign-in file must configure a provider.");
  return parsed.data;
}
type Provider = "google" | "apple";
const endpoints = {
  google: {
    discovery: "https://accounts.google.com/.well-known/openid-configuration",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
  },
  apple: {
    discovery: "https://appleid.apple.com/.well-known/openid-configuration",
    authorize: "https://appleid.apple.com/auth/authorize",
    token: "https://appleid.apple.com/auth/token",
  },
} as const;

/** Prepared server-only credentials; this module does not activate or provision providers. */
export function productionSocialProviders(input: ProductionSocialCredentials) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) throw Error("Invalid social sign-in configuration.");
  const credentials = parsed.data;
  let appleSecret: (() => string) | undefined;
  if (credentials.apple) {
    const { privateKey, clientId, keyId, teamId } = credentials.apple;
    try {
      const key = createPrivateKey(privateKey);
      if (
        key.asymmetricKeyType !== "ec" ||
        key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      )
        throw Error("Unsupported key");
      appleSecret = () => {
        const now = Math.floor(Date.now() / 1000);
        const encoded = [
          { alg: "ES256", kid: keyId, typ: "JWT" },
          {
            iss: teamId,
            sub: clientId,
            aud: "https://appleid.apple.com",
            iat: now,
            exp: now + 300,
          },
        ]
          .map((value) =>
            Buffer.from(JSON.stringify(value)).toString("base64url"),
          )
          .join(".");
        return `${encoded}.${sign("sha256", Buffer.from(encoded), { key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
      };
    } catch {
      throw Error("Invalid Apple sign-in signing key.");
    }
  }
  const providers = (["google", "apple"] as const).filter(
    (provider) => !!credentials[provider],
  );
  const configs: Parameters<typeof genericOAuth>[0]["config"] = providers.map(
    (providerId) => {
      const clientId = credentials[providerId]!.clientId;
      const profileReader = (providerId === "google" ? google : apple)({
        clientId,
      });
      return {
        providerId,
        clientId,
        discoveryUrl: endpoints[providerId].discovery,
        authorizationUrl: endpoints[providerId].authorize,
        tokenUrl: endpoints[providerId].token,
        requireIdTokenVerification: true,
        pkce: true,
        scopes: ["openid", "email"],
        responseType: "code",
        responseMode: providerId === "apple" ? "form_post" : "query",
        disableProviderLogout: true,
        getToken: async (data) => {
          if (
            data.redirectURI !==
              productionAccountTarget.origin +
                accountCallbackPaths[providerId] ||
            !data.codeVerifier
          )
            throw Error("Invalid social sign-in callback.");
          const request = await authorizationCodeRequest({
            ...data,
            options: {
              clientId,
              clientSecret:
                providerId === "apple"
                  ? appleSecret!()
                  : credentials.google!.clientSecret,
            },
            tokenEndpoint: endpoints[providerId].token,
          });
          return exchangeIdentityCode(providerId, request);
        },
        getUserInfo: async (tokens) => {
          if (!tokens.idToken) return null;
          // The generic OIDC provider verifies signature, issuer, audience and nonce first.
          const profile = await profileReader.getUserInfo(tokens);
          return profile
            ? {
                sub: profile.data.sub,
                email: profile.user.email,
                emailVerified: profile.user.emailVerified,
                name: "",
              }
            : null;
        },
      };
    },
  );
  const plugin = genericOAuth({ config: configs });
  const initialize = plugin.init;
  // Pinned library bounds discovery retries, but not initial discovery. A supplier
  // outage must not leave the independent email/passkey methods waiting forever.
  plugin.init = async (context) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        initialize(context),
        new Promise<Awaited<ReturnType<typeof initialize>>>((resolve) => {
          timer = setTimeout(
            () =>
              resolve({
                context: {
                  socialProviders: context.socialProviders,
                  genericOAuthPendingDiscovery: new Map(),
                },
              }),
            10000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  return { providers, plugin };
}

const tokenSchema = z.object({
  id_token: z.string().min(1).max(32768),
  access_token: z.string().max(16384).optional(),
  token_type: z.string().max(100).optional(),
  expires_in: z.number().nonnegative().finite().optional(),
});

/** Single exchange with a fixed endpoint, no redirects/retries, and a bounded body/deadline. */
async function exchangeIdentityCode(
  provider: Provider,
  request: Awaited<ReturnType<typeof authorizationCodeRequest>>,
) {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(endpoints[provider].token, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          redirect: "error",
          signal: abort.signal,
        });
        if (!response.ok || !response.body) throw Error("Exchange failed");
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            size += result.value.length;
            if (size > 65536 || abort.signal.aborted)
              throw Error("Exchange stopped");
            chunks.push(result.value);
          }
        } finally {
          void reader.cancel().catch(() => {});
          reader.releaseLock();
        }
        abort.signal.throwIfAborted();
        return getOAuth2Tokens(
          tokenSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))),
        );
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abort.abort();
          reject(Error("Exchange deadline"));
        }, 10000);
      }),
    ]);
  } catch {
    abort.abort();
    throw Error(
      "Social sign-in could not be confirmed. Start a new sign-in attempt.",
    );
  } finally {
    clearTimeout(timer);
  }
}
