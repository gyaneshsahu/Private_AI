# Where each component runs, and what EU hosting still needs — 23 October 2026

Status: engineering note for the owner's hosting and transfer decisions; nothing here is a purchase, a settings change or a transfer assessment. Facts marked **[recorded]** come from the repository's own ledger entries; **[supplier statement]** from the supplier; `[OWNER]` is an open decision.

| Component | Today | Region | Evidence | What EU hosting needs |
| --- | --- | --- | --- | --- |
| Web service and relay (`app.cometrow.com`) | Render web service, Docker, 0.5 CPU / 512 MB | Frankfurt, Germany **[recorded, 20 October dashboard inspection]** | docs/development-deployment.md | Nothing further for residency; the relay only forwards ciphertext. Keep the region on every redeploy; the deployment review checklist asks for it. |
| Account database | Render PostgreSQL 0.1 CPU / 256 MB, 1 GB | Frankfurt, Germany **[recorded, owner-selected form values; provisioning by the owner]** | docs/development-deployment.md | Verify the live instance's region once it exists; TLS with the reviewed CA bundle; backups stay in the same region (Render's point-in-time window is three days). |
| Confidential inference | Tinfoil router `inference.tinfoil.sh` and its workers | Not recorded; the supplier's infrastructure location is `[OWNER to ask]` | provider-qualification.md | Content is encrypted end to end to the attested enclave, but the processing itself and the 90-day metadata **[supplier statement]** sit with the supplier. A transfer tool (the supplier's DPA with standard contractual clauses, or an EU region if offered) is a legal decision, not an engineering one. The provider-neutral interfaces (plan 2.7) allow a second, EU-hosted inference adapter later without touching the relay. |
| Web search | Brave Search API (not active on the hosted candidate) | United States | search-provider-comparison.md | Approved search text is sent in clear. Either keep it off, cover it under a transfer assessment, or choose an EU provider or the in-enclave search once the supplier questions are settled. |
| Sign-in email (not active) | None; Brevo evaluated | EU data hosting documented by the provider | development-deployment.md | Activate only with reviewed retention settings and no marketing contacts. |
| Payments (test mode) | Stripe test mode | Stripe processes in the EU and the US under its own DPA | billing docs | `[OWNER]` signs the processor terms before live mode. |
| Off-host encrypted backups | Not built (plan 7.2) | — | launch plan | Choose an EU object store; the backup key is held separately by the owner. |
| Monitoring | Not built (plan 7.3) | — | launch plan | Choose a provider that stores no content; residency of alert logs is low risk. |

## Decisions for the owner

1. Ask the supplier where its routers and workers run and whether an EU region exists; the answer goes into the DPIA's transfer row.
2. Sign the supplier's DPA (the supplier confirmed on 22 October that an individual founder in Germany may) and record the transfer tool.
3. Decide the web search provider or keep search off at launch.
4. Keep every Render resource in Frankfurt; confirm the database region at provisioning.

No engineering change is needed for the relay and database to be EU-hosted; they already are, subject to the owner's provisioning. The open residency question is inference, and it is a supplier and legal question.
