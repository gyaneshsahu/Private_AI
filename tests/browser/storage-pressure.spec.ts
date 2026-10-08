import { expect, test } from "@playwright/test";

test("storage quota failure preserves the draft and prior encrypted snapshot until explicit save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (
        (window as unknown as { syntheticStorageFull?: boolean })
          .syntheticStorageFull &&
        mode === "readwrite"
      )
        throw new DOMException("SYNTHETIC_QUOTA_DETAIL", "QuotaExceededError");
      return original.call(this, stores, mode, options);
    };
  });
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto("/");
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC ORIGINAL SAVED DRAFT");
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic quota test password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
  const ciphertext = () =>
    page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const request = indexedDB.open("privateai-vault");
          request.onerror = () => reject(Error("fixture open"));
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction("conversations", "readonly"),
              read = tx.objectStore("conversations").getAll();
            read.onsuccess = () =>
              resolve(
                JSON.stringify(
                  read.result.map((r) =>
                    Array.from(new Uint8Array(r.data.data)),
                  ),
                ),
              );
            read.onerror = () => reject(Error("fixture read"));
            tx.oncomplete = () => db.close();
          };
        }),
    );
  const before = await ciphertext();
  await tab("Conversation").click();
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC UNSAVED REPLACEMENT");
  await page.evaluate(() => {
    Object.assign(window, { syntheticStorageFull: true });
  });
  await tab("Saved").click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Browser storage is full" });
  await expect(notice).toContainText("Browser storage is full");
  await expect(notice).not.toContainText("SYNTHETIC_QUOTA_DETAIL");
  expect(await ciphertext()).toBe(before);
  await tab("Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC UNSAVED REPLACEMENT",
  );
  await page.evaluate(() => {
    Object.assign(window, { syntheticStorageFull: false });
  });
  await tab("Saved").click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByText("No unsaved workspace changes.", { exact: false }),
  ).toBeVisible();
  expect(await ciphertext()).not.toBe(before);
  expect(posts).toEqual([]);
});

test("narrow and magnified workspace supports keyboard activation and error recovery without draft loss", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC KEYBOARD DRAFT");
  const saved = page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Saved", exact: false });
  await saved.focus();
  await page.keyboard.press("Enter");
  const pass = page.getByLabel("Vault passphrase");
  await pass.focus();
  await page.keyboard.type("synthetic keyboard password");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save encrypted snapshot" }),
  ).toBeVisible();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 780 });
    await page.evaluate((w) => {
      document.body.style.zoom = w === 1280 ? "2" : "1";
    }, width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Save encrypted snapshot" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
});
