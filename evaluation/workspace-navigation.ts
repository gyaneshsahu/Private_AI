import type { Page } from "@playwright/test";

/** Navigate through the same visible controls as a user, including mobile drawers. */
export function workspaceControl(page: Page, name: string) {
  return {
    async click() {
      // Multi-tab journeys must activate the tab before interacting with its UI.
      await page.bringToFront();
      await page.locator(".app-shell").waitFor({ state: "visible" });
      if (name === "Context") {
        await workspaceControl(page, "Conversation").click();
        await page.getByLabel("Attachments and tools", { exact: true }).click();
        await page
          .locator(".tools-menu")
          .getByRole("button", {
            name: "Conversation files",
            exact: true,
          })
          .click();
      } else if (name === "Conversation") {
        await page.getByLabel("Conversation actions", { exact: true }).click();
        const item = page
          .locator(".conversation-menu")
          .getByRole("button", { name, exact: true });
        // Already on the conversation: the menu has no such item (16 November), so close it.
        if (await item.count()) await item.click();
        else await page.keyboard.press("Escape");
      } else {
        const toggle = page.getByRole("button", { name: "Open navigation" });
        if (
          (await toggle.isVisible()) &&
          !(await page
            .getByRole("dialog", { name: "Navigation", exact: true })
            .isVisible())
        ) {
          await toggle.click();
        }
        if (name === "New conversation") {
          await page
            .getByRole("button", { name: "New conversation", exact: false })
            .click();
          return;
        }
        const account = page.getByLabel("Account menu", { exact: true });
        if (
          !(await page
            .locator(".account-menu")
            .evaluate((el) => (el as HTMLDetailsElement).open))
        )
          await account.click();
        await page
          .getByRole("navigation", { name: "Workspace" })
          .getByRole("button", {
            name: new RegExp(`^${name}`),
          })
          .click();
      }
    },
  };
}
