import { it, expect } from "vitest";
import { networkRoute } from "../evaluation/network-observation";
it("identifies relay versus module failures without recording URL secrets", () => {
  const origin = "http://127.0.0.1:4321";
  expect(
    networkRoute(
      `${origin}/api/inference/v1/chat/completions?secret=PRIVATE`,
      origin,
    ),
  ).toBe("INFERENCE_RELAY");
  expect(networkRoute(`${origin}/src/private-name.ts`, origin)).toBe(
    "LOCAL_MODULE",
  );
  expect(networkRoute("https://atc.tinfoil.sh/attestation", origin)).toBe(
    "ATTESTATION",
  );
  expect(
    networkRoute(
      "https://atc.tinfoil.sh.attacker.example/attestation?PRIVATE",
      origin,
    ),
  ).toBe("OTHER_EXTERNAL");
});

it("allows dependency modules but keeps local evidence and external destinations blocked", async () => {
  const { approvedLocalGet } =
    await import("../evaluation/network-observation");
  const origin = "http://127.0.0.1:4321";
  expect(
    approvedLocalGet(
      `${origin}/node_modules/.vite-experiment/deps/zod.js?v=abc`,
      "GET",
      origin,
    ),
  ).toBe(true);
  for (const path of [
    "/.local/compatibility.json",
    "/.local/vite-experiment/deps/zod.js",
    "/.env",
  ]) {
    expect(approvedLocalGet(origin + path, "GET", origin)).toBe(false);
  }
  expect(
    approvedLocalGet("https://example.com/node_modules/a.js", "GET", origin),
  ).toBe(false);
  expect(approvedLocalGet(`${origin}/node_modules/a.js`, "POST", origin)).toBe(
    false,
  );
});
