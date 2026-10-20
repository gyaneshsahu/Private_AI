import { test, expect } from "@playwright/test";

test("inactive account preview shows all methods without requests or browser credentials", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.method() !== "GET" ||
      url.pathname.startsWith("/api/") ||
      url.hostname !== "127.0.0.1"
    )
      requests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "credentials", {
      value: {
        get() {
          throw Error("Unexpected credential request");
        },
        create() {
          throw Error("Unexpected credential creation");
        },
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?account-preview=1");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Google sign-in is not connected",
  );
  await expect(
    page.getByRole("button", {
      name: /Continue with Apple|Continue with phone|Sign in with a passkey/,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(
    page.getByRole("heading", { name: "Continue with email" }),
  ).toBeFocused();
  await expect(page.getByLabel("Email address")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "Preview verification step" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeFocused();
  await expect(
    page.getByText("No code has been sent.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Other sign-in options" }).click();
  await page
    .getByText("How sign-in affects your privacy", { exact: true })
    .click();
  await expect(
    page.getByText("It cannot recover a lost vault passphrase", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => ({
      local: Object.fromEntries(
        Object.keys(localStorage).map((key) => [
          key,
          localStorage.getItem(key),
        ]),
      ),
      session: sessionStorage.length,
      databases: (await indexedDB.databases()).length,
      caches: (await caches.keys()).length,
    })),
  ).toEqual({
    local: {},
    session: 0,
    databases: 0,
    caches: 0,
  });
  expect(await page.context().cookies()).toEqual([]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  expect(
    await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))),
  ).toEqual({ "privateai.appearance": "dark" });
  await page.reload();
  await expect(page.getByLabel("Appearance", { exact: true })).toHaveValue("dark");
});

test("preview stays usable at phone width, enlarged text and keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?account-preview=1");
  await page.getByRole("heading", { name: "Welcome to PrivateAI" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Continue with email" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.addStyleTag({ content: ":root { font-size: 30px; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 800, height: 360 });
  await page.getByRole("button", { name: "Other sign-in options" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to PrivateAI" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
