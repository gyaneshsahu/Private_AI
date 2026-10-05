import { expect, test } from "@playwright/test";

test("search excerpts lead to separately approved pages without sharing the draft", async ({ page }) => {
  const disclosures: unknown[] = [];
  let executions = 0;
  const url = "https://example.com/synthetic-library";
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), search: true } });
  });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/research/prepare")) disclosures.push(request.postDataJSON());
  });
  await page.route("**/api/research/execute", async (route) => {
    executions++;
    await route.fulfill({ json: { sources: [{
      id: executions === 1 ? "search-source" : "page-source",
      title: executions === 1 ? "Library excerpt" : "Library page",
      text: executions === 1 ? "Search excerpt only (full page not fetched): Open Saturday." : "Saturday hours: 10:00–14:00.",
      url, retrievedAt: "2026-10-05T12:00:00.000Z",
    }] } });
  });
  const tab = (name: string) => page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name, exact: false });
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC private draft");
  await tab("Research").click();
  await page.getByLabel("Exact search query").fill("synthetic library hours");
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(page.getByRole("status")).toContainText("Public sources added");
  await tab("Context").click();
  await page.locator("details summary").click();
  await page.getByRole("button", { name: "Review page retrieval" }).click();
  await expect(page.getByLabel("Exact HTTPS URL")).toHaveValue(url);
  await expect(page.getByRole("region", { name: "Confirm external disclosure" })).toHaveCount(0);
  expect(executions).toBe(1);
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await expect(page.getByRole("region", { name: "Confirm external disclosure" })).toContainText(url);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(executions).toBe(1);
  expect(disclosures).toEqual([{ kind: "search", value: "synthetic library hours" }]);
  await page.getByRole("button", { name: "Review disclosure" }).click();
  await page.getByRole("button", { name: "Approve and retrieve" }).click();
  await expect(page.getByRole("button", { name: "Review disclosure" })).toBeEnabled();
  await tab("Context").click();
  await expect(page.locator("details summary")).toHaveCount(2);
  await page.locator("details summary").filter({ hasText: "Library page" }).click();
  await expect(page.getByLabel("Text for Library page", { exact: true })).toHaveValue("Saturday hours: 10:00–14:00.");
  await expect(page.getByLabel("Text for Library excerpt", { exact: true })).toHaveValue("Search excerpt only (full page not fetched): Open Saturday.");
  expect(disclosures).toEqual([{ kind: "search", value: "synthetic library hours" }, { kind: "page", value: url }]);
  expect(executions).toBe(2);
  await tab("Conversation").click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue("SYNTHETIC private draft");
});
