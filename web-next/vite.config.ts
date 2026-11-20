import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "react-i18next",
      "i18next",
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 6502,
    strictPort: true,
    proxy: Object.fromEntries(
      ["/api", "/outputs", "/assets", "/i18n"].map((path) => [
        path,
        {
          target: "http://127.0.0.1:6500",
          changeOrigin: true,
        },
      ]),
    ),
  },
  build: { outDir: "dist", emptyOutDir: true },
});
