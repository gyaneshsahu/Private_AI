// Encrypted share links (docs/sharing-20261125.md): what the browser and the server agree on.
// The server only ever sees `cipher`: the snapshot encrypted in the browser with a key that stays
// in the link after "#", which browsers never send to a server.
import { z } from "zod";

export const SHARE = {
  /** The encrypted snapshot as base64url: about 3 MB of bytes, enough for one image version. */
  cipherChars: 4_200_000,
  /** Links one account can have at a time. */
  perAccount: 50,
  /** How long a link lives, in days, by the choice shown to the user. */
  days: { day: 1, week: 7, month: 30 },
  /** The id in the link: 16 random bytes as base64url. */
  id: /^[A-Za-z0-9_-]{22}$/,
} as const;
export type ShareExpiry = keyof typeof SHARE.days;

export const shareCreateRequest = z
  .object({
    cipher: z.string().min(40).max(SHARE.cipherChars).regex(/^[A-Za-z0-9_-]+$/),
    expires: z.enum(["day", "week", "month"]),
  })
  .strict();

/** What the owner's list shows about a link: never its content, which the server cannot read. */
export type ShareListing = { id: string; createdAt: string; expiresAt: string; bytes: number };

/** The snapshot inside the encryption. `v` lets a later format be told apart. */
const turn = z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(200_000) }).strict();
const picture = z.object({ type: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(4_000_000).regex(/^[A-Za-z0-9+/]+=*$/) }).strict();
export const shareSnapshot = z
  .object({
    v: z.literal(1),
    kind: z.enum(["answer", "chat", "image"]),
    title: z.string().max(300),
    /** An answer (one assistant turn, with its question when known) or a chat (every turn, in order). */
    turns: z.array(turn).max(400).optional(),
    image: picture.optional(),
    sharedAt: z.string().datetime(),
  })
  .strict();
export type ShareSnapshot = z.infer<typeof shareSnapshot>;
