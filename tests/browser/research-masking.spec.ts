import { workspaceControl } from "./workspace-navigation";
import { expect, test } from "@playwright/test";

test("identifiers are removed from the search text before approval, the user is warned about names, and only the cleaned text leaves", async ({
  page,
}) => {
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), search: true } });
  });
  const prepared: string[] = [];
  await page.route("**/api/research/prepare", async (route) => {
    prepared.push(route.request().postData() ?? "");
    await route.continue();
  });
  await page.route("**/api/research/execute", async (route) => {
    await route.fulfill({
      json: {
        sources: [
          {
            id: "search-masked",
            title: "Synthetic result",
            text: "Search excerpt only",
            url: "https://example.com/tax",
            retrievedAt: "2026-10-22T12:00:00.000Z",
          },
        ],
      },
    });
  });
  await page.goto("/");
  await workspaceControl(page, "Research").click();
  await page
    .getByLabel("Exact search query")
    .fill("home office tax rules DE89 3704 0044 0532 0130 00 for Anna Weber");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  const approval = page.getByRole("region", {
    name: "Confirm external disclosure",
  });
  await expect(approval.locator("pre")).toHaveText(
    "home office tax rules [bank account removed] for Anna Weber",
  );
  await expect(approval).toContainText(
    "Removed from the search text before approval: 1 bank account.",
  );
  await expect(approval.getByRole("alert")).toContainText(
    "may still contain personal details",
  );
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Search results added" }),
  ).toBeVisible();
  expect(prepared).toHaveLength(1);
  expect(prepared[0]).toContain("[bank account removed]");
  expect(prepared[0]).not.toContain("0532 0130");
  // A plain query shows neither the note nor the warning.
  await workspaceControl(page, "Research").click();
  await page.getByLabel("Exact search query").fill("library opening hours");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await expect(approval.locator("pre")).toHaveText("library opening hours");
  await expect(approval).not.toContainText("Removed from the search text");
  await expect(approval.getByRole("alert")).toHaveCount(0);
});
