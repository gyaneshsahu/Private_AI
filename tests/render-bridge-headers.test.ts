// T4 rehearsal of 12 November: the Render bridge dropped the CSRF and chat headers, so every
// chat request through app.cometrow.com failed with 403. Every custom request header the
// browser code or its encryption library sends must be on the bridge's forwarding list.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { BRIDGE_REQUEST_HEADERS } from "../server/render-bridge";

const RESPONSE_ONLY = new Set(["x-privateai-upstream", "ehbp-response-nonce"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|m?js)$/.test(name) ? [path] : [];
  });
}

it("forwards every custom request header the browser sends", () => {
  const sent = new Set<string>();
  const files = [...sources("src"), ...sources("node_modules/ehbp/dist")];
  for (const file of files)
    for (const match of readFileSync(file, "utf8").matchAll(/["'](x-privateai-[a-z-]+|x-tinfoil-[a-z-]+|ehbp-[a-z-]+)["']/gi))
      if (!RESPONSE_ONLY.has(match[1].toLowerCase())) sent.add(match[1].toLowerCase());
  expect(sent.size).toBeGreaterThan(3);
  const missing = [...sent].filter((h) => !(BRIDGE_REQUEST_HEADERS as readonly string[]).includes(h));
  expect(missing).toEqual([]);
});

it("still forwards no identity or forwarding headers", () => {
  for (const h of ["x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-real-ip", "forwarded", "authorization", "x-privateai-client-ip"])
    expect(BRIDGE_REQUEST_HEADERS as readonly string[]).not.toContain(h);
});
