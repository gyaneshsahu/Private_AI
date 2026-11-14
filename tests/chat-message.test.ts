// The message component's pure parts (docs/chat-feature-gaps-20261114.md, packages C and D):
// when a long own message is collapsed, that own text is shown exactly as typed, and what a
// request costs according to the report.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { emptyConversation, type Qualification } from "../shared/contracts";
import { requestCost } from "../src/answer-modes";
import { UserText } from "../src/ChatMessage";
import { newMessage } from "../src/conversation";
import { COLLAPSED_LINES, shouldCollapse } from "../src/message-collapse";
import { savedConversationSchema } from "../src/saved-conversation";
import { messageText } from "../src/text/message";

it("collapses only when the text is at least 1.5 times the collapsed height", () => {
  const line = 24;
  const collapsed = COLLAPSED_LINES * line;
  expect(COLLAPSED_LINES).toBe(12);
  expect(shouldCollapse(13 * line, line)).toBe(false); // 13 lines: the button would hide one
  expect(shouldCollapse(collapsed * 1.5 - 1, line)).toBe(false);
  expect(shouldCollapse(collapsed * 1.5, line)).toBe(true); // 18 lines
  expect(shouldCollapse(40 * line, line)).toBe(true);
  // The same text at another line height (a phone) is judged in lines, not pixels or characters.
  expect(shouldCollapse(40 * 30, 30)).toBe(true);
  expect(shouldCollapse(17 * 30, 30)).toBe(false);
  // Once collapsible, a few pixels of width change do not flip it; clearly shorter text does.
  expect(shouldCollapse(collapsed * 1.5 - 1, line, true)).toBe(true);
  expect(shouldCollapse(collapsed * 1.25 - 1, line, true)).toBe(false);
  // No usable measurement: leave the text open.
  expect(shouldCollapse(5000, 0)).toBe(false);
  expect(shouldCollapse(5000, Number.NaN)).toBe(false);
});

it("shows the user's own text exactly as typed, with no Markdown, link or citation", () => {
  const typed =
    "# Not a heading\n* not a list\n1. not a number list\n[word] and [doc-1] stay\n" +
    "https://example.com/page and <b>tags</b> & **stars** `ticks`\n    indented();";
  const html = renderToStaticMarkup(
    createElement(UserText, { message: newMessage("user", typed) }),
  );
  expect(html).not.toMatch(/<(h\d|ul|ol|li|a|strong|em|code|pre|b)[\s>]/);
  // No control inside the text, and none after it before the text was measured.
  expect(html).not.toContain("<button");
  expect(html).toContain("# Not a heading\n* not a list\n1. not a number list\n[word] and [doc-1] stay\n");
  expect(html).toContain("https://example.com/page and &lt;b&gt;tags&lt;/b&gt; &amp; **stars** `ticks`\n    indented();");
  // Nothing hides the text from assistive technology.
  expect(html).not.toMatch(/aria-hidden|hidden=|inert/);
});

it("reads the cost of a request from the report, and Auto decides the mode on the device first", () => {
  const tier = { model: "SYNTHETIC", maxOutputTokens: 100 };
  const report = {
    modes: { fast: { ...tier, allowanceCost: 2 }, thinking: { ...tier, allowanceCost: 7 } },
  } as unknown as Qualification;
  const asked = (text: string) => ({ ...emptyConversation(), messages: [newMessage("user", text)] });
  expect(requestCost(report, "fast", asked("Why?"))).toBe(2);
  expect(requestCost(report, "thinking", asked("Hello"))).toBe(7);
  expect(requestCost(report, "auto", asked("What is the capital of France?"))).toBe(2);
  expect(requestCost(report, "auto", asked("Explain step by step why the sum is 4."))).toBe(7);
  // An edited text not yet in the conversation decides, not the old question.
  expect(
    requestCost(report, "auto", asked("What is the capital of France?"), false, "Explain step by step why."),
  ).toBe(7);
  // A report without modes: one unit.
  expect(requestCost({ model: "SYNTHETIC", maxOutputTokens: 100 } as unknown as Qualification, "auto", asked("Why?"))).toBe(1);
});

it("keeps the answer's recorded mode in a saved conversation", () => {
  const conversation = {
    ...emptyConversation(),
    messages: [newMessage("user", "Q"), { ...newMessage("assistant", "A"), mode: "fast" as const }],
  };
  expect(savedConversationSchema.parse(JSON.parse(JSON.stringify(conversation))).messages[1].mode).toBe("fast");
});

it("has the cost wording in both languages, singular and plural", () => {
  expect(messageText.en.uses(1)).toBe("uses 1 request");
  expect(messageText.en.uses(5)).toBe("uses 5 requests");
  expect(messageText.de.uses(1)).toBe("verbraucht 1 Anfrage");
  expect(messageText.de.uses(5)).toBe("verbraucht 5 Anfragen");
});
