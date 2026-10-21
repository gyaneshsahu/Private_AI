import { test, expect } from "@playwright/test";
import { workspaceControl } from "./workspace-navigation";
import { emptyConversation } from "../../shared/contracts";
import { newMessage } from "../../src/conversation";
import { derive } from "../../src/vault-crypto";
import { encodeVaultBackup } from "../../src/vault-backup";
import { mkdir } from "node:fs/promises";

test("projects, pin/archive, account menus and isolation through the rendered workspace", async ({
  page,
}) => {
  test.setTimeout(90000);
  const secret = "synthetic organized workspace",
    first = crypto.randomUUID();
  let accountId = first,
    email = "alex.synthetic@example.test";
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        accountId,
        accountEmail: email,
        accessEpoch: accountId,
        consumerWorkspace: true,
        requestAllowance: {
          state: "active",
          limit: 50,
          used: 8,
          remaining: 42,
          pending: 0,
          uncertain: 0,
          resetsAt: "2026-11-01T00:00:00Z",
        },
      },
    });
  });
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") calls.push(r.url());
  });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw Error("Disabled media must not request permission");
    };
  });
  const conversations = Array.from({ length: 24 }, (_, i) => ({
    ...emptyConversation(),
    title:
      i === 0
        ? "Field guide and release notes"
        : `Research planning ${String(i).padStart(2, "0")}`,
    messages: [
      newMessage("user", "Compare these synthetic release notes."),
      newMessage(
        "assistant",
        "## Plan\n\n| Version | State |\n|---|---|\n| One | Planned |\n| Two | Revised |\n\n```typescript\nconst ready: boolean = false;\n```\n\nA revised plan does not establish that release happened.",
      ),
    ],
  }));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const backup = await encodeVaultBackup(
    await derive(secret, salt),
    salt,
    conversations,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await workspaceControl(page, "Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "synthetic.privateai-backup",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(secret);
  await page
    .getByRole("checkbox", {
      name: "I want to add copies from this backup to the current vault.",
    })
    .check();
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(page.getByRole("article")).toHaveCount(24);
  const createProject = async (name: string) => {
    await page
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    await page.getByLabel("Project name", { exact: true }).fill(name);
    await page
      .locator(".project-form")
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(page.locator(".project-list")).toContainText(name);
  };
  await createProject("Product launch");
  await createProject("Everyday research");
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  const title = conversations[0].title;
  const actions = page.getByLabel(`Actions for ${title}`, { exact: true });
  await actions.click();
  await page.getByRole("button", { name: "Pin", exact: true }).click();
  await expect(page.locator(".chat-list-row > button").first()).toHaveText(
    title,
  );
  await actions.click();
  await page
    .getByLabel(`Project for ${title}`, { exact: true })
    .selectOption({ label: "Product launch" });
  await page.keyboard.press("Escape");
  await page
    .locator(".project-list")
    .getByRole("button", { name: /Product launch/ })
    .click();
  await expect(page.locator(".chat-list-row")).toHaveCount(1);
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Plan", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Message PrivateAI")
    .fill("Unsaved correction stays here");
  await actions.click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.locator(".chat-list-row")).toHaveCount(0);
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "Unsaved correction stays here",
  );
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await actions.click();
  await page.getByRole("button", { name: "Restore chat", exact: true }).click();
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(page.locator(".chat-list-row > button").first()).toHaveText(
    title,
  );
  await workspaceControl(page, "Saved").click();
  await page
    .getByRole("button", { name: "Save encrypted snapshot", exact: true })
    .click();
  await workspaceControl(page, "Conversation").click();
  await mkdir(".local/ui-product-20261020", { recursive: true });
  for (const theme of ["light", "dark"]) {
    await workspaceControl(page, "Settings").click();
    await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
    await page.getByRole("button", { name: "Close settings" }).click();
    await page.screenshot({
      path: `.local/ui-product-20261020/projects-${theme}.png`,
      animations: "disabled",
    });
    await page.getByLabel("Account menu", { exact: true }).click();
    await expect(page.locator(".account-popover")).toContainText(email);
    await expect(page.locator(".account-popover")).toContainText(
      "42 of 50 requests remaining",
    );
    await page.screenshot({
      path: `.local/ui-product-20261020/account-${theme}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
  }
  await workspaceControl(page, "Settings").click();
  for (const name of ["Account & security", "Privacy & data", "Plan & usage"]) {
    await page
      .getByRole("navigation", { name: "Settings sections" })
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator(".settings-content")).not.toBeEmpty();
  }
  await page.screenshot({
    path: ".local/ui-product-20261020/settings-usage.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await expect(
    page
      .locator(".tools-menu")
      .getByRole("button", { name: "Photo to text", exact: true }),
  ).toBeEnabled();
  for (const name of [
    "Create image",
    "Microphone dictation",
    "Live voice conversation",
  ]) {
    const b = page
      .locator(".coming-later-list")
      .getByRole("button", { name: new RegExp(name.replace("/", "\\/")) });
    await expect(b).toBeDisabled();
    await expect(b).toContainText("Coming later");
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.screenshot({
    path: ".local/ui-product-20261020/projects-mobile.png",
    animations: "disabled",
  });
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.screenshot({
    path: ".local/ui-product-20261020/account-mobile.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.reload();
  await workspaceControl(page, "Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".project-list")).toContainText("Product launch");
  await expect(page.locator(".chat-list-row > button").first()).toHaveText(
    title,
  );
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "Unsaved correction stays here",
  );
  accountId = crypto.randomUUID();
  email = "sam.synthetic@example.test";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue("");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).not.toContainText("Product launch");
  await expect(page.locator(".account-label")).toContainText(email);
  await page.keyboard.press("Escape");
  await workspaceControl(page, "Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(page.getByRole("article")).toHaveCount(0);
  expect(calls).toEqual([]);
});
