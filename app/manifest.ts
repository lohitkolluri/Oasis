import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oasis: Income protection for delivery partners",
    short_name: "Oasis",
    description:
      "AI-powered parametric wage protection for India's Q-commerce delivery partners. Rider & Admin app.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#059669",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "business"],
    shortcuts: [
      {
        name: "Rider Dashboard",
        short_name: "Rider",
        description: "View your wallet, policy & claims",
        url: "/dashboard",
        icons: [{ src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }],
      },
      {
        name: "Admin Dashboard",
        short_name: "Admin",
        description: "Manage triggers, fraud & policies",
        url: "/admin",
        icons: [{ src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }],
      },
    ],
  };
}
