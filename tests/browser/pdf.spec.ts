import { workspaceControl } from "./workspace-navigation";
import { test, expect } from "@playwright/test";
function pdf() {
  const stream = "BT /F1 16 Tf 50 700 Td (Amount due: 120.50 EUR) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let result = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(result));
    result += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => n.toString().padStart(10, "0") + " 00000 n ")
    .join(
      "\n",
    )}\ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(result);
}
test("real PDF extraction preserves a source page and amount; malformed inputs fail explicitly", async ({
  page,
}) => {
  await page.goto("/?developmentTools");
  await workspaceControl(page, "Context").click();
  await page
    .getByLabel("Add documents or screenshots")
    .setInputFiles({
      name: "synthetic-bill.pdf",
      mimeType: "application/pdf",
      buffer: pdf(),
    });
  await expect(page.locator(".content-view details summary")).toContainText("page 1");
  await page.locator(".content-view details summary").click();
  await expect(
    page.getByLabel("Text for synthetic-bill.pdf page 1"),
  ).toContainText("120.50 EUR");
  await page
    .getByLabel("Add documents or screenshots")
    .setInputFiles({
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-broken"),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "Extraction failed" }),
  ).toBeVisible();
});

test("new session clears calculator and dialog keyboard focus stays inside", async ({
  page,
}) => {
  await page.goto("/?developmentTools");
  await page.getByText("Exact decimal calculator", { exact: true }).click();
  await page.getByLabel("First number").fill("921");
  await page.getByLabel("Second number").fill("100");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await workspaceControl(page, "New conversation").click();
  await expect(page.getByLabel("First number")).toHaveValue("");
  await expect(page.locator("output")).toHaveText("");
  await workspaceControl(page, "Settings").click();
  await page
    .getByRole("button", { name: "Privacy boundaries", exact: false })
    .click();
  await expect(page.getByRole("dialog", { name: "Your privacy boundaries" })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Your privacy boundaries" })).not.toBeVisible();
});

test("short desktop with enlarged text can reach sidebar privacy controls", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 450 });
  await page.goto("/?developmentTools");
  await page.addStyleTag({ content: "html {font-size:200%}" });
  await workspaceControl(page, "Settings").click();
  const privacy = page.getByRole("button", { name: "Privacy boundaries", exact: false });
  await privacy.click();
  await expect(page.getByRole("dialog", { name: "Your privacy boundaries" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(privacy).toBeFocused();
  await expect(privacy).toBeInViewport();
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
});
