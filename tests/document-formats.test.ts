import { expect, it } from "vitest";
import {
  checkTextSize,
  decodeTextDocument,
  isTextDocument,
} from "../src/document-formats";

it("uses filename allowlists without trusting MIME, and preserves literal source/data text", () => {
  for (const name of [
    "README.MD",
    "sample.py",
    "app.tsx",
    "data.csv",
    "data.jsonl",
    "query.sql",
  ])
    expect(isTextDocument(name)).toBe(true);
  for (const name of [
    "text.html",
    "file.docx",
    "book.xlsx",
    "code.ts.exe",
    "README",
  ])
    expect(isTextDocument(name)).toBe(false);
  const text = "# Notes\r\n<script>alert(1)</script>\n=SUM(A1:A3)\n€ 42\t0.25";
  expect(decodeTextDocument(new TextEncoder().encode(text))).toBe(text);
});
it("rejects malformed UTF-8, binary controls and oversized aggregate text without truncation", () => {
  expect(() => decodeTextDocument(new Uint8Array([0xc3, 0x28]))).toThrow(
    "UTF-8",
  );
  expect(() => decodeTextDocument(new Uint8Array([65, 0, 66]))).toThrow(
    "plain text",
  );
  expect(
    decodeTextDocument(new TextEncoder().encode("a".repeat(60000))),
  ).toHaveLength(60000);
  expect(() => checkTextSize("x", 60000)).toThrow("exceeds");
  expect(() =>
    decodeTextDocument(new TextEncoder().encode("a".repeat(60001))),
  ).toThrow("exceeds");
});
