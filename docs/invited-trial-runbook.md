# Invited-trial preparation

Status: local onboarding implemented; invited-user release **NOT READY**.
5 October 2026. This runbook records prerequisites, not permission to invite users.

## Current experience

Conversation is the main workspace. Getting started opens a dismissible guide
without sending the draft, changing context or storing a consent receipt. It
explains supported files, extraction review, explicit encrypted snapshots,
reload/lock behavior, deletion scope, research approval and interrupted replies.
Privacy boundaries remain separately accessible. The guide is not legal consent
or evidence that users understand the product.

Existing hosted Basic access is a shared development credential. It cannot revoke
one person, attribute service limits to an invite, or separate customer accounts.
Do not distribute it as an invited-user account system. Browser-local encrypted
vaults do not substitute for service access control.

## Before the first invitation

1. Complete Q1 and quality/canonical-workflow evidence. Publish supported families
   and observed limits. Do not claim ChatGPT/Gemini parity from development cases.
2. Founder approves audience, exact deployed origin and hosting/privacy boundary,
   data scope, and invitation/feedback channel. Synthetic testing remains separate.
3. Implement individual access using a maintained authentication integration once
   the identity/hosting boundary is selected. Require expiring invitation access,
   explicit logout and revocation checked on every protected request. Never put
   credentials or bearer tokens in URLs, frontend configuration or logs.
4. Validate two independent invited identities: denied without invitation, no
   cross-session grants, revocation prevents new requests, and in-flight cancellation
   behavior is documented. Define per-user and aggregate limits and one operator
   stop control; shared Basic access does not satisfy these requirements.
5. Pin release/qualification evidence, deploy through passing CI, then run hosted
   TLS/access/cookie/streaming checks against that exact release. Current local
   validation does not certify the older hosted deployment.
6. Observe keyboard and real-phone use: compose, attach/correct, save/reopen,
   stop/retry, inspect sources, approve/cancel research, lock and delete. Capture
   consented usability findings without copying private conversation content.

## Operator stop and recovery

For the current single-instance development service, stop the service to prevent
new work and terminate active connections. Rotate the deployment access secret
and restart before reopening compromised access; this revokes everyone, not one
invite. Remove provider/search credentials and qualification configuration before
starting a disabled-inference diagnostic deployment. Do not alter provider gates
or populate qualification from test fixtures to restore availability.

Restart invalidates in-memory sessions and disclosure grants. Reloading discards
unsaved workspace state; saved browser snapshots remain encrypted. Explain that
loss before asking anyone to reload. Browser-held Basic credentials can be cached;
closing a window is not a reliable server-side revocation mechanism.

Preserve content-free incident facts: release identity, time, affected route,
status/error category and aggregate counts. Do not collect prompts, documents,
responses, authorization headers, cookies, keys or full request URLs. Feedback
has no automatic upload. If an incident involves personal data, pause and obtain
a reviewed response decision before wider disclosure or changed privacy promises.

## Open evidence

Full provider-chain qualification, human quality grades, realistic planning
reliability, individual access implementation, current hosted validation and
real-device/user observation remain open. The next access implementation depends
on the selected identity boundary, not another inference experiment.
