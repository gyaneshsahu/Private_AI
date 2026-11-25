# The "Loading your chats…" stall (investigation, 26 November 2026)

**Status:** not explained yet. A guard test and a diagnostic are in place. Not seen outside the long screen tour.

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

## What is not known

Which request or step the page was waiting for when it stalled. The tour did not record that.

## What I did

1. **A test that fails if it happens:** `tests/chat-list-load-ui.test.ts` opens the real app 60 times (12 fresh accounts, 5 loads each, phone and desktop, with saved chats after the first loads) and fails if the saved chats ever take longer than 8 seconds. On a failure it prints the requests that were still waiting. It runs with the unit suite, so also in CI.
2. **A diagnostic in the tour:** when a step fails, the tour now records every request that had no answer yet, with its age, and what the sidebar and footer said. The next stall names its cause in the tour's log (a line starting with "waiting:") and in `index.json`.
3. **Two look-alike causes fixed** (table above).

## What I think it is (not proven)

The tour runs about 100 steps in one browser, each reloading the app while the accessibility checker and full-page screenshots run. Opening the saved chats needs the server's key, the browser's database and one sync pull; under that load one of them is slow now and then. If that is right, a user cannot hit it. The diagnostic will confirm or refute this the next time it happens.

## For your owner test

If after a reload the sidebar stays on "Loading your chats…" for more than a few seconds, write down what you did just before and send it to the agent. With the activity switch on, that state shows skeleton rows instead of the sentence.
