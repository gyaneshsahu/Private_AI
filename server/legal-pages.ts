// Public Terms and Privacy Policy pages, reachable before sign-in (owner, 18 November: one
// acceptance on the sign-in page, which links here). Static HTML, no script, CSP like the error
// pages (server/error-page.ts; not imported, since that file imports server/app.ts).
import { createHash } from "node:crypto";
import express from "express";
import { privacyPolicyText } from "../shared/privacy-policy";
import type { DisclosedProvider } from "../shared/provider-disclosure";
import { termsText } from "../shared/terms-of-use";

const style = `*{box-sizing:border-box}body{margin:0;background:#fbfcfe;color:#101828;font:16px/1.6 system-ui,sans-serif}main{max-width:44rem;margin:0 auto;padding:2rem 1rem 4rem}.brand{display:block;margin:0 0 1.5rem;height:32px}.brand img{height:32px;width:auto}.brand .on-dark{display:none}nav{display:flex;gap:1.25rem;flex-wrap:wrap;margin:0 0 1.5rem}a{color:#2456e6}a:focus-visible{outline:3px solid #8fb4ff;outline-offset:3px}h1{font-size:1.5rem;font-weight:600;line-height:1.3;margin:0 0 1.5rem}h2{font-size:1.125rem;font-weight:600;margin:2rem 0 .5rem}p,li{margin:0 0 .75rem;color:#344054;overflow-wrap:anywhere}ul{padding-left:1.25rem;margin:0 0 .75rem}@media(prefers-color-scheme:dark){body{background:#1b1b1e;color:#ededf0}p,li{color:#c9c9d1}a{color:#9db7ff}.brand .on-light{display:none}.brand .on-dark{display:inline}}`;
const styleHash = createHash("sha256").update(style).digest("base64");

const copy = {
  en: { back: "Back to CometRow", other: "Deutsch", terms: "Terms of use", privacy: "Privacy policy" },
  de: { back: "Zurück zu CometRow", other: "English", terms: "Nutzungsbedingungen", privacy: "Datenschutzerklärung" },
} as const;

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain legal text (title line, then blocks of heading + lines) as HTML; "• " lines become a list. */
export function legalHtml(text: string): string {
  const [title, ...blocks] = text.split("\n\n");
  const body = blocks.map((block) => {
    const [heading, ...lines] = block.split("\n");
    let html = `<h2>${escape(heading)}</h2>`;
    let list = false;
    for (const line of lines) {
      const item = line.startsWith("• ");
      if (item !== list) html += item ? "<ul>" : "</ul>";
      list = item;
      html += item ? `<li>${escape(line.slice(2))}</li>` : `<p>${escape(line)}</p>`;
    }
    return list ? `${html}</ul>` : html;
  });
  return `<h1>${escape(title)}</h1>${body.join("")}`;
}

export function legalPages(provider: () => DisclosedProvider | undefined) {
  const router = express.Router();
  const page = (kind: "terms" | "privacy") => (req: express.Request, res: express.Response) => {
    // Only the two known values are ever used; the query is never reflected.
    const lang =
      req.query.lang === "de" || req.query.lang === "en"
        ? req.query.lang
        : req.acceptsLanguages("en", "de") === "de"
          ? "de"
          : "en";
    const t = copy[lang];
    const text = kind === "terms" ? termsText(lang) : privacyPolicyText(provider(), lang);
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'none'; style-src 'sha256-${styleHash}'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    );
    res.setHeader("Content-Language", lang);
    res
      .type("html")
      .send(
        `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>${t[kind]} · CometRow</title><style>${style}</style></head><body><main><a class="brand" href="/"><img class="on-light" src="/logo/svg/cometrow-A-lockup-horizontal-dark.svg" alt="CometRow"><img class="on-dark" src="/logo/svg/cometrow-A-lockup-horizontal-light.svg" alt="CometRow"></a><nav><a href="/">${t.back}</a><a href="/${kind}?lang=${lang === "de" ? "en" : "de"}" hreflang="${lang === "de" ? "en" : "de"}">${t.other}</a><a href="/${kind === "terms" ? "privacy" : "terms"}?lang=${lang}">${t[kind === "terms" ? "privacy" : "terms"]}</a></nav>${legalHtml(text)}</main></body></html>`,
      );
  };
  router.get("/terms", page("terms"));
  router.get("/privacy", page("privacy"));
  return router;
}
