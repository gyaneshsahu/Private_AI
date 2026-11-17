import { readdir } from "node:fs/promises";
import type { ViteDevServer } from "vite";

/**
 * Transforms the application's module graph before the browser navigates, so
 * a cold dev server does not spend the page's navigation timeout compiling
 * hundreds of modules. The UI tests measured a cold first load above five
 * seconds on 23 October 2026 on an otherwise idle machine; warming the entry
 * and waiting for the request queue to drain removes that timing dependence
 * without changing what the tests assert.
 * 16 November: screens loaded on demand are not reachable from the entry, so every
 * component file is warmed too; otherwise their first use can make Vite discover a
 * dependency late and reload the page in the middle of a test.
 */
export async function warmDevServer(vite: ViteDevServer): Promise<void> {
  // Tests never reload on file changes; a watcher scanning the whole checkout (old agent worktrees,
  // .local evidence: several GB on 17 November) made each file load wait up to 11 s.
  await vite.watcher.close();
  await vite.warmupRequest("/src/main.tsx");
  for (const file of await readdir("src")) if (file.endsWith(".tsx")) await vite.warmupRequest(`/src/${file}`);
  await vite.waitForRequestsIdle();
}
