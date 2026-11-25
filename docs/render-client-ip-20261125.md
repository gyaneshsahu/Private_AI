# Visitor address on Render, for sign-in rate limits (25 November 2026)

**The problem (docs/owner-security-ops-20261118.md, item 1):** on Render the app never learned a visitor's address, so the sign-in rate limit was one bucket per path shared by every visitor. One noisy client could lock everyone out of sign-in for a minute.

**What is built:** the Render bridge can pass the visitor's address to the app from one named edge header. The app then counts sign-in attempts per visitor. It is **off** until you set it, because Render's documentation names no header for the visitor's address and does not say whether a visitor can set such a header himself (checked 25 November 2026). A header a visitor can set would let him dodge the limit, which is worse than the shared bucket.

**Your steps, once, after deploying a build that contains this change:**

1. On your laptop: `node scripts/check-client-ip.mjs https://app.cometrow.com`
2. It prints one line per candidate header (`cf-connecting-ip`, `true-client-ip`) and a verdict.
3. If it says `CLIENT IP CHECK PASSED`, add the named header to `render-config.json` and redeploy:
   `"renderBridge": { ..., "clientIpHeader": "cf-connecting-ip" }`
4. If it says no safe header exists, change nothing. Sign-in limits stay shared, as today. Tell the agent the output.

**What the check does:** it calls `/edge-check` on the bridge twice, once plainly and once with a made-up address (`203.0.113.9`, a range reserved for documentation) in the header. The bridge answers only "this header arrived: yes or no" and "it was the made-up value: yes or no". It never returns an address.

**Limits, stated plainly:**
- Not verified on the live site: this needs a deploy, which only you do.
- The address is used for the sign-in rate limit only, and never as itself: the app turns it into a keyed stand-in (an HMAC with the app's secret, shaped like a private address) before the rate limit sees it. So the rate-limit table holds no real address, nothing is logged, and the Privacy Policy sentence "no IP address or browser string stored" stays true.
- Another service in the same Render workspace and region can reach the bridge over Render's private network and could send any header. With no other service in the workspace, nothing can use this path (same note as in the 18 November document).
- The rate limit itself is unchanged: 60 a minute per path, now per visitor instead of for everyone.
- For the legal read: the address is processed in memory for a moment to compute the stand-in. Whether the Privacy Policy should say so in one sentence is the lawyer's call (run report, Needs you).
