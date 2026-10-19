import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    // Several integration files launch a browser plus a Vite server. Bound their
    // combined resource use instead of extending deadlines or retrying failures.
    // Two concurrent Vite/browser suites exhibited navigation/render failures
    // in the whole-suite run despite passing serially; retain their deadlines.
    maxWorkers: 1,
  },
});
