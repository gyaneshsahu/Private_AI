import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    // Several integration files launch a browser plus a Vite server. Bound their
    // combined resource use instead of extending deadlines or retrying failures.
    maxWorkers: 2,
  },
});
