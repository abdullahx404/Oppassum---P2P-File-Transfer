import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oppassum - P2P WiFi File Sharing",
    short_name: "Oppassum",
    description:
      "Browser-based P2P file sharing for transferring files directly across devices over WiFi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f25a2b",
    icons: [
      {
        src: "/oppassum-logo.png",
        sizes: "1024x1024",
        type: "image/png"
      }
    ]
  };
}
