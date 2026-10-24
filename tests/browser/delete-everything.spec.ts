import { test, expect } from "@playwright/test";
import { workspaceControl } from "./workspace-navigation";

test("delete everything on this device removes the vault database, states what it cannot delete, and the privacy policy page opens", async ({
  page,
}) => {
  await page.goto("/?developmentTools");
  await page
    .getByLabel("Message PrivateAI")
    .fill("DELETE_EVERYTHING_CANARY_7731");
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("Encrypted snapshot saved", { exact: false }),
  ).toBeVisible();
  const before = await page.evaluate(async () =>
    (await indexedDB.databases()).map((d) => d.name ?? ""),
  );
  expect(before.some((name) => name.startsWith("privateai-vault"))).toBe(true);
  const region = page.getByRole("region", {
    name: "Delete everything on this device",
  });
  await expect(region).toContainText("cannot delete");
  await expect(region).toContainText("short-term working memory");
  // Cancelling the confirmation deletes nothing.
  page.once("dialog", (dialog) => void dialog.dismiss());
  await region
    .getByRole("button", { name: "Delete everything on this device" })
    .click();
  await expect(
    page.getByText("Local vault unlocked", { exact: false }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await region
    .getByRole("button", { name: "Delete everything on this device" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Everything saved on this device was deleted" }),
  ).toBeVisible();
  await expect(page.getByLabel("Vault passphrase")).toBeVisible();
  const after = await page.evaluate(async () =>
    (await indexedDB.databases()).map((d) => d.name ?? ""),
  );
  expect(after.some((name) => name.startsWith("privateai-vault"))).toBe(false);
  await workspaceControl(page, "Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue("");
  // Unlocking again starts from an empty vault.
  await workspaceControl(page, "Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toBeVisible();
  // The privacy policy page is reachable from settings and carries the deletion and contact sections.
  await workspaceControl(page, "Settings").click();
  await page.getByRole("button", { name: "Privacy & data" }).click();
  await page
    .getByRole("button", { name: "Privacy policy", exact: false })
    .click();
  const policy = page.getByRole("dialog", { name: "Privacy policy" });
  await expect(policy).toContainText("What you can delete, and how");
  await expect(policy).toContainText("90 days and then delete them");
  await expect(policy).toContainText("What stays on your device");
  // The imprint opens from the same section and carries the operator identity
  // placeholders until the owner fills deployment/legal-identity.json.
  await policy.getByRole("button", { name: "Close source" }).click();
  await workspaceControl(page, "Settings").click();
  await page.getByRole("button", { name: "Privacy & data" }).click();
  await page.getByRole("button", { name: "Imprint", exact: false }).click();
  const imprint = page.getByRole("dialog", { name: "Imprint" });
  await expect(imprint).toContainText("Service provider");
  await expect(imprint).toContainText("Security incidents:");
  await expect(imprint).toContainText("48149 Münster");
});
