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
