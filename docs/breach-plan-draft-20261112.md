# Personal-data breach plan — DRAFT, needs owner approval (12 November 2026)

**Status: draft, needs owner approval** (checklist F1). For the invite-only alpha, run by one person.

**Named contact:** Ganesh Sahu (controller), security@cometrow.com. There is no deputy; if the owner is unreachable, nobody else acts. Owner decision D15: name a deputy or accept that risk for the alpha.

## Signals that start this plan

A friend reports seeing someone else's data; a supplier breach notice (Tinfoil within 72 hours, Privatemode within 48 hours, per their DPAs); a Render security notice; unexpected spend on the supplier dashboard; a secret found where it should not be (repository, log, chat); the stop switch or allowlist not behaving as tested.

## Steps

| When | Step | How |
| --- | --- | --- |
| At once | **Contain** | Stop chat: `touch <stopFile>` in the Render shell, then `"enabled": false` and redeploy (`docs/development-deployment.md`). If sign-in itself is affected, remove the affected email from the allowlist or suspend the service in Render. |
| At once | **Preserve** | Note the time; save Render events and logs; do not delete database rows; write down who saw what. |
| Within hours | **Rotate** | Any exposed secret: provider API key (supplier dashboard), database password (owner role, then `database-url` secret file), auth secret, OAuth client secret. The secrets inventory in the private hardening record lists each one and its effect. |
| Within 24 hours | **Assess** | What data, whose, how many people, could it identify them, is there a risk to their rights (Art. 33(1))? Use the record of processing (`docs/art30-record-draft-20261112.md`) to see where the data lives. |
| Within 72 hours of becoming aware | **Notify the authority** unless the breach is unlikely to risk people's rights | LDI NRW, Düsseldorf, through its online breach form. Content: Art. 33(3) (nature, categories and approximate numbers, contact, likely consequences, measures). If not everything is known yet, notify in stages. |
| Without undue delay, if high risk | **Tell the people affected** (Art. 34) | Plain-language email from security@cometrow.com: what happened, what it means for them, what we did, what they can do. |
| Always | **Document** | Every breach, notified or not, goes in a private breach log (Art. 33(5)) under `docs/private/`, and a dated, content-free entry in `docs/READINESS.md`. |

## Not covered yet

No deputy; no tested contact path with LDI NRW; the support mailbox is not set up (checklist R6), so friends can only report through the owner directly.
