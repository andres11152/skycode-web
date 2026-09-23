import { buildRssFeed } from "@/lib/rss";

// Fallback de seguridad, ver la misma nota en app/blog/page.tsx — la
// revalidación real es bajo demanda al publicar un artículo.
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildRssFeed("es"), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Un día es suficiente — el blog no publica más de una vez al día,
      // y el cache del hosting igual se invalida en cada deploy.
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
