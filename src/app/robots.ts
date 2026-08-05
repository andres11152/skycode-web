import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El dashboard y el login ya llevan `robots: { index: false }` por página
      // (evita que se indexen), pero eso no evita que un crawler gaste
      // presupuesto de rastreo entrando ahí. Las rutas de API no son HTML
      // indexable de todos modos — no tienen nada que hacer en un rastreo.
      disallow: ["/dashboard", "/login", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
