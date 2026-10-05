import { z } from "zod";
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareFromPreflight } from "./prepare-experiment";
import { validateExperiment } from "./experiment";

export const windowsApprovalId = "windows_20261005_compat_usd2";
const billingSchema = z
  .object({
    checkedAt: z.string().datetime(),
    cumulativeSpentUSD: z.number().finite().nonnegative(),
    remainingBalanceUSD: z.number().finite().positive(),
    accountCapUSD: z.literal(2),
    autoRechargeDisabled: z.literal(true),
    keyMatchesCappedAccount: z.literal(true),
    inputPerMillion: z.number().finite().positive(),
    outputPerMillion: z.number().finite().positive(),
    noAdditionalRequestFee: z.literal(true),
  })
  .strict();

export function prepareWindowsCompatibility(
  proof: unknown,
  billing: unknown,
  now = Date.now(),
) {
  const receipt = billingSchema.parse(billing);
  const age = now - Date.parse(receipt.checkedAt);
  // Conservative token allowance, not a provider-enforced monetary limit.
  const allowance =
    (8000 * receipt.inputPerMillion + 512 * receipt.outputPerMillion) / 1e6;
  if (
    age < 0 ||
    age > 24 * 60 * 60 * 1000 ||
    allowance > 0.01 ||
    receipt.cumulativeSpentUSD + 0.01 > 2 ||
    receipt.remainingBalanceUSD < 0.01
  )
    throw new Error(
      "Fresh billing evidence and at least USD 0.01 headroom within the existing USD 2 cap are required.",
    );
  const base = prepareFromPreflight(proof, now);
  return validateExperiment(
    {
      ...base,
      scenario: "adapter_compatibility",
      approvalId: windowsApprovalId,
      approvalEvidence:
        "User authorized the 2026-10-05 Windows batch: one synthetic compatibility request; only after success, a separately prepared two-turn invoice. Three maximum, no retries, existing USD 2 cap including prior charges.",
      providerLimitEvidence: `Operator dashboard receipt ${receipt.checkedAt}: cumulative USD ${receipt.cumulativeSpentUSD}, remaining balance USD ${receipt.remainingBalanceUSD}; USD 2 account/key cap, auto-recharge disabled. User-reported controls, not independently enforced here.`,
      pricingEvidence: `Operator checked dashboard pricing at ${receipt.checkedAt}: USD ${receipt.inputPerMillion}/M input, USD ${receipt.outputPerMillion}/M output; no additional request fee.`,
      pricingCheckedAt: receipt.checkedAt,
      browserPreflightEvidence: base.browserPreflightEvidence.replace(
        "User-run WSL Chromium",
        "Windows browser preflight",
      ),
      policy: {
        ...base.policy,
        maxInputCharacters: 2000,
        maxOutputTokens: 512,
        pricing: {
          inputPerMillion: receipt.inputPerMillion,
          outputPerMillion: receipt.outputPerMillion,
          currency: "USD",
        },
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
    if (process.argv.length !== 2) throw new Error();
    const local = resolve(dirname(fileURLToPath(import.meta.url)), "../.local");
    try {
      await access(resolve(local, "experiment-runs", windowsApprovalId));
      throw new Error("Consumed");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const billing = JSON.parse(
      await readFile(resolve(local, "windows-billing.json"), "utf8"),
    );
    const files = (await readdir(local))
      .filter((n) => /^browser-preflight-\d+\.json$/.test(n))
      .sort()
      .reverse();
    let permit;
    for (const file of files) {
      try {
        permit = prepareWindowsCompatibility(
          JSON.parse(await readFile(resolve(local, file), "utf8")),
          billing,
        );
        break;
      } catch {
        /* Only fresh matching evidence can prepare this fixed approval. */
      }
    }
    if (!permit) throw new Error();
    await writeFile(
      resolve(local, "compatibility.json"),
      JSON.stringify(permit, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      "Prepared ONE Windows synthetic request, existing USD 2 cumulative cap, no inference sent. No retry or private-data approval.",
    );
  } catch {
    console.error(
      "Not prepared: requires fresh matching preflight, current non-secret billing receipt, and unused Windows approval. Existing permits/claims are never overwritten or reissued.",
    );
    process.exitCode = 1;
  }
}
