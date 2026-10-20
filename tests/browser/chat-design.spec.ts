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
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
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
  await mkdir(".local/ui-review-20261020", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
      await expect(page.locator(".app-shell")).toHaveAttribute(
        "data-theme",
        theme,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `.local/ui-review-20261020/${theme}-${width}.png`,
        fullPage: true,
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
  await page.getByLabel("Message PrivateAI").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Message PrivateAI")).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.getByLabel("Appearance", { exact: true }).selectOption("system");
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
  await tab("Saved").click();
  await page
    .getByRole("article", { name: long.title, exact: true })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.locator(".messages article")).toHaveCount(30);
  await page
    .getByRole("button", { name: "Jump to latest", exact: false })
    .click();
  await expect(
    page.getByRole("article", { name: "PrivateAI reply 30", exact: true }),
  ).toBeInViewport();
  expect(outgoing).toEqual([]);
});
