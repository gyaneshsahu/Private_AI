import { test, expect } from "@playwright/test";

test("an unreadable snapshot stays stored while an intact draft can open, update and delete", async ({
  page,
}) => {
  await page.goto("/");
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC INTACT DRAFT");
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic recovery passphrase");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("privateai-vault", 1);
      request.onerror = () => reject(Error("Test database open failed"));
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction("conversations", "readwrite");
        tx.objectStore("conversations").put(
          { syntheticCorruption: true },
          "unreadable-synthetic",
        );
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = () => {
          database.close();
          reject(Error("Test write failed"));
        };
      };
    });
  });
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic recovery passphrase");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "1 saved snapshot could not be read",
  );
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC INTACT DRAFT",
  );
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC UPDATED DRAFT");
  await tab("Saved").click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("SYNTHETIC UPDATED DRAFT", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "remain stored unchanged",
  );
  await expect(
    page.getByText("No saved conversations yet.", { exact: false }),
  ).toHaveCount(0);
  const remaining = await page.evaluate(
    async () =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open("privateai-vault", 1);
        request.onerror = () => reject(Error("Test read failed"));
        request.onsuccess = () => {
          const database = request.result;
          const read = database
            .transaction("conversations")
            .objectStore("conversations")
            .getAll();
          read.onsuccess = () => {
            database.close();
            resolve(read.result);
          };
          read.onerror = () => {
            database.close();
            reject(Error("Test read failed"));
          };
        };
      }),
  );
  expect(remaining).toEqual([{ syntheticCorruption: true }]);
});
