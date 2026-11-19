import { workspaceControl } from "./workspace-navigation";
import { expect, test } from "@playwright/test";

// Since 19 November a page is no longer opened by its address: the server reads the top result page
// during the automatic search, and both join the chat as separate sources.
test("an automatic search brings the excerpt and the top result page without sending a page address", async ({ page }) => {
  const disclosures: unknown[] = [];
  let executions = 0;
  const url = "https://example.com/synthetic-library";
  const question = "Is the synthetic library open today?";
  // Search is automatic (owner, 19 November): it needs search and a ready model. No answer is
  // stubbed here, so the answer after the search fails; only the search is under test.
  await page.route("**/api/status", async (route) => {
    const status = await (await route.fetch()).json();
    await route.fulfill({ json: { ...status, search: true, inference: { ...status.inference, ready: true } } });
  });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/research/prepare")) disclosures.push(request.postDataJSON());
  });
  await page.route("**/api/research/execute", async (route) => {
    executions++;
    await route.fulfill({ json: {
      sources: [
        { id: "search-source", title: "Library excerpt", text: "Search excerpt only (full page not fetched): Open Saturday.", url, retrievedAt: "2026-10-05T12:00:00.000Z", evidenceKind: "search-excerpt" },
        { id: "page-source", title: "Library page", text: "Saturday hours: 10:00–14:00.", url, retrievedAt: "2026-10-05T12:00:00.000Z", evidenceKind: "page" },
      ],
      topPage: { url, outcome: "read" },
    } });
  });
  await page.goto("/");
  await page.getByLabel("Message CometRow").fill(question);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator("details.searched-web")).toContainText("Searched the web");
  await workspaceControl(page, "Context").click();
  await expect(page.locator(".content-view details summary")).toHaveCount(2);
  await page.locator(".content-view details summary").filter({ hasText: "Library page" }).click();
  await page.locator(".content-view details summary").filter({ hasText: "Library excerpt" }).click();
  await expect(page.getByLabel("Text for Library page", { exact: true })).toHaveValue("Saturday hours: 10:00–14:00.");
  await expect(page.getByLabel("Text for Library excerpt", { exact: true })).toHaveValue("Search excerpt only (full page not fetched): Open Saturday.");
  // With both sources open: a page is never offered for a separate retrieval any more.
  await expect(page.getByRole("button", { name: "Inspect source" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Review page retrieval" })).toHaveCount(0);
  // Only the question left the device, once, as a search; no page address was sent.
  expect(disclosures).toEqual([{ kind: "search", value: question }]);
  expect(executions).toBe(1);
});
