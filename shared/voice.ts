// Voice input limits shared by the browser recorder and the relay (docs/voice-to-text-20261114.md).

/** The bitrate the browser asks its recorder for. Speech in Opus or AAC is clear at this rate. */
export const VOICE_BITS_PER_SECOND = 32_000;

/**
 * Largest encrypted upload the relay accepts for one recording. The relay cannot see inside the
 * body, so size is its only bound on length:
 *   maxSeconds x 32,000 bit/s / 8 = audio bytes at the requested bitrate (120 s: 480,000)
 *   x 2 = room for a recorder that overshoots the bitrate and for the encryption encoding
 *   + 65,536 = container headers and form fields
 * For 120 seconds: 1,025,536 bytes, which also fits the Render bridge's 1,048,576-byte body limit.
 */
export const voiceUploadLimit = (maxSeconds: number) =>
  maxSeconds * (VOICE_BITS_PER_SECOND / 8) * 2 + 65_536;

/**
 * Recordings one account may transcribe in any 24 hours. A declared length cannot be trusted, so
 * every recording counts as a full one: dailyMinutes x 60 / maxSeconds, at least 1.
 */
export const voiceDailyCount = (dailyMinutes: number, maxSeconds: number) =>
  Math.max(1, Math.floor((dailyMinutes * 60) / maxSeconds));
