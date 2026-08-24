import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // manifest.json is hand-authored in public/ per the PWA spec doc; the
      // plugin only needs to know about it for precaching, not generate it.
      manifest: false,
      includeAssets: ["icon-192.png", "icon-512.png", "manifest.json"],
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/auth\/me$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-auth-me" },
          },
          {
            urlPattern: /\/api\/teacher\/groups$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-teacher-groups" },
          },
          {
            urlPattern: /\/api\/teacher\/groups\/[^/]+\/students$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-teacher-group-students" },
          },
          {
            urlPattern: /\/api\/attendance(\?.*)?$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-attendance" },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // Uploaded org logos are served statically by the API (see main.ts) —
      // proxied here too so <img src="/uploads/..."> resolves in dev the
      // same way it will behind a single origin in production.
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
