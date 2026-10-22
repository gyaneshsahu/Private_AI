## 22 October 2026 - Tenant isolation tests (two accounts, A and B)

Status: tests added; nothing in `src/`, `server/`, `shared/` or `scripts/` changed. Gates stay closed. The hosted second-identity denial (launch plan 0.3) remains UNVERIFIED; these are local, synthetic checks only.

Evidence (verified locally by the sub-agent, `PRIVATEAI_SYNTHETIC_PG` unset): `npx tsc --noEmit` clean; `npx vitest run tests/tenant-isolation.test.ts` gives 15 passed, 8 skipped (the PostgreSQL-gated cases). The PostgreSQL-gated cases were written but NOT run by the sub-agent; the main track must run them with `PRIVATEAI_SYNTHETIC_PG` set and treat them as unverified until then.

File: `tests/tenant-isolation.test.ts`.

| Requirement | Where covered | Runs without PostgreSQL |
|---|---|---|
| 1. A cannot read, settle or reserve against B's allowance or request IDs, including replay | `sqlite` and `postgres` ledger cases (no allowance means no reserve; period IDs not reusable across accounts; A's dispatch and finish of B's request ID throw and leave B intact; replay of B's ID refused before and after settlement); HTTP case: server-generated request IDs, `X-Account-ID`, `X-Request-ID`, `?accountId=` hints ignored | yes (SQLite); `postgres:` cases gated |
| 2. A's cookie and CSRF cannot act on B's status, approvals or billing | HTTP (invited accounts): mixed cookie and CSRF pairs return 403, A's access cookie with B's process session yields A's own status; billing is absent in that composition (404). PostgreSQL consumer workspace: mixed pairs return 403 on research prepare, billing checkout and portal, provider never called; B's overview shows no customer and no A identifiers; B's portal refused (409) | HTTP yes; consumer and billing gated |
| 3. Approval for A refused for B and after A signs out | Unit (`Approvals`): other session's consume and revoke refused, single use. HTTP: B's execute returns 400, B's cancel does not remove A's grant, A still uses it once; A revoked returns 401. PostgreSQL consumer: B refused (400 and direct `consume` rejects), B's cancel leaves the `research_consent` row, A's execute after sign-out returns 401 | unit and HTTP yes; sign-out gated |
| 4. A's metering not visible in B's summary | Ledger cases (both backends), plus the PostgreSQL consumer status for B | SQLite yes; others gated |
| 5. One in-flight request is per account | HTTP: A held in admission, A's second request returns 429 without reaching admission, B's request returns 200 meanwhile | yes |
| 6. A's closure or revocation does not affect B | HTTP: invite revoked, A gets 401, B's allowance record is byte-equal and B can still send. PostgreSQL consumer: A signs out and `requestAccountClosure` runs, B's session, CSRF and allowance unchanged and B can reserve | HTTP yes; closure gated |
| 7. Response identifiers are the caller's own | HTTP: A's status, relay refusals, research prepare and execute, and an unknown route never contain B's ID (headers included) while A's status contains A's; PostgreSQL consumer status and billing overview likewise | HTTP yes; consumer gated |

Not duplicated, by design: encrypted vault separation across accounts, tabs and sign-out needs a real browser (IndexedDB) and is already covered by `tests/consumer-control.test.ts` ("keeps account vaults separate and clears other tabs on sign-out ..."). Allowance binding to authenticated accounts with exhaustion, uncertain settlement and ledger outage is already covered by `tests/account-usage-http.test.ts`; this file adds the cross-account direction.

Isolation failures found: none. Proposed hardening (not failures, no source changed):
1. `SqliteUsageLedger.metrics(requestId)` and `PostgresUsageLedger.metrics(requestId)` are not account-scoped. No HTTP route exposes them today, so there is no leak; if one is ever added, add an `accountId` parameter and join on `usage_requests.account_id`.
2. `/api/research/cancel` answers `{cancelled:true}` even for another session's approval ID. It does not remove the grant (tested) and gives no existence signal, so this is acceptable; noted so nobody reads the response as proof of revocation.
3. The invite-path `Approvals` and relay session map live in process memory, so isolation there holds per process only. The PostgreSQL consumer path binds approvals to the live session row and was written to be tested across replicas by `tests/consumer-control.test.ts`.

Limits: all fixtures are synthetic, one process, no hosted deployment, no database role separation (isolation remains cooperative application control, as in the threat model row). Owner-reported items: none.
