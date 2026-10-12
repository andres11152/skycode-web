import type { PublicTeamMember } from "@/content/teamShared";
import type { Locale } from "@/lib/i18n";
import { buildPersonNode, serializeJsonLd } from "@/lib/jsonLd";

/**
 * Una entidad `Person` por integrante publicado en `/equipo`. El `@id` es el mismo que usan la página
 * del autor y los artículos del blog como `author` (ver ArticleJsonLd, lib/jsonLd.ts::buildPersonNode),
 * así que Google puede unir autor ↔ persona ↔ empresa.
 */
export function TeamJsonLd({ members, locale }: { members: PublicTeamMember[]; locale: Locale }) {
  if (members.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd({ "@context": "https://schema.org", "@graph": members.map((member) => buildPersonNode(member, locale)) }),
      }}
    />
  );
}
