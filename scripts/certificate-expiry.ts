// Content-free TLS certificate check for the runbook (plan 7.3): one handshake
// with the named host, no request body, no cookie, nothing sent but the
// handshake. Prints issuer, subject, validity and days remaining; exits 2 when
// fewer than the threshold days remain or the chain does not validate. This is
// a manual cross-check, not a replacement for the external monitor.
import { connect } from "node:tls";

const host = process.argv[2];
const thresholdDays = Number(process.argv[3] ?? "14");
if (!host || !/^[a-z0-9.-]+$/i.test(host) || !Number.isFinite(thresholdDays)) {
  console.error("usage: certificate-expiry.ts <host> [thresholdDays]");
  process.exit(1);
}

const socket = connect(
  { host, port: 443, servername: host, rejectUnauthorized: false, timeout: 10000 },
  () => {
    const cert = socket.getPeerCertificate();
    const authorized = socket.authorized;
    const authorizationError = socket.authorizationError;
    socket.end();
    if (!cert || !cert.valid_to) {
      console.error("No certificate presented.");
      process.exit(2);
    }
    const expiresAt = new Date(cert.valid_to);
    const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
    const line = (label: string, value: unknown) =>
      console.log(`${label.padEnd(12)} ${String(value)}`);
    line("host", host);
    line("subject", cert.subject?.CN ?? "");
    line("issuer", `${cert.issuer?.O ?? ""} ${cert.issuer?.CN ?? ""}`.trim());
    line("valid from", cert.valid_from);
    line("valid to", cert.valid_to);
    line("days left", daysLeft);
    line("chain", authorized ? "validates" : `does not validate (${String(authorizationError)})`);
    if (!authorized || daysLeft < thresholdDays) process.exit(2);
  },
);
socket.on("timeout", () => {
  console.error("Handshake timed out.");
  socket.destroy();
  process.exit(2);
});
socket.on("error", (error) => {
  console.error(`Handshake failed: ${error.message}`);
  process.exit(2);
});
