# Paste batches: unseen-v3 cross-check with ChatGPT and Claude (12 November 2026)

The 30 two-turn conversations of `unseen-v3-20261023.json` are written here as 60 standalone questions (the `a` question is turn 1, the `b` question is turn 2 restated so it makes sense on its own), 10 per batch: `batch-01.md` to `batch-06.md`. The three repetitions of the model runs use the same 30 conversations, so there are 60 questions, not 90.

## What to do

1. Open a new chat in ChatGPT, paste everything between the two `---` lines of `batch-01.md`, send it.
2. Copy the whole reply and save it as `answers-chatgpt/batch-01.md` in this folder.
3. Do the same in Claude and save the reply as `answers-claude/batch-01.md`.
4. Repeat for batches 02 to 06 (a new chat per batch, so earlier batches do not influence later ones).

Save the reply as it comes; extra text around the answer lines is ignored. Only lines that start with a question id (`unseen3-01a: ...`) are read.

## Then

```
node --import tsx evaluation/arithmetic-gate/ai-agreement.ts
```

It scores every line against the code key with the frozen scorer and prints the AI cross-check section for `results-v3-unseen-20261112.md`: each AI's wrong lines, and the lines where both AIs give the same figures but the key differs. Those are the key items to review by hand; the key stays the truth until a review shows it wrong.

Synthetic data only: every amount in these questions is invented.
