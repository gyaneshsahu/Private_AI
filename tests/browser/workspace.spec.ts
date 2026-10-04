import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test("temporary text extraction, context corrections and calculator work without outbound disclosure", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173/")) external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByText("Private chat is not connected yet"),
  ).toBeVisible();
  await page.getByLabel("Message PrivateAI").fill("PRIVATE CANARY 4829");
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Context", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Add documents or screenshots")
    .setInputFiles({
      name: "bill.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Electricity bill: 120.50 EUR. Due 15 November. PRIVATE CANARY 4829",
      ),
    });
  await expect(
    page.getByText("bill.txt", { exact: false }).first(),
  ).toBeVisible();
  await page.locator("details summary").first().click();
  await expect(
    page.getByLabel("Text for bill.txt", { exact: true }),
  ).toContainText("120.50 EUR");
  await page
    .getByLabel("Text for bill.txt", { exact: true })
    .fill("Corrected total 102.50 EUR");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(
    await page.evaluate(
      async () =>
        (await indexedDB.databases()).filter(
          (d) => d.name === "privateai-vault",
        ).length,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Conversation", exact: false })
    .first()
    .click();
  await page.getByText("Exact decimal calculator", { exact: true }).click();
  await page.getByLabel("First number").fill("0.1");
  await page.getByLabel("Second number").fill("0.2");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator("output")).toHaveText("0.1 + 0.2 = 0.3");
  await page.reload();
  await page
    .getByRole("button", { name: "Context", exact: false })
    .first()
    .click();
  await expect(
    page.getByText("Your context is empty.", { exact: false }),
  ).toBeVisible();
  expect(external).toEqual([]);
});

test("research review and cancellation make no research request; unsafe page approval fails closed", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/research/")) requests.push(r.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Research", exact: false })
    .first()
    .click();
  await page.getByLabel("Research method").selectOption("page");
  await page
    .getByLabel("Exact HTTPS URL")
    .fill("https://127.0.0.1/private-canary");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Research could not complete" }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
});

test("encrypted snapshots survive reload, lock clears content and deletion persists", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Context", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Add documents or screenshots")
    .setInputFiles({
      name: "private.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "SENSITIVE NOTE 991: only an encrypted snapshot should persist.",
      ),
    });
  await expect(
    page.getByText("private.txt", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Saved", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Save encrypted snapshot" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("Encrypted snapshot saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await expect(page.getByText("Local vault unlocked")).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Saved", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page
    .getByRole("button", { name: "Context", exact: false })
    .first()
    .click();
  await page.locator("details summary").first().click();
  await expect(page.getByLabel("Text for private.txt")).toContainText(
    "SENSITIVE NOTE 991",
  );
  await page
    .getByRole("button", { name: "Saved", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toBeVisible();
});

test("real local screenshot OCR reads printed text without a remote OCR service", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173/")) external.push(r.url());
  });
  await page.goto("/");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1000, 200);
    ctx.fillStyle = "black";
    ctx.font = "48px Arial";
    ctx.fillText("Total: 120.50 EUR", 30, 100);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByRole("button", { name: "Context", exact: false })
    .first()
    .click();
  await page
    .getByLabel("Add documents or screenshots")
    .setInputFiles({
      name: "screenshot.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(page.locator("details summary")).toBeVisible({ timeout: 45000 });
  await page.locator("details summary").click();
  await expect(page.getByLabel("Text for screenshot.png page 1")).toContainText(
    "120.50 EUR",
  );
  expect(external).toEqual([]);
});

test("desktop and basic phone layouts have no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ["Conversation", "Context", "Research", "Saved"]) {
      await page
        .getByRole("button", { name: tab, exact: false })
        .first()
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.screenshot({ path: "test-results/phone.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Conversation", exact: false })
    .first()
    .click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
