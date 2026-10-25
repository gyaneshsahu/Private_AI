import { workspaceControl } from "./workspace-navigation";
import { expect, test } from "@playwright/test";
import { emptyConversation } from "../../shared/contracts";
import { newMessage } from "../../src/conversation";
import { branchConversation } from "../../src/conversation-branches";
import { derive } from "../../src/vault-crypto";
import { encodeVaultBackup } from "../../src/vault-backup";

test("built workspace restores, edits, switches and saves branches without any inference request", async ({
  page,
}) => {
  const original = {
    ...emptyConversation(),
    title: "SYNTHETIC Branch recovery",
    messages: [
      newMessage("user", "SYNTHETIC ORIGINAL QUESTION"),
      {
        ...newMessage("assistant", "SYNTHETIC INCOMPLETE OUTPUT"),
        status: "partial" as const,
        failure: "timeout" as const,
      },
    ],
  };
  const edited = branchConversation(
    original,
    "SYNTHETIC ORIGINAL DRAFT",
    original.messages[0].id,
    "SYNTHETIC EDITED QUESTION",
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const secret = "synthetic branch recovery password";
  const backup = await encodeVaultBackup(await derive(secret, salt), salt, [
    edited,
  ]);
  const outgoing: string[] = [];
  page.on("request", (r) => {
    if (
      r.method() !== "GET" ||
      new URL(r.url()).origin !== "http://127.0.0.1:4173"
    )
      outgoing.push(r.url());
  });
  const tab = (name: string) =>
    workspaceControl(page, name);
  await page.goto("/");
  await tab("Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page
    .getByLabel("Encrypted backup file", { exact: true })
    .setInputFiles({
      name: "synthetic.privateai-backup",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await page
    .getByLabel("Original backup passphrase", { exact: true })
    .fill(secret);
  await page
    .getByRole("checkbox", {
      name: "I want to add copies from this backup to the current vault.",
    })
    .check();
  await page.getByRole("button", { name: "Restore as new copies" }).click();
  await page
    .getByRole("article", { name: "SYNTHETIC Branch recovery" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(
    page.getByText("SYNTHETIC EDITED QUESTION", { exact: true }),
  ).toBeVisible();
  await page.getByText("Conversation branches ·", { exact: false }).click();
  await page.getByLabel("Message CometRow").fill("SYNTHETIC EDIT DRAFT");
  await page
    .getByRole("button", { name: "Open Original branch", exact: true })
    .click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "SYNTHETIC ORIGINAL DRAFT",
  );
  await expect(
    page.getByText("Response timed out.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy answer", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Edit into a new branch" }).click();
  await expect(page.getByLabel("Edited message")).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit into a new branch" }),
  ).toBeFocused();
  await expect(
    page.getByRole("article", { name: "Your message 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "CometRow reply 2", exact: true }),
  ).toContainText("Response timed out");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Edit into a new branch" }).click();
  await expect(page.getByLabel("Edited message")).toBeFocused();
  await page.getByLabel("Edited message").fill("SYNTHETIC SECOND EDIT");
  await page
    .getByRole("button", { name: "Create branch", exact: true })
    .click();
  await expect(
    page.getByText("SYNTHETIC SECOND EDIT", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Message CometRow")).toBeFocused();
  await tab("Saved").click();
  await page
    .getByRole("button", { name: "Save encrypted snapshot", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Encrypted snapshot saved on this browser." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.reload();
  await tab("Saved").click();
  await page.getByLabel("Vault passphrase").fill(secret);
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByLabel("Search saved conversations").fill("INCOMPLETE OUTPUT");
  await page
    .getByRole("article", { name: "SYNTHETIC Branch recovery" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page.getByText("Conversation branches ·", { exact: false }).click();
  await page
    .getByRole("button", { name: "Open Edit 1 branch", exact: true })
    .click();
  await expect(
    page.getByText("Conversation branches ·", { exact: false }),
  ).toBeFocused();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "SYNTHETIC EDIT DRAFT",
  );
  await expect(
    page.getByText("SYNTHETIC SECOND EDIT", { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(outgoing).toEqual([]);
  await page.screenshot({
    path: ".local/conversation-branches-review/enlarged-mobile.png",
    fullPage: true,
  });
});
