// Voice input limits shared by the browser recorder and the relay (docs/voice-to-text-20261114.md).

/** The bitrate the browser asks its recorder for. Speech in Opus or AAC is clear at this rate. */
export const VOICE_BITS_PER_SECOND = 32_000;
/** One voice unit is this many seconds of the user's own recording, rounded up. */
export const VOICE_UNIT_SECONDS = 2;
/** The settings the deployment config and /api/status carry. */
export interface VoiceLimits {
  /** Longest chunk: each chunk is its own file, transcribed while the user keeps talking. */
  chunkSeconds: number;
  /** Longest turn (one dictation or one live voice question), with a warning before the end. */
  maxTurnSeconds: number;
  /** Voice units per account in any 24 hours. */
  dailyUnits: number;
}

/** Most units one chunk may report: chunkSeconds / 2, rounded up (30 s: 15). */
export const voiceChunkUnits = (chunkSeconds: number) => Math.ceil(chunkSeconds / VOICE_UNIT_SECONDS);

/** A chunk's units from its measured length, at least 1 and never above the chunk maximum. */
export const voiceUnits = (ms: number, chunkSeconds: number) =>
  Math.min(voiceChunkUnits(chunkSeconds), Math.max(1, Math.ceil(ms / (VOICE_UNIT_SECONDS * 1000))));

/**
 * Largest encrypted upload the relay accepts for a chunk that reports `units`. The relay cannot
 * see inside the body, so size is its only check of the reported length:
 *   units x 2 s x 32,000 bit/s / 8 = audio bytes at the requested bitrate (15 units: 120,000)
 *   x 2 = room for a recorder that overshoots the bitrate and for the encryption encoding
 *   + 8,192 = container header, form fields and encryption framing
 * For 15 units (30 s): 248,192 bytes, far below the Render bridge's 1,048,576-byte body limit.
 */
export const voiceChunkLimit = (units: number) =>
  units * VOICE_UNIT_SECONDS * (VOICE_BITS_PER_SECOND / 8) * 2 + 8_192;

/** "2:10" for a number of voice units. */
export const voiceClock = (units: number) => {
  const seconds = Math.max(0, units) * VOICE_UNIT_SECONDS;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
