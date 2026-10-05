import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";

test("draft and corrected document survive explicit encrypted save; switching protects unsaved changes", async ({
  page,
}) => {
  const disclosures: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      disclosures.push(request.url());
  });
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("DRAFT CANARY 732: compare this bill");
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Context").click();
  await page.getByLabel("Add documents or screenshots").setInputFiles({
    name: "draft-bill.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SYNTHETIC amount 80 EUR"),
  });
  await page.locator("details summary").first().click();
  await page
    .getByLabel("Text for draft-bill.txt", { exact: true })
    .fill("SYNTHETIC corrected amount 95 EUR");
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic draft test password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  // Inspect actual IndexedDB bytes, including metadata, rather than UI text.
  const durable = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("privateai-vault", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const records = await Promise.all(
        Array.from(database.objectStoreNames).map(
          (name) =>
            new Promise<unknown[]>((resolve, reject) => {
              const request = database
                .transaction(name)
                .objectStore(name)
                .getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            }),
        ),
      );
      return JSON.stringify(records, (_key, value) =>
        value instanceof ArrayBuffer ? new TextDecoder().decode(value) : value,
      );
    } finally {
      database.close();
    }
  });
  expect(durable).not.toMatch(/DRAFT CANARY|corrected amount|draft-bill/);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic draft test password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Context").click();
  await page.locator("details summary").first().click();
  await expect(
    page.getByLabel("Text for draft-bill.txt", { exact: true }),
  ).toHaveValue("SYNTHETIC corrected amount 95 EUR");
  await tab("Conversation").click();
  await page.getByLabel("Message PrivateAI").fill("UNSAVED replacement draft");
  await tab("Saved").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await tab("Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "UNSAVED replacement draft",
  );
  await tab("Saved").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Saved").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toBeVisible();
  await tab("Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toBeEmpty();
  expect(disclosures).toEqual([]);
});

test("a draft without attachments can be saved and reopened", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("Draft only");
  const saved = page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Saved" });
  await saved.click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic draft test password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Save encrypted snapshot" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByLabel("Message PrivateAI")).toBeEmpty();
  await saved.click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue("Draft only");
});

test("everyday starters prepare editable drafts and keep research an explicit action", async ({
  page,
}) => {
  const outbound: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") outbound.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Write or revise", exact: false })
    .click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    /Help me write/,
  );
  await page.getByLabel("Message PrivateAI").fill("My existing unsent draft");
  await page
    .getByRole("button", { name: "Plan something", exact: false })
    .click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "My existing unsent draft",
  );
  await page
    .locator(".composer")
    .getByRole("button", { name: "Research", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Review disclosure" }),
  ).toBeVisible();
  expect(outbound).toEqual([]);
});
