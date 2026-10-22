import type { ViteDevServer } from "vite";

/**
 * Transforms the application's module graph before the browser navigates, so
 * a cold dev server does not spend the page's navigation timeout compiling
 * hundreds of modules. The UI tests measured a cold first load above five
 * seconds on 23 October 2026 on an otherwise idle machine; warming the entry
 * and waiting for the request queue to drain removes that timing dependence
 * without changing what the tests assert.
 */
export async function warmDevServer(vite: ViteDevServer): Promise<void> {
  await vite.warmupRequest("/src/main.tsx");
  await vite.waitForRequestsIdle();
}
