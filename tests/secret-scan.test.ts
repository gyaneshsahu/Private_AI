import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error plain ES module script without types
import { findSecrets } from "../scripts/secret-scan.mjs";

// Values are assembled at run time so this file itself never holds a secret-shaped string.
const tk = "tk" + "_" + "A1b2C3d4E5f6G7h8J9k0L1m2N3p4";
const pem = "-----BEGIN " + "PRIVATE KEY-----";
const google = "GOCSPX" + "-" + "abcdefghijKLMNOPQRST12";
const db = "postgres" + "://cometrow_owner:" + "Very-long-pass99" + "@dpg-abc.frankfurt-postgres.render.com/db";

describe("secret scan", () => {
  it("flags credential shapes and names them without printing values", () => {
    for (const [line, name] of [
      [`TINFOIL_API_KEY=${tk}`, "Tinfoil key"],
      [pem, "Private key block"],
      [`clientSecret: "${google}"`, "Google OAuth client secret"],
      [`DATABASE_URL=${db}`, "Database URL with password"],
    ])
      expect(findSecrets(`first line\n${line}`)).toEqual([{ line: 2, name }]);
  });

  it("allows local databases and lines marked synthetic", () => {
    expect(findSecrets("postgres" + "://u:longpassword1@localhost:5433/x")).toEqual([]);
    expect(findSecrets(`const key = "${tk}"; // synthetic`)).toEqual([]);
    expect(findSecrets("Authorization: Bearer YOUR_ADMIN_KEY")).toEqual([]);
  });

  it("runs in CI before the tests", () => {
    expect(readFileSync(".github/workflows/validate.yml", "utf8")).toContain("node scripts/secret-scan.mjs");
  });
});
