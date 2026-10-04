import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ??
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
  },
  workers: 1,
  webServer: {
    command: "PORT=4173 npm start",
    url: "http://127.0.0.1:4173/api/status",
    reuseExistingServer: false,
  },
});
