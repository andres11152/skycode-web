// Tipos puros del equipo público, sin ningún import de lib/db.ts ni de
// lib/queries/teamProfiles.ts — mismo split que content/blogShared.ts vs.
// content/blog.ts y content/portfolioShared.ts: `TeamView.tsx` es un
// componente cliente y necesita este tipo sin arrastrar `pg` a su bundle
// del navegador (eso rompe el build con "Module not found: util/types").

export interface PublicTeamMember {
  /** URL pública ya indexada: cada post del blog enlaza a su autor como `/equipo#{slug}` (ver lib/blogPaths.ts::authorUrl). */
  slug: string;
  name: string;
  /** Cargo de marketing, traducible (ej. "Backend & Arquitectura") — no el `job_title` interno de la cuenta. */
  role: string;
  description: string;
  /** URL absoluta de la variante grande del avatar, o null si no tiene foto (TeamView cae a las iniciales). */
  photo: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
}

export interface PublicTeamSection {
  sectionAria: string;
  title: string;
  description: string;
  ctaLabel: string;
}
