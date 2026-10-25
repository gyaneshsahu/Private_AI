import { workspaceControl } from "../evaluation/workspace-navigation";
import { expect, it } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
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
    cacheDir: "node_modules/.vite-invite-browser",
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
    logLevel: "silent",
  });
  await warmDevServer(vite);
  const app = createApp({ origin, invites: registry, dev: true });
  app.use(vite.middlewares);
  server.on("request", app);
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
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
    await page.route("http://invitation.example/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<a href="${origin}/">Open PrivateAI</a><a href="${origin}/auth">Sign in</a>`,
      }),
    );
    for (const name of ["Open PrivateAI", "Sign in"]) {
      await page.goto("http://invitation.example/");
      await page.getByRole("link", { name, exact: true }).click();
      await ui(
        page.getByRole("heading", { name: "Your conversation starts here." }),
      ).toBeVisible();
    }
    await page.goto(origin, { timeout: 30000 });
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("body")
          .evaluate((node) => getComputedStyle(node).backgroundColor),
      ).toBe("rgb(247, 246, 242)");
    }
    await page.screenshot({
      path: ".local/diagnostics/invite-access-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    const accept = async (invite: typeof alice) => {
      await page.goto(origin, { timeout: 30000 });
      const form = page.locator('form[action="/auth/register"]');
      if (invite.id === alice.id) {
        await form.getByLabel("Access ID").fill(invite.id);
        await form.getByLabel("Invitation code").fill("SYNTHETIC_WRONG_CODE");
        await form
          .getByLabel("Choose password", { exact: false })
          .fill("SYNTHETIC_SECRET_PASSWORD");
        await form.getByRole("button", { name: "Accept invitation" }).click();
        await ui(page.getByRole("alert")).toContainText(
          "Access could not be verified",
        );
        expect(await page.content()).not.toContain("SYNTHETIC_WRONG_CODE");
        expect(await page.content()).not.toContain("SYNTHETIC_SECRET_PASSWORD");
        await ui(form.getByLabel("Invitation code")).toHaveValue("");
        await ui(
          form.getByLabel("Choose password", { exact: false }),
        ).toHaveValue("");
      }
      await form.getByLabel("Access ID").fill(invite.id);
      await form.getByLabel("Invitation code").fill(invite.token);
      await form
        .getByLabel("Choose password", { exact: false })
        .fill("synthetic access password");
      const accepted = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/auth/register" &&
          r.request().method() === "POST",
      );
      await form.getByRole("button", { name: "Accept invitation" }).click();
      expect((await accepted).status()).toBe(303);
      await ui(page.getByLabel("Message CometRow")).toBeVisible();
    };
    const saved = () => workspaceControl(page, "Saved").click();
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
      .getByLabel("Message CometRow")
      .fill("ALICE SYNTHETIC PRIVATE DRAFT");
    await unlock();
    await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
    await ui(
      page.getByText("Encrypted snapshot saved", { exact: false }),
    ).toBeVisible();
    await workspaceControl(page, "Account").click();
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
    await workspaceControl(page, "Conversation").click();
    await ui(page.getByLabel("Message CometRow")).toHaveValue(
      "ALICE SYNTHETIC PRIVATE DRAFT",
    );
    await workspaceControl(page, "Account").click();
    await page
      .getByRole("button", { name: "Change sign-in password", exact: true })
      .click();
    await ui(page).toHaveURL(origin + "/auth/password");
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    const passwordForm = page.locator('form[action="/auth/password"]');
    await passwordForm
      .getByLabel("Current password", { exact: true })
      .fill("synthetic access password");
    await passwordForm
      .getByLabel("New password (at least 12 characters)", { exact: true })
      .fill("synthetic changed password");
    await passwordForm
      .getByLabel("Confirm new password", { exact: true })
      .fill("wrong confirmation");
    await passwordForm.getByRole("button").click();
    await ui(page.getByRole("alert")).toBeVisible();
    await ui(
      passwordForm.getByLabel("Current password", { exact: true }),
    ).toHaveValue("");
    await passwordForm
      .getByLabel("Current password", { exact: true })
      .fill("synthetic access password");
    await passwordForm
      .getByLabel("New password (at least 12 characters)", { exact: true })
      .fill("synthetic changed password");
    await passwordForm
      .getByLabel("Confirm new password", { exact: true })
      .fill("synthetic changed password");
    await passwordForm.getByRole("button").click();
    await ui(page).toHaveURL(origin + "/auth");
    await login.getByLabel("Access ID").fill(alice.id);
    await login.getByLabel("Password").fill("synthetic changed password");
    await login.getByRole("button", { name: "Sign in", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await unlock();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await workspaceControl(page, "Conversation").click();
    await ui(page.getByLabel("Message CometRow")).toHaveValue(
      "ALICE SYNTHETIC PRIVATE DRAFT",
    );
    const oldEpoch = await page.evaluate(
      async () => (await (await fetch("/api/status")).json()).accessEpoch,
    );
    const sibling = await page.context().newPage();
    await sibling.goto(origin + "/auth");
    const siblingLogin = sibling.locator('form[action="/auth/login"]');
    await siblingLogin.getByLabel("Access ID").fill(alice.id);
    await siblingLogin
      .getByLabel("Password")
      .fill("synthetic changed password");
    const siblingSignedIn = sibling.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/auth/login" &&
        response.request().method() === "POST",
    );
    await Promise.all([
      sibling.waitForURL(origin + "/", { waitUntil: "load" }),
      siblingLogin
        .getByRole("button", { name: "Sign in", exact: true })
        .click(),
    ]);
    expect((await siblingSignedIn).status()).toBe(303);
    await ui(sibling.getByLabel("Message CometRow")).toBeVisible();
    const newEpoch = await sibling.evaluate(
      async () => (await (await fetch("/api/status")).json()).accessEpoch,
    );
    expect(newEpoch).not.toBe(oldEpoch);
    await sibling
      .getByLabel("Message CometRow")
      .fill("NEW LOGIN UNSAVED DRAFT");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await ui(page.getByLabel("Message CometRow")).toHaveValue("");
    await ui(sibling.getByLabel("Message CometRow")).toHaveValue(
      "NEW LOGIN UNSAVED DRAFT",
    );
    await unlock();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await workspaceControl(page, "Conversation").click();
    await ui(page.getByLabel("Message CometRow")).toHaveValue(
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
