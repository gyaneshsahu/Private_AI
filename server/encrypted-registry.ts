import { DatabaseSync, backup } from "node:sqlite";
import { spawn } from "node:child_process";
import { lstat, realpath, mkdtemp, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { validateInviteRegistry } from "./registry-validation";

const maximumBytes = 16 * 1024 * 1024;

function supported() {
  if (
    typeof DatabaseSync.prototype.serialize !== "function" ||
    typeof DatabaseSync.prototype.deserialize !== "function"
  )
    throw Error("In-memory SQLite backup is unavailable in this Node runtime.");
}

async function regularFile(file: string) {
  if (!isAbsolute(file)) throw Error("An absolute regular file is required.");
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximumBytes)
    throw Error("Invalid or oversized backup input.");
}

async function age(binary: string, args: string[], input: Uint8Array) {
  if (!isAbsolute(binary))
    throw Error("Configure an absolute age executable path.");
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "ignore"],
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
      },
    });
    const chunks: Buffer[] = [];
    let size = 0,
      failed = false;
    const fail = () => {
      failed = true;
      child.kill();
    };
    const timer = setTimeout(fail, 60000);
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maximumBytes) {
        chunk.fill(0);
        fail();
      } else chunks.push(chunk);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const output = !failed && code === 0 ? Buffer.concat(chunks) : undefined;
      for (const chunk of chunks) chunk.fill(0);
      if (output) resolve(output);
      else
        reject(
          Error(
            "Encrypted registry operation failed; no diagnostic content was logged.",
          ),
        );
    });
    child.stdin.end(input);
  });
}

export async function encryptRegistry(
  source: string,
  recipient: string,
  binary: string,
) {
  supported();
  await regularFile(source);
  if (!/^age1[0-9a-z]{58}$/.test(recipient))
    throw Error("Use a single native age recipient.");
  const db = new DatabaseSync(source, { readOnly: true });
  let plain: Uint8Array | undefined;
  try {
    db.exec("BEGIN");
    validateInviteRegistry(db);
    plain = db.serialize();
    if (plain.length > maximumBytes - 65536)
      throw Error("Registry exceeds backup limit.");
    // SQLite documents this conversion for deserializing a committed WAL image.
    // Only the in-memory snapshot changes; the live database remains read-only.
    // https://sqlite.org/c3ref/deserialize.html
    plain[18] = plain[19] = 1;
    return await age(binary, ["--encrypt", "--recipient", recipient], plain);
  } finally {
    plain?.fill(0);
    db.close();
  }
}

async function decryptedRegistry(
  file: string,
  identity: string,
  binary: string,
) {
  supported();
  await regularFile(file);
  if (!/^AGE-SECRET-KEY-1[0-9A-Z]+\s*$/.test(identity))
    throw Error("Invalid backup identity.");
  const key = Buffer.from(identity.trim() + "\n");
  let plain: Buffer | undefined;
  const db = new DatabaseSync(":memory:");
  try {
    plain = await age(binary, ["--decrypt", "--identity", "-", file], key);
    db.deserialize(plain);
    validateInviteRegistry(db);
    return db;
  } catch {
    db.close();
    throw Error("Backup authentication or registry validation failed.");
  } finally {
    key.fill(0);
    plain?.fill(0);
  }
}

export async function verifyEncryptedRegistry(
  file: string,
  identity: string,
  binary: string,
) {
  const db = await decryptedRegistry(file, identity, binary);
  try {
    return {
      verified: true,
      accounts: Number(
        db.prepare("SELECT count(*) AS n FROM invites").get()!.n,
      ),
    };
  } finally {
    db.close();
  }
}

export async function restoreEncryptedRegistry(
  file: string,
  identity: string,
  binary: string,
  destination: string,
) {
  if (!isAbsolute(destination))
    throw Error("Use a private absolute restore directory outside Git.");
  const stat = await lstat(destination);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw Error("Invalid restore destination.");
  const root = await realpath(destination);
  for (let parent = root; ; parent = dirname(parent)) {
    if (existsSync(join(parent, ".git")))
      throw Error("Restore destination must be outside Git.");
    if (dirname(parent) === parent) break;
  }
  const db = await decryptedRegistry(file, identity, binary);
  try {
    db.exec(
      "BEGIN; UPDATE access_settings SET paused=1 WHERE id=1; UPDATE invites SET revoked=1,invite=NULL; COMMIT;",
    );
    validateInviteRegistry(db);
    const directory = await mkdtemp(join(root, "privateai-restored-"));
    await chmod(directory, 0o700);
    const database = join(directory, "invites.sqlite");
    await backup(db, database);
    await chmod(database, 0o600);
    return { directory, paused: true, restoredAccountsRevoked: true };
  } finally {
    db.close();
  }
}
