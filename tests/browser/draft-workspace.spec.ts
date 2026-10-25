import { workspaceControl } from "./workspace-navigation";
import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";

test("reload warns for unsaved drafts and stops warning after an encrypted save", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Message CometRow").click();
  await page.getByLabel("Message CometRow").fill("SYNTHETIC RELOAD DRAFT");
  const warning = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await warning;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "SYNTHETIC RELOAD DRAFT",
  );
  await workspaceControl(page, "Saved")
    .click();
  await page.getByLabel("Vault passphrase").fill("synthetic reload passphrase");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  const unexpected: string[] = [];
  page.on("dialog", async (event) => {
    unexpected.push(event.type());
    await event.dismiss();
  });
  await page.reload();
  expect(unexpected).toEqual([]);
  await expect(page.getByLabel("Message CometRow")).toHaveValue("");
});

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
    workspaceControl(page, name);
  await page.goto("/");
  await page
    .getByLabel("Message CometRow")
    .fill("DRAFT CANARY 732: compare this bill");
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await workspaceControl(page, "New conversation").click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Context").click();
  await page.getByLabel("Add documents or screenshots").setInputFiles({
    name: "draft-bill.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("SYNTHETIC amount 80 EUR"),
  });
  await page.locator(".content-view details summary").first().click();
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
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key !== "privateai.appearance"))).toEqual([]);
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic draft test password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Context").click();
  await page.locator(".content-view details summary").first().click();
  await expect(
    page.getByLabel("Text for draft-bill.txt", { exact: true }),
  ).toHaveValue("SYNTHETIC corrected amount 95 EUR");
  await tab("Conversation").click();
  await page.getByLabel("Message CometRow").fill("UNSAVED replacement draft");
  await tab("Saved").click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await tab("Conversation").click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "UNSAVED replacement draft",
  );
  await tab("Saved").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "DRAFT CANARY 732: compare this bill",
  );
  await tab("Saved").click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toBeVisible();
  await tab("Conversation").click();
  await expect(page.getByLabel("Message CometRow")).toBeEmpty();
  expect(disclosures).toEqual([]);
});

test("a draft without attachments can be saved and reopened", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Message CometRow").fill("Draft only");
  const saved = workspaceControl(page, "Saved");
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
  await workspaceControl(page, "New conversation").click();
  await expect(page.getByLabel("Message CometRow")).toBeEmpty();
  await saved.click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue("Draft only");
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
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    /Help me write/,
  );
  await page.getByLabel("Message CometRow").fill("My existing unsent draft");
  await page
    .getByRole("button", { name: "Plan something", exact: false })
    .click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "My existing unsent draft",
  );
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await page
    .locator(".composer")
    .getByRole("button", { name: "Research", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Review disclosure" }),
  ).toBeVisible();
  expect(outbound).toEqual([]);
});

test("workspace guide preserves a draft and supports keyboard dismissal without disclosure", async ({
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
  await page.goto("/");
  await page.getByLabel("Message CometRow").fill("SYNTHETIC guide draft");
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await workspaceControl(page, "Settings").click();
    await page
      .getByRole("button", { name: "Getting started", exact: true })
      .click();
    const guide = page.getByRole("dialog", { name: "Using CometRow" });
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("Temporary work disappears on reload");
    await expect(guide).toContainText("passphrase cannot be recovered");
    await expect(guide).toContainText("review the exact query", {
      ignoreCase: true,
    });
    await page.keyboard.press("Escape");
    await expect(guide).toHaveCount(0);
    await expect(page.getByLabel("Message CometRow")).toHaveValue(
      "SYNTHETIC guide draft",
    );
    await expect(
      page.getByRole("button", { name: "Getting started", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Close settings" }).click();
  }
  expect(disclosures).toEqual([]);
});
