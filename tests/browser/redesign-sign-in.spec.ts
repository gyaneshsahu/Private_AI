// UI redesign (18 November): the real sign-in page (/account, production build), clicked through like
// a user: comet mark and name, outlined Google button, email, code, signed in. Account answers are faked
// in the page; nothing leaves the machine. Log: docs/ui-redesign-log.md.
import { test, expect } from "@playwright/test";

for (const width of [375, 1280]) {
  test(`sign-in at ${width} px: comet mark, calm form, email code signs in`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 700 ? 812 : 900 });
    let signedIn = false;
    const posts: string[] = [];
    const outside: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:4173/")) outside.push(r.url());
    });
    await page.route("http://127.0.0.1:4173/account", async (route) => {
      await route.fulfill({ response: await route.fetch({ url: "http://127.0.0.1:4173/" }) });
    });
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "POST") {
        posts.push(path);
        if (path === "/api/auth/sign-in/email-otp") signedIn = true;
      }
      const json =
        path === "/api/account/options"
          ? { synthetic: false, emailEnabled: true, socialProviders: ["google"] }
          : path === "/api/auth/get-session"
            ? signedIn
              ? { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "synthetic@example.test" } }
              : null
            : path === "/api/account/access"
              ? { sessions: [], passkeys: [], providers: [] }
              : path === "/api/account/security-notices"
                ? { notices: [] }
                : {};
      await route.fulfill({ status: 200, json });
    });
    await page.goto("/account");

    // The comet mark and the name, not the old "P" square.
    const brand = page.locator(".account-preview-brand");
    await expect(brand).toBeVisible();
    await expect(brand).toHaveText("CometRow");
    await expect(brand.locator("svg.brand-mark circle")).toHaveCount(1);
    expect(await brand.evaluate((el) => getComputedStyle(el, "::before").content)).toMatch(/^(none|normal)$/);

    // Google is an outlined button; one email field; one main button.
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeVisible();
    expect(await google.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("1px");
    expect((await google.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const email = page.getByLabel("Email address", { exact: true });
    await expect(email).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    // The email code signs in.
    await email.fill("synthetic@example.test");
    await page.getByRole("button", { name: "Continue with email", exact: true }).click();
    await page.getByLabel("Verification code").fill("12345678");
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your account", exact: true })).toBeVisible();
    expect(posts).toEqual(["/api/auth/email-otp/send-verification-otp", "/api/auth/sign-in/email-otp"]);
    expect(outside).toEqual([]);
  });
}
