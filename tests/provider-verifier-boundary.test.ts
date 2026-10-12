import { describe, expect, it } from "vitest";
import {
  compareMeasurements,
  PredicateType,
  verifyAttestation,
} from "@tinfoilsh/verifier";

describe("pinned browser verifier capability boundary (offline, not qualification)", () => {
  it.each([PredicateType.SevGuestV1, PredicateType.SnpTdxMultiplatformV1])(
    "rejects unsupported attestation format %s before parsing evidence",
    async (format) => {
      await expect(
        verifyAttestation({ format, body: "synthetic-invalid-evidence" }, ""),
      ).rejects.toThrow("Only SEV-SNP Guest V2 format is supported");
    },
  );

  it("matches only the SNP register of a multiplatform reference, not a TDX quote", () => {
    const reference = {
      type: PredicateType.SnpTdxMultiplatformV1,
      registers: ["synthetic-snp", "synthetic-tdx-1", "synthetic-tdx-2"],
    };
    const report = { type: PredicateType.SevGuestV2, registers: ["synthetic-snp"] };
    expect(() => compareMeasurements(reference, report)).not.toThrow();
    expect(() => compareMeasurements({ ...reference, registers: ["different-snp"] }, report))
      .toThrow("SNP measurement");
    expect(() => compareMeasurements({ ...reference, registers: [] }, report))
      .toThrow("Missing measurement registers");
  });
});
