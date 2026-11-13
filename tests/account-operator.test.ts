import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  commands,
  emailLiteral,
  main,
  operatorSql,
} from "../scripts/account-operator";

describe("account operator SQL", () => {
  it("lowercases and quotes an email, doubling apostrophes", () => {
    expect(emailLiteral(" Person@Example.TEST ")).toBe("'person@example.test'");
    expect(emailLiteral("o'brien@example.test")).toBe("'o''brien@example.test'");
  });

  it.each([
    "",
    "not-an-email",
    "back\\slash@example.test",
    "semi;colon@example.test",
    "x'); DROP TABLE \"user\"; --@example.test",
    "a@b.test'; DELETE FROM session; --",
    "line\nbreak@example.test",
    "nul\0@example.test",
    "dollar$$@example.test",
    `${"a".repeat(250)}@example.test`,
  ])("refuses malformed or hostile email %j", (email) => {
    for (const command of commands)
      expect(() => operatorSql(command, email)).toThrow("valid email");
  });

  it("keeps the statement shape independent of the email", () => {
    for (const command of commands) {
      const plain = operatorSql(command, "plain@example.test").replaceAll(
        "'plain@example.test'",
        "<EMAIL>",
      );
      const hostile = operatorSql(command, "o'brien@example.test").replaceAll(
        "'o''brien@example.test'",
        "<EMAIL>",
      );
      expect(hostile).toBe(plain);
      // Every quote in the template is balanced once the literal is removed.
      expect((plain.match(/'/g) ?? []).length % 2).toBe(0);
    }
  });

  it("prints one transaction; show rolls back, writes commit", () => {
    for (const command of commands) {
      const sql = operatorSql(command, "plain@example.test");
      expect(sql.match(/^BEGIN;$/gm)).toHaveLength(1);
      expect(sql.trimEnd().endsWith(command === "show" ? "ROLLBACK;" : "COMMIT;")).toBe(true);
    }
    expect(operatorSql("show", "plain@example.test")).not.toMatch(/DELETE|INSERT|UPDATE/);
  });

  it("covers every table the migrations create, except the account-free ones", async () => {
    const migrations = await Promise.all(
      (await readFile("server/account-migrations.ts", "utf8"))
        .match(/"\d{4}-[a-z-]+\.sql"/g)!
        .map((name) => readFile(`server/migrations/${JSON.parse(name)}`, "utf8")),
    );
    const created = migrations
      .join("\n")
      .matchAll(/create table "?([A-Za-z_]+)"?/gi);
    // rateLimit: keyed by IP and path; signin_delivery: keyed hash needs the app secret, pruned after a day;
    // billing_event_inbox: provider events, not keyed to an account; account_recovery_control: one service-wide row.
    const accountFree = ["rateLimit", "signin_delivery", "billing_event_inbox", "account_recovery_control"];
    const show = operatorSql("show", "plain@example.test");
    for (const [, table] of created)
      if (!accountFree.includes(table))
        expect(show, table).toContain(`FROM "${table}" WHERE`);
  });

  it("erase keeps only the closure receipt and suspend ends sessions", () => {
    const erase = operatorSql("erase", "plain@example.test");
    expect(erase).not.toMatch(/DELETE FROM "?account_closure/);
    expect(erase).toContain('DELETE FROM "user"');
    expect(erase.indexOf('DELETE FROM "usage_metrics"')).toBeLessThan(
      erase.indexOf('DELETE FROM "usage_requests"'),
    );
    const suspend = operatorSql("suspend", "plain@example.test");
    expect(suspend).toContain("DELETE FROM session");
    expect(suspend).toContain("'infinity'");
  });

  it("requires a command and --email", () => {
    expect(() => main([])).toThrow("Usage");
    expect(() => main(["drop", "--email", "a@example.test"])).toThrow("Usage");
    expect(() => main(["show", "a@example.test"])).toThrow("Usage");
    expect(() => main(["show", "--email", "a@example.test", "extra"])).toThrow("Usage");
    expect(main(["show", "--email", "a@example.test"])).toContain("'a@example.test'");
  });
});
