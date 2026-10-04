import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
  worker: { format: "es" },
  server: { allowedHosts: ["127.0.0.1", "localhost"] },
});
