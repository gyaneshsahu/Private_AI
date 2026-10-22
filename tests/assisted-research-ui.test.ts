import { workspaceControl } from "../evaluation/workspace-navigation";
import { workspaceBrowserDependencies } from "../evaluation/browser-dependencies";
import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("displays calculator-assisted prose and a corrected total through the actual application", async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { include: workspaceBrowserDependencies, noDiscovery: true },
    logLevel: "silent",
    cacheDir: "node_modules/.vite-assisted-ui-test",
    plugins: [
      {
        name: "synthetic-assisted-only",
        enforce: "pre",
        load(id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/inference.ts")) return;
          return `
        import { consumeCheckedResponse } from '/src/checked-response.ts';
        import { renderAssistedResearch } from '/src/assisted-research.ts';
        export async function streamReply(c,q,csrf,signal,chunk,status) {
          const source=c.attachments[0].sources[0];
          const users=c.messages.filter(m=>m.role==='user');
          const corrected=users.length>1;
          const input=value=>({value,evidence:{kind:'source',sourceId:source.id,quote:source.text}});
          const fee=corrected?{value:'9',evidence:{kind:'user',userTurn:2,quote:users[1].text}}:input('4');
          const raw=JSON.stringify({blocks:[
            {kind:'paragraph',text:'The total includes delivery and the applicable tax.',evidence:[{sourceId:source.id,quote:source.text}]},
            users.length>2 ? {kind:'arithmetic',unit:'EUR',program:{
              inputs:[{id:'quantity',...input('3')},{id:'price',...input('27')},{id:'fee',...fee},{id:'tax',...input('12')}],
              steps:[{id:'items',op:'multiply',left:'quantity',right:'price'},{id:'tax_amount',op:'percentOf',left:'items',right:'tax'},{id:'taxed_items',op:'add',left:'items',right:'tax_amount'},{id:'total',op:'add',left:'taxed_items',right:'fee'}],
              results:[{id:'total',decimals:2}],passages:[],limitation:'none'
            }} : {kind:'calculator',calculation:{kind:'calculation',method:'order-total',unit:'EUR',inputs:{quantity:input('3'),price:input('27'),fee,tax:input('12')}}}
          ]});
          async function* events(){yield {choices:[{index:0,delta:{content:raw},finish_reason:'stop'}]};}
          return consumeCheckedResponse(events(),{inputPerMillion:0,outputPerMillion:0,currency:'USD'},signal,[source],c,chunk,undefined,renderAssistedResearch);
        }`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No local port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    const external: string[] = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || route.request().method() !== "GET") {
        external.push(url.origin);
        return route.abort();
      }
      if (url.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "SYNTHETIC",
            inference: {
              ready: true,
              reason: "OFFLINE ONLY",
              qualification: { maxInputCharacters: 8000 },
            },
            search: false,
          },
        });
      return route.continue();
    });
    await page.goto(origin, { timeout: 30000 });
    // These are workflow assertions; await the real lazy renderer module first.
    // Cold packaged loading is exercised separately by Playwright.
    await page.evaluate("import('/src/Answer.tsx')");
    const tab = (name: string) => workspaceControl(page, name);
    await tab("Context").click();
    await page.getByLabel("Add documents or screenshots").setInputFiles({
      name: "synthetic.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Buy 3 items at EUR 27 each. Delivery EUR 4. Tax 12 percent applies to items and delivery.",
      ),
    });
    await ui(page.locator(".content-view details summary")).toBeVisible();
    await tab("Conversation").click();
    for (const [question, total] of [
      ["Calculate the full invoice.", "95.20 EUR"],
      ["Correct delivery to EUR 9.", "100.80 EUR"],
      ["Now tax applies only to items; delivery stays untaxed.", "99.72 EUR"],
    ]) {
      await page.getByLabel("Message PrivateAI").fill(question);
      await page.getByRole("button", { name: "Send ↑", exact: true }).click();
      await ui(page.locator("article.assistant").last()).toContainText(total);
      await ui(page.locator("article.assistant").last()).toContainText(
        "The total includes delivery",
      );
    }
    await page.locator("button.citation").first().click();
    await ui(page.getByRole("dialog")).toContainText("Buy 3 items");
    expect(external).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 30000);
