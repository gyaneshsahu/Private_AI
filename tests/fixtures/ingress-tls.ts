import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  unlink,
  rmdir,
} from "node:fs/promises";
import { join, resolve } from "node:path";

/** Test-only CA and leaf keys, never installed into an OS trust store. */
export async function ingressTLS() {
  const prepared = process.env.PRIVATEAI_SYNTHETIC_INGRESS_TLS_DIR;
  if (prepared) {
    const leaf = async (name: string) => ({
      key: await readFile(join(prepared, `${name}.key`)),
      cert: await readFile(join(prepared, `${name}.pem`)),
    });
    return {
      server: await leaf("localhost"),
      proxy: await leaf("proxy"),
      other: await leaf("other"),
      ca: await readFile(join(prepared, "ca.pem")),
      directory: prepared,
      dispose: async () => {},
    };
  }
  await mkdir(".local", { recursive: true });
  const folder = await mkdtemp(resolve(".local/ingress-tls-"));
  const files = new Set<string>();
  const path = (name: string) => {
    files.add(name);
    return join(folder, name);
  };
  const openssl =
    process.env.PRIVATEAI_TEST_OPENSSL ??
    (process.platform === "win32" &&
    existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
      ? "C:/Program Files/Git/usr/bin/openssl.exe"
      : "openssl");
  const run = (args: string[]) =>
    execFileSync(openssl, args, {
      stdio: "ignore",
      windowsHide: true,
      timeout: 10000,
    });
  const dispose = async () => {
    for (const name of files)
      await unlink(join(folder, name)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    await rmdir(folder);
  };
  try {
    run([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      path("ca.key"),
      "-out",
      path("ca.pem"),
      "-subj",
      "/CN=PrivateAI synthetic ingress CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
      "-addext",
      "keyUsage=critical,keyCertSign,cRLSign",
    ]);
    async function leaf(name: string, server = false) {
      run([
        "req",
        "-new",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        path(`${name}.key`),
        "-out",
        path(`${name}.csr`),
        "-subj",
        `/CN=${name}`,
      ]);
      await writeFile(
        path(`${name}.ext`),
        `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=${server ? "serverAuth" : "clientAuth"}\n${server ? "subjectAltName=DNS:localhost,IP:127.0.0.1\n" : ""}`,
      );
      run([
        "x509",
        "-req",
        "-in",
        path(`${name}.csr`),
        "-CA",
        path("ca.pem"),
        "-CAkey",
        path("ca.key"),
        "-set_serial",
        server ? "1" : name === "proxy" ? "2" : "3",
        "-days",
        "1",
        "-extfile",
        path(`${name}.ext`),
        "-out",
        path(`${name}.pem`),
      ]);
      return {
        key: await readFile(path(`${name}.key`)),
        cert: await readFile(path(`${name}.pem`)),
      };
    }
    return {
      server: await leaf("localhost", true),
      proxy: await leaf("proxy"),
      other: await leaf("other"),
      ca: await readFile(path("ca.pem")),
      directory: folder,
      dispose,
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}
