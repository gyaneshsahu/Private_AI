import { workspaceControl } from "./workspace-navigation";
import { test, expect } from "@playwright/test";

test("attaches from the keyboard in chat, reviews local corrections and preserves the draft without disclosure", async ({
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
    .getByLabel("Message PrivateAI")
    .fill("Compare these synthetic notes");
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Attach file", exact: true }).focus();
  await page.keyboard.press("Enter");
  await (
    await chooser
  ).setFiles([
    {
      name: "first-note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SYNTHETIC FIRST: date June 3"),
    },
    {
      name: "second-note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("SYNTHETIC SECOND: date June 4"),
    },
  ]);
  const attachments = page.getByRole("list", {
    name: "Conversation attachments",
  });
  await expect(attachments.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "Compare these synthetic notes",
  );
  await expect(
    page.getByRole("button", { name: "Send ↑", exact: true }),
  ).toBeDisabled();
  await attachments
    .getByRole("button", { name: "Review first-note.txt", exact: true })
    .click();
  await page.locator(".content-view details summary").first().click();
  await page
    .getByLabel("Text for first-note.txt", { exact: true })
    .fill("SYNTHETIC FIRST: corrected June 5");
  await page
    .getByRole("checkbox", { name: "second-note.txt", exact: true })
    .uncheck();
  await workspaceControl(page, "Conversation")
    .click();
  await expect(attachments.getByRole("listitem").nth(1)).toContainText(
    "Excluded",
  );
  await page.addStyleTag({ content: "html { font-size: 30px !important; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await workspaceControl(page, "Saved")
    .click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic attachment password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  expect(disclosures).toEqual([]);
});

test("attachment limit and unsupported-file errors keep the chat draft and existing local files", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("Keep this synthetic draft");
  const input = page.getByLabel("Attach files to this conversation");
  await input.setInputFiles({
    name: "unsupported.html",
    mimeType: "text/html",
    buffer: Buffer.from("<p>synthetic</p>"),
  });
  await expect(
    page.getByRole("region", { name: "File import results" }),
  ).toContainText("unsupported.html — failed");
  await expect(input).toBeEnabled();
  await input.setInputFiles(
    Array.from({ length: 5 }, (_, index) => ({
      name: `note-${index}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(`SYNTHETIC note ${index}`),
    })),
  );
  await expect(
    page
      .getByRole("list", { name: "Conversation attachments" })
      .getByRole("listitem"),
  ).toHaveCount(5);
  await page.getByLabel("Attachments and tools", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Attach file", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "Keep this synthetic draft",
  );
});
