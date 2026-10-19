import { test, expect, type Page } from "@playwright/test";
const oldSecret = "synthetic original browser passphrase";
const nextSecret = "synthetic replacement browser passphrase";
const tab = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name, exact: true });
async function unlock(page: Page, secret: string) {
  await tab(page, "Saved").click();
  await page.getByLabel("Vault passphrase", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Lock and clear workspace" }),
  ).toBeVisible();
}
async function fillChange(page: Page, current = oldSecret) {
  await page
    .getByLabel("Current vault passphrase", { exact: true })
    .fill(current);
  await page
    .getByLabel("New vault passphrase", { exact: true })
    .fill(nextSecret);
  await page
    .getByLabel("Confirm new vault passphrase", { exact: true })
    .fill(nextSecret);
  await page
    .getByLabel("I have saved work I need in every open tab", { exact: false })
    .check();
}
async function backup(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
test("passphrase change preserves history across tabs and older backups retain their original secret", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const outgoing: string[] = [];
  context.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      outgoing.push(request.url());
  });
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC original saved draft");
  await page.getByLabel("Attach files to this conversation").setInputFiles({
    name: "synthetic-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SYNTHETIC source to preserve"),
  });
  await expect(
    page.getByRole("region", { name: "File import results" }),
  ).toContainText("added");
  await unlock(page, oldSecret);
  await page
    .getByLabel("Conversation title", { exact: true })
    .fill("SYNTHETIC private history");
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  const originalBackup = await backup(page);
  const other = await context.newPage();
  await other.goto("/");
  await unlock(other, oldSecret);
  await other.getByRole("button", { name: "Open", exact: true }).click();
  await expect(other.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC original saved draft",
  );
  await fillChange(page, "incorrect synthetic password");
  await page
    .getByRole("button", { name: "Change passphrase and lock" })
    .click();
  await expect(
    page.getByText("Passphrase change could not complete.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Current vault passphrase", { exact: true }),
  ).toBeEmpty();
  await expect(page.getByRole("article")).toHaveCount(1);
  await tab(page, "Conversation").click();
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC latest saved draft");
  await tab(page, "Saved").click();
  await fillChange(page);
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page
    .getByRole("button", { name: "Change passphrase and lock" })
    .click();
  await expect(
    page.getByRole("button", { name: "Lock and clear workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  await fillChange(page);
  await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Change passphrase and lock" })
    .click();
  await expect(
    page.getByText("Vault passphrase changed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Current vault passphrase", { exact: true }),
  ).toHaveCount(0);
  await expect(other.getByLabel("Message PrivateAI")).toBeEmpty();
  await tab(other, "Saved").click();
  await expect(
    other.getByRole("button", { name: "Create or unlock vault" }),
  ).toBeVisible();
  await page.reload();
  await tab(page, "Saved").click();
  await page.getByLabel("Vault passphrase", { exact: true }).fill(oldSecret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByText("Could not unlock the vault.", { exact: false }),
  ).toBeVisible();
  await unlock(page, nextSecret);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC latest saved draft",
  );
  await expect(
    page.getByRole("list", { name: "Conversation attachments" }),
  ).toContainText("synthetic-notes.txt");
  await tab(page, "Saved").click();
  const newBackup = await backup(page);
  expect(newBackup.equals(originalBackup)).toBe(false);
  expect(newBackup.toString()).not.toMatch(
    /SYNTHETIC|synthetic-notes|original browser|replacement browser/,
  );
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "old.privateai-backup",
      mimeType: "application/json",
      buffer: originalBackup,
    });
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(nextSecret);
  await page
    .getByLabel("I want to add copies from this backup to the current vault.")
    .check();
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(
    page.getByText("Restore could not complete.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(oldSecret);
  await page
    .getByLabel("I want to add copies from this backup to the current vault.")
    .check();
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  const drafts: string[] = [];
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("article")
      .nth(i)
      .getByRole("button", { name: "Open", exact: true })
      .click();
    drafts.push(await page.getByLabel("Message PrivateAI").inputValue());
    await tab(page, "Saved").click();
  }
  expect(drafts.sort()).toEqual([
    "SYNTHETIC latest saved draft",
    "SYNTHETIC original saved draft",
  ]);
  expect(outgoing).toEqual([]);
});
