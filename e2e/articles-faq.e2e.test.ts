import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, TestClient } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

const PASSWORD = "SuperSecret123456";

beforeEach(async () => {
  await resetTestDb();
});

async function createDraft(slug: string): Promise<number> {
  const res = await query(
    `INSERT INTO articles (slug, locale, title, description, author, author_slug, tags, content, status)
     VALUES ($1, 'es', 'Título', 'Descripción', 'Autor', 'autor', '{}', '[]', 'draft') RETURNING id;`,
    [slug]
  );
  return res.rows[0].id;
}

function articleBody(content: unknown[]) {
  return { slug: "post-faq", title: "Post con FAQ", description: "Descripción", author: "Autor", authorSlug: "autor", tags: [], content };
}

const CONTENT = [
  { type: "paragraph", text: "Lee el [servicio de migración](/servicios/migracion-datos-legacy) y [esto](https://externo.test)." },
  { type: "heading", level: 2, text: "Preguntas frecuentes" },
  { type: "faq", items: [{ question: "¿Se puede migrar sin downtime?", answer: "Sí, por [fases](/servicios/migracion-datos-legacy)." }] },
];

describe("bloques faq y enlaces internos en artículos", () => {
  it("la API acepta un bloque faq y rechaza uno vacío", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const client = await loginAs(admin.email, PASSWORD);
    const id = await createDraft("post-faq");

    expect((await client.patch(`/api/articles/${id}`, articleBody(CONTENT))).status).toBe(200);
    expect((await client.patch(`/api/articles/${id}`, articleBody([{ type: "faq", items: [] }]))).status).toBe(400);
    expect(
      (await client.patch(`/api/articles/${id}`, articleBody([{ type: "faq", items: [{ question: "", answer: "x" }] }]))).status
    ).toBe(400);
  });

  it("el post publicado renderiza el enlace interno, deja el externo como texto y emite FAQPage", async () => {
    const admin = await createTestUser({ role: "admin", password: PASSWORD });
    const client = await loginAs(admin.email, PASSWORD);
    const id = await createDraft("post-faq");
    await client.patch(`/api/articles/${id}`, articleBody(CONTENT));
    await query("UPDATE articles SET status = 'published', published_at = now() WHERE id = $1;", [id]);

    const html = await (await new TestClient().get("/blog/post-faq")).text();
    expect(html).toContain('href="/servicios/migracion-datos-legacy"');
    expect(html).not.toContain('href="https://externo.test"');
    expect(html).toContain("[esto](https://externo.test)");
    expect(html).toContain('"@type":"FAQPage"');
    // El JSON-LD lleva la respuesta sin la sintaxis de enlace.
    expect(html).toContain('"text":"Sí, por fases."');
  });
});
