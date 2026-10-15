import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Answer } from "../src/Answer";
import { auditResearchAnswer } from "../src/research-audit";

const sources = [
  {
    id: "notice-01",
    title: "Proposal",
    url: "https://example.com/proposal",
    text: "The ferry may resume in November.",
  },
  {
    id: "notice-02",
    title: "Inspection",
    url: "https://example.com/inspection",
    text: "Inspection remains unfinished.",
  },
];

it("flags a genuine quotation attributed to the wrong retrieved source", () => {
  const text = "“The ferry may resume in November.” [notice-02]";
  expect(auditResearchAnswer(text, sources)).toMatchObject({
    quotesNotFoundVerbatim: 0,
    quotesWithAdjacentCitations: 1,
    quotesNotFoundInCitedSources: 1,
    semanticSupport: "NOT_ASSESSED",
  });
  const html = renderToStaticMarkup(
    createElement(Answer, { text, sources, open: () => {} }),
  );
  expect(html).toContain("not found in their adjacent cited sources");
  expect(html).toContain("Inspection");
});

it.each([
  "“The ferry may resume in November.” [notice-01]",
  "“The ferry may resume in November.”. 【notice-02】 [notice-01]",
  "**“The ferry may resume in November.”** [notice-01]",
])("accepts literal support within the adjacent citation group: %s", (text) => {
  expect(auditResearchAnswer(text, sources)).toMatchObject({
    quotesWithAdjacentCitations: 1,
    quotesNotFoundInCitedSources: 0,
    semanticSupport: "NOT_ASSESSED",
  });
});

it.each([
  "Draft: “Please review the ferry proposal.” Next, inspection [notice-02].",
  "“The ferry may resume in November.”\n\nOther evidence [notice-02].",
  "[notice-01] says “The ferry may resume in November.”",
])("leaves nonadjacent attribution unassessed: %s", (text) => {
  expect(auditResearchAnswer(text, sources)).toMatchObject({
    quotesWithAdjacentCitations: 0,
    quotesNotFoundInCitedSources: 0,
  });
});

it("does not borrow support from another quote or an unknown source", () => {
  const result = auditResearchAnswer(
    "“The ferry may resume in November.” [missing-01]. “Inspection remains unfinished.” [notice-02]",
    sources,
  );
  expect(result).toMatchObject({
    quotesWithAdjacentCitations: 2,
    quotesNotFoundInCitedSources: 1,
    unknownSourceReferences: 1,
  });
});

it("keeps a false conclusion with a genuine quotation semantically unassessed", () => {
  const result = auditResearchAnswer(
    "The ferry definitely resumed. “The ferry may resume in November.” [notice-01]",
    sources,
  );
  expect(result).toMatchObject({
    quotesNotFoundInCitedSources: 0,
    semanticSupport: "NOT_ASSESSED",
  });
});
