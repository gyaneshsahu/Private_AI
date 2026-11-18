// Public Terms and Privacy Policy pages (server/legal-pages.ts), reachable without a session.
// The production composition is createApp behind the account router, which passes every
// non-/api path through (server/consumer-workspace.ts); it needs PostgreSQL, so the same mount
// is checked here through createApp, plain and with the invite gate.
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { InviteRegistry } from "../server/invite-registry";
import { legalHtml, SECURITY_TXT_EXPIRES } from "../server/legal-pages";
import { LEGAL_IDENTITY } from "../shared/legal-identity";
import { PRIVACY_VERSION, TERMS_VERSION } from "../shared/legal-versions";
import { termsText } from "../shared/terms-of-use";

const servers: Server[] = [];
const roots: Record<"plain" | "invites", string> = { plain: "", invites: "" };
async function start(withInvites: boolean) {
  const server = createServer();
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  server.on(
    "request",
    createApp({
      origin: root,
      providerDisclosureDraft: "privatemode",
      ...(withInvites ? { invites: new InviteRegistry(":memory:") } : {}),
    }),
  );
  return root;
}
beforeAll(async () => {
  roots.plain = await start(false);
  roots.invites = await start(true);
});
afterAll(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});

const page = { accept: "text/html,application/xhtml+xml,*/*;q=0.8" };

describe("legal pages", () => {
  for (const mode of ["plain", "invites"] as const)
    for (const path of ["/terms", "/privacy"])
      it(`${path} answers without a session (${mode})`, async () => {
        const r = await fetch(roots[mode] + path, { headers: page, redirect: "manual" });
        expect(r.status).toBe(200);
        expect(r.headers.get("content-type")).toContain("text/html");
        const csp = r.headers.get("content-security-policy")!;
        expect(csp).toMatch(/^default-src 'none'; style-src 'sha256-[^']+'/);
        expect(csp).not.toContain("script-src");
        const html = await r.text();
        expect(html).not.toContain("<script");
        expect(html).toContain('<html lang="en">');
        expect(html).toContain('href="/"');
        expect(html).toContain(`href="${path}?lang=de"`);
        expect(html).toContain("/logo/svg/cometrow-A-lockup-horizontal-dark.svg");
        expect(html).toContain(path === "/terms" ? `version ${TERMS_VERSION}` : `version ${PRIVACY_VERSION}`);
      });

  it("opens from a link in another site (an email or the sign-in page in a new tab)", async () => {
    const r = await fetch(roots.invites + "/privacy", {
      headers: { ...page, "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" },
      redirect: "manual",
    });
    expect(r.status).toBe(200);
  });

  it("serves German from ?lang=de or Accept-Language, and ignores any other value", async () => {
    const byQuery = await (await fetch(roots.plain + "/terms?lang=de", { headers: page })).text();
    expect(byQuery).toContain('<html lang="de">');
    expect(byQuery).toContain(`Version ${TERMS_VERSION}`);
    expect(byQuery).toContain("Zurück zu CometRow");
    expect(byQuery).toContain('href="/terms?lang=en"');
    const byHeader = await fetch(roots.plain + "/privacy", { headers: { ...page, "accept-language": "de-DE,de;q=0.9" } });
    expect(byHeader.headers.get("content-language")).toBe("de");
    const html = await byHeader.text();
    expect(html).toContain("Datenschutzerklärung");
    expect(html).toContain(`Version ${PRIVACY_VERSION}`);
    const odd = await (await fetch(roots.plain + "/terms?lang=%3Cscript%3E", { headers: page })).text();
    expect(odd).toContain('<html lang="en">');
    expect(odd).not.toContain("<script");
  });

  it("shows the policy for the provider the server names", async () => {
    const html = await (await fetch(roots.plain + "/privacy", { headers: page })).text();
    expect(html).toContain("Edgeless Systems GmbH");
    expect(html).toContain("Who processes your messages");
  });

  it("escapes the text and turns bullet lines into a list", () => {
    expect(legalHtml("T <b>\n\nHead\nline & more\n• one\n• two\nafter")).toBe(
      "<h1>T &lt;b&gt;</h1><h2>Head</h2><p>line &amp; more</p><ul><li>one</li><li>two</li></ul><p>after</p>",
    );
  });

  it("states the terms version and keeps the same sections in both languages", () => {
    const blocks = (text: string) => text.split("\n\n").map((b) => b.split("\n")[0].split(".")[0]);
    expect(blocks(termsText("de")).slice(1)).toEqual(blocks(termsText("en")).slice(1));
    expect(termsText("en").split("\n")[0]).toContain(TERMS_VERSION);
  });

  for (const mode of ["plain", "invites"] as const)
    it(`/.well-known/security.txt answers without a session (${mode})`, async () => {
      const r = await fetch(roots[mode] + "/.well-known/security.txt", { redirect: "manual" });
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type")).toContain("text/plain");
      const text = await r.text();
      expect(text).toContain(`Contact: mailto:${LEGAL_IDENTITY.incidentContactEmail}\n`);
      expect(text).toContain(`Expires: ${SECURITY_TXT_EXPIRES}\n`);
    });

  it("security.txt has not expired (RFC 9116: renew Expires in server/legal-pages.ts, at most a year ahead)", () => {
    expect(Date.parse(SECURITY_TXT_EXPIRES)).toBeGreaterThan(Date.now());
    expect(Date.parse(SECURITY_TXT_EXPIRES) - Date.now()).toBeLessThan(366 * 24 * 3600 * 1000);
  });
});
