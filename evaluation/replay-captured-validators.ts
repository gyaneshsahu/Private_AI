import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { emptyConversation } from "../shared/contracts";
import tools from "./cases/research-tools.json";
import assisted from "./cases/research-assisted.json";
const hash = (b: any) => createHash("sha256").update(b).digest("hex");
const files = [
  "research-assisted-expanded-20261015",
  "research-structured-20261015",
  "research-tools-multi-20261016",
  "research-tools-lexical-20261016",
  "research-tools-flat-20261016",
  "research-tools-session-20261016",
];
const objects = new Map<string, Buffer>();
for (const line of execFileSync(
  "git",
  ["rev-list", "--objects", "--all", "--", "src", "shared"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")) {
  const [id, ...p] = line.split(" ");
  if (!/\.(ts|tsx)$/.test(p.join(" "))) continue;
  const b = execFileSync("git", ["cat-file", "blob", id]);
  objects.set(hash(b), b);
}
async function scan(p: string) {
  for (const e of await fs.readdir(p, { withFileTypes: true })) {
    if (e.isDirectory() && ["node_modules", ".git"].includes(e.name)) continue;
    const f = p + "/" + e.name;
    if (e.isDirectory()) await scan(f);
    else if (/\.(ts|tsx)$/.test(f)) {
      const b = await fs.readFile(f);
      objects.set(hash(b), b);
    }
  }
}
await scan(".local/experiment-runs");
const reconstructed = JSON.parse(
  await fs.readFile("evaluation/fixtures/validator-history.json", "utf8"),
);
for (const value of Object.values(reconstructed) as {
  sha256: string;
  source: string;
}[]) {
  const b = Buffer.from(value.source);
  if (hash(b) !== value.sha256)
    throw Error("Historical reconstruction hash mismatch");
  objects.set(value.sha256, b);
}
await scan("src");
await scan("shared");
const rows: any[] = [];
for (const file of files) {
  const j = JSON.parse(
    await fs.readFile("evaluation/results/" + file + ".json", "utf8"),
  );
  for (const run of j.runs || [
    {
      root: ".local/structured-live-20261015",
      plan: j.plan,
      report: j.run ?? j,
    },
  ]) {
    if (!run.plan) continue;
    const base = resolve(".local/validator-replay", run.root.split("/").at(-1));
    let missing: string[] = [];
    for (const [p, h] of Object.entries(run.plan.implementationHashes || {})) {
      if (!p.startsWith("src/")) continue;
      const b = objects.get(String(h));
      if (b) {
        await fs.mkdir(dirname(base + "/" + p), { recursive: true });
        await fs.writeFile(base + "/" + p, b);
      } else missing.push(p);
    }
    // Complete transitive imports from the matching module revision where possible.
    const entry =
      file.includes("assisted") || file.includes("structured")
        ? "src/assisted-research.ts"
        : "src/calculator-turn.ts";
    const dependencyHashes: Record<
      string,
      { sha256: string; frozen: boolean }
    > = {};
    async function deps(p: string, seen = new Set<string>()) {
      if (seen.has(p)) return;
      seen.add(p);
      let b;
      try {
        b = await fs.readFile(base + "/" + p);
      } catch {
        const local = await fs.readFile(p);
        if (
          run.plan.implementationHashes[p] &&
          hash(local) !== run.plan.implementationHashes[p]
        ) {
          missing.push(p);
          return;
        }
        b = local;
        await fs.mkdir(dirname(base + "/" + p), { recursive: true });
        await fs.writeFile(base + "/" + p, b);
      }
      dependencyHashes[p] = {
        sha256: hash(b),
        frozen: run.plan.implementationHashes[p] === hash(b),
      };
      for (const m of b.toString().matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const abs = resolve(dirname(base + "/" + p), m[1]);
        let rel = abs.slice(base.length + 1).replaceAll("\\", "/");
        if (!/\.tsx?$/.test(rel)) rel += ".ts";
        await deps(rel, seen);
      }
    }
    if (!missing.includes(entry)) await deps(entry);
    for (const c of run.report?.results || []) {
      const fixture = [...tools, ...assisted].find((f) => f.id === c.id);
      if (!fixture) continue;
      for (const [i, r] of c.replies.entries()) {
        if (!r.diagnosticDraft) continue;
        const conv = emptyConversation();
        conv.messages = fixture.turns.slice(0, i + 1).map(
          (text, k) =>
            ({
              id: "user" + k,
              role: "user",
              text,
              included: true,
              status: "complete",
              createdAt: 0,
            }) as any,
        );
        const result: any = {
          file,
          run: run.root,
          case: c.id,
          turn: i + 1,
          rawSHA256: hash(r.diagnosticDraft),
          originalFailure: r.calculatorFailure || r.checkedFailure,
          originalCompleted: r.completed,
          historicalDependencyHashes: dependencyHashes,
          oldMissing: missing,
          liveOutcomeUnchanged: true,
        };
        for (const variant of ["old", "current"]) {
          if (variant === "old" && missing.length) {
            result.old = { status: "UNAVAILABLE_EXACT_SNAPSHOT" };
            continue;
          }
          try {
            const mod = await import(
              pathToFileURL(resolve(variant === "old" ? base : ".", entry)).href
            );
            let answer;
            if (entry.includes("assisted"))
              answer = mod.renderAssistedResearch(
                r.diagnosticDraft,
                fixture.sources,
                conv,
              );
            else {
              async function* events() {
                yield {
                  choices: [
                    {
                      index: 0,
                      delta: {
                        tool_calls: [
                          {
                            index: 0,
                            id: "offline",
                            type: "function",
                            function: {
                              name: "calculate",
                              arguments: r.diagnosticDraft,
                            },
                          },
                        ],
                      },
                      finish_reason: "tool_calls",
                    },
                  ],
                };
                yield {
                  choices: [],
                  usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                  },
                };
              }
              const v = await mod.consumeCalculatorTurn(
                events(),
                { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" },
                new AbortController().signal,
                fixture.sources,
                conv,
              );
              answer = mod.renderCalculatorTurn(v);
            }
            result[variant] = { status: "ACCEPTED", answer };
          } catch (e: any) {
            result[variant] = {
              status: "REJECTED",
              kind: e.calculatorFailure || e.checkedFailure || e.name,
              issues:
                e.schemaIssues ||
                e.issues?.map((x: any) => ({ code: x.code, path: x.path })),
            };
          }
        }
        if (c.id === "assisted-tool-08") {
          const raw = JSON.parse(r.diagnosticDraft);
          const { passages, limitation, ...program } = raw.program;
          const mod = await import("../src/calculator-turn");
          async function* converted() {
            yield {
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: "offline",
                        type: "function",
                        function: {
                          name: "calculate",
                          arguments: JSON.stringify({
                            unit: raw.unit,
                            ...program,
                          }),
                        },
                      },
                    ],
                  },
                  finish_reason: "tool_calls",
                },
              ],
            } as any;
            yield {
              choices: [],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              },
            } as any;
          }
          try {
            const v = await mod.consumeCalculatorTurn(
              converted(),
              { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" },
              new AbortController().signal,
              fixture.sources as any,
              conv,
            );
            result.currentWireMigration = {
              status: "ACCEPTED",
              answer: mod.renderCalculatorTurn(v),
              note: "Only removes obsolete program wrapper and empty renderer bookkeeping; operands and operations unchanged. Not a live success.",
            };
          } catch (e: any) {
            result.currentWireMigration = {
              status: "REJECTED",
              kind: e.calculatorFailure || e.name,
            };
          }
        }
        rows.push(result);
      }
    }
  }
}
await fs.writeFile(
  "evaluation/results/validator-replay-20261016.json",
  JSON.stringify(
    {
      status: "OFFLINE_ONLY_NOT_LIVE_REPAIR",
      paidRequests: 0,
      notes: [
        "Original bytes replayed without normalization. Historical entry files matched frozen SHA256 where available; missing exact files explicitly block old replay. Current validator is not required to accept superseded wire formats.",
        "Terminal tool events synthesized because full original SSE was not retained; this tests validation, not transport.",
        "Previously calculated assistant values not promoted to source evidence.",
      ],
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      case: r.case,
      old: r.old.status,
      current: r.current.status,
      missing: r.oldMissing,
    })),
  ),
);
