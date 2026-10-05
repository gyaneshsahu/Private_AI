import { expect, it } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
it("accepts two invitations and keeps the signed-out user's saved workspace isolated in the same browser", async () => {
  const registry = new InviteRegistry(":memory:");
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const origin = `http://127.0.0.1:${address.port}`;
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    logLevel: "silent",
  });
  const app = createApp({ origin, invites: registry, dev: true });
  app.use(vite.middlewares);
  server.on("request", app);
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) =>
      console.error("Browser fixture:", error.message),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        console.error(
          "Fixture response:",
          new URL(response.url()).pathname,
          response.status(),
        );
    });
    const alice = registry.issue(Date.now() + 600000),
      bob = registry.issue(Date.now() + 600000);
    const accept = async (invite: typeof alice) => {
      await page.goto(origin);
      const form = page.locator('form[action="/auth/register"]');
      await form.getByLabel("Access ID").fill(invite.id);
      await form.getByLabel("Invitation code").fill(invite.token);
      await form
        .getByLabel("Choose password", { exact: false })
        .fill("synthetic access password");
      await form.getByRole("button", { name: "Accept invitation" }).click();
      await ui(page.getByLabel("Message PrivateAI")).toBeVisible();
    };
    const saved = () =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name: "Saved", exact: false })
        .click();
    const unlock = async () => {
      await saved();
      await page
        .getByLabel("Vault passphrase")
        .fill("same synthetic vault password");
      await page
        .getByRole("button", { name: "Create or unlock vault" })
        .click();
      await ui(
        page.getByRole("button", { name: "Lock and clear workspace" }),
      ).toBeVisible();
    };
    await accept(alice);
    await page
      .getByLabel("Message PrivateAI")
      .fill("ALICE SYNTHETIC PRIVATE DRAFT");
    await unlock();
    await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
    await ui(
      page.getByText("Encrypted snapshot saved", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await ui(page).toHaveURL(origin + "/auth");
    await accept(bob);
    await unlock();
    await ui(
      page.getByText("No saved conversations yet.", { exact: false }),
    ).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain(
      "ALICE SYNTHETIC",
    );
    registry.revoke(bob.id);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await ui(page).toHaveURL(origin + "/auth");
    const login = page.locator('form[action="/auth/login"]');
    await login.getByLabel("Access ID").fill(alice.id);
    await login.getByLabel("Password").fill("synthetic access password");
    await login.getByRole("button", { name: "Sign in", exact: true }).click();
    await unlock();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name: "Conversation", exact: false })
      .click();
    await ui(page.getByLabel("Message PrivateAI")).toHaveValue(
      "ALICE SYNTHETIC PRIVATE DRAFT",
    );
  } finally {
    await browser.close();
    await vite.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    registry.close();
  }
}, 30000);
