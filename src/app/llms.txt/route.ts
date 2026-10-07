import { getBlogPosts } from "@/content/blog";
import { services } from "@/content/services";
import { getServiceSeo } from "@/content/serviceSeo";
import { bogotaPagePath } from "@/lib/bogotaPaths";
import { blogIndexPath, blogPostPath } from "@/lib/blogPaths";
import { faqPath } from "@/lib/faqPaths";
import { estimatorPath } from "@/lib/estimatorMetadata";
import { logError } from "@/lib/logger";
import { portfolioCasePath, portfolioIndexPath } from "@/lib/portfolioPaths";
import { getPublishedPortfolioProjects } from "@/lib/queries/portfolio";
import { servicePath, servicesIndexPath } from "@/lib/serviceMetadata";
import { contactEmail, getSiteText, siteName, siteUrl, whatsappHref } from "@/lib/site";
import { teamPath } from "@/lib/teamMetadata";

// Resumen para asistentes y buscadores con IA (convención llmstxt.org). Se
// arma con el mismo contenido que sirve el sitio, nunca a mano, para que no
// se desactualice; los casos y artículos vienen de Postgres y se refrescan
// cada hora. Solo describe lo que ya es público.
export const revalidate = 3600;

const link = (title: string, path: string, note?: string) => `- [${title}](${siteUrl}${path})${note ? `: ${note}` : ""}`;

async function safely<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logError(`❌ [llms.txt] no se pudo leer ${label}`, error);
    return fallback;
  }
}

export async function GET() {
  const { siteDescription } = getSiteText("es");
  const [projects, posts] = await Promise.all([
    safely("casos del portafolio", () => getPublishedPortfolioProjects("es"), []),
    safely("artículos del blog", () => getBlogPosts("es"), []),
  ]);

  const lines = [
    `# ${siteName}`,
    "",
    `> ${siteDescription}`,
    "",
    "Agencia de ingeniería de software con sede en Bogotá, Colombia. Desarrolla software a la medida, aplicaciones móviles, integraciones y APIs, comercio electrónico, seguridad y cumplimiento (Ley 1581/RGPD), migración de sistemas legados e inteligencia artificial aplicada. El código y los repositorios quedan a nombre del cliente, con 90 días de garantía técnica.",
    "",
    "El sitio está en español (principal), inglés (/en) y francés (/fr). El portafolio, el blog, los servicios, el equipo y las preguntas frecuentes tienen versión en los tres idiomas.",
    "",
    "## Servicios",
    ...services.map((service) => {
      const seo = getServiceSeo(service.slug, "es");
      return link(seo?.h1 ?? service.title, servicePath("es", service.slug), seo?.description ?? service.description);
    }),
    link("Todos los servicios", servicesIndexPath("es")),
    "",
    "## Páginas clave",
    link("Desarrollo de software en Bogotá", bogotaPagePath, "servicios, casos, proceso y preguntas frecuentes para empresas en Bogotá"),
    link("Casos de estudio", portfolioIndexPath("es"), "proyectos reales entregados"),
    link("Equipo", teamPath("es"), "ingenieros y especialistas que construyen cada proyecto"),
    link("Preguntas frecuentes", faqPath("es"), "propiedad del código, pagos, garantía, seguridad e integraciones"),
    link("Cotizador", estimatorPath("es"), "estimación de costo y tiempo de un proyecto de software"),
    link("Blog técnico", blogIndexPath("es"), "guías sobre arquitectura, APIs, migraciones y cumplimiento"),
    "",
  ];

  if (projects.length > 0) {
    lines.push("## Casos de estudio", ...projects.map((p) => link(p.title, portfolioCasePath("es", p.slug), p.summary)), "");
  }
  if (posts.length > 0) {
    lines.push("## Artículos", ...posts.map((p) => link(p.title, blogPostPath("es", p.slug), p.description)), "");
  }

  lines.push("## Contacto", `- Correo: ${contactEmail}`, `- WhatsApp: ${whatsappHref}`, `- Formulario: ${siteUrl}/#contacto`, "");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
