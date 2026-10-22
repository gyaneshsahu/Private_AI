import { expect, it } from "vitest";
import { parseUsageMetrics } from "../server/usage-metrics";

it("parses the provider's usage metrics header and refuses anything malformed", () => {
  expect(
    parseUsageMetrics(
      "prompt=1000,completion=500,total=1500,model=gpt-oss-120b,web_search_calls=2,cost_usd=0.052",
    ),
  ).toEqual({
    promptTokens: 1000,
    completionTokens: 500,
    model: "gpt-oss-120b",
    webSearchCalls: 2,
    costUsd: "0.052",
  });
  // Cost is omitted by the provider when any component is unknown; metering still records tokens.
  expect(parseUsageMetrics("prompt=7,completion=0,model=m")).toEqual({
    promptTokens: 7,
    completionTokens: 0,
    model: "m",
  });
  expect(parseUsageMetrics(" prompt=1 , completion=2 ,model=x ")).toEqual({
    promptTokens: 1,
    completionTokens: 2,
    model: "x",
  });
  for (const bad of [
    undefined,
    "",
    "prompt=1,completion=2",
    "prompt=-1,completion=2,model=x",
    "prompt=1.5,completion=2,model=x",
    "prompt=1,completion=2,model=x,cost_usd=abc",
    "prompt=1,completion=2,model=x,cost_usd=-1",
    "prompt=1,completion=2,model=bad model",
    "prompt=1,prompt=2,completion=2,model=x",
    "prompt=1,completion=2,model=x,web_search_calls=many",
    "a".repeat(2000),
    ["prompt=1,completion=2,model=x"],
  ])
    expect(parseUsageMetrics(bad as never), String(bad)).toBeUndefined();
});
