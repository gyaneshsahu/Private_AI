// Owner, 25 November: no "synthetic", "audit" or "test" wording where a real user can read it.
// Every text block of the app (English and German), the server's messages and the legal texts
// are scanned. Texts that only the local account lab or the billing rehearsal can show are named
// below, and the two gates that keep them out of production are checked at the end.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const WORDS = /\b(synthetic\w*|synthetisch\w*|audit\w*|tests?|testing)\b/i;
// src/text/account.ts also holds the lab's and the rehearsal's texts. These are the only ones let
// through: keys named ...Test or ...Synthetic (each rendered under `synthetic &&` or `synthetic ?`),
// the two texts that take `synthetic` as their parameter, the loopback-only preview, and the
// billing rehearsal (status.billingRehearsal).
const LAB_ONLY = /account\.ts:(accountLabText|accountDeletionText)\.(en|de)\.(\w*(Test|Synthetic)\w*|testEmailAddress|testPasskeyAdded|testCodeAvailable|syntheticNotRunning|accountClosed|recoveryComplete)$|account\.ts:(accountPreviewText|billingText)\./;
const ALLOWED = [
  // The lab's own server message.
  "Use a synthetic .test address.",
  // The Privacy Policy's security request: an honest use of the verb.
  "do not test it against other people's accounts",
  // The Terms' description of the alpha: a legal text under the legal read.
  "invite-only test phase (alpha)",
];

type Hit = { where: string; text: string };
function scan(where: string, value: unknown, hits: Hit[]) {
  // A text with parameters is a function: its literals are in its source.
  if (typeof value === "function") value = String(value);
  if (typeof value === "string") {
    if (WORDS.test(value) && !ALLOWED.some((ok) => (value as string).includes(ok))) hits.push({ where, text: value.slice(0, 160) });
  } else if (value && typeof value === "object")
    for (const [key, inner] of Object.entries(value)) scan(`${where}.${key}`, inner, hits);
}

it("no synthetic, audit or test wording in any text a production user can read", () => {
  const hits: Hit[] = [];
  const modules = {
    ...import.meta.glob("../src/text/*.ts", { eager: true }),
    ...import.meta.glob("../src/{when-to-search,limit-message}.ts", { eager: true }),
  } as Record<string, Record<string, unknown>>;
  expect(Object.keys(modules).length).toBeGreaterThan(20);
  for (const [file, exports] of Object.entries(modules))
    for (const [name, value] of Object.entries(exports)) {
      if (typeof value === "function") continue; // helpers, not texts

      scan(`${file.replace("../", "")}:${name}`, value, hits);
    }
  // Texts held in plain tables or built from the legal identity: every quoted line of the file.
  for (const file of ["src/server-messages.ts", "shared/terms-of-use.ts", "shared/privacy-policy.ts", "shared/privacy-copy.ts", "index.html"])
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        const code = line.trim();
        if (/["`<]/.test(code) && !/^(\/\/|\*|\/\*|import )/.test(code)) scan(`${file}:${index + 1}`, code, hits);
      });
  expect(hits.filter((hit) => !LAB_ONLY.test(hit.where))).toEqual([]);
});

it("the account lab and the billing rehearsal cannot show in production", () => {
  // The lab needs the host "localhost" as well as its query switch.
  expect(readFileSync("src/main.tsx", "utf8")).toMatch(/pageUrl\.hostname === "localhost" &&\s+pageUrl\.searchParams\.get\("account-lab"\) === "1"/);
  // The rehearsal panel needs the server to say so, and the production server never does.
  expect(readFileSync("src/App.tsx", "utf8")).toMatch(/status\?\.billingRehearsal/);
});
