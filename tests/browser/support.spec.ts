import { test, expect } from "@playwright/test";

test("help preserves local drafts and offers only an explicit, content-free clipboard note", async ({
  page,
}) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") sent.push(request.postData() ?? "");
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("SUPPORT_PRIVATE_DRAFT_CANARY");
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Help", exact: false })
    .click();
  await page
    .getByLabel("Problem area", { exact: true })
    .selectOption("research");
  await page
    .getByLabel("What happened", { exact: true })
    .selectOption("incorrect");
  const note = page.getByLabel("Review your support note", { exact: true });
  await expect(note).toHaveValue(/Web research or citations/);
  await expect(note).not.toHaveValue(/SUPPORT_PRIVATE_DRAFT_CANARY/);
  expect(
    await page.evaluate(
      () => (window as unknown as { copied?: string }).copied,
    ),
  ).toBeUndefined();
  await page
    .getByRole("button", { name: "Copy support note", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Support note copied" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(await note.inputValue());
  expect(sent).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Conversation", exact: false })
    .click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SUPPORT_PRIVATE_DRAFT_CANARY",
  );
});

test("help handles denied copying and remains usable with keyboard and enlarged mobile text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw Error("clipboard denied");
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Help", exact: false })
    .click();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  const area = page.getByLabel("Problem area", { exact: true });
  await area.focus();
  await page.keyboard.press("p");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("What happened", { exact: true })).toBeFocused();
  await page
    .getByRole("button", { name: "Copy support note", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Copy was unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Review your support note", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByText("A staffed support contact", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/review-batches/product-20261019/help-mobile.png",
    fullPage: true,
  });
});
