import { expect, it } from "vitest";
import Decimal from "decimal.js";
import fixtures from "../evaluation/cases/research-revision-transfer.json";
import {
  developmentCase,
  experimentRequestLimit,
  type Experiment,
} from "../evaluation/experiment";
import {
  assertRevisionPolicy,
  revisionBatchReserve,
  revisionCases,
} from "../evaluation/revision-batch";
import { composeContext, newMessage } from "../src/conversation";
import { emptyConversation } from "../shared/contracts";

it("delivers every correction, previous answer and the same review instruction without losing source provenance", () => {
  expect(revisionCases).toHaveLength(12);
  for (const c of revisionCases) {
    const selected = developmentCase(c.id, "robustness_case");
    expect(selected.turns).toEqual(c.turns);
    expect(
      experimentRequestLimit({
        scenario: "robustness_case",
        developmentCaseId: c.id,
      }),
    ).toBe(3);
    const conversation = emptyConversation();
    conversation.attachments.push({
      id: "fixture",
      name: "Synthetic",
      selected: true,
      sources: selected.sources.map((source) => ({
        title: "Synthetic evidence",
        ...source,
      })),
    });
    for (const turn of c.turns.slice(0, 2)) {
      conversation.messages.push(
        newMessage("user", turn),
        newMessage("assistant", "SYNTHETIC EARLIER DRAFT"),
      );
    }
    conversation.messages.push(newMessage("user", c.turns[2]));
    const messages = composeContext(
      conversation,
      fixtures.maxInputCharacters,
      new Date("2026-10-15"),
      "constraints-v4",
    );
    expect(messages[1].content).toContain(c.source);
    expect(messages.at(-3)?.content).toBe(c.turns[1]);
    expect(messages.at(-2)?.content).toBe("SYNTHETIC EARLIER DRAFT");
    expect(messages.at(-1)?.content).toBe(fixtures.reviewPrompt);
  }
  expect(revisionCases.reduce((n, c) => n + c.turns.length, 0)).toBe(36);
});

it("retains independent arithmetic and endpoint ground truth", () => {
  expect(new Decimal(45).div(60).times(100).toNumber()).toBe(75);
  expect(new Decimal(54).div(90).times(100).toNumber()).toBe(60);
  expect(new Decimal(63).div(90).times(100).toNumber()).toBe(70);
  const net = new Decimal(48).times(3).times("0.875");
  expect(net.plus(9).times("1.2").toFixed(2)).toBe("162.00");
  expect(net.plus(14).times("1.2").toFixed(2)).toBe("168.00");
  expect(6 >= 2 && 6 <= 6).toBe(true);
  expect(
    Date.parse("2026-11-06T10:20:00Z") < Date.parse("2026-11-06T10:20:00Z"),
  ).toBe(false);
  expect(revisionBatchReserve(0.65, 1.45)).toBe(1.7114112);
});

it("rejects unplanned configuration changes rather than silently consuming a permit", () => {
  const permit = {
    scenario: "robustness_case",
    developmentCaseId: "revision-01",
    policy: {
      model: fixtures.model,
      deepSeekThinking: false,
      answerPolicyVariant: fixtures.policy,
      maxInputCharacters: 16000,
      maxOutputTokens: 4096,
    },
  } as Experiment;
  expect(() => assertRevisionPolicy(permit)).not.toThrow();
  for (const delta of [
    { deepSeekThinking: true },
    { maxOutputTokens: 2048 },
    { researchEvidenceContract: true },
    { model: "gpt-oss-120b" },
    { answerPolicyVariant: "constraints-v2" },
  ]) {
    expect(() =>
      assertRevisionPolicy({
        ...permit,
        policy: { ...permit.policy, ...delta },
      } as Experiment),
    ).toThrow("configuration mismatch");
  }
});
