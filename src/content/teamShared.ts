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
  /** URL absoluta de la variante grande (1600px, proporción original — pipeline del portafolio) o null si no tiene foto: TeamView cae a las iniciales. */
  photo: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
}

export interface PublicTeamNetworkItem {
  iconName: string;
  label: string;
  description: string;
}

export interface PublicTeamStat {
  value: string;
  label: string;
}

export interface PublicTeamSection {
  sectionAria: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Eyebrow del Hero (opcional). */
  heroEyebrow?: string;
  /** Líneas destacadas para el H1 cinematográfico (opcional). */
  heroTitleLines?: string[];
  /** Título de la sección de red de especialistas (opcional). */
  networkTitle?: string;
  /** Descripción de la red de especialistas (opcional). */
  networkDescription?: string;
  /** Items de la red de especialistas (opcional). */
  networkItems?: PublicTeamNetworkItem[];
  /** Título del bloque de cierre / CTA (opcional). */
  closingTitle?: string;
  /** Descripción del bloque de cierre / CTA (opcional). */
  closingDescription?: string;
  /** CTA secundario para el bloque de cierre (opcional). */
  ctaSecondary?: { label: string; href: string };
  /** Estadísticas de impacto y escala del equipo (opcional). */
  stats?: PublicTeamStat[];
}
