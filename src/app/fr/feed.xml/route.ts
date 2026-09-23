import { buildRssFeed } from "@/lib/rss";

export const revalidate = 3600;

export async function GET() {
  return new Response(await buildRssFeed("fr"), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
