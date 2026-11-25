// Feedback from testers (docs/feedback-20261125.md): what the browser sends and the owner reads.
import { z } from "zod";

export const FEEDBACK = {
  categories: ["problem", "idea", "wording", "other"] as const,
  textMax: 2000,
  /** An attached screenshot as base64: about 500 KB of bytes. The browser scales it down first. */
  screenshotChars: 700_000,
  /** Longest side of an attached screenshot, in pixels. */
  screenshotSide: 1280,
  /** Messages one account may send in 24 hours. */
  perDay: 20,
  /** Entries the owner's list shows, newest first. */
  listed: 200,
} as const;
export type FeedbackCategory = (typeof FEEDBACK.categories)[number];

export const feedbackRequest = z
  .object({
    category: z.enum(FEEDBACK.categories),
    text: z.string().trim().min(1).max(FEEDBACK.textMax),
    /** 1 (bad) to 5 (good); absent when the tester gave none. */
    rating: z.number().int().min(1).max(5).optional(),
    /** Only when the tester attached one. Never taken by the app itself. */
    screenshot: z
      .object({ type: z.enum(["image/jpeg", "image/png"]), data: z.string().min(1).max(FEEDBACK.screenshotChars).regex(/^[A-Za-z0-9+/]+=*$/) })
      .strict()
      .optional(),
    /** The two things sent along, shown to the tester before sending: the interface language and the window size. */
    context: z.object({ lang: z.enum(["en", "de"]), width: z.number().int().min(100).max(10_000), height: z.number().int().min(100).max(10_000) }).strict(),
  })
  .strict();
export type FeedbackRequest = z.infer<typeof feedbackRequest>;

/** One entry in the owner's list. The screenshot itself is fetched apart, only when opened. */
export type FeedbackEntry = {
  id: string;
  createdAt: string;
  /** Who sent it: the account's address where known, otherwise the start of its id. */
  from: string;
  category: FeedbackCategory;
  text: string;
  rating?: number;
  hasScreenshot: boolean;
  lang: "en" | "de";
  width: number;
  height: number;
};
