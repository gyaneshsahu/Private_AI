import { expect, test } from "@playwright/test";

test("trial boundaries are readable on a narrow screen with keyboard dismissal and no disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      external.push(request.url());
  });
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Trial scope and safety",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Trial scope and safety" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("adults aged 18 and over");
  await expect(dialog).toContainText(
    "sexual-health, consent and relationship advice are supported",
  );
  await expect(dialog).toContainText("not a guarantee");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  expect(external).toEqual([]);
});
