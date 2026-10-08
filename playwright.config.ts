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
    command: "npm start",
    env: {
      PORT: "4173",
      PRIVATEAI_ORIGIN: "http://127.0.0.1:4173",
      PRIVATEAI_INVITES_FILE: "",
      PRIVATEAI_ACCESS_KEY: "",
      PRIVATEAI_QUALIFICATION_FILE: "",
      TINFOIL_API_KEY: "",
      BRAVE_SEARCH_API_KEY: "",
    },
    url: "http://127.0.0.1:4173/api/status",
    reuseExistingServer: false,
  },
});
