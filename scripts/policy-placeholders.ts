// Build-time gate for the production candidate: exits 1 while the in-app
// privacy policy still carries an owner placeholder. Runs inside the
// deployment-candidate stage of both Dockerfiles with the PRIVACY_PLACEHOLDERS
// build argument ("forbid" by default; "allow" only for rehearsal images).
//   node --import tsx scripts/policy-placeholders.ts [forbid|allow]
import { policyPlaceholders } from "../shared/privacy-policy";

export function placeholderGate(
  mode: string,
  found = policyPlaceholders(),
): {
  exitCode: number;
  lines: string[];
} {
  const lines = found.map(
    (item) => `privacy policy section "${item.id}" still says "${item.phrase}"`,
  );
  if (found.length === 0) return { exitCode: 0, lines: ["no placeholders"] };
  if (mode === "allow")
    return {
      exitCode: 0,
      lines: [
        ...lines,
        "allowed for a rehearsal image; not a deployment candidate",
      ],
    };
  if (mode !== "forbid")
    return {
      exitCode: 2,
      lines: [`unknown mode "${mode}"; use forbid or allow`],
    };
  return {
    exitCode: 1,
    lines: [
      ...lines,
      "the production candidate cannot be built until the owner names these in shared/privacy-policy.ts",
    ],
  };
}

if (process.argv[1]?.endsWith("policy-placeholders.ts")) {
  const gate = placeholderGate(process.argv[2] ?? "forbid");
  for (const line of gate.lines) console.error(line);
  process.exit(gate.exitCode);
}
