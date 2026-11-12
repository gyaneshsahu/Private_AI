import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rmdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Ephemeral localhost certificate; never imported into the machine trust store. */
export async function localTLS() {
  await mkdir(".local", { recursive: true });
  const folder = await mkdtemp(resolve(".local/account-tls-"));
  const keyPath = join(folder, "key.pem"),
    certPath = join(folder, "cert.pem");
  const dispose = async () => {
    for (const file of [keyPath, certPath])
      await unlink(file).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    await rmdir(folder);
  };
  try {
    const bundled = "C:/Program Files/Git/usr/bin/openssl.exe";
    const openssl =
      process.env.PRIVATEAI_TEST_OPENSSL ??
      (process.platform === "win32" && existsSync(bundled)
        ? bundled
        : "openssl");
    execFileSync(
      openssl,
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    const key = await readFile(keyPath),
      cert = await readFile(certPath);
    return {
      key,
      cert,
      dispose,
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}
