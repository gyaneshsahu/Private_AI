import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

type Fixture = Window & {
  releaseUnlock: () => void;
  unlockPending: boolean;
  unlockDone: boolean;
  releaseResearch: () => void;
  researchCalls: string[];
  researchReleased: boolean;
  releaseExtraction: () => void;
  extractionCalls: number;
  extractionDone: boolean;
  releaseSave: () => void;
  savePending: boolean;
  saveDone: boolean;
};

it("clearing pending imports and locking pending encrypted saves cannot restore discarded work", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-workspace-races",
    plugins: [
      {
        name: "TEST-only-delayed-extraction",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/documents.ts")) return;
          return `export async function extract(file, signal, progress) {
        window.extractionCalls = (window.extractionCalls ?? 0) + 1;
        await new Promise(resolve => window.releaseExtraction = resolve);
        progress('TEST_STALE_PROGRESS');
        window.extractionDone = true;
        return {id:'test-source',name:file.name,selected:true,sources:[{id:'test-page',title:file.name,text:'TEST_STALE_CONTENT'}]};
      }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const unexpected: string[] = [];
  try {
    const page = await browser.newPage();
    page.on("dialog", (dialog) => dialog.accept());
    await page.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== origin || request.method() !== "GET") {
        unexpected.push(request.url());
        return route.abort();
      }
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "TEST_ONLY",
            inference: { ready: false, reason: "TEST offline" },
            search: false,
          },
        });
      return route.continue();
    });
    await page.goto(origin);
    const tab = (name: string) =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name });
    await tab("Context").click();
    await page.getByLabel("Add documents or screenshots").setInputFiles(
      ["first.txt", "second.txt"].map((name) => ({
        name,
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic only"),
      })),
    );
    await page.waitForFunction(
      () => !!(window as unknown as Fixture).releaseExtraction,
    );
    await page
      .getByRole("button", { name: "New conversation", exact: false })
      .click();
    await page.evaluate(() =>
      (window as unknown as Fixture).releaseExtraction(),
    );
    await page.waitForFunction(
      () => (window as unknown as Fixture).extractionDone,
    );
    await tab("Context").click();
    await ui(page.locator("details summary")).toHaveCount(0);
    await ui(page.getByText("TEST_STALE_PROGRESS")).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as unknown as Fixture).extractionCalls),
    ).toBe(1);
    for (const delayedStage of ["prepare", "execute"] as const) {
      await page.evaluate((stage) => {
        const w = window as unknown as Fixture;
        w.researchCalls = [];
        w.researchReleased = false;
        const original = fetch.bind(window);
        window.fetch = async (input, init) => {
          const path = String(input);
          if (!path.startsWith("/api/research/")) return original(input, init);
          w.researchCalls.push(path);
          if (path.endsWith(stage)) {
            await new Promise<void>((resolve) => (w.releaseResearch = resolve));
            w.researchReleased = true;
          }
          return Response.json(
            path.endsWith("prepare")
              ? { id: "TEST_GRANT" }
              : {
                  sources: [
                    {
                      id: "test-page",
                      title: "TEST_STALE_RESEARCH",
                      text: "Synthetic only",
                    },
                  ],
                },
          );
        };
      }, delayedStage);
      await tab("Research").click();
      await page.getByLabel("Research method").selectOption("page");
      await page
        .getByLabel("Exact HTTPS URL")
        .fill("https://example.com/synthetic");
      await page.getByRole("button", { name: "Review disclosure" }).click();
      await page.getByRole("button", { name: "Approve and retrieve" }).click();
      await page.waitForFunction(
        (stage) =>
          (window as unknown as Fixture).researchCalls.includes(
            "/api/research/" + stage,
          ),
        delayedStage,
      );
      await page
        .getByRole("button", { name: "New conversation", exact: false })
        .click();
      await page.evaluate(() =>
        (window as unknown as Fixture).releaseResearch(),
      );
      await page.waitForFunction(
        () => (window as unknown as Fixture).researchReleased,
      );
      await tab("Context").click();
      await ui(page.locator("details summary")).toHaveCount(0);
      await ui(
        page.getByText("Public sources added", { exact: false }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(() => (window as unknown as Fixture).researchCalls),
      ).toEqual(
        delayedStage === "prepare"
          ? ["/api/research/prepare"]
          : ["/api/research/prepare", "/api/research/execute"],
      );
    }
    await tab("Saved").click();
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic race test passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await ui(
      page.getByRole("button", { name: "Lock and clear workspace" }),
    ).toBeVisible();
    await tab("Conversation").click();
    await page.getByLabel("Message PrivateAI").fill("SYNTHETIC_UNSAVED_DRAFT");
    await tab("Saved").click();
    await page.evaluate(() => {
      const w = window as unknown as Fixture;
      const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
      crypto.subtle.encrypt = async (
        ...args: Parameters<SubtleCrypto["encrypt"]>
      ) => {
        crypto.subtle.encrypt = encrypt;
        w.savePending = true;
        await new Promise<void>((resolve) => (w.releaseSave = resolve));
        const result = await encrypt(...args);
        w.saveDone = true;
        return result;
      };
    });
    await page.getByRole("button", { name: "Save encrypted snapshot" }).click();
    await page.waitForFunction(
      () => (window as unknown as Fixture).savePending,
    );
    await page
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await page.evaluate(() => (window as unknown as Fixture).releaseSave());
    await page.waitForFunction(() => (window as unknown as Fixture).saveDone);
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic race test passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await ui(
      page.getByText("No saved conversations yet.", { exact: false }),
    ).toBeVisible();
    await ui(
      page.getByText("Encrypted snapshot saved on this browser.", {
        exact: false,
      }),
    ).toHaveCount(0);
    await tab("Conversation").click();
    await ui(page.getByLabel("Message PrivateAI")).toHaveValue("");
    await tab("Saved").click();
    await page
      .getByRole("button", { name: "Lock and clear workspace" })
      .click();
    await page.evaluate(() => {
      const w = window as unknown as Fixture;
      const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
      crypto.subtle.deriveKey = async (
        ...args: Parameters<SubtleCrypto["deriveKey"]>
      ) => {
        crypto.subtle.deriveKey = derive;
        w.unlockPending = true;
        await new Promise<void>((resolve) => (w.releaseUnlock = resolve));
        const result = await derive(...args);
        w.unlockDone = true;
        return result;
      };
    });
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic race test passphrase");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await page.waitForFunction(
      () => (window as unknown as Fixture).unlockPending,
    );
    await page.evaluate(() => {
      const otherTab = new BroadcastChannel("privateai-vault");
      otherTab.postMessage("lock");
      otherTab.close();
    });
    await ui(
      page.getByRole("button", { name: "Create or unlock vault" }),
    ).toBeEnabled();
    await page.evaluate(() => (window as unknown as Fixture).releaseUnlock());
    await page.waitForFunction(() => (window as unknown as Fixture).unlockDone);
    await ui(
      page.getByRole("button", { name: "Lock and clear workspace" }),
    ).toHaveCount(0);
    await ui(page.getByText("Local vault unlocked")).toHaveCount(0);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 60000);
