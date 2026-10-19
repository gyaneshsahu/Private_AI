import { it, expect } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

it("delivers bounded continuation in the actual temporary research workspace without persistence", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: ".local/vite-tests/continuation-ui",
    optimizeDeps: { exclude: ["tinfoil", "ehbp"] },
    plugins: [
      {
        name: "offline-continuation-boundaries",
        enforce: "pre",
        resolveId(id) {
          if (id === "tinfoil" || id === "ehbp") return "\0offline-" + id;
        },
        load(id) {
          if (id === "\0offline-tinfoil")
            return `export async function fetchAttestationBundle(){return {domain:'inference.tinfoil.sh'}};export class Verifier {async verifyBundle(){} getVerificationDocument(){return {securityVerified:true,releaseDigest:'a'.repeat(64),configRepo:'tinfoilsh/confidential-model-router',hpkePublicKey:'synthetic',enclaveHost:'inference.tinfoil.sh'}}}`;
          if (id === "\0offline-ehbp")
            return `export const Identity={fromPublicKeyHex:async()=>({})};export class Transport{async request(url,init){
 const body=JSON.parse(init.body);window.offlineRequests=(window.offlineRequests||0)+1;
 let delta,finish='stop';
 if(body.tool_choice==='none')delta={content:'The subtotal is doubled because there are two items. Delivery is not included in the supplied source. [public-test]'};
 else {const args={unit:'EUR',inputs:[{id:'price',value:'7',evidence:{kind:'source',sourceId:'public-test',quote:'Each item costs EUR 7. Buy 2 items.'}},{id:'count',value:'2',evidence:{kind:'source',sourceId:'public-test',quote:'Each item costs EUR 7. Buy 2 items.'}}],steps:[{id:'total',op:'multiply',left:'price',right:'count'}],results:[{id:'total',decimals:2}]};delta={tool_calls:[{index:0,id:'tool-1',type:'function',function:{name:'calculate',arguments:JSON.stringify(args)}}]};finish='tool_calls';}
 const events=[{choices:[{index:0,delta,finish_reason:finish}]},{choices:[],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}];
 return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\\n\\n').join('')+'data: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});
 }};`;
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts"))
            return `import {streamVerifiedConversation} from '/src/verified-chat.ts';
 export async function streamReply(c,q,csrf,signal,chunk,status,session){return streamVerifiedConversation(c,{origin:'https://inference.tinfoil.sh',repository:'tinfoilsh/confidential-model-router',releaseDigests:['a'.repeat(64)],model:'synthetic',maxInputCharacters:20000,maxOutputTokens:100,pricing:{currency:'USD',inputPerMillion:0,outputPerMillion:0},optionalCalculator:true,calculatorContinuation:true},csrf,signal,chunk,status,()=>{},undefined,undefined,undefined,session,undefined,async()=>{window.offlinePermits=(window.offlinePermits||0)+1;return {approvalId:"synthetic-continuation"};});}`;
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
  try {
    const page = await browser.newPage();
    const external: string[] = [];
    const logs: string[] = [];
    page.on("console", (message) => logs.push(message.text()));
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) {
        external.push(u.origin);
        return route.abort();
      }
      if (u.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "synthetic",
            inference: {
              ready: true,
              reason: "OFFLINE ONLY",
              qualification: { maxInputCharacters: 20000 },
            },
            search: true,
          },
        });
      if (u.pathname === "/api/research/prepare")
        return route.fulfill({
          json: {
            id: "synthetic-grant",
            query: "public synthetic price",
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          },
        });
      if (u.pathname === "/api/research/execute")
        return route.fulfill({
          json: {
            sources: [
              {
                id: "public-test",
                title: "Synthetic price",
                text: "Each item costs EUR 7. Buy 2 items.",
                url: "https://example.com/prices",
                retrievedAt: new Date().toISOString(),
              },
            ],
          },
        });
      if (route.request().method() !== "GET") {
        external.push(u.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const tab = (name: string) =>
      page
        .getByRole("navigation", { name: "Workspace" })
        .getByRole("button", { name, exact: false });
    await page.goto(origin);
    await tab("Research").click();
    await page.getByLabel("Exact search query").fill("public synthetic price");
    await page.getByRole("button", { name: "Review disclosure" }).click();
    await page.getByRole("button", { name: "Approve and retrieve" }).click();
    await ui(
      page.getByRole("status").filter({ hasText: "Search results added" }),
    ).toBeVisible();
    await tab("Conversation").click();
    await page
      .getByLabel("Message PrivateAI")
      .fill("Calculate the items and explain missing delivery information.");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.locator("article.assistant").last()).toContainText(
      "14.00 EUR",
    );
    await ui(page.locator("article.assistant").last()).toContainText(
      "Delivery is not included",
    );
    expect(
      await page.evaluate(() => ({
        requests: (window as any).offlineRequests,
        permits: (window as any).offlinePermits,
      })),
    ).toEqual({ requests: 2, permits: 1 });
    await page.locator("button.citation").first().click();
    await ui(page.getByRole("dialog")).toContainText("Each item costs EUR 7");
    await page
      .getByRole("button", { name: "Close source", exact: true })
      .click();
    await tab("Saved").click();
    await page
      .getByLabel("Vault passphrase")
      .fill("synthetic continuation browser password");
    await page.getByRole("button", { name: "Create or unlock vault" }).click();
    await ui(
      page.getByRole("button", { name: "Save encrypted snapshot" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        caches: (await caches.keys()).length,
        workers: (await navigator.serviceWorker.getRegistrations()).length,
      })),
    ).toEqual({ local: 0, session: 0, caches: 0, workers: 0 });
    expect(external).toEqual([]);
    expect(logs.join("\n")).not.toMatch(
      /Each item costs|Delivery is not included|tool-1/,
    );
    page.on("dialog", (dialog) => dialog.accept());
    await page.reload();
    await tab("Context").click();
    await ui(
      page.getByText("Your context is empty.", { exact: false }),
    ).toBeVisible();
  } finally {
    await browser.close();
    await vite.close();
  }
}, 30000);
