import { expect, test } from "@playwright/test";

test("identifiers are removed from the search text on the device, only the cleaned text leaves, and the answer shows what was searched", async ({
  page,
}) => {
  // Search is automatic (owner, 19 November): it needs search and a ready model. No answer is
  // stubbed here, so the answer after the search fails; only the search is under test.
  await page.route("**/api/status", async (route) => {
    const status = await (await route.fetch()).json();
    await route.fulfill({
      json: { ...status, search: true, inference: { ...status.inference, ready: true } },
    });
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
  await page
    .getByLabel("Message CometRow")
    .fill("current home office tax rules DE89 3704 0044 0532 0130 00 for Anna Weber");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const searched = page.locator("details.searched-web");
  await expect(searched).toContainText("Searched the web");
  expect(prepared).toHaveLength(1);
  const sent = JSON.parse(prepared[0]) as { kind: string; value: string };
  expect(sent.kind).toBe("search");
  expect(sent.value).toContain(
    "current home office tax rules [bank account removed] for Anna Weber",
  );
  expect(prepared[0]).not.toContain("0532 0130");
  // Opened, the note shows exactly the text that left the device, and the source.
  await searched.locator("summary").click();
  await expect(searched).toContainText(`Searched for: “${sent.value}”`);
  await expect(searched.getByRole("link", { name: "Synthetic result" })).toHaveAttribute(
    "href",
    "https://example.com/tax",
  );
  // A question that needs no current information is not searched.
  await page.getByLabel("Message CometRow").fill("Explain how a library catalogue works");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator("article.user")).toHaveCount(2);
  expect(prepared).toHaveLength(1);
});
