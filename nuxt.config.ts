import type { ModuleOptions as PwaModuleOptions } from "@vite-pwa/nuxt";

export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase", "@nuxt/ui", "@pinia/nuxt", "@vite-pwa/nuxt"],
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Mijn Vakanties",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        { name: "theme-color", content: "#10b981" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
    },
  },

  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Mijn Vakanties",
      short_name: "Vakanties",
      description: "Vakantie-uitgaven en budget tracking",
      theme_color: "#10b981",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: "/overzicht",
      icons: [
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: undefined,
    },
  } as PwaModuleOptions,
});
