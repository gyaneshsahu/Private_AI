# The "Loading your chats…" stall (investigation, 26 November 2026)

**Status:** not explained. The diagnostic gave leads, not causes (below). A guard test is in place. Not seen outside the long screen tour.

## What was seen

In the long automated screen tour, a page sometimes stayed on "Loading your chats…" (the footer saying "Temporary chat · Not saved") for more than 8 seconds, so the next click of the tour timed out. About once in 150 to 400 page loads. No error on the page, no failed request. The same step passed when run again.

## What is known

| Fact | How I know |
| --- | --- |
| It happens only inside the long tour | 820 page loads outside it, in four different probes and the new test, never showed it (slowest 0.4 s) |
| It is older than the work of 25 and 26 November | It also happened on a branch that has none of that work; the code that opens saved chats is unchanged since the tag `owner-test-candidate` |
| It is not one screen | It hit seven different steps |
| It often hits the first page of a fresh test account | Three of the seven cases |
| One look-alike had its own cause, now fixed | The test tool relays the first status request itself; that relay once timed out after 10 s. It now tries a second time |
| Another look-alike had its own cause, now fixed | The deep-research step waited for a progress line that the fake research passes in a split second |

## What the new diagnostic showed (evening of 26 November)

Three stalls happened after the diagnostic was added. What it recorded are **leads, not causes**. One reading I wrote down at first (old streamed answers using up the browser's six connections) does not hold and is withdrawn: the test answers are served by the test tool inside the browser, not over a connection to the server, and the diagnostic's list still held requests of earlier pages. The list is now emptied on every page load, so the next stall shows only what its own page waits for.

| Stall | What the page was waiting for | What that points to |
| --- | --- | --- |
| Light tour, German, phone, a Settings step | The request for the saved chats (`GET /api/secure/items`) had no answer for **69 seconds**. At the same time a streamed test answer from an earlier step (`POST /__audit/reply`) had been open for 180 seconds | Only that the request for the saved chats was slow or unanswered. The old streamed answer was a leftover of an earlier page and proves nothing. Whether the 69 seconds belong to this page's request is not certain either |
| Dark tour, English, phone, an answer step | **No request at all** was open, and the sidebar still said "Loading your chats…" | A lead: not the network, so something inside the page was waiting. Opening the saved chats also opens the browser's own database; a blocked open would look like this. Not shown |
| Light tour, English, phone, the first-send step | No "Loading your chats…" on the page at all; the click on Send timed out | A different failure that only looks alike. Passed when run alone |

## What is still not known

- **Why the request for the saved chats went unanswered in the first one,** and whether that was this page's request at all.
- **Whether the database was really what waited in the second one,** and what would have held it. Two tabs of CometRow, or a page kept by the browser's back/forward cache, are the candidates. If it is two tabs, a user can hit it.
- **Whether a user can hit any of it.** Nothing so far says yes; nothing rules it out.

## Next steps (not done)

1. Read the next stall with the corrected diagnostic (only the page's own requests).
2. Make the database open report when it is blocked and by what, and show a plain line ("CometRow is open in another tab") instead of waiting silently.
3. A test with two tabs of the same account.

## What I did

1. **A test that fails if it happens:** `tests/chat-list-load-ui.test.ts` opens the real app 60 times (12 fresh accounts, 5 loads each, phone and desktop, with saved chats after the first loads) and fails if the saved chats ever take longer than 8 seconds. On a failure it prints the requests that were still waiting. It runs with the unit suite, so also in CI.
2. **A diagnostic in the tour:** when a step fails, the tour now records every request that had no answer yet, with its age, and what the sidebar and footer said. The next stall names its cause in the tour's log (a line starting with "waiting:") and in `index.json`.
3. **Two look-alike causes fixed** (table above).

## What I think it is (not proven)

The tour runs about 100 steps in one browser, each reloading the app while the accessibility checker and full-page screenshots run. Opening the saved chats needs the server's key, the browser's database and one sync pull; under that load one of them is slow now and then. If that is right, a user cannot hit it. The diagnostic will confirm or refute this the next time it happens.

## For your owner test

If after a reload the sidebar stays on "Loading your chats…" for more than a few seconds, write down what you did just before and send it to the agent. With the activity switch on, that state shows skeleton rows instead of the sentence.
