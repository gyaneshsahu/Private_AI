// The sign-in code email (server/email-template.ts): the kit logo in both modes, both languages,
// nothing from another origin, the code only where it belongs.
import { expect, it } from "vitest";
import { signInCodeEmail } from "../server/email-template";

it("uses the kit's PNG logo (dark artwork, light in dark mode) from our own origin, in both languages", () => {
  for (const lang of ["en", "de"] as const) {
    const mail = signInCodeEmail({ otp: "12345678", origin: "https://app.cometrow.example/x?y=1", lang });
    expect(mail.html).toContain("https://app.cometrow.example/logo/png/cometrow-A-lockup-horizontal-dark-512.png");
    expect(mail.html).toContain('srcset="https://app.cometrow.example/logo/png/cometrow-A-lockup-horizontal-light-512.png" media="(prefers-color-scheme: dark)"');
    const urls = [...mail.html.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => new URL(m[0]).origin);
    expect(new Set(urls)).toEqual(new Set(["https://app.cometrow.example"]));
    expect(mail.text).toContain("12345678");
    expect(mail.subject).toMatch(lang === "de" ? /Anmeldecode/ : /sign-in code/);
  }
});

it("refuses anything that is not an 8-digit code", () => {
  expect(() => signInCodeEmail({ otp: "1234<b>", origin: "https://a.example", lang: "en" })).toThrow();
});
