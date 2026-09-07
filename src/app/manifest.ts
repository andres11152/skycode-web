import type { MetadataRoute } from "next";
import { siteName, siteTagline } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "SkyCode",
    description: siteTagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0089cd",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
