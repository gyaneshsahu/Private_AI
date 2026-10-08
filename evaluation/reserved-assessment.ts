import { createHash } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Experiment } from "./experiment";
import { configurationIdentity } from "./implementation";

export async function validateReservedBinding(
  root: string,
  permit: Experiment,
  codeHash: string,
) {
  if (permit.scenario !== "reserved_case") return;
  const binding = permit.reservedAssessment;
  const bytes = await readFile(resolve(root, "evaluation/cases/heldout.json"));
  const manifest = JSON.parse(
    await readFile(resolve(root, "evaluation/frozen-manifest.json"), "utf8"),
  );
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    !binding ||
    digest !== manifest["heldout.json"] ||
    digest !== binding.fixtureSHA256 ||
    configurationIdentity(codeHash, permit.policy) !==
      binding.configurationSHA256
  )
    throw new Error(
      "Reserved fixture/configuration differs from the reviewed freeze.",
    );
}

// A new approval ID cannot repeat an already consumed reserved slot.
export async function claimReservedSlot(root: string, permit: Experiment) {
  if (permit.scenario !== "reserved_case") return;
  const binding = permit.reservedAssessment;
  if (
    !binding ||
    !/^heldout-[a-z]+-\d{2}$/.test(permit.developmentCaseId ?? "")
  )
    throw new Error("Invalid reserved slot.");
  const parent = resolve(
    root,
    ".local/reserved-claims",
    binding.configurationSHA256,
  );
  await mkdir(parent, { recursive: true });
  await mkdir(
    resolve(parent, `${permit.developmentCaseId}-${binding.repetition}`),
  );
}
