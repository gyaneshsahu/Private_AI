import { test, expect } from "@playwright/test";
test("context count updates with draft and makes unavailable sending limit explicit", async ({
  page,
}) => {
  await page.goto("/");
  // An empty chat has no context count (16 November): the review opens from "+".
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page.locator(".tools-menu").getByRole("button", { name: /^Review context/ }).click();
  const hint = page.getByTestId("context-size");
  await expect(hint).toContainText("not a token count");
  const before = await hint.innerText();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Message CometRow")
    .fill("Synthetic draft with several new characters.");
  // An empty chat has no context count (16 November): the review opens from "+".
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page.locator(".tools-menu").getByRole("button", { name: /^Review context/ }).click();
  await expect(hint).not.toHaveText(before);
  await expect(hint).toContainText("no indefinite memory");
  await expect(hint).toContainText("limit unavailable");
});
