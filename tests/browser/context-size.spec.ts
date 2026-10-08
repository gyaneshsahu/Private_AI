import { test, expect } from "@playwright/test";
test("context count updates with draft and makes unavailable sending limit explicit", async ({
  page,
}) => {
  await page.goto("/");
  const hint = page.getByTestId("context-size");
  await expect(hint).toContainText("not a token count");
  const before = await hint.innerText();
  await page
    .getByLabel("Message PrivateAI")
    .fill("Synthetic draft with several new characters.");
  await expect(hint).not.toHaveText(before);
  await expect(hint).toContainText("no indefinite memory");
  await expect(hint).toContainText("limit unavailable");
});
