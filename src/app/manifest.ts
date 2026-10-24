// web app manifest - next serves this at /manifest.webmanifest and links it in <head>,
// which is what lets browsers offer to install the app

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brain Fungus",
    short_name: "Brain Fungus",
    description: "Organise your bands, setlists and rehearsals",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c090a",
    theme_color: "#0c090a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // extra padding so android can crop it to a circle/squircle without cutting the logo
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
