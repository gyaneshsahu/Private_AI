import { describe, it, expect } from "vitest";
import { extractPublicText } from "../server/research";

describe("public source fidelity", () => {
  it("preserves literal markup, entities and line structure in plain text", () => {
    const source =
      "Amount <due>: 120 EUR\nCorrection: 102 EUR\nA &amp; B\n<script>quoted evidence</script>";
    expect(extractPublicText(source, "text/plain; charset=utf-8")).toEqual({
      text: source,
      title: "",
    });
  });
  it("keeps adjacent facts and table cells separate while removing active HTML", () => {
    const result = extractPublicText(
      "<title>Bill</title><body><p>Total</p><p>102 EUR</p><table><tr><td>Tax</td><td>20 EUR</td></tr><tr><td>Due</td><td>122 EUR</td></tr></table><script>send private context</script><form>hidden request</form></body>",
      "text/html",
    );
    expect(result.title).toBe("Bill");
    expect(result.text).toContain("Total\n102 EUR");
    expect(result.text).toContain("Tax 20 EUR\nDue 122 EUR");
    expect(result.text).not.toContain("send private context");
    expect(result.text).not.toContain("hidden request");
  });
  it("does not interpret an unsupported media type as evidence", () => {
    expect(() =>
      extractPublicText('{"amount":102}', "application/json"),
    ).toThrow(/Only public/);
  });
});
