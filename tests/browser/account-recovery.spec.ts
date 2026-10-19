import { test, expect, type Page } from "@playwright/test";
const currentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keyId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function prepare(page: Page, target: string) {
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
        ? { synthetic: false, socialProviders: [] }
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
  await page.getByRole("button", { name: "Reload account status" }).click();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close account", exact: true }),
  ).toHaveCount(0);
  expect(attempts()).toBe(1);
});
