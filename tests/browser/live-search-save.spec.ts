import { workspaceControl } from "./workspace-navigation";
import { expect, test } from "@playwright/test";

test("a live search conversation saves its written draft and query, never the results, and reopens with Search again", async ({
  page,
}) => {
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), search: true } });
  });
  const disclosures: unknown[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/research/prepare"))
      disclosures.push(request.postDataJSON());
  });
  let executions = 0;
  await page.route("**/api/research/execute", async (route) => {
    executions++;
    await route.fulfill({
      json: {
        sources: [
          {
            id: "search-live",
            title: "SYNTHETIC RESULT TITLE",
            text: "Search excerpt only: SYNTHETIC EXCERPT closes at 17:00",
            url: "https://example.com/SYNTHETIC-RESULT-LINK",
            retrievedAt: "2026-10-22T12:00:00.000Z",
          },
        ],
      },
    });
  });
  const tab = (name: string) => workspaceControl(page, name);
  await page.goto("/");
  await tab("Research").click();
  await page.getByLabel("Exact search query").fill("synthetic library hours");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Search results added" }),
  ).toBeVisible();
  expect(executions).toBe(1);
  await tab("Conversation").click();
  await page
    .getByLabel("Message CometRow")
    .fill("SYNTHETIC WRITTEN DRAFT about the hours");
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic live search password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await expect(
    page.getByText("Search results and source links are never saved", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Encrypted snapshot saved" }),
  ).toBeVisible();
  // The encrypted database never holds the result title, excerpt or link.
  const stored = await page.evaluate(async () => {
    const names = (await indexedDB.databases()).map((d) => d.name ?? "");
    const name = names.find((n) => n.startsWith("privateai-vault"))!;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const chunks: string[] = [];
    for (const store of Array.from(db.objectStoreNames)) {
      const all = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction(store).objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      chunks.push(JSON.stringify(all));
    }
    db.close();
    return chunks.join("\n");
  });
  // Records are sealed, so plaintext must be absent regardless; this guards the
  // storage path itself, not the cipher.
  expect(stored).not.toContain("SYNTHETIC RESULT TITLE");
  expect(stored).not.toContain("SYNTHETIC-RESULT-LINK");
  await page.getByRole("button", { name: "Lock and clear workspace" }).click();
  await page.reload();
  await tab("Saved").click();
  await page
    .getByLabel("Vault passphrase")
    .fill("synthetic live search password");
  await page.getByRole("button", { name: "Create or unlock vault" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await tab("Conversation").click();
  await expect(page.getByLabel("Message CometRow")).toHaveValue(
    "SYNTHETIC WRITTEN DRAFT about the hours",
  );
  await tab("Context").click();
  const note = page.getByRole("region", { name: "From a live search" });
  await expect(note).toContainText("Results and links were not kept");
  await expect(page.locator("body")).not.toContainText(
    "SYNTHETIC RESULT TITLE",
  );
  await note.getByRole("button", { name: "Search again" }).click();
  // One tap prepares the same approved query; nothing is sent until approval.
  await expect(
    page.getByRole("region", { name: "Confirm external disclosure" }),
  ).toContainText("synthetic library hours");
  expect(executions).toBe(1);
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Search results added" }),
  ).toBeVisible();
  expect(executions).toBe(2);
  expect(disclosures).toEqual([
    { kind: "search", value: "synthetic library hours" },
    { kind: "search", value: "synthetic library hours" },
  ]);
});
