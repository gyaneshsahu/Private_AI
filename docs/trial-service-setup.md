# Trial accounts and service setup

6 October 2026. Consolidated setup list for the current general-assistant trial,
not authorization for new subscriptions or a change to privacy promises.

| Service | Needed now? | Action |
| --- | --- | --- |
| Tinfoil inference | Already configured locally | Keep the existing key, USD 2 cumulative account cap and auto-reload off. Supplier privacy evidence remains pending. No second model account is needed for the selected Gemma assessment. |
| Search API, supplier selection pending | One new API integration dependency | Five suppliers compared; none yet has established saved-citation rights and acceptable privacy conditions. Seek one Brave clarification first; do not create five accounts. See the [comparison](search-provider-comparison.md). |
| Render hosting and durable disk | Existing account; separate spending decision | Paid hosting remains unapproved. Follow [storage decision](trial-hosting-decision.md); the existing free filesystem cannot safely host the invitation registry. No new hosting API key is required for manual operator deployment. |
| External login, email/SMS delivery, cloud OCR, vector database, analytics | Not required for the agreed small trial | Invitations are operator-issued, extraction and encrypted history are local. Do not create these accounts merely in anticipation of public launch. Reconsider against roadmap requirements. |

## Search account and retention prerequisite

The [five-provider comparison](search-provider-comparison.md) covers Brave,
Tavily, Exa, SearchApi and SerpApi. No reviewed offer is yet eligible for our
saved-citation workflow. This is an evidence assessment, not a blanket claim that
storage is prohibited. Ask Brave first because its storage-plan requirement is
explicit and the adapter exists. Do not email all suppliers or create accounts
before this dependency is resolved.

The current [Brave pricing page](https://api-dashboard.search.brave.com/documentation/pricing)
lists Search at USD 5 per 1,000 requests with USD 5 monthly credits. The
[official help page](https://api-dashboard.search.brave.com/documentation/resources/help-feedback)
says plan activation requires a card, prepaid auto-reload can buy additional
credits, and retaining returned API data needs permission from its team.
These were checked on 6 October; verify the actual account terms before accepting.

PrivateAI retains source snippets, titles and URLs for inspectable citations and
optional encrypted saved conversations. The published retention restriction
therefore conflicts with our intended workflow unless our plan/agreement permits
it. Do not call the integration qualified or silently remove source persistence.
Account creation alone will not resolve this dependency. Before purchasing or
activating a plan, obtain written confirmation from Brave covering:

> May PrivateAI keep web-search titles, URLs and snippets in a user's temporary
> conversation and optional browser-local encrypted history, display saved citations
> when reopened, and retain synthetic integration-test evidence? No model training,
> redistribution dataset or public search-results cache is intended. Which plan
> and retention conditions permit these uses?

Also request the exact enabling plan/order clause, whether saved citations may
remain after termination, and query retention/subprocessor conditions. Brave's
[API privacy notice](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice)
currently permits up to 90 days of query retention; ZDR is an enterprise option.
Do not describe the ordinary plan as zero-retention or assume its DPA covers queries.

This is a prepared question, not a sent message. The founder can contact the
support address linked in Brave's official help page. If required rights are
unavailable, compare a search supplier that permits this workflow before making
a material service/privacy or cost decision. Do not rebuild search prematurely.

Any paid search spending is separate from the Tinfoil cap and needs approval.
If using included credits, keep auto-reload off and verify the dashboard's limit
semantics; do not assume a zero field disables charges. Start with one synthetic,
generic query and its separately approved public URL, then inspect source fidelity
and follow-up citations. Full conversation text is not sent to the search service.

## Store the key locally when the service is approved

Run from the Windows checkout; the prompt masks input and writes to this Windows
user's Credential Manager. Do not paste a key into chat or a command argument.

```powershell
pwsh -NoProfile -File .\scripts\windows-secret.ps1 -Action Set -Name BRAVE_SEARCH_API_KEY
```

The same command replaces it. `-Action Status` reports presence only;
`-Action Remove` removes the local copy (provider revocation is separate).
The existing process-scoped loader restores the previous environment on exit.
Do not create a repository `.env` or save the credential in evidence files.

Only one selected search account/key and the separately approved durable hosting arrangement
are additional current-trial setup items. Voice, general vision and public-launch
integrations remain deferred until a capability/privacy decision justifies them.
