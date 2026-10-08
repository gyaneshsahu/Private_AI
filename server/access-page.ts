import { createHash } from "node:crypto";
import type { Response } from "express";

const style = `*{box-sizing:border-box}body{margin:0;background:#f7f6f2;color:#263b34;font:16px/1.5 system-ui,sans-serif}main{max-width:880px;margin:4rem auto;padding:0 1.25rem}h1{font-size:2rem;letter-spacing:-.05em;margin:0}h2{font-size:1.15rem;margin:0 0 1rem}.brand{letter-spacing:.15em;text-transform:uppercase;font-size:.75rem}.intro{max-width:42rem;color:#52645b}.forms{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin:2rem 0}section{padding:1.5rem;border:1px solid #d9ded8;border-radius:16px;background:#fff}label{display:block;margin:1rem 0}input{display:block;width:100%;margin-top:.4rem;border:1px solid #a7b6ab;border-radius:7px;padding:.7rem;font:inherit;min-width:0}button{width:100%;border:0;border-radius:7px;padding:.8rem;background:#294d3d;color:#fff;font:inherit;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #749c87;outline-offset:3px}.note{font-size:.875rem;color:#52645b}[role=alert]{padding:1rem;border:1px solid #936244;border-radius:8px;background:#fff4e9;color:#583c2b}@media(max-width:620px){main{margin:2rem auto}.forms{grid-template-columns:1fr}section{padding:1.1rem}}`;
const styleHash = createHash("sha256").update(style).digest("base64");
const errors = {
  invalid:
    "Access could not be verified. Check your details and try again. If your invitation has expired or access was revoked, contact the trial operator.",
  limited: "Too many sign-in attempts. Wait one minute before trying again.",
  busy: "Sign-in is busy. Wait a few seconds before trying again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again later.",
} as const;

export function sendAccessPage(
  res: Response,
  status = 200,
  error?: keyof typeof errors,
) {
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; style-src 'sha256-${styleHash}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
  );
  res.status(status).type("html")
    .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PrivateAI · Trial access</title><style>${style}</style></head><body><main>
<p class="brand">PrivateAI</p><h1>Your conversation starts here.</h1><p class="intro">Sign in with your individual access ID, or accept an invitation from the trial operator.</p>
${error ? `<p role="alert">${errors[error]}</p>` : ""}
<div class="forms"><section aria-labelledby="login-title"><h2 id="login-title">Welcome back</h2><form method="post" action="/auth/login"><label>Access ID<input name="id" autocomplete="username" required maxlength="36" spellcheck="false" autocapitalize="none"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><button>Sign in</button></form></section>
<section aria-labelledby="invite-title"><h2 id="invite-title">Accept your invitation</h2><form method="post" action="/auth/register"><label>Access ID<input name="id" autocomplete="username" required maxlength="36" spellcheck="false" autocapitalize="none"></label><label>Invitation code<input name="token" type="password" autocomplete="off" required maxlength="100"></label><label>Choose password (at least 12 characters)<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><button>Accept invitation</button></form></section></div>
<p class="note">Keep your access ID. Your encrypted local vault uses a separate passphrase. Password recovery is not available in this trial.</p><p class="note">Access is not anonymous: PrivateAI and its hosting provider receive relevant identity and network metadata. Private-data chat remains subject to separate privacy checks.</p>
</main></body></html>`);
}

export function sendPasswordPage(
  res: Response,
  status = 200,
  error?: keyof typeof errors,
) {
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; style-src 'sha256-${styleHash}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
  );
  res.status(status).type("html")
    .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PrivateAI · Change password</title><style>${style}</style></head><body><main>
<p class="brand">PrivateAI</p><h1>Change your sign-in password</h1>
<p class="intro">This signs out every session for your account, including this one. Save work in other tabs first. Your access ID, expiry and saved encrypted workspaces stay the same. Your separate vault passphrase does not change.</p>
${error ? `<p role="alert">${errors[error]}</p>` : ""}
<section><form method="post" action="/auth/password"><label>Current password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><label>New password (at least 12 characters)<input name="replacement" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><label>Confirm new password<input name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><button>Change password and sign out</button></form></section>
<p class="note">Use a different password, and keep it in your password manager. Lost sign-in passwords and vault passphrases cannot be recovered in this trial.</p><a href="/">Back to conversation</a></main></body></html>`);
}
