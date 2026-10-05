import { DatabaseSync } from "node:sqlite";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class InviteRegistry {
  private db: DatabaseSync;
  constructor(
    path: string,
    private now = Date.now,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY, invite TEXT, expires INTEGER NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0, salt TEXT, password TEXT,
        window INTEGER NOT NULL DEFAULT 0, requests INTEGER NOT NULL DEFAULT 0
      );`);
  }
  issue(expires: number) {
    if (
      !Number.isSafeInteger(expires) ||
      expires <= this.now() ||
      expires > this.now() + 30 * 86400000
    )
      throw new Error("Choose an expiry within 30 days.");
    const id = randomUUID(),
      token = randomBytes(32).toString("base64url");
    this.db
      .prepare("INSERT INTO invites(id,invite,expires) VALUES(?,?,?)")
      .run(id, digest(token), expires);
    return { id, token, expires };
  }
  active(id: string) {
    return !!this.db
      .prepare("SELECT id FROM invites WHERE id=? AND revoked=0 AND expires>?")
      .get(id, this.now());
  }
  async register(id: string, token: string, password: string) {
    if (password.length < 12 || password.length > 256 || token.length > 100)
      return false;
    const salt = randomBytes(16).toString("hex");
    const hash = ((await derive(password, salt, 64)) as Buffer).toString("hex");
    return (
      this.db
        .prepare(
          "UPDATE invites SET password=?,salt=?,invite=NULL WHERE id=? AND invite=? AND password IS NULL AND revoked=0 AND expires>?",
        )
        .run(hash, salt, id, digest(token), this.now()).changes === 1
    );
  }
  async login(id: string, password: string) {
    if (password.length > 256) return false;
    const row = this.db
      .prepare(
        "SELECT salt,password FROM invites WHERE id=? AND revoked=0 AND expires>?",
      )
      .get(id, this.now()) as { salt?: string; password?: string } | undefined;
    const actual = (await derive(
      password,
      row?.salt ?? "invalid-account-fixed-salt",
      64,
    )) as Buffer;
    const expected = Buffer.from(row?.password ?? "00".repeat(64), "hex");
    return timingSafeEqual(actual, expected) && !!row?.password;
  }
  revoke(id: string) {
    this.db
      .prepare("UPDATE invites SET revoked=1,invite=NULL WHERE id=?")
      .run(id);
  }
  allowRequest(id: string) {
    const now = this.now();
    this.db
      .prepare(
        "UPDATE invites SET window=?,requests=0 WHERE id=? AND window<=?",
      )
      .run(now, id, now - 3600000);
    return (
      this.db
        .prepare(
          "UPDATE invites SET requests=requests+1 WHERE id=? AND revoked=0 AND expires>? AND requests<200",
        )
        .run(id, now).changes === 1
    );
  }
  close() {
    this.db.close();
  }
}
