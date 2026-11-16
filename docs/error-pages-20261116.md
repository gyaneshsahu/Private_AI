# Error pages, favicon and the final error handler (16 November 2026)

Status: built and tested on a bare Express app; not tried on Render.

- Production: a GET or HEAD page request (Accept contains text/html, not /api, not /assets) with no route gets a small static 404 page in English or German (Accept-Language), with a link to "/". An error on a page request gets the same page as 500 (a 4xx error, such as a refused dotfile, gets the 404 page). No script; the inline style is allowed by its sha256 hash in the page's own CSP. server/error-page.ts, mounted last in server/production-runtime.ts. Other requests fall through as before.
- Final API error handler (server/app.ts `finalErrorHandler`): body-parser and other 4xx errors and schema errors stay 400 "Invalid request.", an oversized body is 413, everything else is 503 with a generic message and no details.
- Favicon: public/favicon.svg (a "C" in the brand purple), linked from index.html, copied into both Docker images, served by the static handler as image/svg+xml and passed through by the Render bridge unchanged.
