// Branded 404 and 500 pages for page requests the production runtime has no route for
// (docs/error-pages-20261116.md). Static HTML, English or German from Accept-Language, no script.
import { createHash } from "node:crypto";
import type express from "express";
import { finalErrorHandler } from "./app";

const style = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8f5;color:#243a32;font:16px/1.5 system-ui,sans-serif}main{max-width:30rem;padding:2rem 1rem;text-align:center}.brand{font-size:1.5rem;font-weight:650;letter-spacing:-.03em;margin:0 0 1.5rem}.brand span{font-weight:350}h1{font-size:1.5rem;margin:0 0 .5rem}p{margin:0 0 1.5rem;color:#536359}a.home{display:inline-block;min-height:44px;padding:.65rem 1.25rem;border-radius:999px;background:#6b4bb0;color:#fff;text-decoration:none;font-weight:600}a.home:focus-visible{outline:3px solid #c3adf5;outline-offset:3px}@media(prefers-color-scheme:dark){body{background:#17181c;color:#ecebf2}p{color:#b8b6c4}a.home{background:#c3adf5;color:#17181c}}`;
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
      `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>${t[status].title} · CometRow</title><style>${style}</style></head><body><main><p class="brand">Comet<span>Row</span></p><h1>${t[status].heading}</h1><p>${t[status].body}</p><a class="home" href="/">${t.home}</a></main></body></html>`,
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
  sendErrorPage(req, res, status >= 400 && status < 500 ? 404 : 500);
};
