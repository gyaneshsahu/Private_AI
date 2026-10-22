import { workspaceControl } from "./workspace-navigation";
import { expect, test, type Page } from "@playwright/test";
import { decodeVaultBackup } from "../../src/vault-backup";
import { mkdir } from "node:fs/promises";

const tab = (page: Page, name: string) =>
  workspaceControl(page, name);
const password = "synthetic portable backup password";
async function unlock(page: Page, secret = password) {
  await tab(page, "Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Lock and clear workspace" }),
  ).toBeVisible();
}
async function download(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  const file = await event;
  expect(file.suggestedFilename()).toBe("privateai-encrypted.privateai-backup");
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
async function choose(page: Page, data: Buffer, secret = password) {
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "history.privateai-backup",
      mimeType: "application/json",
      buffer: data,
    });
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(secret);
  await page
    .getByLabel("I want to add copies from this backup to the current vault.")
    .check();
}
function collect(page: Page) {
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      outgoing.push(request.url());
  });
  return outgoing;
}

test("downloads only encrypted saved content and restores documents/drafts into a separate browser vault", async ({
  page,
  browser,
}) => {
  const outgoing = collect(page);
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC SAVED PORTABLE DRAFT");
  await page.getByLabel("Attach files to this conversation").setInputFiles({
    name: "synthetic-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SYNTHETIC PORTABLE DOCUMENT"),
  });
  await expect(page.getByLabel("File import results")).toContainText("added");
  await unlock(page);
  await page
    .getByLabel("Conversation title", { exact: true })
    .fill("Portable synthetic notes");
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("article", { name: "Portable synthetic notes" }),
  ).toBeVisible();
  await tab(page, "Conversation").click();
  await page
    .getByLabel("Message PrivateAI")
    .fill("UNSAVED DRAFT MUST NOT BE EXPORTED");
  await tab(page, "Saved").click();
  const backup = await download(page);
  expect(backup.toString()).not.toMatch(
    /SYNTHETIC|Portable synthetic|synthetic-notes|UNSAVED|portable backup password/,
  );
  const destination = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const restored = await destination.newPage();
    const requests = collect(restored);
    await restored.goto("/");
    await restored
      .getByLabel("Message PrivateAI")
      .fill("KEEP DESTINATION WORKSPACE DRAFT");
    await unlock(restored, "synthetic destination key password");
    await choose(restored, backup);
    await restored
      .getByRole("button", { name: "Restore as new copies" })
      .click();
    await expect(
      restored.getByText("Restored 1 saved conversation as new copies.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      restored.getByLabel("Original backup passphrase", { exact: true }),
    ).toBeEmpty();
    await tab(restored, "Conversation").click();
    await expect(restored.getByLabel("Message PrivateAI")).toHaveValue(
      "KEEP DESTINATION WORKSPACE DRAFT",
    );
    await tab(restored, "Saved").click();
    await restored
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await restored.reload();
    await unlock(restored, "synthetic destination key password");
    await restored.addStyleTag({
      content: "html { font-size: 200% !important; }",
    });
    expect(
      await restored.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mkdir(".local/vault-backup-review", { recursive: true });
    await restored
      .getByRole("region", { name: "Encrypted backup and restore" })
      .screenshot({ path: ".local/vault-backup-review/mobile-enlarged.png" });
    await restored
      .getByRole("article", { name: "Portable synthetic notes" })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await expect(restored.getByLabel("Message PrivateAI")).toHaveValue(
      "SYNTHETIC SAVED PORTABLE DRAFT",
    );
    await tab(restored, "Context").click();
    await restored.locator(".content-view details summary").click();
    await expect(
      restored
        .getByRole("textbox", { name: /Text for synthetic-notes/ })
        .first(),
    ).toHaveValue("SYNTHETIC PORTABLE DOCUMENT");
    expect(requests).toEqual([]);
  } finally {
    await destination.close();
  }
  expect(outgoing).toEqual([]);
});

test("wrong password and corrupt backup preserve saved history; restore requires renewed explicit confirmation", async ({
  page,
}) => {
  const outgoing = collect(page);
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC EXISTING HISTORY");
  await unlock(page);
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  const backup = await download(page);
  await choose(page, backup, "synthetic incorrect backup password");
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Restore could not complete" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Restore as new copies" }),
  ).toBeDisabled();
  await choose(page, Buffer.from('{"format":"not-a-backup"}'));
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Restore could not complete" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await choose(page, backup);
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "oversized.privateai-backup",
      mimeType: "application/json",
      buffer: Buffer.alloc(16 * 1024 * 1024 + 1),
    });
  await expect(page.getByRole("alert")).toContainText("at most 16 MiB");
  await expect(
    page.getByRole("button", { name: "Restore as new copies" }),
  ).toBeDisabled();
  expect(outgoing).toEqual([]);
});

test("current temporary research never enters a backup of earlier saved history", async ({
  page,
}) => {
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), search: true } });
  });
  await page.route("**/api/research/execute", (route) =>
    route.fulfill({
      json: {
        sources: [
          {
            id: "research-canary",
            title: "SYNTHETIC TEMPORARY RESEARCH CANARY",
            text: "SYNTHETIC TEMPORARY EXCERPT CANARY",
            url: "https://example.test/synthetic",
            retrievedAt: "2026-10-19T00:00:00Z",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC SAVED BEFORE RESEARCH");
  await unlock(page);
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await tab(page, "Research").click();
  await page
    .getByLabel("Exact search query")
    .fill("synthetic research query canary");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Search results added" }),
  ).toBeVisible();
  await tab(page, "Saved").click();
  // Unsaved live research never enters a backup of the earlier snapshot.
  const backup = await download(page);
  const decoded = await decodeVaultBackup(backup.toString(), password);
  expect(decoded).toHaveLength(1);
  expect(decoded[0].draft).toBe("SYNTHETIC SAVED BEFORE RESEARCH");
  expect(JSON.stringify(decoded)).not.toMatch(
    /TEMPORARY|CANARY|canary|example\.test/,
  );
  // Saving is allowed since 22 October: the snapshot keeps the approved query
  // and the written draft, never the result title, excerpt or link.
  await expect(
    page.getByRole("button", { name: "Save encrypted snapshot" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Encrypted snapshot saved" }),
  ).toBeVisible();
  const afterSave = await decodeVaultBackup(
    (await download(page)).toString(),
    password,
  );
  expect(afterSave).toHaveLength(1);
  const text = JSON.stringify(afterSave);
  expect(text).toContain("synthetic research query canary");
  expect(text).toContain("strippedAt");
  expect(text).not.toMatch(/TEMPORARY RESEARCH CANARY|EXCERPT CANARY|example\.test/);
});
