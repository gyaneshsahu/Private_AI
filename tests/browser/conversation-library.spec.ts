import { expect, test } from "@playwright/test";

test("named encrypted history is searchable locally and survives lock/reopen without leaking the query", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      new URL(request.url()).origin !== "http://127.0.0.1:4173"
    )
      outgoing.push(request.url());
  });
  const tab = (name: string) =>
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name, exact: false });
  await page.goto("/");
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC walking itinerary");
  await tab("Saved").click();
  await page
    .getByLabel("Conversation title", { exact: true })
    .fill("SYNTHETIC Weekend plans");
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic library passphrase");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("article", { name: "SYNTHETIC Weekend plans" }),
  ).toBeVisible();
  await tab("Conversation").click();
  await page
    .getByRole("button", { name: "New conversation" })
    .click();
  await tab("Conversation").click();
  await page
    .getByLabel("Message PrivateAI")
    .fill("SYNTHETIC explain array sorting");
  await tab("Saved").click();
  await page
    .getByLabel("Conversation title", { exact: true })
    .fill("SYNTHETIC Coding notes");
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await page.getByLabel("Search saved conversations").fill("weekend itinerary");
  await expect(
    page.getByRole("article", { name: "SYNTHETIC Weekend plans" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "SYNTHETIC Coding notes" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Search saved conversations")
    .fill("SEARCH CANARY NEVER PERSIST");
  await expect(
    page.getByText("No matching conversations.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByLabel("Sort conversations").selectOption("title");
  await expect(page.getByRole("article").first()).toHaveAccessibleName(
    "SYNTHETIC Coding notes",
  );
  const stored = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("privateai-vault", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const all = await Promise.all(
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
      return JSON.stringify(all, (_key, value) =>
        value instanceof ArrayBuffer ? new TextDecoder().decode(value) : value,
      );
    } finally {
      database.close();
    }
  });
  expect(stored).not.toMatch(/SYNTHETIC|Weekend|itinerary|SEARCH CANARY/);
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await expect(page.getByLabel("Search saved conversations")).toHaveCount(0);
  await expect(
    page.getByLabel("Conversation title", { exact: true }),
  ).toHaveValue("New conversation");
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic library passphrase");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(page.getByLabel("Search saved conversations")).toBeEmpty();
  await page.getByLabel("Search saved conversations").fill("weekend");
  await page
    .getByRole("article", { name: "SYNTHETIC Weekend plans" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC walking itinerary",
  );
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(outgoing).toEqual([]);
});
