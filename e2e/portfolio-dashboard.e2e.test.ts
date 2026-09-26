import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, TestClient } from "./helpers/client";
import { createTestPortfolioProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { withTransaction } from "../src/lib/db";
import { createTechnology } from "../src/lib/queries/portfolioTechnologies";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

async function adminClient() {
  const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
  return loginAs(admin.email, "SuperSecret123456");
}

async function salesManagerClient() {
  const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
  return loginAs(salesManager.email, "SuperSecret123456");
}

describe("GET/POST /api/portfolio/projects", () => {
  it("admin lista los casos existentes", async () => {
    await createTestPortfolioProject({ slug: "caso-uno" });
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects");
    expect(res.status).toBe(200);
    const { projects } = await res.json();
    expect(projects.some((p: { slug: string }) => p.slug === "caso-uno")).toBe(true);
  });

  it("sales_manager sin portfolio:read recibe 403", async () => {
    const client = await salesManagerClient();
    const res = await client.fetch("/api/portfolio/projects");
    expect(res.status).toBe(403);
  });

  it("admin crea un caso nuevo en borrador", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "nuevo-caso", industryIcon: "Buildings" }),
    });
    expect(res.status).toBe(200);
    const { projectId } = await res.json();
    const row = await query("SELECT status FROM portfolio_projects WHERE id = $1;", [projectId]);
    expect(row.rows[0].status).toBe("draft");
  });

  it("rechaza un slug duplicado con 409", async () => {
    await createTestPortfolioProject({ slug: "repetido" });
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "repetido", industryIcon: "Buildings" }),
    });
    expect(res.status).toBe(409);
  });

  it("rechaza un slug con formato inválido con 400", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "Slug Invalido!", industryIcon: "Buildings" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET/PATCH/DELETE /api/portfolio/projects/[id]", () => {
  it("admin ve el detalle completo de un caso", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}`);
    expect(res.status).toBe(200);
    const { project: detail } = await res.json();
    expect(detail.id).toBe(project.id);
    expect(detail.translations.es).toBeNull();
  });

  it("404 para un id inexistente", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects/999999");
    expect(res.status).toBe(404);
  });

  it("admin actualiza metadatos (slug, liveUrl, destacado, orden)", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "actualizado", liveUrl: "https://ejemplo.com", isFeatured: true }),
    });
    expect(res.status).toBe(200);
    const row = await query("SELECT slug, live_url, is_featured FROM portfolio_projects WHERE id = $1;", [project.id]);
    expect(row.rows[0].slug).toBe("actualizado");
    expect(row.rows[0].live_url).toBe("https://ejemplo.com");
    expect(row.rows[0].is_featured).toBe(true);
  });

  it("sales_manager sin portfolio:write recibe 403 al editar", async () => {
    const project = await createTestPortfolioProject();
    const client = await salesManagerClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: true }),
    });
    expect(res.status).toBe(403);
  });

  it("admin hace soft-delete de un caso", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const row = await query("SELECT deleted_at FROM portfolio_projects WHERE id = $1;", [project.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });
});

describe("PATCH /api/portfolio/projects/[id]/status", () => {
  it("rechaza publicar sin imagen de portada", async () => {
    const project = await createTestPortfolioProject();
    await withTransaction((c) =>
      c.query(
        `INSERT INTO portfolio_project_translations (project_id, locale, title, summary) VALUES ($1,'es','Título','Resumen');`,
        [project.id]
      )
    );
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/portada/i);
  });

  it("rechaza publicar sin traducción en español", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/español/i);
  });

  it("publica cuando ya hay portada y traducción en español", async () => {
    const project = await createTestPortfolioProject();
    await withTransaction((c) =>
      c.query(
        `INSERT INTO portfolio_project_translations (project_id, locale, title, summary) VALUES ($1,'es','Título','Resumen');`,
        [project.id]
      )
    );
    const imageRes = await withTransaction((c) =>
      c.query(
        `INSERT INTO portfolio_project_images (project_id, storage_key, variants, width, height) VALUES ($1,'key.webp','{}','100','100') RETURNING id;`,
        [project.id]
      )
    );
    await withTransaction((c) => c.query(`UPDATE portfolio_projects SET cover_image_id = $1 WHERE id = $2;`, [imageRes.rows[0].id, project.id]));

    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    expect(res.status).toBe(200);
    const row = await query("SELECT status, published_at FROM portfolio_projects WHERE id = $1;", [project.id]);
    expect(row.rows[0].status).toBe("published");
    expect(row.rows[0].published_at).not.toBeNull();
  });

  it("404 para un id inexistente", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/projects/999999/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/portfolio/projects/[id]/translations/[locale]", () => {
  it("guarda la traducción en español", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/translations/es`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Caso de estudio",
        clientLabel: "Cliente X",
        summary: "Resumen",
        challenge: "Reto",
        solution: "Solución",
        results: "Resultados",
        capabilities: ["A", "B"],
      }),
    });
    expect(res.status).toBe(200);
    const row = await query("SELECT title, capabilities FROM portfolio_project_translations WHERE project_id = $1 AND locale = 'es';", [project.id]);
    expect(row.rows[0].title).toBe("Caso de estudio");
    expect(row.rows[0].capabilities).toEqual(["A", "B"]);
  });

  it("rechaza un locale inválido con 400", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/translations/de`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", clientLabel: "x", summary: "x", challenge: "x", solution: "x", results: "x", capabilities: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("sin sesión, da 401", async () => {
    const project = await createTestPortfolioProject();
    const res = await new TestClient().fetch(`/api/portfolio/projects/${project.id}/translations/es`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", clientLabel: "x", summary: "x", challenge: "x", solution: "x", results: "x", capabilities: [] }),
    });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/portfolio/projects/[id]/technologies", () => {
  it("asigna tecnologías en orden", async () => {
    const project = await createTestPortfolioProject();
    const techA = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const techB = await withTransaction((c) => createTechnology({ slug: "postgresql", name: "PostgreSQL", category: "database", iconSource: "simple-icons", iconRef: "postgresql" }, c));

    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/technologies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technologyIds: [techB.id, techA.id] }),
    });
    expect(res.status).toBe(200);

    const detail = await client.fetch(`/api/portfolio/projects/${project.id}`);
    const { project: detailData } = await detail.json();
    expect(detailData.technologies.map((t: { id: number }) => t.id)).toEqual([techB.id, techA.id]);
  });

  it("rechaza más de 30 tecnologías con 400", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/technologies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technologyIds: Array.from({ length: 31 }, (_, i) => i + 1) }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/portfolio/projects/[id]/metrics", () => {
  it("guarda métricas nuevas", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/metrics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: [{ value: "−60%", label: { es: "tiempo de despacho", en: "dispatch time", fr: "délai" } }] }),
    });
    expect(res.status).toBe(200);
    const row = await query("SELECT value FROM portfolio_project_metrics WHERE project_id = $1;", [project.id]);
    expect(row.rows[0].value).toBe("−60%");
  });

  it("rechaza más de 6 métricas con 400", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/metrics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: Array.from({ length: 7 }, () => ({ value: "1", label: { es: "x", en: "x", fr: "x" } })) }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/portfolio/projects/[id]/cover", () => {
  it("fija la portada del caso", async () => {
    const project = await createTestPortfolioProject();
    const imageRes = await withTransaction((c) =>
      c.query(
        `INSERT INTO portfolio_project_images (project_id, storage_key, variants, width, height) VALUES ($1,'key.webp','{}','100','100') RETURNING id;`,
        [project.id]
      )
    );
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/cover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: imageRes.rows[0].id }),
    });
    expect(res.status).toBe(200);
    const row = await query("SELECT cover_image_id FROM portfolio_projects WHERE id = $1;", [project.id]);
    expect(row.rows[0].cover_image_id).toBe(imageRes.rows[0].id);
  });

  it("permite quitar la portada con null", async () => {
    const project = await createTestPortfolioProject();
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/projects/${project.id}/cover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: null }),
    });
    expect(res.status).toBe(200);
  });
});

describe("GET/POST /api/portfolio/technologies", () => {
  it("lista tecnologías con su conteo de uso", async () => {
    await withTransaction((c) => createTechnology({ slug: "react", name: "React", category: "frontend", iconSource: "simple-icons", iconRef: "react" }, c));
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies");
    expect(res.status).toBe(200);
    const { technologies } = await res.json();
    expect(technologies.find((t: { slug: string }) => t.slug === "react").projectCount).toBe(0);
  });

  it("crea una tecnología nueva", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "vuejs", name: "Vue.js", category: "frontend", iconSource: "simple-icons", iconRef: "vuedotjs" }),
    });
    expect(res.status).toBe(200);
  });

  it("rechaza un slug duplicado con 409", async () => {
    await withTransaction((c) => createTechnology({ slug: "react", name: "React", category: "frontend", iconSource: "simple-icons", iconRef: "react" }, c));
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "react", name: "React otra vez", category: "frontend", iconSource: "simple-icons", iconRef: "react" }),
    });
    expect(res.status).toBe(409);
  });

  it("sales_manager sin portfolio:write recibe 403 al crear", async () => {
    const client = await salesManagerClient();
    const res = await client.fetch("/api/portfolio/technologies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "vuejs", name: "Vue.js", category: "frontend", iconSource: "simple-icons", iconRef: "vuedotjs" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH/DELETE /api/portfolio/technologies/[id]", () => {
  it("edita una tecnología existente", async () => {
    const tech = await withTransaction((c) => createTechnology({ slug: "react", name: "React", category: "frontend", iconSource: "simple-icons", iconRef: "react" }, c));
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/technologies/${tech.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "React 19" }),
    });
    expect(res.status).toBe(200);
  });

  it("elimina una tecnología sin uso", async () => {
    const tech = await withTransaction((c) => createTechnology({ slug: "react", name: "React", category: "frontend", iconSource: "simple-icons", iconRef: "react" }, c));
    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/technologies/${tech.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("rechaza eliminar una tecnología en uso con 409", async () => {
    const tech = await withTransaction((c) => createTechnology({ slug: "react", name: "React", category: "frontend", iconSource: "simple-icons", iconRef: "react" }, c));
    const project = await createTestPortfolioProject();
    await withTransaction((c) => c.query(`INSERT INTO portfolio_project_technologies (project_id, technology_id, sort_order) VALUES ($1,$2,0);`, [project.id, tech.id]));

    const client = await adminClient();
    const res = await client.fetch(`/api/portfolio/technologies/${tech.id}`, { method: "DELETE" });
    expect(res.status).toBe(409);
  });

  it("404 para un id inexistente", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies/999999", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/portfolio/technologies/icons/search", () => {
  it("busca íconos reales de simple-icons", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies/icons/search?q=react");
    expect(res.status).toBe(200);
    const { results } = await res.json();
    expect(results.some((r: { slug: string }) => r.slug === "react")).toBe(true);
  });

  it("devuelve vacío para una búsqueda de menos de 2 caracteres", async () => {
    const client = await adminClient();
    const res = await client.fetch("/api/portfolio/technologies/icons/search?q=r");
    const { results } = await res.json();
    expect(results).toEqual([]);
  });

  it("sales_manager sin portfolio:write recibe 403", async () => {
    const client = await salesManagerClient();
    const res = await client.fetch("/api/portfolio/technologies/icons/search?q=react");
    expect(res.status).toBe(403);
  });
});
