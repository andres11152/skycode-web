import { beforeAll, describe, expect, it } from "vitest";
import { query } from "../src/lib/db";
import { resetTestDb } from "../src/lib/testHelpers/db";
import { extractJsonLd, hasType, validateJsonLd } from "../src/lib/jsonLdValidate";
import { SERVICE_IDS } from "../src/seo/slugs";
import { BASE_URL } from "./helpers/config";

// Página de cada persona del equipo (E-E-A-T): /equipo/{slug} en los tres idiomas, con la entidad Person
// que cita cada artículo suyo como autor.

const SLUG = "cesar-leon";
const PERSON_ID = `https://skycode.agency/equipo/${SLUG}#person`;
const get = (path: string) => fetch(`${BASE_URL}${path}`, { redirect: "manual" });

beforeAll(async () => {
  await resetTestDb();
  const profile = await query(
    `INSERT INTO team_profiles (slug, linkedin_url, github_url, is_published, sort_order)
     VALUES ($1, 'https://www.linkedin.com/in/cesar-test', NULL, true, 1) RETURNING id;`,
    [SLUG]
  );
  const id = profile.rows[0].id;
  // Español y francés con traducción real; el inglés queda SIN fila (cae al español).
  await query(
    `INSERT INTO team_profile_translations (profile_id, locale, name, public_role, public_bio) VALUES
     ($1, 'es', 'César León', 'Frontend & Rendimiento', 'Desarrollo frontend con Next.js y React.'),
     ($1, 'fr', 'César León', 'Frontend et performance', 'Développement frontend avec Next.js et React.');`,
    [id]
  );
  await query(`INSERT INTO team_profiles (slug, is_published, sort_order) VALUES ('borrador', false, 2);`);
  await query(
    `INSERT INTO articles (slug, locale, status, title, description, author, author_slug, tags, content, published_at)
     VALUES ('post-de-cesar', 'es', 'published', 'Post de César', 'Descripción.', 'César León', $1, '{}', '[{"type":"paragraph","text":"Texto."}]', now());`,
    [SLUG]
  );
});

describe("páginas de autor", () => {
  it("la persona publicada responde 200 en español y francés; la no publicada y la desconocida, 404", async () => {
    expect((await get(`/equipo/${SLUG}`)).status).toBe(200);
    expect((await get(`/fr/equipo/${SLUG}`)).status).toBe(200);
    expect((await get("/equipo/borrador")).status).toBe(404);
    expect((await get("/equipo/no-existe")).status).toBe(404);
  });

  it("canonical propio, un solo H1 con el nombre y hreflang solo hacia los idiomas con traducción real", async () => {
    const html = await (await get(`/equipo/${SLUG}`)).text();
    expect(html).toContain(`<link rel="canonical" href="https://skycode.agency/equipo/${SLUG}"/>`);
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>César León<\/h1>/);
    const langs = Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
    expect(langs).toEqual({
      es: `https://skycode.agency/equipo/${SLUG}`,
      fr: `https://skycode.agency/fr/equipo/${SLUG}`,
      "x-default": `https://skycode.agency/equipo/${SLUG}`,
    });
    // Lista el artículo que firma.
    expect(html).toContain('href="/blog/post-de-cesar"');
  });

  it("el inglés sin traducción real se sirve en español pero sin indexar y sin hreflang propio", async () => {
    const html = await (await get(`/en/equipo/${SLUG}`)).text();
    expect(html).toContain("noindex");
    const xml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
    expect(xml).not.toContain(`/en/equipo/${SLUG}`);
    expect(xml).toContain(`https://skycode.agency/fr/equipo/${SLUG}`);
    expect(xml).toContain(`https://skycode.agency/equipo/${SLUG}`);
    expect(xml).not.toContain("/equipo/borrador");
  });

  it("JSON-LD válido: ProfilePage + Person con @id estable, sameAs reales y worksFor → #organization", async () => {
    const html = await (await get(`/equipo/${SLUG}`)).text();
    const nodes = extractJsonLd(html);
    // Las ofertas de la organización (grafo del layout) citan el Service que define cada página de servicio.
    const external = new Set(SERVICE_IDS.map((id) => `https://skycode.agency/servicios/${id}#service`));
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const person = nodes.find((n) => hasType(n, "Person"))!;
    expect(person["@id"]).toBe(PERSON_ID);
    expect(person.jobTitle).toBe("Frontend & Rendimiento");
    expect(person.sameAs).toEqual(["https://www.linkedin.com/in/cesar-test"]);
    expect((person.worksFor as { "@id": string })["@id"]).toBe("https://skycode.agency/#organization");
    expect(nodes.some((n) => hasType(n, "ProfilePage"))).toBe(true);
  });

  it("el artículo cita a su autor con el mismo @id que la página de la persona", async () => {
    const html = await (await get("/blog/post-de-cesar")).text();
    const article = extractJsonLd(html).find((n) => hasType(n, "BlogPosting"))!;
    expect((article.author as { "@id": string })["@id"]).toBe(PERSON_ID);
    expect(html).toContain(`href="/equipo/${SLUG}"`);
  });
});
