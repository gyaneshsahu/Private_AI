import { pathToFileURL } from "node:url";

type Options = {
  origin: string;
  id: string;
  password: string;
  local?: boolean;
};
export async function checkTrialAccess(options: Options) {
  const evidence = {
    kind: "INDIVIDUAL_ACCESS_CHECK",
    observedAt: new Date().toISOString(),
    transport: options.local ? "LOCAL_HTTP" : "HOSTED_HTTPS",
    result: "FAILED",
    stage: "CONFIGURATION",
    checks: [] as string[],
    requests: 0,
    logout: "NOT_NEEDED",
    providerQualification: "NOT_ASSESSED",
  };
  let cookie = "";
  let validOrigin = false;
  const require = (condition: unknown) => {
    if (!condition) throw new Error("Check failed");
  };
  const request = async (
    path: string,
    method = "GET",
    body?: string,
    crossOrigin = false,
  ) => {
    evidence.requests++;
    return fetch(options.origin + path, {
      method,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(method === "POST"
          ? {
              Origin: crossOrigin ? "https://invalid.example" : options.origin,
              "Content-Type": "application/x-www-form-urlencoded",
            }
          : {}),
      },
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
  try {
    const url = new URL(options.origin);
    require(url.origin === options.origin && !url.username && !url.password);
    require(
      options.local
        ? url.protocol === "http:" && url.hostname === "127.0.0.1"
        : url.protocol === "https:",
    );
    require(
      /^[a-f0-9-]{36}$/.test(options.id) &&
        options.password.length >= 12 &&
        options.password.length <= 256,
    );
    validOrigin = true;
    evidence.stage = "ANONYMOUS_ACCESS";
    const anonymous = await request("/api/status");
    require(anonymous.status === 401);
    protectedHeaders(anonymous);
    await anonymous.body?.cancel();
    const root = await request("/");
    require(root.status === 303 && root.headers.get("location") === "/auth");
    await root.body?.cancel();
    evidence.checks.push("anonymous-access-denied");
    evidence.stage = "SIGN_IN_PAGE";
    const page = await request("/auth");
    require(page.status === 200);
    protectedHeaders(page);
    require(
      page.headers
        .get("content-security-policy")
        ?.includes("form-action 'self'"),
    );
    await page.body?.cancel();
    evidence.checks.push("sign-in-page-protected");
    evidence.stage = "SIGN_IN";
    const login = await request(
      "/auth/login",
      "POST",
      new URLSearchParams({
        id: options.id,
        password: options.password,
      }).toString(),
    );
    const accessCookies = login.headers
      .getSetCookie()
      .filter((value) => value.startsWith("privateai-access="));
    // Retain a returned session only in memory, including when a later check fails.
    if (accessCookies.length === 1) cookie = accessCookies[0].split(";")[0];
    require(
      login.status === 303 &&
        login.headers.get("location") === "/" &&
        accessCookies.length === 1,
    );
    const attributes = accessCookies[0]
      .split(";")
      .slice(1)
      .map((value) => value.trim().toLowerCase());
    require(
      attributes.includes("httponly") &&
        attributes.includes("samesite=strict") &&
        attributes.includes("path=/"),
    );
    require(!attributes.some((value) => value.startsWith("domain=")));
    if (!options.local) require(attributes.includes("secure"));
    await login.body?.cancel();
    evidence.checks.push("sign-in-cookie-protected");
    evidence.stage = "CROSS_ORIGIN";
    const denied = await request("/auth/logout", "POST", "", true);
    require(denied.status === 403);
    await denied.body?.cancel();
    evidence.checks.push("cross-origin-logout-denied");
    evidence.stage = "AUTHENTICATED_STATUS";
    const status = await request("/api/status");
    require(status.status === 200);
    protectedHeaders(status);
    const payload = await status.json();
    require(
      payload.accountId === options.id &&
        /^[a-f0-9]{32}$/.test(payload.accessEpoch),
    );
    // This pre-release diagnostic must not certify an inference-enabled deployment.
    require(payload.inference?.ready === false);
    evidence.checks.push("individual-status-and-disabled-inference");
    evidence.stage = "LOGOUT";
    evidence.logout = "ATTEMPTED";
    const logout = await request("/auth/logout", "POST", "");
    require(logout.status === 204);
    evidence.logout = "COMPLETED";
    evidence.stage = "REPLAY_AFTER_LOGOUT";
    const replay = await request("/api/status");
    require(replay.status === 401);
    await replay.body?.cancel();
    cookie = "";
    evidence.checks.push("logged-out-session-rejected");
    evidence.stage = "COMPLETE";
    evidence.result = "PASSED";
  } catch {
    if (evidence.logout === "ATTEMPTED") evidence.logout = "FAILED";
    // Only fixed stage labels leave this function; never serialize server errors or credentials.
  } finally {
    if (validOrigin && cookie && evidence.logout === "NOT_NEEDED") {
      try {
        const cleanup = await request("/auth/logout", "POST", "");
        evidence.logout = cleanup.status === 204 ? "COMPLETED" : "FAILED";
        await cleanup.body?.cancel();
      } catch {
        evidence.logout = "FAILED";
      }
    }
  }
  return evidence;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await checkTrialAccess({
    origin: process.env.PRIVATEAI_TRIAL_ORIGIN ?? "",
    id: process.env.PRIVATEAI_TRIAL_ID ?? "",
    password: process.env.PRIVATEAI_TRIAL_PASSWORD ?? "",
    local: process.argv.includes("--local"),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.result === "PASSED" ? 0 : 1;
}
