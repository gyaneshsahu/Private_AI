// Every fixed message the server sends to the browser has a German entry, so a new server message
// fails here until it is translated in src/server-messages.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { serverMessage } from "../src/server-messages";

const LITERAL = /"[^"\n]*"|`(?:\$\{[^}]*\}|[^`])*`/.source;

/** Sentences in `error:` / `message:` values (all branches of a ternary) and BillingHold texts. */
function serverMessages() {
  const found = new Set<string>();
  const files = readdirSync("server", { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join("server", file));
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const values = [
      ...source.matchAll(
        new RegExp(String.raw`\b(?:error|message)\s*:((?:${LITERAL}|[^;{}"\x60])*)`, "g"),
      ),
      ...source.matchAll(new RegExp(String.raw`new BillingHold\(\s*(${LITERAL})`, "g")),
    ].map((match) => match[1]);
    for (const value of values)
      for (const literal of value.matchAll(new RegExp(LITERAL, "g"))) {
        const text = literal[0].slice(1, -1).replace(/\s*\n\s*/g, " ");
        // Machine codes (snake_case reasons) are lower case; user-facing messages are sentences.
        if (/^[A-Z].*[.!?]$/.test(text)) found.add(text);
      }
  }
  return [...found];
}

// A template is checked with a sample number in each placeholder.
const sample = (text: string) => text.replace(/\$\{[^}]*\}/g, "37");
const numbers = (text: string) => text.match(/\d+/g) ?? [];

describe("server messages in German", () => {
  const messages = serverMessages();

  it("finds the server's messages", () => {
    expect(messages.length).toBeGreaterThan(80);
    expect(messages).toContain(
      "CometRow is busy checking the secure server. Please try again in a minute.",
    );
    expect(messages.some((text) => text.includes("${"))).toBe(true);
  });

  it("has a German entry for every server message", () => {
    const missing = messages.filter((text) => serverMessage(sample(text), "de") === sample(text));
    expect(missing).toEqual([]);
  });

  it("keeps every number of a template", () => {
    for (const text of messages.filter((message) => message.includes("${"))) {
      for (const n of ["1", "5", "150"]) {
        const english = text.replace(/\$\{[^}]*\}/g, n);
        const german = serverMessage(english, "de");
        expect(german).not.toBe(english);
        expect(numbers(german)).toEqual(numbers(english));
      }
    }
    expect(
      serverMessage(
        "Not enough request allowance: this mode counts as 5 requests. No request was forwarded.",
        "de",
      ),
    ).toBe(
      "Ihr Kontingent reicht nicht aus: Dieser Modus zählt als 5 Anfragen. Es wurde nichts gesendet.",
    );
  });

  it("uses the glossary terms", () => {
    expect(
      serverMessage(
        "CometRow is busy checking the secure server. Please try again in a minute.",
        "de",
      ),
    ).toMatch(/ausgelastet.*Bitte versuchen Sie es in einer Minute erneut\./);
    expect(
      serverMessage("Private chat is paused by the operator. No request was forwarded.", "de"),
    ).toBe("Der private Chat ist vom Betreiber pausiert. Es wurde nichts gesendet.");
  });

  it("returns English unchanged and passes unknown text through", () => {
    for (const text of messages.map(sample)) expect(serverMessage(text, "en")).toBe(text);
    expect(serverMessage("Something the server never said.", "de")).toBe(
      "Something the server never said.",
    );
    expect(serverMessage("toString", "de")).toBe("toString");
  });
});
