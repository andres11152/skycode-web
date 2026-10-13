import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../src/lib/db";
import { resetTestDb } from "../src/lib/testHelpers/db";
import { extractJsonLd, hasType, validateJsonLd, type JsonLdNode } from "../src/lib/jsonLdValidate";
import { SERVICE_IDS } from "../src/seo/slugs";
import { BASE_URL } from "./helpers/config";

// Validación estructural del JSON-LD de seis páginas representativas contra el servidor real: home, servicio
// (español e inglés), guía del blog con FAQ, página de autor y caso de estudio. Comprueba @type, @id, campos
// obligatorios, migas ordenadas, preguntas con respuesta y que toda referencia por @id apunte a una entidad
// definida (en la propia página o en el grafo del layout). No sustituye al Rich Results Test de Google.

const SITE = "https://skycode.agency";
const get = async (path: string) => {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  expect(res.status, path).toBe(200);
  return extractJsonLd(await res.text());
};
const byType = (nodes: JsonLdNode[], type: string) => nodes.filter((n) => hasType(n, type));
const external = new Set(SERVICE_IDS.map((id) => `${SITE}/servicios/${id}#service`));
const ids = (nodes: JsonLdNode[]) => nodes.map((n) => n["@id"]).filter(Boolean);

beforeAll(async () => {
  await resetTestDb();
  const profile = await query(`INSERT INTO team_profiles (slug, linkedin_url, is_published) VALUES ('cesar-leon', 'https://www.linkedin.com/in/cesar-test', true) RETURNING id;`);
  await query(
    `INSERT INTO team_profile_translations (profile_id, locale, name, public_role, public_bio) VALUES ($1, 'es', 'César León', 'Frontend & Rendimiento', 'Desarrollo frontend con Next.js.');`,
    [profile.rows[0].id]
  );
  await query(
    `INSERT INTO articles (slug, locale, status, title, description, author, author_slug, tags, content, published_at) VALUES
     ('migracion-sistemas-legados-sin-interrupcion', 'es', 'published', 'Guía: cómo migrar sistemas legados sin downtime', 'Guía paso a paso para migrar sistemas legados.', 'César León', 'cesar-leon', '{migración}',
      $1, now());`,
    [
      JSON.stringify([
        { type: "paragraph", text: "Introducción con [servicios de migración](/servicios/migracion-datos-legacy)." },
        { type: "heading", level: 2, text: "Preguntas frecuentes" },
        { type: "faq", items: [{ question: "¿Se puede migrar sin downtime?", answer: "Sí, por [fases](/servicios/migracion-datos-legacy)." }] },
      ]),
    ]
  );
  const project = await query(`INSERT INTO portfolio_projects (slug, status, industry_icon, published_at) VALUES ('sentry-crm', 'published', 'Buildings', now()) RETURNING id;`);
  await query(
    `INSERT INTO portfolio_project_translations (project_id, locale, title, client_label, summary, challenge, solution, capabilities)
     VALUES ($1, 'es', 'Sentry CRM', 'Cliente', 'Plataforma de leads por WhatsApp.', 'El problema.', 'La solución.', ARRAY['Multi-inquilino']);`,
    [project.rows[0].id]
  );
});

describe("JSON-LD de páginas representativas", () => {
  it("home: la organización (con legalName, alias, fundador y sameAs) y el sitio en un @graph", async () => {
    const nodes = await get("/");
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const org = byType(nodes, "Organization")[0];
    expect(org["@id"]).toBe(`${SITE}/#organization`);
    expect(org.alternateName).toEqual(["SkyCode", "Sky Code", "SkyCode Agency"]);
    expect(org.legalName).toBeTruthy();
    expect((org.founder as JsonLdNode).name).toBeTruthy();
    expect((org.sameAs as string[]).every((url) => url.startsWith("https://"))).toBe(true);
    expect(JSON.stringify(nodes)).not.toContain("{{TODO");
    const site = byType(nodes, "WebSite")[0];
    expect(site["@id"]).toBe(`${SITE}/#website`);
    expect(site.name).toBe("SkyCode");
  });

  it.each(["/servicios/migracion-datos-legacy", "/en/services/legacy-software-migration"])("servicio %s: Service con @id propio, migas y FAQ", async (path) => {
    const nodes = await get(path);
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const service = byType(nodes, "Service")[0];
    expect(String(service["@id"])).toMatch(/#service$/);
    expect((service.provider as JsonLdNode)["@id"]).toBe(`${SITE}/#organization`);
    expect(byType(nodes, "FAQPage")).toHaveLength(1);
    expect(byType(nodes, "BreadcrumbList")).toHaveLength(1);
    // La oferta de la organización (grafo del layout) cita el MISMO @id que esta página define por completo.
    const offered = (byType(nodes, "Organization")[0].makesOffer as { itemOffered: JsonLdNode }[]).map((o) => o.itemOffered["@id"]);
    expect(ids(nodes).filter((id) => id === service["@id"])).toHaveLength(1);
    // (la organización solo declara las ofertas en español, las rutas canónicas del grafo del sitio)
    if (!path.startsWith("/en")) expect(offered).toContain(service["@id"]);
  });

  it("guía del blog: BlogPosting con autor (Person), publisher, migas y FAQPage", async () => {
    const nodes = await get("/blog/migracion-sistemas-legados-sin-interrupcion");
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const post = byType(nodes, "BlogPosting")[0];
    expect((post.author as JsonLdNode)["@id"]).toBe(`${SITE}/equipo/cesar-leon#person`);
    expect((post.publisher as JsonLdNode)["@id"]).toBe(`${SITE}/#organization`);
    expect(byType(nodes, "FAQPage")[0].mainEntity).toHaveLength(1);
  });

  it("página de autor: ProfilePage + Person con sameAs reales y worksFor → #organization", async () => {
    const nodes = await get("/equipo/cesar-leon");
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const person = byType(nodes, "Person").find((n) => n["@id"] === `${SITE}/equipo/cesar-leon#person` && n.jobTitle)!;
    expect(person.sameAs).toEqual(["https://www.linkedin.com/in/cesar-test"]);
    expect((person.worksFor as JsonLdNode)["@id"]).toBe(`${SITE}/#organization`);
    expect(byType(nodes, "ProfilePage")).toHaveLength(1);
  });

  it("caso de estudio: WebPage -> Article -> SoftwareApplication, sin métricas ni reseñas inventadas", async () => {
    const nodes = await get("/portafolio/sentry-crm");
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const article = byType(nodes, "Article")[0];
    expect((article.about as JsonLdNode)["@id"]).toBe(`${SITE}/portafolio/sentry-crm#software`);
    const software = byType(nodes, "SoftwareApplication")[0];
    expect(software.featureList).toEqual(["Multi-inquilino"]);
    expect(software.additionalProperty).toBeUndefined();
    expect(JSON.stringify(nodes)).not.toMatch(/aggregateRating|"Review"/);
  });
});
