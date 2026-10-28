import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mixstro",
    short_name: "Mixstro",
    description: "Where musicians meet.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F0D0B",
    theme_color: "#0F0D0B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
