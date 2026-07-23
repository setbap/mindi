import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Mindi",
        short_name: "Mindi",
        description: "Local-first offline mind maps",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#282828",
        background_color: "#282828",
        icons: [
          {
            src: "/mindi-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/mindi-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/mindi-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        navigationPreload: false,
        runtimeCaching: [],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
