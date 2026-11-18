// Branded 404 and 500 pages for page requests the production runtime has no route for
// (docs/error-pages-20261116.md). Static HTML, English or German from Accept-Language, no script.
import { createHash } from "node:crypto";
import type express from "express";
import { finalErrorHandler, logServerError } from "./app";

const style = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfcfe;color:#101828;font:16px/1.5 system-ui,sans-serif}main{max-width:30rem;padding:2rem 1rem;text-align:center}.brand{display:block;margin:0 auto 1.75rem;height:32px}.brand img{height:32px;width:auto}.brand .on-dark{display:none}h1{font-size:1.5rem;font-weight:600;margin:0 0 .5rem}p{margin:0 0 1.5rem;color:#525d76}a.home{display:inline-block;min-height:44px;padding:.65rem 1.25rem;border-radius:999px;background:#2456e6;color:#fff;text-decoration:none;font-weight:600}a.home:focus-visible{outline:3px solid #8fb4ff;outline-offset:3px}@media(prefers-color-scheme:dark){body{background:#1b1b1e;color:#ededf0}p{color:#b1b1ba}a.home{background:#ededf0;color:#18181b}.brand .on-light{display:none}.brand .on-dark{display:inline}}`;
const styleHash = createHash("sha256").update(style).digest("base64");

const copy = {
  en: {
    404: { title: "Page not found", heading: "This page does not exist.", body: "The link may be old or mistyped." },
    500: { title: "Something went wrong", heading: "Something went wrong.", body: "Please try again in a moment." },
    home: "Go to CometRow",
  },
  de: {
    404: { title: "Seite nicht gefunden", heading: "Diese Seite gibt es nicht.", body: "Der Link ist vielleicht veraltet oder falsch geschrieben." },
    500: { title: "Etwas ist schiefgelaufen", heading: "Etwas ist schiefgelaufen.", body: "Bitte versuchen Sie es gleich noch einmal." },
    home: "Zu CometRow",
  },
} as const;

/** A browser asking for a page: GET or HEAD with text/html, outside the API and the build files. */
export const wantsPage = (req: express.Request) =>
  (req.method === "GET" || req.method === "HEAD") &&
  !/^\/(?:api|assets)(?:\/|$)/.test(req.path) &&
  String(req.headers.accept ?? "").includes("text/html");

export function sendErrorPage(req: express.Request, res: express.Response, status: 404 | 500) {
  const lang = req.acceptsLanguages("en", "de") === "de" ? "de" : "en";
  const t = copy[lang];
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; style-src 'sha256-${styleHash}'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  );
  res.setHeader("Content-Language", lang);
  res
    .status(status)
    .type("html")
    .send(
      `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>${t[status].title} · CometRow</title><style>${style}</style></head><body><main><p class="brand"><img class="on-light" src="/logo/svg/cometrow-A-lockup-horizontal-dark.svg" alt="CometRow"><img class="on-dark" src="/logo/svg/cometrow-A-lockup-horizontal-light.svg" alt="CometRow"></p><h1>${t[status].heading}</h1><p>${t[status].body}</p><a class="home" href="/">${t.home}</a></main></body></html>`,
    );
}

/** After every route: unknown page paths get the 404 page; everything else falls through. */
export const notFoundPage: express.RequestHandler = (req, res, next) =>
  wantsPage(req) ? sendErrorPage(req, res, 404) : next();

/** Last error handler: the 500 page for page requests, the API's JSON answer otherwise. */
export const errorPage: express.ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (!wantsPage(req)) return finalErrorHandler(err, req, res, next);
  // A refused file (express.static answers dotfiles with 403) is "not here" to a visitor.
  const status = Number((err as { status?: unknown } | undefined)?.status);
  if (!(status >= 400 && status < 500)) logServerError(err, req);
  sendErrorPage(req, res, status >= 400 && status < 500 ? 404 : 500);
};
