import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
// ✅ FIX: Removed viteSingleFile — it inlines all JS/CSS into one HTML file which
// causes MIME-type errors and broken caching on Vercel. Standard Vite build output
// works correctly with Vercel's static hosting + the vercel.json SPA rewrite rule.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
