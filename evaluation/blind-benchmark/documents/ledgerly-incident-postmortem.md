# Incident Post-Mortem: Invoice Export Outage, 3 September 2026

*Synthetic document written for a blind benchmark. Ledgerly, its customers, its staff roles and every detail of this incident are fictional.*

**Product:** Ledgerly (online invoicing and bookkeeping for small businesses)
**Incident ID:** INC-2026-0412
**Severity:** SEV-1 (customer-facing, revenue-affecting)
**Status:** Resolved; all action items assigned
**Document owner:** Incident commander (Platform team lead)
**Review meeting:** 8 September 2026, blameless format

## 1. Summary

On Wednesday 3 September 2026, from 09:12 to 11:59 UTC, Ledgerly customers hosted in our EU region were unable to create, send or export invoices reliably. For a period of 2 hours and 47 minutes, around 31 per cent of EU customers saw errors or very long loading times on the invoice pages, and scheduled invoice emails for those customers were delayed. Customers hosted in our US region were not affected.

The direct cause was that a new feature, controlled by the feature flag `batch_export_v2`, was switched on for all customers in the EU region instead of the intended 5 per cent. The new batch export code opened a database connection for every invoice in a batch instead of reusing one connection per batch. Under normal morning load this exhausted the connection pool of the EU primary database, which is limited to 200 connections. Once the pool was full, ordinary requests, including opening and sending invoices, had to wait for a free connection and many of them timed out.

No customer data was lost or exposed. Every delayed invoice email was sent by 12:40 UTC on the same day. No invoices were sent twice.

## 2. Customer Impact

- **Who was affected:** about 31 per cent of customers in the EU region, namely those whose accounts are stored on the primary database cluster EU-1. Customers on cluster EU-2 and all US customers were unaffected.
- **What they experienced:** error messages ("Something went wrong, please try again") or pages that did not finish loading when opening, editing, sending or exporting invoices. The dashboard and the expenses section mostly worked, but were slow.
- **Scheduled invoices:** 4,860 scheduled invoice emails due between 09:15 and 11:59 UTC were delayed. They were sent automatically once the system recovered, the last at 12:40 UTC. Customers whose invoices were delayed received an email explaining the delay on the same afternoon.
- **Payments:** card and bank payments made by our customers' clients were not affected, because the payment service uses a separate database.
- **Support load:** support received 1,190 tickets and chat requests during the incident, roughly six times a normal Wednesday morning.
- **Data:** no data was lost, corrupted or exposed. We verified this by comparing invoice records against the write-ahead log for the whole incident window.

## 3. Timeline (all times UTC)

| Time | Event |
| --- | --- |
| 08:55 | A developer on the Exports team changes the rollout setting for `batch_export_v2` from "5 per cent of EU accounts" to what they believed was the same setting in the new flag dashboard. Because of a known display issue in the dashboard, the field labelled "percentage" was actually the field for "all accounts in region". The change is approved by a second developer through the normal review step. |
| 09:00 | The flag change takes effect. Batch export jobs scheduled for 09:00 start for all EU accounts that have exports scheduled. |
| 09:12 | Database connection usage on EU-1 reaches 200 of 200. First customer requests begin to time out. This is the start of customer impact. |
| 09:31 | An automated alert fires: "EU-1 API error rate above 5 per cent for 15 minutes." The on-call engineer (Site Reliability, primary on-call) acknowledges it at 09:33. Detection took 19 minutes from the start of impact. |
| 09:40 | The on-call engineer sees intermittent name-resolution errors in the logs and suspects a DNS problem with our cloud provider. Time is spent checking the provider status page and DNS configuration. |
| 10:05 | The DNS theory is ruled out: the name-resolution errors are a side effect of overloaded application servers, not the cause. The incident is raised to SEV-1 and an incident commander (Platform team lead) takes over. |
| 10:22 | A database engineer notices that most open connections belong to the batch export worker. |
| 10:41 | The incident commander asks the Exports team to switch off `batch_export_v2`. The flag is switched off at 10:44. |
| 10:44–11:20 | Connection usage does not fall as expected, because export jobs already running keep their connections until they finish or time out. The team decides not to kill running jobs, to avoid partially written export files. |
| 11:20 | The team lowers the job time-out for export workers from 60 minutes to 5 minutes as a temporary measure. Stuck jobs end and connections are released. |
| 11:42 | Connection usage on EU-1 falls below 120. Error rates return to normal. |
| 11:59 | Error rates and loading times have been normal for 15 minutes. The incident commander declares the end of customer impact. |
| 12:40 | The last delayed scheduled invoice email is sent. |
| 14:10 | Status page updated to "resolved"; customer email about delayed invoices sent. |

## 4. Root Cause

The root cause has two parts that only caused harm together.

First, the new batch export code had a defect: it opened a new database connection for every invoice in a batch, instead of using one connection for the whole batch. In testing, batches were small (at most 20 invoices) and the test database had a generous connection limit, so the defect was not visible. In production, some EU customers export batches of several thousand invoices on the first working days of the month.

Second, the flag was rolled out to 100 per cent of EU accounts instead of 5 per cent. The new flag dashboard, introduced in August, displayed the "all accounts in region" option in the position where the old dashboard showed the percentage field. The display issue was known to the team that built the dashboard and was listed in their backlog, but it had not been communicated to other teams. The reviewer of the change saw the same misleading screen and approved it.

At 5 per cent of accounts, the defect would most likely have caused higher connection use but not exhaustion, and would have been caught by the connection-usage dashboard during the normal rollout review.

We want to be clear that no individual is to blame. Both the developer and the reviewer followed the documented process. The process and the tools allowed a mistake that a person could reasonably make.

## 5. Why Detection and Recovery Took So Long

- **Alert threshold:** the alert required an error rate above 5 per cent for 15 minutes. There was no alert on connection-pool usage, which reached 100 per cent at 09:12 and would have pointed directly at the problem.
- **The DNS red herring:** overloaded application servers produced name-resolution errors in the logs, which looked like a DNS problem. About 25 minutes were spent on this theory.
- **Flag changes were not visible in the incident channel:** the flag change at 08:55 was recorded in the flag system's audit log, but nobody on the incident looked there until 10:22, because flag changes are not posted to the incident channel or the deployment log.
- **Running jobs kept their connections:** switching the flag off stopped new export jobs but did not release connections held by running ones. The 60-minute job time-out was much longer than necessary.

## 6. What Went Well

- No data was lost, and the team's decision not to kill running export jobs avoided corrupted export files.
- Scheduled invoices were queued and sent automatically after recovery; nothing was sent twice.
- The support team published a status page update within 12 minutes of the SEV-1 being declared and kept it updated every 30 minutes.
- The payment service, which uses a separate database, kept working throughout.

## 7. Action Items

| No. | Action | Owner (role) | Due date |
| --- | --- | --- | --- |
| 1 | Fix the batch export code so that each batch uses a single database connection; add a test with a batch of 5,000 invoices against a database with a production-like connection limit. | Exports team lead | 19 September 2026 |
| 2 | Fix the flag dashboard display issue and require the rollout percentage to be typed out in a confirmation dialog for any change above 10 per cent. | Developer Tools team lead | 26 September 2026 |
| 3 | Add an alert when connection-pool usage on any primary database stays above 80 per cent for 3 minutes. | Site Reliability lead | 12 September 2026 |
| 4 | Post every feature flag change in production automatically to the deployment log and to any open incident channel. | Developer Tools team lead | 10 October 2026 |
| 5 | Reduce the default time-out for export jobs from 60 minutes to 15 minutes and document how to release connections held by running jobs safely. | Platform team lead | 3 October 2026 |

Progress on these items will be reviewed in the weekly reliability meeting until all are closed.

## 8. Lessons

1. **Roll out gradually, and make the rollout setting impossible to misread.** A gradual rollout is only a safety net if the tool shows the setting clearly.
2. **Alert on causes as well as symptoms.** An error-rate alert told us something was wrong; a connection-pool alert would have told us what.
3. **Make recent changes visible during incidents.** The question "what changed?" should be answerable in the incident channel within a minute.
4. **Test with production-like limits.** Connection limits, batch sizes and time-outs in test environments should match production for code that touches the database in bulk.

## 9. Communication to Customers

A short explanation was emailed to affected customers on 3 September at 14:10 UTC, and a public summary was posted on the status page. Customers on paid plans who were affected will receive a credit equal to one day of their subscription on their next bill, applied automatically.

## Appendix A: Glossary for Non-Engineers

- **Feature flag:** a switch that lets us turn a new feature on for some customers before turning it on for everyone.
- **Connection pool:** a fixed number of open lines between our application and the database. If all lines are busy, new requests must wait.
- **Time-out:** the maximum time a task is allowed to run or wait before it is stopped.
- **SEV-1:** our highest severity level, used when many customers cannot use a core feature.
- **Blameless review:** a review that looks at how systems and processes allowed a problem, rather than at who made a mistake.

*End of document.*
