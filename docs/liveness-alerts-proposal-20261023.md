# Independent liveness and certificate-expiry alerts - proposal, 23 October 2026 (plan 7.3)

Status: proposal for the owner's approval. No account is created and no monitor is configured by this document. Prices are those recorded on 20 October in `docs/development-deployment.md` unless marked otherwise and must be re-checked at purchase.

## Requirements (from the plan and the PRD)

- Works when the service is down: the probe and the alert path run outside Render and outside the owner's PC.
- Content-free: the probe fetches fixed endpoints with no account, no cookie, no payload; nothing it stores can contain a user's data. The service already exposes `/healthz` (content-free liveness) and `/readyz` (readiness) **[recorded]**.
- Reaches the owner: an alert must arrive on the phone, not only in a mailbox.
- Covers the four failure kinds the trial runbook cannot see on its own: the service is down or not ready; the TLS certificate is near expiry or wrong; DNS for `app.cometrow.com` does not resolve; a scheduled job (backup) did not run.

## Proposal

**Probes (external, every 1 to 5 minutes).**

| Probe | Target | Alert when |
| --- | --- | --- |
| Liveness | `GET https://app.cometrow.com/healthz` | not HTTP 200 twice in a row |
| Readiness | `GET https://app.cometrow.com/readyz` | not HTTP 200 for 10 minutes (a restart is not an incident; a stuck start is) |
| Certificate | TLS handshake on `app.cometrow.com:443` | fewer than 14 days to expiry, or the chain does not validate |
| DNS | A/AAAA for `app.cometrow.com` | no answer, or an answer outside the recorded Render targets |
| Heartbeat | the backup job (plan 7.2) pings a per-job URL after a verified run | no ping within 26 hours |

**Provider.** One external monitoring service with both uptime probes and heartbeat checks, alerting by email and mobile push. UptimeRobot was costed on 20 October at USD 10 per month for ten 60-second monitors with TLS and cron checks **[recorded]**; its free tier and competitors (for example Better Stack, or healthchecks.io for heartbeats only) exist but were not priced here. Self-hosted monitoring is rejected: it fails with the service. Two providers are unnecessary at this scale; one provider plus the certificate script below as a manual cross-check is enough.

**What the provider sees.** The URL, status code, response time, certificate fields and the probe times. No account exists on the probe path, so no user data can appear. Render's own gateway logs will show the probe requests; they show no content either.

**Alert routing.** Email to the operator mailbox and push to the owner's phone; SMS optional. Quiet hours are not acceptable for the liveness and certificate alerts during an invited trial (8.4), because the pause criteria depend on them.

**Runbook additions.** For each alert: what to check first (Render status page, the deploy list, the certificate issuer), when to pause the trial, how to record the incident in the ledger. The incident contact in the imprint receives external reports; these alerts are internal.

**Local certificate check (built now, read-only).** `scripts/certificate-expiry.ts <host> [thresholdDays]` performs one TLS handshake, prints issuer, subject, validity dates and days remaining, and exits with code 2 under the threshold (default 14 days) or when the chain does not validate. It is content-free and sends nothing but the handshake. It is a manual cross-check for the runbook, not a replacement for the external probe. Caveat found on first run: on a machine with a TLS-inspecting antivirus (the owner's PC has one) the handshake shows the antivirus's own certificate, not the real one, so the check must run from a machine or network without interception, or the result is meaningless. This is one more reason the probe must be external.

## Decisions for the owner

1. Provider and tier (recorded option: UptimeRobot at USD 10 per month; a free tier may be enough for five probes at 5-minute intervals, to verify at sign-up).
2. Alert channels: email plus push, with or without SMS.
3. Probe interval: 1 minute (paid) or 5 minutes (free tiers).
4. Whether the backup heartbeat waits for plan 7.2's runner decision or is set up now for the existing registry backup on the owner's PC.

## What the agent will do after approval

Document the exact monitor definitions (URLs, intervals, thresholds, contacts) in the runbook and the deployment review checklist, add the heartbeat ping to the backup job, and record the first alert test in the ledger. Creating the account and entering contact details are owner actions by the standing rule.
