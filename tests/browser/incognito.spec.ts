import { test, expect } from "@playwright/test";
import { workspaceControl } from "./workspace-navigation";

test("an incognito chat is marked, cannot be saved, and leaves nothing behind after lock or reload", async ({
  page,
}) => {
  await page.goto("/?developmentTools");
  await workspaceControl(page, "New conversation").click();
  const toggle = page.getByRole("button", { name: "Open navigation" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("button", { name: "New incognito chat" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Incognito chat." }),
  ).toContainText("Nothing from this chat is saved on this device");
  await page
    .getByLabel("Message PrivateAI")
    .fill("INCOGNITO_CANARY_4471 draft");
  await workspaceControl(page, "Context").click();
  await page.getByLabel("Add documents or screenshots").setInputFiles({
    name: "secret.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("INCOGNITO_FILE_CANARY_8812"),
  });
  await expect(
    page.getByText("secret.txt", { exact: false }).first(),
  ).toBeVisible();
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Save encrypted snapshot" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Incognito chat." }),
  ).toHaveCount(0);
  await workspaceControl(page, "Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue("");
  await page.reload();
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toBeVisible();
  const storage = await page.evaluate(async () => {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++)
      out.push(localStorage.getItem(localStorage.key(i)!) ?? "");
    const databases = await indexedDB.databases();
    return { local: out.join("\n"), databases: databases.map((d) => d.name) };
  });
  expect(storage.local).not.toContain("INCOGNITO_CANARY_4471");
  expect(storage.local).not.toContain("INCOGNITO_FILE_CANARY_8812");
  // A normal new chat after incognito starts clean and can be saved again.
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole("button", { name: "New conversation", exact: false })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Incognito chat." }),
  ).toHaveCount(0);
});
