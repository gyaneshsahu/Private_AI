// Deep research: the caps shared by the browser and the relay (docs/deep-research-20261114.md).
// One run is two model requests (plan, answer), a few approved searches and a few page reads.

/** The value of `x-privateai-kind` (the image feature's header) on a run's two model requests. */
export const RESEARCH_KINDS = { plan: "research-plan", answer: "research-answer" } as const;
export type ResearchStep = keyof typeof RESEARCH_KINDS;

export const RESEARCH_LIMITS = {
  /** Model requests per run: the plan (Fast) and the answer (Thinking). No retry, no follow-up. */
  modelRequests: 2,
  /** Search texts per run. All are shown, edited and approved before the first one is sent. */
  searches: 4,
  /** Result pages used per run, the top page our server opens with each search included. */
  pages: 6,
  pagesPerSearch: 3,
  /** Sources given to the model, and the characters of source text over all of them. */
  sources: 10,
  sourceCharacters: 16_000,
  /** Characters of one page that go to the model: the passages chosen on the device. */
  pageCharacters: 2_400,
  questionCharacters: 1_000,
  /** Searching and reading together; when it runs out, the answer is written from what was read. */
  gatherMs: 150_000,
  /** From the approval to the end of the answer. The run is stopped when it runs out. */
  wallClockMs: 480_000,
} as const;

/**
 * The source text of one run must fit the report's input limit beside the conversation. Kept free
 * for what the answer request adds around the sources: the instructions for web results (about
 * 1,000 characters, more for German rules), the JSON around each source and its escaping.
 */
export const RESEARCH_OVERHEAD = 6_000;
/** Below this much room for source text a run is not started: the answer would rest on too little. */
export const RESEARCH_MIN_SOURCE_CHARACTERS = 4_000;
/** Source characters a run may use: the cap, or less when the input limit leaves less room. */
export const researchSourceRoom = (maxInputCharacters: number, contextCharacters: number) =>
  Math.min(RESEARCH_LIMITS.sourceCharacters, maxInputCharacters - contextCharacters - RESEARCH_OVERHEAD);

