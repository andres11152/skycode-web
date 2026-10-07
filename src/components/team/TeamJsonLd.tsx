import type { PublicTeamMember } from "@/content/teamShared";
import { authorUrl } from "@/lib/blogPaths";
import type { Locale } from "@/lib/i18n";
import { siteName, siteUrl } from "@/lib/site";
import { withoutTodos } from "@/lib/todoPlaceholders";

/**
 * Una entidad `Person` por integrante publicado en `/equipo`. El `@id` es la
 * misma URL (`/equipo#slug`) que usan los artículos del blog como `author`
 * (ver ArticleJsonLd), así que Google puede unir autor ↔ persona ↔ empresa.
 * `sameAs` solo con perfiles reales cargados en el dashboard (LinkedIn/GitHub);
 * sin ellos se omite, nunca se inventa.
 */
export function TeamJsonLd({ members, locale }: { members: PublicTeamMember[]; locale: Locale }) {
  if (members.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": members.map((member) => {
      const sameAs = withoutTodos([member.linkedinUrl, member.githubUrl].filter((u): u is string => Boolean(u)));
      return {
        "@type": "Person",
        "@id": authorUrl(locale, member.slug),
        name: member.name,
        jobTitle: member.role,
        description: member.description,
        url: authorUrl(locale, member.slug),
        ...(member.photo ? { image: member.photo } : {}),
        worksFor: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: siteName },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
