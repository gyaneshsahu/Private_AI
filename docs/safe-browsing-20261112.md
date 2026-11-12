# Safe Browsing warning (checklist R4) — 12 November 2026

## What the agent found (public checks only)

| Check | Result |
| --- | --- |
| Transparency Report, `cometrow.com` | **"Some pages on this site are unsafe"**: pages that "try to trick visitors into sharing personal info or downloading software" (social engineering / deceptive pages). The domain entry covers its subdomains, including `app.cometrow.com`. |
| Transparency Report, `www.cometrow.com`, `app.cometrow.com`, `app.cometrow.com/account`, `app.cometrow.com/api/auth/callback/google` | "No available data" for each URL: the report does not name the flagged page. |
| `https://cometrow.com/` and `https://www.cometrow.com/` | HTTP 404 with an empty body from Cloudflare: **no website is live at the root domain**. |
| Earlier owner report (25 Oct) | Chrome showed "Dangerous site" once on `app.cometrow.com/api/auth/callback/google?state=…&iss=…`. |

**Most likely cause (not confirmed):** a newly registered domain with nothing at its root and a page that asks visitors to sign in with Google is the typical pattern of a phishing page, so Google's classifier flagged it. Only Search Console shows the exact sample URLs.

## Search Console steps (owner, about 30 minutes plus Google's review)

1. Open https://search.google.com/search-console and sign in with the Google account that owns the domain.
2. **Add property → Domain**, enter `cometrow.com` (a Domain property covers `app.` and `www.`).
3. Verify with the **DNS TXT record** Google shows: add it in Cloudflare (DNS → Add record → TXT, name `@`), then press Verify (minutes to a few hours).
4. Open **Security & Manual Actions → Security issues**. It names the issue type and **sample URLs**: that is the page that triggered the warning. Write them down (or send them to the agent).
5. Fix before asking for review:
   - put real content at `cometrow.com` (the marketing site from the `PrivateAI-website` repository, with imprint and privacy links), or redirect `cometrow.com` and `www` to it;
   - Google Cloud console → OAuth consent screen (**Branding**, checklist L12): app name "CometRow", home page `https://cometrow.com`, privacy policy URL, authorised domain `cometrow.com`;
   - the sign-in page already names CometRow and links the privacy statement; keep it.
6. Back in **Security issues**: tick "I have fixed these issues" → **Request review**. Suggested text: "cometrow.com is a new privacy-first AI assistant run by its owner. app.cometrow.com uses Google's own sign-in (OAuth) for invited users; it never asks for Google passwords or other credentials. The root domain now serves our website with imprint and privacy policy." Google usually answers deceptive-pages reviews within a few days.
7. Optional, in parallel: report the false positive for the callback URL at https://safebrowsing.google.com/safebrowsing/report_error/ .

Until the review clears, friends may see the red warning at sign-in: a reason to finish this before the first invitation.
