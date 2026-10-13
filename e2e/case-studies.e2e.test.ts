import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../src/lib/db";
import { resetTestDb } from "../src/lib/testHelpers/db";
import { extractJsonLd, hasType, validateJsonLd } from "../src/lib/jsonLdValidate";
import { SERVICE_IDS } from "../src/seo/slugs";
import { BASE_URL } from "./helpers/config";
import { revalidatePublicPages } from "./helpers/revalidate";

// Plantilla de caso de estudio (contexto → problema → solución → arquitectura y stack → proceso →
// resultados) aplicada a Sentry CRM y ServiFuturo con el texto REAL archivado en
// scripts/seed-data/seo/case-studies.json. Donde falta un dato (plazos, métricas, testimonio) el texto
// trae un marcador {{TODO}} que la vista pública omite: nunca debe llegar al HTML ni al JSON-LD.

interface CaseText {
  clientContext: string;
  challenge: string;
  solution: string;
  architecture: string;
  process: string;
  results: string;
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
}
const seed = JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "scripts/seed-data/seo/case-studies.json"), "utf-8")) as {
  projects: Record<string, { es: CaseText }>;
};
const CASES = [
  { slug: "sentry-crm", title: "Sentry CRM", summary: "Plataforma de gestión y automatización de leads para negocios que venden por WhatsApp." },
  { slug: "servifuturo", title: "ServiFuturo", summary: "Sistema de gestión de flota, liquidaciones y cumplimiento para una empresa de transporte." },
];
const get = (p: string) => fetch(`${BASE_URL}${p}`, { redirect: "manual" });

beforeAll(async () => {
  await resetTestDb();
  await query(
    `INSERT INTO portfolio_technologies (slug, name, category, icon_source, icon_ref) VALUES
     ('nextdotjs', 'Next.js', 'frontend', 'simple-icons', 'nextdotjs'),
     ('postgresql', 'PostgreSQL', 'database', 'simple-icons', 'postgresql');`
  );
  for (const [index, c] of CASES.entries()) {
    const text = seed.projects[c.slug].es;
    const project = await query(
      `INSERT INTO portfolio_projects (slug, status, sort_order, industry_icon, published_at) VALUES ($1, 'published', $2, 'Buildings', now()) RETURNING id;`,
      [c.slug, index]
    );
    const id = project.rows[0].id;
    await query(
      `INSERT INTO portfolio_project_translations
         (project_id, locale, title, client_label, summary, challenge, solution, results, capabilities,
          client_context, architecture, process, testimonial_quote, testimonial_author, testimonial_role)
       VALUES ($1, 'es', $2, 'Cliente', $3, $4, $5, $6, ARRAY['Multi-inquilino'], $7, $8, $9, $10, $11, $12);`,
      [id, c.title, c.summary, text.challenge, text.solution, text.results, text.clientContext, text.architecture, text.process, text.testimonialQuote, text.testimonialAuthor, text.testimonialRole]
    );
    await query(`INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order) SELECT $1, id, id FROM portfolio_technologies;`, [id]);
  }
  await revalidatePublicPages();
});

describe.each(CASES)("caso de estudio $slug", ({ slug, title }) => {
  it("responde 200 con un solo H1, canonical propio y los capítulos reales visibles", async () => {
    const res = await get(`/portafolio/${slug}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toContain(`<link rel="canonical" href="https://skycode.agency/portafolio/${slug}"/>`);
    for (const heading of ["Contexto del cliente", "El problema", "La solución", "Arquitectura y stack"]) {
      expect(html, `capítulo "${heading}"`).toContain(heading);
    }
  });

  it("los datos que faltan (plazos, métricas, testimonio) se omiten: ningún marcador llega al HTML", async () => {
    const html = await (await get(`/portafolio/${slug}`)).text();
    expect(html).not.toContain("{{TODO");
    expect(html).not.toContain("TODO:");
  });

  it("JSON-LD válido: WebPage → Article → SoftwareApplication, sin cifras ni valoraciones inventadas", async () => {
    const html = await (await get(`/portafolio/${slug}`)).text();
    const nodes = extractJsonLd(html);
    const external = new Set(SERVICE_IDS.map((id) => `https://skycode.agency/servicios/${id}#service`));
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const article = nodes.find((n) => hasType(n, "Article"))!;
    expect(article.headline).toBe(title);
    expect(article.articleSection).toBe("Caso de estudio");
    expect(article.keywords).toContain("Next.js");
    const software = nodes.find((n) => hasType(n, "SoftwareApplication"))!;
    expect(software.additionalProperty).toBeUndefined();
    expect(JSON.stringify(nodes)).not.toMatch(/aggregateRating|"Review"|\{\{TODO/);
  });
});
