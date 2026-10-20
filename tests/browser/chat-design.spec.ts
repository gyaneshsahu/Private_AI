import { workspaceControl } from "./workspace-navigation";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { emptyConversation } from "../../shared/contracts";
import { newMessage } from "../../src/conversation";
import { derive } from "../../src/vault-crypto";
import { encodeVaultBackup } from "../../src/vault-backup";
test("representative themes, long history, source and responsive keyboard controls", async ({
  page,
}) => {
  const secret = "synthetic design passphrase",
    salt = crypto.getRandomValues(new Uint8Array(16));
  const source = {
    id: "format-note",
    title: "Project format notes",
    text: "JSON preserves structured fields. Markdown is readable text.",
  };
  const answer =
    "Use **JSON** for structured backup and re-import. Use **Markdown** for a readable document you can review or share. [format-note]\n\n## Which format fits?\n\n| Format | Best for | Trade-off |\n| --- | --- | --- |\n| JSON | Structured re-import | Less comfortable to read |\n| Markdown | Reading and sharing | Metadata needs a convention |\n\n## Export and import\n\n```javascript\nconst notes = [{ title: 'Project notes', body: 'Review the prototype.' }];\nconst json = JSON.stringify({ version: 1, notes }, null, 2);\nconst restored = JSON.parse(json);\n```\n\n## Check the round trip\n\nTest empty notes, Unicode and long text. Keep backups separate from the working copy. This is a synthetic design fixture, not a live model response.";
  const conversation = {
    ...emptyConversation(),
    title: "Choosing an export format",
    messages: [
      newMessage(
        "user",
        "For my notes project, should I use JSON or Markdown? Show JavaScript and explain re-import.",
      ),
      { ...newMessage("assistant", answer), sourceSnapshot: [source] },
      newMessage("user", "Can you add an import example?"),
      {
        ...newMessage("assistant", ""),
        status: "partial" as const,
        failure: "timeout" as const,
        included: false,
      },
    ],
    draft: "Keep the example short and preserve Unicode.",
  };
  const long = {
    ...emptyConversation(),
    title: "Synthetic long conversation",
    messages: Array.from({ length: 30 }, (_, i) =>
      newMessage(
        i % 2 ? "assistant" : "user",
        `Synthetic turn ${i + 1}: Preserve the previous correction and compare the document. `.repeat(
          4,
        ),
      ),
    ),
  };
  const backup = await encodeVaultBackup(await derive(secret, salt), salt, [
    conversation,
    long,
  ]);
  const outgoing: string[] = [];
  page.on("request", (r) => {
    if (
      r.method() !== "GET" ||
      new URL(r.url()).origin !== "http://127.0.0.1:4173"
    )
      outgoing.push(r.url());
  });
  const tab = (name: string) => workspaceControl(page, name);
  await page.goto("/");
  await tab("Saved").click();
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
  await page
    .getByRole("article", { name: conversation.title, exact: true })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Which format fits?" }),
  ).toBeVisible();
  await expect(page.getByLabel("javascript code block")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notice" }).click();
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("article", { name: "PrivateAI reply 4", exact: true })
      .getByRole("button", { name: "Copy answer" }),
  ).toBeDisabled();
  const settings = async (theme: string) => {
    await page.getByLabel("Conversation actions", { exact: true }).click();
    await page
      .locator(".conversation-menu")
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
    await page.getByRole("button", { name: "Close settings" }).click();
  };
  await mkdir(".local/ui-structure-20261020", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await settings(theme);
      await expect(page.locator(".app-shell")).toHaveAttribute(
        "data-theme",
        theme,
      );
      await page.locator("main").evaluate((el) => el.scrollTo(0, 0));
      await page.screenshot({
        path: `.local/ui-structure-20261020/${theme}-${width}.png`,
        fullPage: false,
        animations: "disabled",
      });
      await page
        .locator("main")
        .evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await expect(page.getByLabel("Message PrivateAI")).toBeInViewport();
      await page.screenshot({
        path: `.local/ui-structure-20261020/${theme}-${width}-error.png`,
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: source.title, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(source.text);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 420 });
  await page.locator("main").evaluate((el) => el.scrollTo(0, 300));
  await expect(page.getByLabel("Message PrivateAI")).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await settings("system");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "light",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Edit into a new branch" })
    .first()
    .click();
  await expect(page.getByLabel("Edited message")).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("searchbox", { name: "Search chats" })
    .fill("long conversation");
  await page.getByRole("button", { name: long.title, exact: true }).click();
  await expect(page.locator(".messages article")).toHaveCount(30);
  await page
    .getByRole("button", { name: "Jump to latest", exact: false })
    .click();
  await expect(
    page.getByRole("article", { name: "PrivateAI reply 30", exact: true }),
  ).toBeInViewport();
  await expect(page.getByLabel("Message PrivateAI")).toBeInViewport();
  await page.locator("main").evaluate((el) => el.scrollTo(0, 0));
  await expect(page.getByLabel("Message PrivateAI")).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  // Reopen the representative chat from the actual searchable sidebar.
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("searchbox", { name: "Search chats" })
    .fill("export format");
  await page.screenshot({
    path: ".local/ui-structure-20261020/mobile-drawer.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: conversation.title, exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/ui-structure-20261020/desktop-collapsed.png",
    animations: "disabled",
  });
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page.screenshot({
    path: ".local/ui-structure-20261020/tools.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByLabel("Attachments and tools", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Attach files to this conversation", { exact: true })
    .setInputFiles({
      name: "synthetic.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Synthetic public project note. JSON stores structured fields.",
      ),
    });
  await expect(
    page.getByRole("list", { name: "Conversation attachments" }),
  ).toContainText("synthetic.txt");
  await page.getByRole("button", { name: source.title, exact: true }).click();
  await page.screenshot({
    path: ".local/ui-structure-20261020/sources.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local/ui-structure-20261020/mobile-sources.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page.screenshot({
    path: ".local/ui-structure-20261020/mobile-tools.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /messages included/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Included context", exact: true }),
  ).toContainText("synthetic.txt");
  await page.keyboard.press("Escape");
  await workspaceControl(page, "Account").click();
  await expect(
    page.getByRole("heading", { name: "Account", exact: true }),
  ).toBeVisible();
  await settings("dark");
  await workspaceControl(page, "Settings").click();
  await page.screenshot({
    path: ".local/ui-structure-20261020/mobile-settings.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Close settings" }).click();
  page.on("dialog", (d) => d.accept());
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Search chats" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Unlock your local vault", { exact: false }),
  ).toBeVisible();
  expect(outgoing).toEqual([]);
});

test("drawer focus, desktop expansion and denied preference storage remain usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(drawer).toBeVisible();
  await page.getByRole("link", { name: "PrivateAI home" }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await drawer.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await drawer.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await workspaceControl(page, "Settings").click();
  await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
  await page.keyboard.press("Escape");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await trigger.click();
  await page.getByRole("button", { name: "Keep sidebar open" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Collapse navigation" }),
  ).toBeVisible();
});
