import { pathToFileURL } from "node:url";
import { z } from "zod";

const statusSchema = z.object({
  accountId: z.string(),
  csrf: z.string().regex(/^[a-f0-9]{64}$/),
  accessEpoch: z.string().regex(/^[a-f0-9]{32}$/),
  inference: z.object({ ready: z.literal(false) }),
});

type Identity = { id: string; password: string };
type Options = {
  origin: string;
  identities: [Identity, Identity];
  local?: boolean;
};

export async function checkTrialIsolation(options: Options) {
  const evidence = {
    kind: "TWO_IDENTITY_ACCESS_CHECK",
    observedAt: new Date().toISOString(),
    transport: options.local ? "LOCAL_HTTP" : "HOSTED_HTTPS",
    result: "FAILED",
    stage: "CONFIGURATION",
    checks: [] as string[],
    requests: 0,
    logout: ["NOT_NEEDED", "NOT_NEEDED"],
    providerQualification: "NOT_ASSESSED",
  };
  const sessions = options.identities.map(() => ({
    access: "",
    api: "",
    csrf: "",
    epoch: "",
  }));
  const require = (condition: unknown) => {
    if (!condition) throw Error("Check failed");
  };
  const request = async (
    path: string,
    cookie = "",
    body?: URLSearchParams | object,
    csrf?: string,
  ) => {
    evidence.requests++;
    return fetch(options.origin + path, {
      method: body === undefined ? "GET" : "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined
          ? {}
          : {
              Origin: options.origin,
              "Content-Type":
                body instanceof URLSearchParams
                  ? "application/x-www-form-urlencoded"
                  : "application/json",
            }),
        ...(csrf ? { "X-PrivateAI-CSRF": csrf } : {}),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof URLSearchParams
            ? body.toString()
            : JSON.stringify(body),
    });
  };
  const protectedHeaders = (response: Response) => {
    require(
      response.headers
        .get("cache-control")
        ?.split(/\s*,\s*/)
        .includes("no-store"),
    );
    require(response.headers.get("x-content-type-options") === "nosniff");
    if (!options.local)
      require(
        /max-age=[1-9]\d*/.test(
          response.headers.get("strict-transport-security") ?? "",
        ),
      );
  };
  const cookieFrom = (response: Response, name: string) => {
    const values = response.headers
      .getSetCookie()
      .filter((value) => value.startsWith(name + "="));
    require(values.length === 1);
    return values[0];
  };
  const validateCookie = (value: string) => {
    const attributes = value
      .split(";")
      .slice(1)
      .map((part) => part.trim().toLowerCase());
    require(
      attributes.includes("httponly") &&
        attributes.includes("samesite=strict") &&
        attributes.includes("path=/"),
    );
    require(!attributes.some((part) => part.startsWith("domain=")));
    if (!options.local) require(attributes.includes("secure"));
  };
  const expectStatus = async (response: Response, status: number) => {
    try {
      require(response.status === status);
      protectedHeaders(response);
    } finally {
      await response.body?.cancel();
    }
  };
  const logout = async (index: number) => {
    evidence.logout[index] = "ATTEMPTED";
    try {
      await expectStatus(
        await request("/auth/logout", sessions[index].access, {}),
        204,
      );
      evidence.logout[index] = "COMPLETED";
    } catch {
      evidence.logout[index] = "FAILED";
      throw Error("Logout failed");
    }
  };
  try {
    const url = new URL(options.origin);
    require(url.origin === options.origin && !url.username && !url.password);
    require(
      options.local
        ? url.protocol === "http:" && url.hostname === "127.0.0.1"
        : url.protocol === "https:",
    );
    require(
      options.identities.length === 2 &&
        options.identities[0].id !== options.identities[1].id,
    );
    for (const identity of options.identities)
      require(
        /^[a-f0-9-]{36}$/.test(identity.id) &&
          identity.password.length >= 12 &&
          identity.password.length <= 256,
      );
    evidence.stage = "ANONYMOUS_ACCESS";
    await expectStatus(await request("/api/status"), 401);
    for (let index = 0; index < 2; index++) {
      evidence.stage = `SIGN_IN_${index + 1}`;
      const login = await request(
        "/auth/login",
        "",
        new URLSearchParams({
          id: options.identities[index].id,
          password: options.identities[index].password,
        }),
      );
      try {
        const value = cookieFrom(login, "privateai-access");
        // Retain the cookie for cleanup even when attribute validation fails.
        sessions[index].access = value.split(";")[0];
        validateCookie(value);
        require(login.status === 303 && login.headers.get("location") === "/");
        protectedHeaders(login);
      } finally {
        await login.body?.cancel();
      }
      evidence.stage = `IDENTITY_STATUS_${index + 1}`;
      const status = await request("/api/status", sessions[index].access);
      try {
        require(status.status === 200);
        protectedHeaders(status);
        const value = cookieFrom(status, "privateai-session");
        validateCookie(value);
        sessions[index].api = value.split(";")[0];
        const payload = statusSchema.parse(await status.json());
        require(payload.accountId === options.identities[index].id);
        sessions[index].csrf = payload.csrf;
        sessions[index].epoch = payload.accessEpoch;
      } finally {
        if (!status.bodyUsed) await status.body?.cancel();
      }
    }
    require(
      sessions[0].api !== sessions[1].api &&
        sessions[0].epoch !== sessions[1].epoch &&
        sessions[0].csrf !== sessions[1].csrf,
    );
    evidence.checks.push("distinct-identities-and-disabled-inference");
    // Cancellation cannot fetch a page or invoke a model, even on a defective deployment.
    const cancellation = { id: "0".repeat(48) };
    for (let index = 0; index < 2; index++) {
      const own = sessions[index],
        other = sessions[1 - index];
      evidence.stage = `CROSSED_SESSION_${index + 1}`;
      await expectStatus(
        await request(
          "/api/research/cancel",
          `${own.access}; ${other.api}`,
          cancellation,
          other.csrf,
        ),
        401,
      );
      evidence.stage = `CROSSED_CSRF_${index + 1}`;
      await expectStatus(
        await request(
          "/api/research/cancel",
          `${own.access}; ${own.api}`,
          cancellation,
          other.csrf,
        ),
        403,
      );
      evidence.stage = `OWN_SESSION_${index + 1}`;
      await expectStatus(
        await request(
          "/api/research/cancel",
          `${own.access}; ${own.api}`,
          cancellation,
          own.csrf,
        ),
        200,
      );
    }
    evidence.checks.push(
      "crossed-sessions-denied-both-directions",
      "crossed-csrf-denied-both-directions",
      "own-sessions-still-usable",
    );
    evidence.stage = "FIRST_LOGOUT";
    await logout(0);
    await expectStatus(await request("/api/status", sessions[0].access), 401);
    evidence.stage = "OTHER_SESSION_SURVIVES";
    const otherStatus = await request(
      "/api/status",
      `${sessions[1].access}; ${sessions[1].api}`,
    );
    try {
      require(otherStatus.status === 200);
      protectedHeaders(otherStatus);
      const otherPayload = statusSchema.parse(await otherStatus.json());
      require(
        otherPayload.accountId === options.identities[1].id &&
          otherPayload.accessEpoch === sessions[1].epoch &&
          otherPayload.csrf === sessions[1].csrf,
      );
    } finally {
      if (!otherStatus.bodyUsed) await otherStatus.body?.cancel();
    }
    evidence.checks.push("logout-isolated-to-one-session");
    evidence.stage = "SECOND_LOGOUT";
    await logout(1);
    await expectStatus(await request("/api/status", sessions[1].access), 401);
    evidence.checks.push("both-logged-out-sessions-rejected");
    evidence.stage = "COMPLETE";
    evidence.result = "PASSED";
  } catch {
    // Evidence contains fixed labels only, never server errors, IDs or credentials.
  } finally {
    for (let index = 0; index < 2; index++) {
      if (sessions[index].access && evidence.logout[index] === "NOT_NEEDED") {
        try {
          await logout(index);
        } catch {
          /* Failure recorded; no retry. */
        }
      }
    }
  }
  return evidence;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await checkTrialIsolation({
    origin: process.env.PRIVATEAI_TRIAL_ORIGIN ?? "",
    identities: [
      {
        id: process.env.PRIVATEAI_TRIAL_ID ?? "",
        password: process.env.PRIVATEAI_TRIAL_PASSWORD ?? "",
      },
      {
        id: process.env.PRIVATEAI_TRIAL_PEER_ID ?? "",
        password: process.env.PRIVATEAI_TRIAL_PEER_PASSWORD ?? "",
      },
    ],
    local: process.argv.includes("--local"),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.result === "PASSED" ? 0 : 1;
}
