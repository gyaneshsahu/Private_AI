import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function browserLaunchOptions() {
  return {
    headless: true,
    timeout: 15000,
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  };
}

export async function browserReady() {
  let browser;
  try {
    browser = await chromium.launch(browserLaunchOptions());
    return true;
  } catch {
    return false;
  } finally {
    await browser?.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const ready = await browserReady();
  console.log(
    JSON.stringify({
      browser: ready,
      networkRequests: 0,
      ...(ready
        ? {}
        : {
            action: process.env.CHROMIUM_PATH
              ? "CHROMIUM_PATH is set but cannot launch. Correct that explicit override."
              : "Run npx playwright install chromium-headless-shell under this Windows user, then check again.",
          }),
    }),
  );
  process.exitCode = ready ? 0 : 1;
}
