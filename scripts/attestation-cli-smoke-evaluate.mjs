// Pure evaluation of one `tinfoil attestation verify -j` run, shared by the
// in-image smoke runner (scripts/attestation-cli-smoke.mjs) and its unit test.
// The CLI writes its record with json.MarshalIndent, so the output spans several
// lines and may be preceded by log lines; the record is the last JSON object.

const DIGEST = /^[a-f0-9]{64}$/;
const HANDSHAKE =
  /unknown authority|tls: failed|x509|no such host|connection refused|i\/o timeout|dial tcp/i;

/** Extracts the last complete JSON object from the CLI's stdout, or undefined. */
export function extractRecord(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return undefined;
  try {
    const whole = JSON.parse(text);
    return whole && typeof whole === "object" && !Array.isArray(whole)
      ? whole
      : undefined;
  } catch {
    /* fall through to the last-object scan */
  }
  const start = text.lastIndexOf("\n{");
  const candidate = start >= 0 ? text.slice(start + 1) : text;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Decides whether the run proves that the pinned CLI, from inside the image,
 * completed a TLS handshake, fetched an attestation and landed on a verdict.
 * Required: exit code 0, no handshake signature on stderr, a parsable record
 * carrying a 64-hex `digest`, an ISO `freshness_expires_at` in the future at
 * `now`, and `status` "ok". Anything else is a failure with a named reason.
 */
export function evaluateSmoke({ stdout, stderr, exitCode, now = Date.now() }) {
  const handshakeFailed = HANDSHAKE.test(String(stderr ?? ""));
  const record = extractRecord(stdout);
  const reasons = [];
  if (handshakeFailed) reasons.push("handshake failed");
  if (exitCode !== 0) reasons.push(`exit code ${exitCode}`);
  if (!record) reasons.push("no JSON record on stdout");
  const digest =
    record && typeof record.digest === "string" ? record.digest : undefined;
  if (record && !(digest && DIGEST.test(digest)))
    reasons.push("digest missing or not 64 hex characters");
  const freshnessRaw =
    record && typeof record.freshness_expires_at === "string"
      ? record.freshness_expires_at
      : undefined;
  const freshness = freshnessRaw ? Date.parse(freshnessRaw) : Number.NaN;
  if (record && Number.isNaN(freshness))
    reasons.push("freshness_expires_at missing or not a date");
  else if (record && freshness <= now)
    reasons.push("freshness_expires_at already passed");
  const verdict =
    record && typeof record.status === "string" ? record.status : undefined;
  if (record && verdict !== "ok")
    reasons.push(`status ${verdict ?? "missing"}`);
  return {
    ok: reasons.length === 0,
    reasons,
    handshakeFailed,
    reachedEnclave: !!record && !!digest,
    digest,
    freshnessExpiresAt: Number.isNaN(freshness)
      ? undefined
      : new Date(freshness).toISOString(),
    verdict,
    // Only the CLI's own error line is surfaced; it carries no request content.
    error: record
      ? typeof record.error === "string"
        ? record.error
        : ""
      : (String(stderr ?? "")
          .split("\n")
          .find((line) => line.trim()) ?? ""),
  };
}
