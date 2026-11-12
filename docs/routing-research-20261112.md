# How assistants route between models and decide to search: research, 12 November 2026

Desk research for the CometRow routing and search design (`docs/routing-and-search-20261112.md`). **[D]** is documented by the vendor or in a paper. **[S]** comes from press, blogs or user reports. **[I]** is inference. OpenAI's help and release-note pages returned HTTP 403 to fetches, so OpenAI's 2026 items rest on search snippets and secondary coverage.

## Products

| Product | Routing | User override and labels | Search trigger | Knowledge cutoff |
| --- | --- | --- | --- | --- |
| ChatGPT | **Aug 2025:** a separate real-time router used conversation type, complexity, tool needs and explicit intent. It was trained on manual switches, preferences and correctness [D, GPT-5 system card]. **Dec 2025:** auto-routing removed for Free/Go; Instant is the default and Thinking is manual [D via snippet]. **Sep 2026:** auto-switching retired for Plus/Pro, except for safety routing [D via snippet]. | Thinking-time levels / reasoning slider; the switch is shown [S] | Model decides, with a manual toggle. Third-party trigger rates 31-46 % [S] | Not stated publicly |
| Gemini app | **Oct 2026:** free users get Auto; most prompts go to Flash-Lite and harder ones may go to Flash/Pro. Internals unpublished [S quoting Google]. API: dynamic thinking by default [D] | Paid users pick the model and effort [S]; label "Auto" | API: the model decides [D]. Gemini 1.5 used a per-prompt 0-1 "needs search" score with a threshold of 0.3 [D] | n/a |
| Claude | No cross-model router. **Adaptive thinking:** the model decides how much to think; effort low to max [D] | User picks the model, effort and the thinking toggle [D] | Model-called web search tool; can be turned off [D] | **The system prompt states the cutoff** and says things may have changed. With search on, it searches news and binary events (deaths, elections) without asking [D] |
| Perplexity | "Best" auto-picks per query; logic unpublished [S] | Paid users pick. Nov 2025: user reports of silent substitution with cheaper models, unconfirmed [S] | Searches by default [I] | – |
| Le Chat | Manual Fast vs Think [D] | Toggle | Web search on by default, used "if necessary" [D] | – |
| Apple Intelligence | On-device vs Private Cloud Compute rule unpublished. PCC: attested nodes, no user identity at the load balancer, no general-purpose logging [D] | – | – | – |
| Kagi / Proton Lumo / Duck.ai | No auto-router; user picks the model [D/S] | Model picker | **User toggle** (Kagi; Lumo off by default, per chat); Duck.ai: model decides when search is enabled [D/S] | – |

**Failures and reversals:**
- **GPT-5 launch day:** the autoswitcher broke ("seemed way dumber", Altman, 8 Aug 2025) [S].
- **Safety routing:** drew complaints about switches made without consent [S].
- **OpenAI** removed auto-switching step by step (Dec 2025, Sep 2026).
- **Google** moved the other way for free users (Oct 2026) and was criticised for defaulting to the cheapest model [S].

## Research

- **Learned routers.**
  - RouteLLM (LMSYS, 2024): cost cut by more than 85 % on MT-Bench and 35-45 % on MMLU/GSM8K at 95 % of GPT-4 quality [D].
  - **LLMRouterBench (Jan 2026):** several routers do not beat the best single model; the main failure is missing the one model that would have been right [D].
  - Arch-Router (2025): a 1.5B model maps queries to user-written policies, 93 % accuracy, authors' own figures [D].
- **Cascades.**
  - AutoMix (NeurIPS 2024): the small model verifies itself, then the system decides whether to escalate; over 50 % lower cost [D].
  - Mixture-of-Thought cascade (ICLR 2024): agreement between chain-of-thought and program answers serves as the difficulty signal [D].
- **Self-routing.** Thinkless (2025) cuts long reasoning by 50-90 % on maths [D]. Claude adaptive thinking and Gemini dynamic thinking are the product form.
- **When to retrieve.** Adaptive-RAG (NAACL 2024): a small classifier picks none, single-step or multi-step retrieval and beats fixed strategies. Classifier accuracy is the bottleneck: oracle 56 vs 47 F1 [D].
- **Numbers.**
  - Running the arithmetic as code beats chain-of-thought by about 12-15 points (PAL / Program-of-Thought; cited from memory).
  - **Asking a model to recheck itself without outside feedback lowers accuracy** (GSM8K 75.9 → 74.7 % for GPT-3.5, 62.0 → 36.5 % for Llama-2) [D, arXiv 2310.01798].
  - No public evidence that any product runs automatic completeness checks on chat answers [I].

## Lessons used in the design

1. Keep the router on the device, small and auditable; never a hosted router that reads the prompt.
2. Label the path that answered, and offer a one-tap "answer again with Thinking". Unlabelled or unwanted switches are what users punish.
3. Lean towards Fast and escalate on cheap signals; judge any router against always-Fast and always-Thinking.
4. Keep search approval by default. Treat the on-device detector as a score with a threshold, and keep automatic search opt-in.
5. Tell the model the current date and that its knowledge may be out of date. Be strictest on office holders, prices and other changing facts.
6. Verify numbers with code or deterministic checks against the inputs, not with "check your work".
