import { test, expect, type Page } from "@playwright/test";
const currentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function prepare(page: Page, target: string, emailEnabled = true) {
  let attempts = 0;
  const session = (id: string, current: boolean) => ({
    id,
    current,
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
    expiresAt: "2026-11-20T10:00:00Z",
  });
  await page.clock.install();
  await page.route("http://127.0.0.1:4173/account", async (route) => {
    const response = await route.fetch({ url: "http://127.0.0.1:4173/" });
    await route.fulfill({ response });
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === target && route.request().method() === "POST") {
      attempts++;
      return; // Simulate the server applying an action but never returning headers.
    }
    const json =
      path === "/api/account/options"
        ? { synthetic: false, emailEnabled, socialProviders: [] }
        : path === "/api/auth/get-session"
          ? attempts && target === "/api/account/close"
            ? null
            : { user: { id: currentId, email: "synthetic@example.test" } }
          : path === "/api/account/security-notices"
            ? { notices: [] }
            : path === "/api/account/access"
              ? {
                  sessions: [
                    session(currentId, true),
                    ...(attempts && target.endsWith("revoke")
                      ? []
                      : [session(otherId, false)]),
                  ],
                  passkeys:
                    attempts && target.endsWith("remove")
                      ? []
                      : [
                          {
                            id: keyId,
                            name: "Synthetic passkey",
                            createdAt: "2026-10-20T10:00:00Z",
                          },
                        ],
                  providers: [],
                }
              : null;
    await route.fulfill({ status: 200, json });
  });
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Refresh account access" }),
  ).toBeEnabled();
  return () => attempts;
}
for (const operation of ["revoke", "remove"] as const) {
  test(`uncertain ${operation} waits for a read-only refresh instead of replaying`, async ({
    page,
  }) => {
    const attempts = await prepare(page, `/api/account/access/${operation}`);
    const name =
      operation === "revoke"
        ? "Sign out session bbbbbbbb"
        : "Remove Synthetic passkey";
    await page.getByRole("button", { name, exact: true }).click();
    await expect.poll(attempts).toBe(1);
    await page.clock.runFor(10_050);
    await expect(
      page.getByText("The result could not be confirmed.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Sign out this session", exact: true }),
    ).toBeDisabled();
    if (operation === "revoke") {
      await page.route("**/api/account/access", (route) =>
        route.fulfill({ status: 503, json: {} }),
      );
      await page
        .getByRole("button", { name: "Refresh account access" })
        .click();
      await expect(
        page.getByText("Refresh failed. Account changes remain unavailable", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeDisabled();
      expect(attempts()).toBe(1);
      await page.unroute("**/api/account/access");
    }
    await page.getByRole("button", { name: "Refresh account access" }).click();
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Sign out this session", exact: true }),
    ).toBeEnabled();
    expect(attempts()).toBe(1);
  });
}
test("uncertain account closure cannot resubmit and reload checks the closed session", async ({
  page,
}) => {
  const attempts = await prepare(page, "/api/account/close");
  await page
    .getByLabel("Type DELETE ACCOUNT to confirm")
    .fill("DELETE ACCOUNT");
  await page
    .getByRole("button", { name: "Close account", exact: true })
    .click();
  await expect.poll(attempts).toBe(1);
  await page.clock.runFor(10_050);
  await expect(
    page.getByText("Closure could not be confirmed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close account", exact: true }),
  ).toBeDisabled();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Reload account status" }).click(),
  ]);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close account", exact: true }),
  ).toHaveCount(0);
  expect(attempts()).toBe(1);
});

test("uncertain recovery completion is reconciled without repeating its POST", async ({
  page,
}) => {
  const attempts = await prepare(page, "/api/account/recovery/complete");
  await page
    .getByRole("button", { name: "Finish sign-in recovery", exact: true })
    .click();
  await expect.poll(attempts).toBe(1);
  await page.clock.runFor(10_050);
  await expect(page.getByRole("status")).toContainText("result is unconfirmed");
  await expect(
    page.getByRole("button", { name: "Finish sign-in recovery", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Check sign-in status", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Sign-in status checked",
  );
  await expect(
    page.getByRole("button", { name: "Finish sign-in recovery", exact: true }),
  ).toBeEnabled();
  expect(attempts()).toBe(1);
});

test("disabled email keeps recovery and credential removal unavailable while session controls work", async ({
  page,
}) => {
  const attempts = await prepare(page, "/api/account/access/remove", false);
  await expect(
    page.getByRole("button", { name: "Finish sign-in recovery" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Verify email for removal" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Remove Synthetic passkey" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Type DELETE ACCOUNT to confirm")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Close account", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeEnabled();
  expect(attempts()).toBe(0);
});

test("disabled email sign-in cannot collect an address or request a code", async ({
  page,
}) => {
  await prepare(page, "/api/auth/email-otp/send-verification-otp", false);
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ status: 200, json: null }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue with email" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Email address" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Email sign-in and recovery are not available yet. Use Google to sign in.",
    ),
  ).toBeVisible();
});
