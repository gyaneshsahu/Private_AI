// Picture questions in the actual application (docs/images-20261114.md). Offline: every request
// except the page's own files and a synthetic /api/status is aborted, so nothing is sent and the
// question itself fails. What is checked: the switch, the composer, and that the picture is gone
// after the attempt while the chat keeps only "[Picture: not kept]".
import { it } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";
import { imageText } from "../src/text/images";

const en = imageText.en;

it("the picture entry exists only while the server says pictures are on; an attached picture shows in the composer, goes with one message and is gone afterwards", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: "node_modules/.vite-image-app-ui-test",
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  const open = async (images: boolean) => {
    const context = await browser.newContext({ locale: "en-GB", viewport: { width: 1280, height: 900 } });
    context.setDefaultTimeout(15_000);
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || route.request().method() !== "GET") return route.abort();
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "SYNTHETIC",
            inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 8000 } },
            search: false,
            ...(images ? { images: { maxBytes: 280_000 } } : {}),
          },
        });
      if (url.pathname.startsWith("/api/")) return route.abort();
      return route.continue();
    });
    await page.goto(origin, { timeout: 30_000 });
    await page.getByLabel("Attachments and tools", { exact: true }).click();
    return page;
  };
  try {
    // Switched off (the default): no entry.
    const off = await open(false);
    await ui(off.getByRole("button", { name: "Photo to text" })).toBeVisible();
    await ui(off.getByRole("button", { name: en.menu })).toHaveCount(0);
    await off.context().close();

    const page = await open(true);
    await page.getByRole("button", { name: en.menu }).click();
    await ui(page.getByRole("heading", { name: en.noteTitle })).toBeVisible();
    await page.getByRole("button", { name: en.noteContinue }).click();
    const png = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#2a6";
      context.fillRect(0, 0, 400, 300);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      return [...new Uint8Array(await blob.arrayBuffer())];
    });
    await page.locator('dialog input[type="file"]').setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(png) });
    await page.getByRole("button", { name: en.pickUse }).click();
    await page.getByRole("button", { name: en.addBox }).click();
    await page.getByRole("button", { name: en.preview }).click();
    await page.getByRole("button", { name: en.attach }).click();
    const attached = page.getByRole("group", { name: en.attachedLabel });
    await ui(attached.getByText(en.attachedNote)).toBeVisible();
    await ui(attached.getByRole("img")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await ui(page.getByText(en.attachedNotice)).toBeVisible();

    // One message with the picture. Offline the request cannot be made, so the answer fails.
    await page.getByLabel("Message CometRow").fill("What is in this synthetic picture?");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    const question = page.getByRole("article").filter({ hasText: "What is in this synthetic picture?" });
    await ui(question.getByText(en.notKept)).toBeVisible();
    // The picture left the composer when the message was sent, and it does not come back.
    await ui(attached).toHaveCount(0);
    await ui(page.getByRole("button", { name: "Send ↑", exact: true })).toBeVisible();
    await ui(attached).toHaveCount(0);
    // Nothing of the picture is anywhere in the page or in browser storage.
    ui(await page.evaluate(() => document.documentElement.innerHTML.includes("data:image/jpeg"))).toBe(false);
    ui(
      await page.evaluate(() =>
        [localStorage, sessionStorage].flatMap((s) => Object.keys(s).map((k) => s.getItem(k) ?? "")).some((v) => v.includes("base64")),
      ),
    ).toBe(false);
    await page.context().close();
  } finally {
    await browser.close();
    await vite.close();
  }
}, 120_000);
