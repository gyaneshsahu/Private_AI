import { test, expect } from "@playwright/test";
import { webcrypto } from "node:crypto";
import { workspaceControl } from "./workspace-navigation";
import { encodeVaultBackup } from "../../src/vault-backup";
import { derive } from "../../src/vault-crypto";

const password = "synthetic disappearing backup password";

async function backupWithExpiredMessage() {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt);
  const now = Date.now();
  return encodeVaultBackup(key, salt, [
    {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Disappearing synthetic chat",
      createdAt: new Date(now - 3 * 3_600_000).toISOString(),
      usage: [],
      attachments: [],
      draft: "",
      disappearAfter: "hour",
      messages: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          role: "user",
          text: "EXPIRED_MESSAGE_CANARY_2201 two hours ago",
          status: "complete",
          included: true,
          at: new Date(now - 2 * 3_600_000).toISOString(),
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          role: "assistant",
          text: "RECENT_MESSAGE_CANARY_2202 ten minutes ago",
          status: "complete",
          included: true,
          at: new Date(now - 10 * 60_000).toISOString(),
        },
      ],
    },
  ]);
}

test("messages older than the chosen window disappear from this device when the chat is opened, and the control is explained", async ({
  page,
}) => {
  const backup = await backupWithExpiredMessage();
  await page.goto("/?developmentTools");
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "history.privateai-backup",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(password);
  await page
    .getByLabel("I want to add copies from this backup to the current vault.")
    .check();
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "older than 1 hour disappeared" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Disappearing messages." }),
  ).toContainText("Messages older than 1 hour are deleted from this device");
  await expect(
    page.getByText("RECENT_MESSAGE_CANARY_2202").first(),
  ).toBeVisible();
  await expect(page.getByText("EXPIRED_MESSAGE_CANARY_2201")).toHaveCount(0);
  // The pruned copy was written back: reopening after a reload still lacks the expired message.
  await page.reload();
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    page.getByText("RECENT_MESSAGE_CANARY_2202").first(),
  ).toBeVisible();
  await expect(page.getByText("EXPIRED_MESSAGE_CANARY_2201")).toHaveCount(0);
  const stored = await page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((d) => d.name ?? "");
    let text = "";
    for (const name of names) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const req = db.transaction(store).objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        text += JSON.stringify(rows, (_k, v) =>
          v instanceof ArrayBuffer
            ? Array.from(new Uint8Array(v)).join(",")
            : v,
        );
      }
      db.close();
    }
    return text;
  });
  // Encrypted at rest: neither canary is visible in storage either way.
  expect(stored).not.toContain("RECENT_MESSAGE_CANARY_2202");
  expect(stored).not.toContain("EXPIRED_MESSAGE_CANARY_2201");
  // Turning the window off keeps what is left; the control lives in the conversation menu.
  await page.getByLabel("Conversation actions", { exact: true }).click();
  await page.getByLabel("Disappearing messages").selectOption("off");
  await expect(
    page.getByRole("status").filter({ hasText: "Disappearing messages." }),
  ).toHaveCount(0);
});
