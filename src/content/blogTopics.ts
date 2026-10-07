import type { BlogPost } from "@/content/blogShared";

// Puro a propósito (sin `pg`, sin iconos de librería): `PostCover` →
// `PostCard` viaja dentro de `BlogTeaser`, un componente cliente de la
// home. Por eso los glifos son trazos SVG propios de ~150 bytes cada uno y
// no íconos de Phosphor (cada uno trae las 6 variantes de peso, ~1 KB
// gzip por ícono) — mismo criterio que `components/icons/UiIcons.tsx`.

export type BlogTopic = "security" | "api" | "architecture" | "cloud" | "migration" | "ownership" | "code";

/** Trazos en una cuadrícula de 24×24, para dibujar con `stroke="currentColor"` y sin relleno. */
export const TOPIC_GLYPHS: Record<BlogTopic, string[]> = {
  security: ["M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z", "M9 12l2 2 4-4"],
  api: [
    "M4 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M16 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M10 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M8 6h8",
    "M7.2 7.6l3.6 8.8",
    "M16.8 7.6l-3.6 8.8",
  ],
  architecture: ["M12 3l9 4.5-9 4.5-9-4.5L12 3z", "M3 12l9 4.5 9-4.5", "M3 16.5L12 21l9-4.5"],
  cloud: ["M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9.5H7z"],
  migration: ["M4 8h15m-4-4l4 4-4 4", "M20 16H5m4-4l-4 4 4 4"],
  ownership: ["M5 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0", "M11 12h10", "M17 12v3", "M20 12v2"],
  code: ["M8 8l-5 4 5 4", "M16 8l5 4-5 4", "M13.5 5l-3 14"],
};

// Slugs ya publicados — la fuente más fiable. Un post nuevo (creado desde
// el dashboard o por el cron de contenido) no está aquí y cae a las
// palabras clave de abajo, o al glifo genérico de código.
const TOPIC_BY_SLUG: Record<string, BlogTopic> = {
  "ley-1581-guia-tecnica-software": "security",
  "deuda-tecnica-como-detectarla": "architecture",
  "buenas-practicas-apis-rest": "api",
  "outsourcing-software-latam-propiedad-codigo": "ownership",
  "migracion-sistemas-legados-sin-interrupcion": "migration",
  "optimizacion-costos-nube-serverless-colombia": "cloud",
};

// Las etiquetas están traducidas por idioma, así que se reconocen por raíz
// en los tres (es/en/fr). Orden = prioridad.
const TOPIC_KEYWORDS: [RegExp, BlogTopic][] = [
  [/segur|security|sécurit|privacidad|privacy|cumplim|complian|conform|1581|rgpd|gdpr|owasp/, "security"],
  [/migra|legad|legacy|moderniz|héritage/, "migration"],
  [/nube|cloud|serverless|sans serveur|costo|cost|coût/, "cloud"],
  [/\bapi\b|rest|backend|integra/, "api"],
  [/outsourcing|propiedad|ownership|propriét|externalis/, "ownership"],
  [/arquitect|architect|deuda|debt|dette/, "architecture"],
];

export function getPostTopic(post: Pick<BlogPost, "slug" | "tags" | "title">): BlogTopic {
  const bySlug = TOPIC_BY_SLUG[post.slug];
  if (bySlug) return bySlug;
  const haystack = `${post.tags.join(" ")} ${post.title}`.toLowerCase();
  return TOPIC_KEYWORDS.find(([pattern]) => pattern.test(haystack))?.[1] ?? "code";
}

// El servicio (o servicios) que respalda cada post vive en
// `content/relatedContent.ts` (`getRelatedServiceSlugsForPost`): una sola
// tabla de la que se deriva también el bloque inverso de cada servicio.
// Antes había aquí un `POST_SERVICE_SLUGS` con un único servicio por post;
// se eliminó para que las dos tablas no se contradigan.
