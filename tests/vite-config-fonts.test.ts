// KaTeX fonts must stay files: the CSP has no font-src, so a data: font would be blocked.
import { expect, it } from "vitest";
import config from "../vite.config";

it("never inlines a font as a data: URL, other small assets keep Vite's default", () => {
  const limit = config.build?.assetsInlineLimit;
  if (typeof limit !== "function") throw Error("assetsInlineLimit must decide per file");
  const small = Buffer.alloc(100);
  for (const font of ["KaTeX_Main-Regular.woff2", "x/KaTeX_Size1-Regular.WOFF", "a.ttf"])
    expect(limit(font, small)).toBe(false);
  expect(limit("icon.png", small)).toBeUndefined();
});
