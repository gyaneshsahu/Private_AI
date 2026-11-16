import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    // Fonts stay files: the CSP has no font-src, so a data: font (KaTeX's small woff2) is blocked.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf|eot)$/i.test(file) ? false : undefined),
  },
  worker: { format: "es" },
  server: { allowedHosts: ["127.0.0.1", "localhost"] },
});
