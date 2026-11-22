import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { webNextCreditRoute, webNextProxyKey } from "../server/config/webNextProxy.js";

function configureWorkspaceProxy(proxy: Parameters<NonNullable<ProxyOptions["configure"]>>[0]) {
  const key = webNextProxyKey(fileURLToPath(new URL("..", import.meta.url)));
  proxy.on("proxyReq", (upstream, request) => {
    upstream.removeHeader("x-mpf-web-next-proxy");
    if (!webNextCreditRoute(request.method, (request.url || "").split("?")[0])) return;
    const origin = request.headers.origin;
    if (origin && origin !== "http://" + request.headers.host && origin !== "https://" + request.headers.host) return;
    if (key && request.headers["sec-fetch-site"] !== "cross-site") upstream.setHeader("x-mpf-web-next-proxy", key);
  });
}
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
    // Media and actor data must be served through the authenticated API.
    fs: { allow: [
      "./index.html",
      "./src",
      "./node_modules",
      "../node_modules",
      "../web/src",
      "../web/node_modules",
      "../client/i18n",
      "../server/domain/dub-sub/subtitleLayout.js",
      "../server/domain/dub-sub/subtitleFonts.js",
      "../server/config/dub-subtitle-fonts.json",
      "../server/config/dub-subtitle-defaults.json",
        "../server/config/cinematic/story-direction.v1.json",
        "../server/config/cinematic/story-authoring.v1.json",
      "../server/domain/dub-sub/takePlacement.js",
    ].map(source => fileURLToPath(new URL(source, import.meta.url))) },
    host: "127.0.0.1",
    port: 6502,
    strictPort: true,
    proxy: Object.fromEntries(
      ["/api", "/outputs", "/assets", "/i18n"].map((path) => [
        path,
        {
          target: "http://127.0.0.1:6500",
          changeOrigin: true,
          ...(path === "/api" ? { configure: configureWorkspaceProxy } : {}),
        },
      ]),
    ),
  },
  build: { outDir: "dist", emptyOutDir: true },
});
