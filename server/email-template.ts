// The sign-in code email, ready for when email sending is switched on (it is off; nothing here
// sends anything). The logo is the kit's PNG (email clients cannot show SVG): dark artwork on light,
// and light artwork where the mail app is in dark mode. Images load from our own origin only.
type Lang = "en" | "de";

const COPY = {
  en: {
    subject: "Your CometRow sign-in code",
    lead: "Your sign-in code:",
    expiry: "It works once and expires in 5 minutes. If you did not ask for it, you can ignore this email.",
  },
  de: {
    subject: "Ihr Anmeldecode für CometRow",
    lead: "Ihr Anmeldecode:",
    expiry: "Er gilt einmal und läuft nach 5 Minuten ab. Wenn Sie ihn nicht angefordert haben, können Sie diese E-Mail ignorieren.",
  },
} as const;

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function signInCodeEmail(input: { otp: string; origin: string; lang: Lang }) {
  if (!/^\d{8}$/.test(input.otp)) throw Error("Invalid sign-in code.");
  const origin = new URL(input.origin).origin;
  const t = COPY[input.lang];
  const logo = (variant: "dark" | "light") => `${origin}/logo/png/cometrow-A-lockup-horizontal-${variant}-512.png`;
  const html = `<!doctype html><html lang="${input.lang}"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escape(t.subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#fbfcfe;color:#101828;font:16px/1.5 -apple-system,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px">
<tr><td style="padding:0 0 28px"><picture><source srcset="${logo("light")}" media="(prefers-color-scheme: dark)"><img src="${logo("dark")}" width="150" alt="CometRow" style="display:block;width:150px;height:auto;border:0"></picture></td></tr>
<tr><td style="padding:0 0 8px;font-size:16px">${escape(t.lead)}</td></tr>
<tr><td style="padding:0 0 20px;font:600 30px/1.2 ui-monospace,'SF Mono',Consolas,monospace;letter-spacing:4px">${input.otp}</td></tr>
<tr><td style="font-size:14px;color:#525d76">${escape(t.expiry)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${t.lead} ${input.otp}\n\n${t.expiry}\n\nCometRow`;
  return { subject: t.subject, html, text };
}
