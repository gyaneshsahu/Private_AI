// Run from the permitted Render network. No password, authentication or SQL.
const net = require("node:net");
const tls = require("node:tls");
const { X509Certificate } = require("node:crypto");
const host = "dpg-dbbpa98ae00c73acf98g-a.frankfurt-postgres.render.com";
let socket;
const timer = setTimeout(() => fail("timeout"), 10000);
function fail(reason) {
  clearTimeout(timer);
  socket?.destroy();
  console.error(JSON.stringify({ verified: false, reason }));
  process.exitCode = 1;
}
socket = net.connect(5432, host, () => {
  const request = Buffer.alloc(8);
  request.writeInt32BE(8, 0);
  request.writeInt32BE(80877103, 4);
  socket.write(request);
});
socket.on("error", () => fail("connection-or-certificate-failure"));
socket.once("data", (reply) => {
  if (reply.length !== 1 || reply[0] !== 83) return fail("TLS-not-accepted");
  socket = tls.connect(
    { socket, servername: host, rejectUnauthorized: true },
    () => {
      clearTimeout(timer);
      const leaf = socket.getPeerCertificate(true);
      let root = leaf;
      const seen = new Set();
      while (root.issuerCertificate && !seen.has(root.fingerprint256)) {
        seen.add(root.fingerprint256);
        root = root.issuerCertificate;
      }
      console.log(
        JSON.stringify({
          verified: socket.authorized,
          host,
          issuer: leaf.issuer?.CN,
          leafExpiry: leaf.valid_to,
          trustCertificateSha256: root.fingerprint256,
        }),
      );
      if (root.raw) console.log(new X509Certificate(root.raw).toString());
      socket.destroy();
    },
  );
  socket.on("error", () => fail("connection-or-certificate-failure"));
});
