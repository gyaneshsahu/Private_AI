// No inference or external research. Configure these only in trusted CI secrets.
import { chromium } from "@playwright/test";
const origin = process.env.PRIVATEAI_DEV_ORIGIN;
const key = process.env.PRIVATEAI_DEV_ACCESS_KEY;
let browser;
try {
  if (
    !origin ||
    new URL(origin).origin !== origin ||
    !origin.startsWith("https://") ||
    !key
  )
    throw new Error();
  browser = await chromium.launch();
  const anonymous = await browser.newContext({
    ignoreHTTPSErrors: false,
    serviceWorkers: "block",
  });
  for (const path of ["/", "/api/status"]) {
    const response = await anonymous.request.get(origin + path, {
      maxRedirects: 0,
    });
    if (response.status() !== 401) throw new Error();
  }
  await anonymous.close();
  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    serviceWorkers: "block",
    httpCredentials: { username: "evaluator", password: key, origin },
  });
  let blocked = 0;
  await context.route("**/*", async (route) => {
    if (
      new URL(route.request().url()).origin !== origin ||
      route.request().method() !== "GET"
    ) {
      blocked++;
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  let pageErrors = 0;
  page.on("pageerror", () => pageErrors++);
  await page.goto(origin, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByPlaceholder("What would you like to work through?").waitFor();
  const response = await context.request.get(origin + "/api/status", {
    maxRedirects: 0,
  });
  if (
    !response.ok() ||
    (await response.json()).inference.ready !== false ||
    blocked ||
    pageErrors
  )
    throw new Error();
  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "privateai-session");
  if (!session?.secure || !session.httpOnly || session.sameSite !== "Strict")
    throw new Error();
  console.log(
    JSON.stringify({
      kind: "HOSTED_FOUNDATION_SMOKE",
      result: "PASSED",
      inferenceRequests: 0,
      providerQualification: "NOT_PASSED",
    }),
  );
} catch {
  console.error(
    "Hosted foundation check failed. Check HTTPS, access configuration, browser availability and deployment health. No inference is authorized by this check.",
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
