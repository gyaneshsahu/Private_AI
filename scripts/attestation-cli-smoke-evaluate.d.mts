export interface SmokeInput {
  stdout: string;
  stderr: string;
  exitCode: number;
  now?: number;
}
export interface SmokeOutcome {
  ok: boolean;
  reasons: string[];
  handshakeFailed: boolean;
  reachedEnclave: boolean;
  digest: string | undefined;
  freshnessExpiresAt: string | undefined;
  verdict: string | undefined;
  error: string;
}
export function extractRecord(
  stdout: string,
): Record<string, unknown> | undefined;
export function evaluateSmoke(input: SmokeInput): SmokeOutcome;
