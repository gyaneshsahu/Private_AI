// Chart blocks in answers (docs/charts-20261117.md): what is drawn and what stays code.
import { expect, it } from "vitest";
import { parseChart } from "../src/AnswerChart";

it("reads a line or bar chart with title, unit and source", () => {
  const line = parseChart('{"type":"line","title":"Savings","unit":"EUR","labels":["2024","2025","2026"],"values":[1,2,3],"source":"Statistik"}');
  expect(line).toEqual({ type: "line", title: "Savings", unit: "EUR", source: "Statistik", labels: ["2024", "2025", "2026"], values: [1, 2, 3] });
  expect(parseChart('{"labels":["a","b","c"],"values":[3,1,2]}')?.type).toBe("bar");
});

it("anything that is not a clean small chart stays code", () => {
  for (const text of [
    "not json",
    '{"labels":["a"],"values":[1]}', // one point is not a chart
    '{"labels":["a","b"],"values":[1]}', // lengths differ
    '{"labels":["a","b"],"values":[1,-2]}', // negative
    '{"labels":["a","b"],"values":[1,"2"]}', // a string number
    '{"type":"pie","labels":["a","b"],"values":[1,2]}', // unknown type
    `{"labels":${JSON.stringify(Array.from({ length: 25 }, (_, i) => String(i)))},"values":${JSON.stringify(Array.from({ length: 25 }, () => 1))}}`,
  ])
    expect(parseChart(text)).toBeUndefined();
});
