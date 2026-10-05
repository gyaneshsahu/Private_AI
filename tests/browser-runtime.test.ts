import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ launch: vi.fn(), exists: vi.fn() }));
vi.mock("@playwright/test", () => ({ chromium: { launch: mock.launch } }));
vi.mock("node:fs", () => ({ existsSync: mock.exists }));
import {
  browserLaunchOptions,
  browserReady,
} from "../scripts/browser-runtime.mjs";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("checks the default headless launch even when full Chrome is absent", async () => {
  vi.stubEnv("CHROMIUM_PATH", "");
  mock.exists.mockReturnValue(false);
  const close = vi.fn();
  mock.launch.mockResolvedValue({ close });
  expect(await browserReady()).toBe(true);
  expect(mock.launch).toHaveBeenCalledWith({
    headless: true,
    timeout: 15000,
    executablePath: undefined,
  });
  expect(close).toHaveBeenCalledOnce();
});
it("fails an explicit invalid override without silently changing browsers", async () => {
  vi.stubEnv("CHROMIUM_PATH", "missing-browser");
  mock.launch.mockRejectedValue(new Error("untrusted launcher output"));
  expect(await browserReady()).toBe(false);
  expect(browserLaunchOptions().executablePath).toBe("missing-browser");
  expect(mock.launch).toHaveBeenCalledOnce();
});
