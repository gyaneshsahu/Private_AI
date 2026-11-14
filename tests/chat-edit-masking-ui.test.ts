// Edit and send goes through the one send path (docs/chat-feature-gaps-20261114.md, package D):
// an email address typed into the edit box is masked in the request that leaves the device.
// Here the real src/verified-chat.ts runs, with its masking; only the attestation and the
// encrypted transport are stand-ins that record the request body. Nothing leaves the machine.
import { expect, it } from "vitest";
import { chromium, expect as ui } from "@playwright/test";
import { createServer } from "vite";
import { warmDevServer } from "./fixtures/dev-server-warmup";
import { browserLaunchOptions } from "../scripts/browser-runtime.mjs";

const EMAIL = "bert.synthetic@example.org";

it("masks an email address in an edited message and sends exactly one request for it", async () => {
  const vite = await createServer({
    configFile: false,
    logLevel: "silent",
    cacheDir: ".local/vite-tests/chat-edit-masking-ui",
    optimizeDeps: { exclude: ["tinfoil", "ehbp"] },
    plugins: [
      {
        name: "offline-recorded-transport",
        enforce: "pre",
        resolveId(id) {
          if (id === "tinfoil" || id === "ehbp") return "\0offline-" + id;
        },
        load(id) {
          if (id === "\0offline-tinfoil")
            return `export async function fetchAttestationBundle(){return {domain:'inference.tinfoil.sh'}};export class Verifier {async verifyBundle(){} getVerificationDocument(){return {securityVerified:true,releaseDigest:'a'.repeat(64),configRepo:'tinfoilsh/confidential-model-router',hpkePublicKey:'synthetic',enclaveHost:'inference.tinfoil.sh'}}}`;
          if (id === "\0offline-ehbp")
            return `export const Identity={fromPublicKeyHex:async()=>({})};export class Transport{async request(url,init){
 (window.offlineBodies ??= []).push(init.body);
 const events=[{choices:[{index:0,delta:{content:'Synthetic masked-path answer.'},finish_reason:'stop'}]},{choices:[],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}];
 return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\\n\\n').join('')+'data: [DONE]\\n\\n',{headers:{'Content-Type':'text/event-stream'}});
 }};`;
          if (id.replaceAll("\\", "/").endsWith("/src/inference.ts"))
            return `import {streamVerifiedConversation} from '/src/verified-chat.ts';
 export async function streamReply(c,q,csrf,signal,chunk,status,session,kept){return streamVerifiedConversation(c,{origin:'https://inference.tinfoil.sh',repository:'tinfoilsh/confidential-model-router',releaseDigests:['a'.repeat(64)],model:'synthetic',maxInputCharacters:20000,maxOutputTokens:100,pricing:{currency:'USD',inputPerMillion:0,outputPerMillion:0}},csrf,signal,chunk,status,()=>{},undefined,undefined,undefined,session,undefined,undefined,kept);}`;
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
    worker: { format: "es" },
  });
  await vite.listen();
  await warmDevServer(vite);
  const address = vite.httpServer!.address();
  if (!address || typeof address === "string") throw Error("No port");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch(browserLaunchOptions());
  try {
    const page = await browser.newPage();
    const external: string[] = [];
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== origin || route.request().method() !== "GET") {
        external.push(u.origin + u.pathname);
        return route.abort();
      }
      if (u.pathname === "/api/status")
        return route.fulfill({
          json: {
            csrf: "synthetic",
            inference: { ready: true, reason: "OFFLINE ONLY", qualification: { maxInputCharacters: 20000 } },
            search: false,
          },
        });
      return route.continue();
    });
    const bodies = () =>
      page.evaluate(() => (window as unknown as { offlineBodies?: string[] }).offlineBodies ?? []);
    await page.goto(origin, { timeout: 30000 });
    await page.getByLabel("Message CometRow").fill("SYNTHETIC first question");
    await page.getByRole("button", { name: "Send ↑", exact: true }).click();
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic masked-path answer.");
    expect(await bodies()).toHaveLength(1);

    await page.getByRole("button", { name: "Edit into a new branch" }).click();
    await page.getByLabel("Edited message").fill(`SYNTHETIC edited question: write to ${EMAIL} today.`);
    await page.getByRole("button", { name: "Send (uses 1 request)", exact: true }).click();
    await ui(page.getByText("Conversation branches · 2 · Edit 1", { exact: true })).toBeVisible();
    await ui(page.locator("article.assistant")).toHaveCount(1);
    await ui(page.locator("article.assistant").last()).toContainText("Synthetic masked-path answer.");
    await ui(page.getByRole("button", { name: "Send ↑", exact: true })).toBeVisible();

    // Exactly one more request, and the address is not in it; the rest of the edited text is.
    const sent = await bodies();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toContain("SYNTHETIC edited question: write to");
    expect(sent[1]).not.toContain(EMAIL);
    expect(sent[1]).not.toContain("bert.synthetic");
    expect(sent[1]).not.toContain("SYNTHETIC first question");
    // On the device the user still sees their own words, and the answer says what stayed here.
    await ui(page.locator("article.user .user-text")).toHaveText(`SYNTHETIC edited question: write to ${EMAIL} today.`);
    await ui(page.locator("article.assistant .kept-on-device")).toBeVisible();
    expect(external).toEqual([]);
  } finally {
    await browser.close();
    await vite.close();
  }
}, 60000);
