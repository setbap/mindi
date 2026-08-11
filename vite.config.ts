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
        description:
          "Offline mind maps that stay on your device. Create, edit, and organize Maps without an account—works fully offline after install.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "browser"],
        theme_color: "#181818",
        background_color: "#181818",
        lang: "en",
        categories: ["productivity"],
        icons: [
          {
            src: "/mindi-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/mindi-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/mindi-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
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
