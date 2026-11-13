import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    // The German interface is off unless a build sets VITE_GERMAN_UI=1 (src/german-rules.ts).
    // The tests cover both languages, so they run with it on: env reaches the Vite servers the
    // tests start, the setup file reaches import.meta.env. tests/german-off.test.ts covers off.
    env: { VITE_GERMAN_UI: "1" },
    setupFiles: ["tests/fixtures/german-on.ts"],
    // Several integration files launch a browser plus a Vite server. Bound their
    // combined resource use instead of extending deadlines or retrying failures.
    // Two concurrent Vite/browser suites exhibited navigation/render failures
    // in the whole-suite run despite passing serially; retain their deadlines.
    maxWorkers: 1,
  },
});
