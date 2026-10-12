import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorPageCopy } from "@/content/team";
import { getAuthorProfile } from "@/lib/authorData";
import { fitTitle, truncateAtWord } from "@/lib/seoText";
import { ogImageUrl, siteUrl } from "@/lib/site";
import { teamMemberPath } from "@/lib/teamPaths";
import { t, type Locale } from "@/lib/i18n";

// Server-only: lee la base. Los componentes cliente construyen rutas con `lib/teamPaths.ts`.

export async function buildAuthorMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const profile = await getAuthorProfile(slug, locale);
  // Nunca `{}`: la metadata vacía hereda la del layout (título y canonical de la home). Sin dato → 404.
  if (!profile) notFound();

  const { member, translated } = profile;
  const copy = getAuthorPageCopy(locale);

  // hreflang solo hacia los idiomas con traducción real (español siempre); x-default → español.
  const versions = await Promise.all(
    (["es", "en", "fr"] as const).map(async (loc) => [loc, loc === locale ? profile : await getAuthorProfile(slug, loc)] as const)
  );
  const languages: Record<string, string> = Object.fromEntries(
    versions.filter(([, p]) => p?.translated).map(([loc]) => [loc, `${siteUrl}${teamMemberPath(loc, slug)}`])
  );
  languages["x-default"] = `${siteUrl}${teamMemberPath("es", slug)}`;

  // `<title>` ≤50 (el layout agrega " | SkyCode") y descripción ≤155.
  const title = fitTitle(`${member.name}, ${member.role}`, 50);
  const description = truncateAtWord(t(copy.seoDescription, { name: member.name, role: member.role, bio: member.description }), 155);

  return {
    title,
    description,
    alternates: { canonical: teamMemberPath(locale, slug), languages },
    // Sin traducción real a este idioma se serviría español bajo una URL en otro idioma: no se indexa.
    ...(translated ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "profile",
      title,
      description,
      images: [member.photo ? { url: member.photo, alt: member.name } : { url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [member.photo ?? ogImageUrl] },
  };
}
