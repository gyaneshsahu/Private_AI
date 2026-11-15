// The difference between two Privatemode deployment manifests, in plain language: the
// explanation of docs/manifest-rotation-20261114.md as code, for scripts/privatemode-rotation.ts.
// A warning is anything that loosens a requirement, adds something that could receive data, or
// that this tool cannot interpret. Nothing here approves anything.
import { stable } from "./model-watch";

export type ChangeKind = "workloads" | "snp" | "tdx" | "recovery-key" | "other";
export interface ManifestChange {
  kind: ChangeKind;
  warning: boolean;
  text: string;
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const short = (v: unknown) => {
  const s = typeof v === "string" ? v : stable(v);
  return s.length > 24 ? `${s.slice(0, 24)}…` : s;
};
const UNREAD = "changed in a way this tool does not interpret: read it yourself before approving";

/** Workloads by kind and name without the cluster namespace, each with its policies (namespace masked). */
function workloads(manifest: Json) {
  const byName = new Map<string, string[]>();
  const namespaces = new Set<string>();
  for (const policy of Object.values(obj(manifest.Policies))) {
    const id = String(obj(policy).WorkloadSecretID ?? "");
    // apps/v1/<Kind>/<namespace>/<name>
    const parts = id.split("/");
    const ns = parts.length >= 5 ? parts[3] : "";
    if (ns) namespaces.add(ns);
    const name = ns ? `${parts[4]} (${parts[2]})` : id || "(unnamed)";
    const masked = ns ? stable(policy).split(ns).join("<namespace>") : stable(policy);
    byName.set(name, [...(byName.get(name) ?? []), masked].sort());
  }
  return { byName, namespaces, hashes: new Set(Object.keys(obj(manifest.Policies))) };
}

function workloadChanges(before: Json, after: Json): ManifestChange[] {
  const a = workloads(before);
  const b = workloads(after);
  const out: ManifestChange[] = [];
  const add = (warning: boolean, text: string) => out.push({ kind: "workloads", warning, text });
  const added = [...b.byName.keys()].filter((n) => !a.byName.has(n));
  const removed = [...a.byName.keys()].filter((n) => !b.byName.has(n));
  if (added.length)
    add(true, `Workloads ADDED: ${added.join(", ")}. A new service could receive data. Ask Privatemode what it is before approving.`);
  if (removed.length)
    add(false, `Workloads removed: ${removed.join(", ")}. A feature that uses one of them will fail.`);
  for (const [name, policies] of b.byName) {
    const old = a.byName.get(name);
    if (old && stable(old) !== stable(policies)) add(true, `The policy details of ${name} ${UNREAD}.`);
  }
  const kept = [...b.byName.keys()].filter((n) => a.byName.has(n)).length;
  const ns = (s: Set<string>) => [...s].join(", ") || "none";
  const renamed = ns(a.namespaces) !== ns(b.namespaces);
  const rehashed = [...b.hashes].filter((h) => !a.hashes.has(h)).length;
  if (renamed || rehashed)
    add(
      false,
      `${kept} workload${kept === 1 ? "" : "s"} kept${renamed ? `, moved from namespace ${ns(a.namespaces)} to ${ns(b.namespaces)}` : ""}; ${rehashed} of ${b.hashes.size} policy hashes are new. A redeployment of the same services (a hash also changes when a container image is updated, so this does not say whether the model software changed).`,
    );
  return out;
}

/** Objects flattened to dotted paths; arrays stay whole. */
function flat(value: unknown, prefix = "", out = new Map<string, unknown>()) {
  const o = obj(value);
  for (const [key, v] of Object.entries(o)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, path, out);
    else out.set(path, v);
  }
  return out;
}

const minimum = (label: string, a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number"
    ? b > a
      ? { warning: false, text: `${label} raised ${a} → ${b} (stricter).` }
      : { warning: true, text: `${label} LOWERED ${a} → ${b} (looser: older, possibly vulnerable hardware or firmware is accepted again).` }
    : { warning: true, text: `${label} ${UNREAD} (${short(a)} → ${short(b)}).` };

function allowList(label: string, a: unknown, b: unknown) {
  const before = new Set(list(a).map(String));
  const after = new Set(list(b).map(String));
  const added = [...after].filter((x) => !before.has(x)).length;
  const removed = [...before].filter((x) => !after.has(x)).length;
  return added
    ? { warning: true, text: `${label}: ${added} added${removed ? `, ${removed} removed` : ""} (looser: more machines are accepted).` }
    : { warning: false, text: `${label}: ${removed} removed (stricter: fewer machines are accepted).` };
}

const SNP_TCB: Record<string, string> = {
  SNPVersion: "AMD minimum firmware (SNP) version",
  BootloaderVersion: "AMD minimum boot loader version",
  TEEVersion: "AMD minimum TEE version",
  MicrocodeVersion: "AMD minimum microcode version",
};
const RTMR = [
  "virtual firmware configuration",
  "boot loader and kernel",
  "kernel command line and initial file system",
  "runtime measurements",
];

/** One hardware entry (an AMD SEV-SNP or Intel TDX reference value) compared field by field. */
function entryChanges(kind: "snp" | "tdx" | "other", label: string, before: unknown, after: unknown) {
  const a = flat(before);
  const b = flat(after);
  const out: ManifestChange[] = [];
  const add = (c: { warning: boolean; text: string }) => out.push({ kind, ...c, text: `${label}: ${c.text}` });
  for (const path of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(path);
    const y = b.get(path);
    if (stable(x) === stable(y)) continue;
    const field = path.split(".").at(-1)!;
    if (kind === "snp" && path.startsWith("MinimumTCB.") && SNP_TCB[field]) add(minimum(SNP_TCB[field], x, y));
    else if (kind === "snp" && path === "MinimumMitigationVector") {
      if (typeof x === "number" && typeof y === "number") {
        // A bit set means that mitigation is required; dropping a bit drops a requirement.
        const dropped = Number(BigInt(x) & ~BigInt(y));
        add(
          dropped
            ? { warning: true, text: `required security mitigations LOOSER ${x} → ${y} (mitigations dropped: bit mask ${dropped}).` }
            : { warning: false, text: `required security mitigations ${x} → ${y} (more required, none dropped: stricter).` },
        );
      } else add({ warning: true, text: `required security mitigations ${UNREAD}.` });
    } else if (kind === "snp" && path === "TrustedMeasurement")
      add({ warning: false, text: "the trusted launch measurement changed: a new virtual machine image (firmware or kernel)." });
    else if (kind === "snp" && path === "AllowedChipIDs") add(allowList("allowed AMD chips", x, y));
    else if (kind === "snp" && path === "GuestPolicy.Debug" && y === true)
      add({ warning: true, text: "DEBUG mode is now allowed: the operator could inspect the machine's memory. Do not approve." });
    else if (kind === "tdx" && path === "Rtmrs") {
      const changed = list(y)
        .map((v, i) => (stable(v) !== stable(list(x)[i]) ? i : -1))
        .filter((i) => i >= 0);
      if (list(x).length !== list(y).length) add({ warning: true, text: `the number of measurement registers ${UNREAD}.` });
      for (const i of changed)
        add({
          warning: false,
          text: `measurement register RTMR ${i} changed (${RTMR[i] ?? "unknown register"}): a new ${i === 0 ? "firmware configuration" : "operating-system image"}.`,
        });
    } else if (kind === "tdx" && path === "MrTd")
      add({ warning: false, text: "the base firmware measurement (MRTD) changed: new virtual firmware." });
    else if (kind === "tdx" && path === "MrSeam")
      add({ warning: false, text: "the Intel TDX module measurement (MRSEAM) changed: a new TDX module." });
    else if (kind === "tdx" && path === "MinTCBEvaluationDataNumber")
      add(minimum("Intel minimum TCB evaluation number", x, y));
    else if (kind === "tdx" && path === "AllowedPIIDs") add(allowList("allowed Intel platforms", x, y));
    else if (kind === "tdx" && ["MemoryIntegrity", "SMTDisabled"].includes(path) && typeof y === "boolean")
      add(
        y
          ? { warning: false, text: `${path} now required (stricter).` }
          : { warning: true, text: `${path} no longer required (looser).` },
      );
    else add({ warning: true, text: `${path} ${UNREAD} (${short(x)} → ${short(y)}).` });
  }
  return out;
}

function hardwareChanges(before: Json, after: Json): ManifestChange[] {
  const a = obj(before.ReferenceValues);
  const b = obj(after.ReferenceValues);
  const out: ManifestChange[] = [];
  for (const type of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const kind = type === "snp" || type === "tdx" ? type : "other";
    const name = type === "snp" ? "AMD (SEV-SNP)" : type === "tdx" ? "Intel (TDX)" : `Hardware type ${type}`;
    const x = list(a[type]);
    const y = list(b[type]);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const label = Math.max(x.length, y.length) > 1 ? `${name} entry ${i + 1}` : name;
      if (i >= x.length)
        out.push({ kind, warning: true, text: `${label}: a NEW accepted hardware configuration (looser: more machines are accepted). Read it yourself.` });
      else if (i >= y.length)
        out.push({ kind, warning: false, text: `${label}: no longer accepted (stricter).` });
      else out.push(...entryChanges(kind, label, x[i], y[i]));
    }
  }
  return out;
}

function recoveryChanges(before: Json, after: Json): ManifestChange[] {
  const a = list(before.SeedshareOwnerPubKeys).map(String);
  const b = list(after.SeedshareOwnerPubKeys).map(String);
  const added = b.filter((k) => !a.includes(k));
  const removed = a.filter((k) => !b.includes(k));
  if (!added.length && !removed.length) return [];
  const starts = added.map((k) => k.slice(0, 24) + "…").join(", ");
  if (added.length > removed.length)
    return [
      {
        kind: "recovery-key",
        warning: true,
        text: `MORE key-recovery owner keys (${a.length} → ${b.length}, new: ${starts}): one more party could recover the cluster's root secret. Ask Edgeless whose key it is before approving.`,
      },
    ];
  return [
    {
      kind: "recovery-key",
      warning: false,
      text: added.length
        ? `The key-recovery owner key changed (new key starts ${starts}). Whoever holds it can recover the cluster's root secret; it should belong to Edgeless Systems. Ask Edgeless to confirm.`
        : `${removed.length} key-recovery owner key${removed.length === 1 ? "" : "s"} removed (fewer parties can recover the root secret).`,
    },
  ];
}

/** Every changed field of the manifest, warnings first. Empty when the two are the same. */
export function manifestChanges(beforeBytes: Uint8Array, afterBytes: Uint8Array): ManifestChange[] {
  const parse = (bytes: Uint8Array) => obj(JSON.parse(new TextDecoder().decode(bytes)));
  const before = parse(beforeBytes);
  const after = parse(afterBytes);
  const known = new Set(["Policies", "ReferenceValues", "SeedshareOwnerPubKeys"]);
  const other: ManifestChange[] = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !known.has(key) && stable(before[key]) !== stable(after[key]))
    .map((key) => ({ kind: "other", warning: true, text: `Top-level field ${key} ${UNREAD}.` }));
  const all = [
    ...workloadChanges(before, after),
    ...hardwareChanges(before, after),
    ...recoveryChanges(before, after),
    ...other,
  ];
  return [...all.filter((c) => c.warning), ...all.filter((c) => !c.warning)];
}

/** The report draft for the owner: the new digest first, every earlier one kept. Never loadable as is. */
export function rotationDraft(report: Json, digest: string, today: string): Json {
  const earlier = list(report.releaseDigests).map(String).filter((d) => d !== digest);
  return {
    ...report,
    releaseDigests: [digest, ...earlier],
    releaseDigestsNote: `${today}: new live manifest ${digest} added first by scripts/privatemode-rotation.ts, PENDING the owner's approval; earlier digests kept (${earlier.join(", ") || "none"}). Remove an earlier one when signing unless a return to that deployment should be accepted.`,
    // Placeholders that fail validation: the report cannot load until the owner signs by dating it.
    reviewedAt: "REPLACE_WHEN_YOU_APPROVE_THIS_ROTATION",
    validUntil: "REPLACE_AT_MOST_SEVEN_DAYS_AFTER_REVIEWEDAT",
  };
}
