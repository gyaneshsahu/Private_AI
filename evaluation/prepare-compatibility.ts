import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareFromPreflight } from "./prepare-experiment";
import { validateExperiment } from "./experiment";

export const confirmation = "--confirm-one-additional-request-within-usd2";
export function prepareCompatibility(
  raw: unknown,
  explicitConfirmation: string,
  now = Date.now(),
) {
  if (explicitConfirmation !== confirmation)
    throw new Error(
      "Additional request scope must be explicitly confirmed. The completed two-turn approval is not reusable.",
    );
  const base = prepareFromPreflight(raw, now);
  return validateExperiment(
    {
      ...base,
      scenario: "adapter_compatibility",
      approvalId: "adapter_compatibility_20261004_one_request",
      approvalEvidence:
        "Operator explicitly confirmed ONE additional synthetic compatibility request within the existing USD 2 TOTAL cap using the confirmation CLI flag. No new USD 2 allowance or private-data approval.",
      providerLimitEvidence:
        "Operator must retain the existing USD 2 provider account limit and disabled auto-recharge. No cap reset, recharge or extra funds are authorized by this preparation.",
      pricingCheckedAt: "2026-10-04T17:54:22.564Z",
      policy: {
        ...base.policy,
        maxInputCharacters: 2000,
        maxOutputTokens: 512,
      },
    },
    now,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== confirmation)
      throw new Error();
    const local = resolve(dirname(fileURLToPath(import.meta.url)), "../.local");
    const files = (await readdir(local))
      .filter((n) => /^browser-preflight-\d+\.json$/.test(n))
      .sort()
      .reverse();
    let permit;
    for (const file of files) {
      try {
        permit = prepareCompatibility(
          JSON.parse(await readFile(resolve(local, file), "utf8")),
          process.argv[2],
        );
        break;
      } catch {
        /* An old/different preflight cannot authorize a changed release. */
      }
    }
    if (!permit) throw new Error();
    await writeFile(
      resolve(local, "compatibility.json"),
      JSON.stringify(permit, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      "Prepared one separately confirmed request, maximum 512 output tokens, within the existing USD 2 total cap. No model request made; no cap reset; provider qualification NOT_PASSED.",
    );
  } catch {
    console.error(
      "Not prepared. Requires explicit additional-request confirmation, a recent matching browser preflight, and no existing compatibility.json. Never delete consumed approvals to retry.",
    );
    process.exitCode = 1;
  }
}
