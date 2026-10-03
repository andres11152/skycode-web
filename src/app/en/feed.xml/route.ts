import { buildRssFeed, RSS_CONTENT_TYPE } from "@/lib/rss";

export const revalidate = 3600;

export async function GET() {
  return new Response(await buildRssFeed("en"), {
    headers: {
      "Content-Type": RSS_CONTENT_TYPE,
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
