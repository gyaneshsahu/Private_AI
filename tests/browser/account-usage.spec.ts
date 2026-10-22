import { workspaceControl } from "./workspace-navigation";
import { test, expect } from "@playwright/test";

test("account view preserves drafts and never invents a paid allowance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Message PrivateAI").fill("SYNTHETIC unsent question");
  await workspaceControl(page, "Account")
    .click();
  await expect(
    page.getByText("No plan is active for this account yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Your vault passphrase cannot currently be recovered", {
      exact: false,
    }),
  ).toBeVisible();
  await workspaceControl(page, "Conversation")
    .click();
  await expect(page.getByLabel("Message PrivateAI")).toHaveValue(
    "SYNTHETIC unsent question",
  );
});

test("synthetic account status renders request counts without claiming token billing", async ({
  page,
}) => {
  await page.route("**/api/status", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        requestAllowance: {
          state: "exhausted",
          limit: 2,
          used: 2,
          remaining: 0,
          pending: 1,
          uncertain: 1,
          resetsAt: "2026-11-01T00:00:00Z",
          meteredRequests: 1,
          promptTokens: 1200,
          completionTokens: 340,
          costUsd: "0.00046",
          unmeteredRequests: 1,
        },
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await workspaceControl(page, "Account")
    .click();
  await expect(
    page.getByRole("heading", { name: "0 requests remaining" }),
  ).toBeVisible();
  await expect(
    page.getByText("not token charges or completed-answer counts", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("1,200 prompt tokens and 340 completion tokens", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Published cost so far: USD 0.00046", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "interrupted requests are billed by the provider but cannot be counted here",
      { exact: false },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
