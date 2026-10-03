import { OG_SIZE, renderBlogOgImage } from "@/lib/blogOgImage";

// Imagen OG propia de cada artículo — ver lib/blogOgImage.tsx.
export const alt = "SkyCode Agency — Blog";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderBlogOgImage(slug, "fr");
}
