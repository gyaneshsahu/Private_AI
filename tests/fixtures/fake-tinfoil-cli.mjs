// Stand-in for the pinned `tinfoil` CLI used by tests/attestation-audit.test.ts.
// The behaviour is selected by the first label of the enclave host so that no
// environment variable is needed (the audit passes none through).
const args = process.argv.slice(2);
const flag = (name) => args[args.indexOf(name) + 1];
const host = flag("-e") ?? "";
const repo = flag("-r") ?? "";
const mode = host.split(".")[0];

if (process.env.TINFOIL_API_KEY !== undefined) process.exit(9);
if (process.env.TINFOIL_NO_UPDATE_CHECK !== "1") process.exit(8);
if (args[0] !== "attestation" || args[1] !== "verify" || !args.includes("-j"))
  process.exit(7);
if (!repo.startsWith("tinfoilsh/")) process.exit(6);

const digest = "a".repeat(64);
const record = (overrides = {}) =>
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      enclave: host,
      repo,
      digest,
      measurements: { sigstore: {}, enclave: null },
      keys: { enclave: "SHA256:fake", connection: "SHA256:fake" },
      crypto_material: [],
      freshness_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      status: "ok",
      ...overrides,
    },
    null,
    2,
  );

const emit = (text, code) => {
  process.stdout.write(text + "\n");
  process.exitCode = code;
};

switch (mode) {
  case "pass":
    emit(record(), 0);
    break;
  case "pinned":
    // Passes only when the single qualified digest was pinned on the command line.
    emit(record(), repo === `tinfoilsh/test-only@sha256:${digest}` ? 0 : 1);
    break;
  case "fail":
    emit(
      record({
        status: "fail",
        error: "remote public key does not match the endorsed TLS key",
      }),
      1,
    );
    break;
  case "crash":
    process.stderr.write("verification failed: fetching freshness witness\n");
    process.exitCode = 1;
    break;
  case "hang":
    setTimeout(() => {}, 60_000);
    break;
  case "garbage":
    emit("verified: yes (not json)", 0);
    break;
  case "expired":
    emit(record({ freshness_expires_at: new Date(Date.now() - 1000).toISOString() }), 0);
    break;
  case "otherdigest":
    emit(record({ digest: "b".repeat(64) }), 0);
    break;
  case "wronghost":
    emit(record({ enclave: "elsewhere.example" }), 0);
    break;
  case "keymismatch":
    emit(record({ keys: { enclave: "SHA256:one", connection: "SHA256:two" } }), 0);
    break;
  case "huge":
    emit("[" + '"x",'.repeat(40_000) + '"x"]', 0);
    break;
  default:
    process.stderr.write("unknown fixture mode\n");
    process.exitCode = 2;
}
