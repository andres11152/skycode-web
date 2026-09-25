import { beforeEach, describe, expect, it } from "vitest";
import {
  getPublishedPortfolioProjects,
  getPublishedPortfolioProjectBySlug,
  getPublishedPortfolioSlugs,
  getAdminPortfolioList,
  getAdminPortfolioDetail,
  createPortfolioProject,
  updatePortfolioProjectMeta,
  upsertPortfolioTranslation,
  setPortfolioProjectStatus,
  softDeletePortfolioProject,
  addPortfolioProjectImage,
  removePortfolioProjectImage,
  reorderPortfolioProjectImages,
  setPortfolioProjectCoverImage,
  setPortfolioProjectTechnologies,
  setPortfolioProjectMetrics,
} from "./portfolio";
import { createTechnology } from "./portfolioTechnologies";
import { query, withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

async function createFullProject(admin: { id: number }) {
  const projectId = await withTransaction((c) => createPortfolioProject({ slug: "caso-prueba", industryIcon: "Buildings" }, admin.id, c));
  await withTransaction((c) =>
    upsertPortfolioTranslation(
      projectId,
      "es",
      {
        title: "Caso de Prueba",
        clientLabel: "Cliente de Prueba",
        summary: "Resumen del caso",
        challenge: "El reto",
        solution: "La solución",
        results: "Los resultados",
        capabilities: ["Catálogo Digital"],
      },
      c
    )
  );
  const imageId = await withTransaction((c) =>
    addPortfolioProjectImage(
      projectId,
      { storageKey: "abc123.webp", variants: { sm: "https://media.test/abc-400.webp", md: "https://media.test/abc-800.webp", lg: "https://media.test/abc-1600.webp" }, width: 1600, height: 900 },
      c
    )
  );
  await withTransaction((c) => setPortfolioProjectCoverImage(projectId, imageId, c));
  return { projectId, imageId };
}

describe("getPublishedPortfolioProjects / getPublishedPortfolioProjectBySlug", () => {
  it("no devuelve nada mientras el proyecto está en borrador", async () => {
    const admin = await createTestUser({ role: "admin" });
    await createFullProject(admin);

    expect(await getPublishedPortfolioProjects("es")).toEqual([]);
    expect(await getPublishedPortfolioProjectBySlug("caso-prueba", "es")).toBeNull();
    expect(await getPublishedPortfolioSlugs()).toEqual([]);
  });

  it("aparece publicado después de setPortfolioProjectStatus('published') con portada y español completos", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);

    const result = await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    expect(result).toEqual({ outcome: "ok" });

    const list = await getPublishedPortfolioProjects("es");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Caso de Prueba");
    expect(list[0].coverImage?.variants.lg).toBe("https://media.test/abc-1600.webp");

    const detail = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");
    expect(detail?.challenge).toBe("El reto");

    expect(await getPublishedPortfolioSlugs()).toEqual(["caso-prueba"]);
  });

  it("rechaza publicar sin portada", async () => {
    const admin = await createTestUser({ role: "admin" });
    const projectId = await withTransaction((c) => createPortfolioProject({ slug: "sin-portada", industryIcon: "Buildings" }, admin.id, c));
    await withTransaction((c) =>
      upsertPortfolioTranslation(
        projectId,
        "es",
        { title: "T", clientLabel: "C", summary: "S", challenge: "", solution: "", results: "", capabilities: [] },
        c
      )
    );

    const result = await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    expect(result).toEqual({ outcome: "missing_cover_image" });
    expect(await getPublishedPortfolioProjects("es")).toEqual([]);
  });

  it("rechaza publicar sin título/resumen en español", async () => {
    const admin = await createTestUser({ role: "admin" });
    const projectId = await withTransaction((c) => createPortfolioProject({ slug: "sin-espanol", industryIcon: "Buildings" }, admin.id, c));
    await withTransaction((c) =>
      addPortfolioProjectImage(projectId, { storageKey: "x.webp", variants: { sm: "s", md: "m", lg: "l" }, width: 100, height: 100 }, c)
    );

    const result = await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    expect(result).toEqual({ outcome: "missing_spanish_translation" });
  });

  it("cae a español cuando falta la traducción de un locale (con EsBadge en la UI)", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));

    const enDetail = await getPublishedPortfolioProjectBySlug("caso-prueba", "en");
    expect(enDetail?.title).toBe("Caso de Prueba"); // fallback a español, no vacío
  });

  it("un caso archivado deja de aparecer en público", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "archived", admin.id, c));

    expect(await getPublishedPortfolioProjects("es")).toEqual([]);
  });

  it("respeta sort_order, no el orden de creación", async () => {
    const admin = await createTestUser({ role: "admin" });
    const p1 = await withTransaction((c) => createPortfolioProject({ slug: "primero", industryIcon: "Buildings" }, admin.id, c));
    const p2 = await withTransaction((c) => createPortfolioProject({ slug: "segundo", industryIcon: "Buildings" }, admin.id, c));
    for (const [id, slug] of [[p1, "primero"], [p2, "segundo"]] as const) {
      await withTransaction((c) =>
        upsertPortfolioTranslation(id, "es", { title: slug, clientLabel: "C", summary: "S", challenge: "", solution: "", results: "", capabilities: [] }, c)
      );
      const imgId = await withTransaction((c) =>
        addPortfolioProjectImage(id, { storageKey: `${slug}.webp`, variants: { sm: "s", md: "m", lg: "l" }, width: 10, height: 10 }, c)
      );
      await withTransaction((c) => setPortfolioProjectCoverImage(id, imgId, c));
      await withTransaction((c) => setPortfolioProjectStatus(id, "published", admin.id, c));
    }
    await withTransaction((c) => updatePortfolioProjectMeta(p2, { sortOrder: 0 }, admin.id, c));
    await withTransaction((c) => updatePortfolioProjectMeta(p1, { sortOrder: 1 }, admin.id, c));

    const list = await getPublishedPortfolioProjects("es");
    expect(list.map((p) => p.slug)).toEqual(["segundo", "primero"]);
  });

  it("no vuelve a fijar published_at al re-publicar tras archivar", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    const first = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");

    await withTransaction((c) => setPortfolioProjectStatus(projectId, "archived", admin.id, c));
    await new Promise((r) => setTimeout(r, 20));
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));
    const second = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");

    expect(second?.publishedAt).toBe(first?.publishedAt);
  });
});

describe("tecnologías y métricas de un proyecto", () => {
  it("un caso publicado trae sus tecnologías en el orden asignado, con ícono", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    const next = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const pg = await withTransaction((c) => createTechnology({ slug: "postgresql", name: "PostgreSQL", category: "database", iconSource: "simple-icons", iconRef: "postgresql" }, c));

    await withTransaction((c) => setPortfolioProjectTechnologies(projectId, [pg.id, next.id], c));
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));

    const detail = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");
    expect(detail?.technologies.map((t) => t.slug)).toEqual(["postgresql", "nextjs"]);
  });

  it("no puede borrarse una tecnología en uso (ON DELETE RESTRICT)", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    const tech = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    await withTransaction((c) => setPortfolioProjectTechnologies(projectId, [tech.id], c));

    const { deleteTechnology } = await import("./portfolioTechnologies");
    const result = await withTransaction((c) => deleteTechnology(tech.id, c));
    expect(result).toEqual({ outcome: "in_use", projectCount: 1 });
  });

  it("las métricas se devuelven con su label resuelto al locale pedido", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    await withTransaction((c) =>
      setPortfolioProjectMetrics(projectId, [{ value: "-60%", label: { es: "Tiempo de despacho", en: "Dispatch time" } }], c)
    );
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));

    const es = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");
    const en = await getPublishedPortfolioProjectBySlug("caso-prueba", "en");
    expect(es?.metrics[0]).toEqual({ value: "-60%", label: "Tiempo de despacho" });
    expect(en?.metrics[0]).toEqual({ value: "-60%", label: "Dispatch time" });
  });
});

describe("imágenes", () => {
  it("reordenar imágenes cambia el orden en que se devuelven", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId, imageId: firstImage } = await createFullProject(admin);
    const secondImage = await withTransaction((c) =>
      addPortfolioProjectImage(projectId, { storageKey: "second.webp", variants: { sm: "s2", md: "m2", lg: "l2" }, width: 10, height: 10 }, c)
    );
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));

    await withTransaction((c) => reorderPortfolioProjectImages(projectId, [secondImage, firstImage], c));

    const detail = await getPublishedPortfolioProjectBySlug("caso-prueba", "es");
    expect(detail?.images.map((img) => img.id)).toEqual([secondImage, firstImage]);
  });

  it("borrar la imagen de portada la deja sin portada (ON DELETE SET NULL)", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId, imageId } = await createFullProject(admin);

    const removed = await withTransaction((c) => removePortfolioProjectImage(imageId, c));
    expect(removed).toEqual({ storageKey: "abc123.webp" });

    const row = await query(`SELECT cover_image_id FROM portfolio_projects WHERE id = $1;`, [projectId]);
    expect(row.rows[0].cover_image_id).toBeNull();
  });
});

describe("panel de administración", () => {
  it("getAdminPortfolioList incluye borradores, con el título en español", async () => {
    const admin = await createTestUser({ role: "admin" });
    await createFullProject(admin);

    const list = await getAdminPortfolioList();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("draft");
    expect(list[0].titleEs).toBe("Caso de Prueba");
  });

  it("getAdminPortfolioDetail trae las 3 traducciones, con null donde falta", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);

    const detail = await getAdminPortfolioDetail(projectId);
    expect(detail?.translations.es?.title).toBe("Caso de Prueba");
    expect(detail?.translations.en).toBeNull();
    expect(detail?.translations.fr).toBeNull();
  });

  it("softDeletePortfolioProject lo saca del listado admin y del público", async () => {
    const admin = await createTestUser({ role: "admin" });
    const { projectId } = await createFullProject(admin);
    await withTransaction((c) => setPortfolioProjectStatus(projectId, "published", admin.id, c));

    await withTransaction((c) => softDeletePortfolioProject(projectId, c));

    expect(await getAdminPortfolioList()).toEqual([]);
    expect(await getPublishedPortfolioProjects("es")).toEqual([]);
  });

  it("un id inexistente en getAdminPortfolioDetail devuelve null", async () => {
    expect(await getAdminPortfolioDetail(999999)).toBeNull();
  });
});
