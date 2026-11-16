// Settings opens from the account menu only (SS-15), inside the drawer on phones.
import type { Page } from "@playwright/test";
import { appText } from "../../src/text/app";
import { workspaceText } from "../../src/text/workspace";

export async function openSettingsMenu(page: Page, lang: "en" | "de") {
  const w = workspaceText[lang];
  const toggle = page.getByRole("button", { name: appText[lang].openNavigation });
  if ((await toggle.isVisible()) && !(await page.locator("dialog.navigation-drawer[open]").count())) await toggle.click();
  const account = page.locator(".account-menu");
  if (!(await account.evaluate((el) => (el as HTMLDetailsElement).open))) await account.locator("summary").click();
  await page.getByRole("navigation", { name: w.workspace }).getByRole("button", { name: w.settings, exact: true }).click();
}
