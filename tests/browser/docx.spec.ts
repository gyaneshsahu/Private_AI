import { test, expect } from "@playwright/test";
import { docxFixture } from "../fixtures/docx";

test("DOCX stays local, exposes omissions, permits correction and preserves encrypted history", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      external.push(request.url());
  });
  await page.goto("/");
  const bytes = await docxFixture(
    "<w:p><w:r><w:t>SYNTHETIC €12.25 strictly before 16:30</w:t></w:r></w:p>",
    {
      "word/_rels/document.xml.rels":
        '<Relationships><Relationship Target="https://example.invalid/exfiltrate" TargetMode="External"/></Relationships>',
    },
  );
  const input = page.getByLabel("Attach files to this conversation");
  await input.setInputFiles([
    {
      name: "notes.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from(bytes),
    },
    {
      name: "corrupt.docx",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a ZIP"),
    },
  ]);
  const results = page.getByRole("region", { name: "File import results" });
  await expect(results).toContainText("notes.docx — added");
  await expect(results).toContainText("corrupt.docx — failed");
  await page
    .getByRole("button", { name: "Review notes.docx", exact: true })
    .click();
  await expect(page.getByText(/Word body text only/)).toBeVisible();
  await page.locator("details summary").first().click();
  const source = page.getByLabel("Text for notes.docx", { exact: true });
  await expect(source).toHaveValue("SYNTHETIC €12.25 strictly before 16:30");
  await source.fill("Corrected synthetic €13.25 strictly before 16:30");
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic docx recovery password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic docx recovery password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await tab("Context").click();
  await page.locator("details summary").first().click();
  await expect(source).toHaveValue(
    "Corrected synthetic €13.25 strictly before 16:30",
  );
  expect(external).toEqual([]);
});
