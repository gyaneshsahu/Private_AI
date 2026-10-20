import { test, expect } from "@playwright/test";
for (const failure of [
  "code request",
  "code verification",
  "social redirect",
] as const) {
  test(`sign-in recovers from uncertain ${failure} without replay`, async ({
    page,
  }) => {
    let signedIn = false;
    let statusUnavailable = false;
    const posts: string[] = [];
    const send = "/api/auth/email-otp/send-verification-otp";
    const verify = "/api/auth/sign-in/email-otp";
    const social = "/api/auth/sign-in/social";
    const stalled =
      failure === "code request"
        ? send
        : failure === "code verification"
          ? verify
          : social;
    await page.clock.install();
    await page.route("http://127.0.0.1:4173/account", async (route) => {
      await route.fulfill({
        response: await route.fetch({ url: "http://127.0.0.1:4173/" }),
      });
    });
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "POST") {
        posts.push(path);
        if (path === verify) signedIn = true;
        if (path === stalled) return;
      }
      if (path === "/api/auth/get-session" && statusUnavailable) {
        await route.fulfill({ status: 503, json: {} });
        return;
      }
      const json =
        path === "/api/account/options"
          ? { synthetic: false, socialProviders: ["google"] }
          : path === "/api/auth/get-session"
            ? signedIn
              ? {
                  user: {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    email: "synthetic@example.test",
                  },
                }
              : null
            : path === "/api/account/access"
              ? { sessions: [], passkeys: [], providers: [] }
              : path === "/api/account/security-notices"
                ? { notices: [] }
                : {};
      await route.fulfill({ status: 200, json });
    });
    await page.goto("/account");
    await expect(
      page.getByLabel("Email address", { exact: true }),
    ).toBeEnabled();
    if (failure === "social redirect") {
      await page.getByRole("button", { name: "Continue with Google" }).click();
    } else {
      await page
        .getByLabel("Email address", { exact: true })
        .fill("synthetic@example.test");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      if (failure === "code verification") {
        await page.getByLabel("Verification code").fill("12345678");
        await page
          .getByRole("button", { name: "Verify code", exact: true })
          .click();
      }
    }
    await expect
      .poll(() => posts.filter((path) => path === stalled).length)
      .toBe(1);
    await page.clock.runFor(10_050);
    if (failure === "code request") {
      await expect(page.getByRole("status")).toContainText(
        "Code delivery could not be confirmed",
      );
      await expect(page.getByLabel("Verification code")).toBeVisible();
      await page.getByLabel("Verification code").fill("12345678");
      await page
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your account", exact: true }),
      ).toBeVisible();
      expect(posts).toEqual([send, verify]);
    } else {
      await expect(page.getByRole("status")).toContainText(
        "result is unconfirmed",
      );
      await expect(
        page.getByRole("button", { name: "Continue with Google" }),
      ).toBeDisabled();
      statusUnavailable = true;
      await page
        .getByRole("button", { name: "Check sign-in status", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText("still unavailable");
      await expect(
        page.getByRole("button", { name: "Continue with Google" }),
      ).toBeDisabled();
      statusUnavailable = false;
      await page
        .getByRole("button", { name: "Check sign-in status", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText(
        "Sign-in status checked",
      );
      await expect(
        page.getByRole("button", { name: "Check sign-in status", exact: true }),
      ).toHaveCount(0);
      if (failure === "code verification") {
        await expect(
          page.getByRole("heading", { name: "Your account", exact: true }),
        ).toBeVisible();
        expect(posts).toEqual([send, verify]);
      } else {
        await expect(
          page.getByRole("button", { name: "Continue with Google" }),
        ).toBeEnabled();
        expect(page.url()).toBe("http://127.0.0.1:4173/account");
        expect(posts).toEqual([social]);
      }
    }
  });
}
