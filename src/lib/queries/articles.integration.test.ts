import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDb, createTestUser } from "../testHelpers/db";
import {
  approveAndPublish,
  articleExists,
  articleExistsForKeyword,
  createArticleDraft,
  deleteArticle,
  getArticleById,
  getArticlesPage,
  getPublishedArticleBySlug,
  getPublishedArticles,
  rejectArticle,
  submitForReview,
  unpublishArticle,
  updateArticleContent,
  type CreateArticleData,
} from "./articles";

beforeEach(async () => {
  await resetTestDb();
});

function draftData(overrides: Partial<CreateArticleData> = {}): CreateArticleData {
  return {
    slug: "post-de-prueba",
    locale: "es",
    title: "Título de prueba",
    description: "Descripción de prueba",
    author: "Ana Dev",
    authorSlug: "ana-dev",
    tags: ["Arquitectura"],
    content: [{ type: "paragraph", text: "Contenido de prueba." }],
    ...overrides,
  };
}

describe("createArticleDraft / getArticleById", () => {
  it("crea un borrador y lo puede leer por id", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);

    const article = await getArticleById(id);
    expect(article).not.toBeNull();
    expect(article?.status).toBe("draft");
    expect(article?.slug).toBe("post-de-prueba");
    expect(article?.createdBy).toBe(Number(user.id));
    expect(article?.publishedAt).toBeNull();
  });

  it("permite created_by NULL (borradores generados por el cron)", async () => {
    const id = await createArticleDraft(draftData({ slug: "generado-por-cron", targetKeyword: "arquitectura hexagonal" }), null);
    const article = await getArticleById(id);
    expect(article?.createdBy).toBeNull();
    expect(article?.targetKeyword).toBe("arquitectura hexagonal");
  });
});

describe("flujo draft -> review -> published", () => {
  it("no aparece en getPublishedArticles hasta que se aprueba", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);

    expect(await getPublishedArticles("es")).toHaveLength(0);
    expect(await getPublishedArticleBySlug("post-de-prueba", "es")).toBeNull();

    await submitForReview(id);
    expect(await getPublishedArticles("es")).toHaveLength(0);

    const result = await approveAndPublish(id, user.id);
    expect(result).toEqual({ slug: "post-de-prueba", locale: "es" });

    const published = await getPublishedArticles("es");
    expect(published).toHaveLength(1);
    expect(published[0].slug).toBe("post-de-prueba");

    const bySlug = await getPublishedArticleBySlug("post-de-prueba", "es");
    expect(bySlug?.title).toBe("Título de prueba");
  });

  it("submitForReview solo avanza desde draft, no desde otros estados", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);

    // ya está en review, un segundo submit no debería hacer nada
    const secondAttempt = await submitForReview(id);
    expect(secondAttempt).toBe(false);
  });

  it("approveAndPublish falla si el artículo no está en review", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    // todavía en draft, no en review
    const result = await approveAndPublish(id, user.id);
    expect(result).toBeNull();
  });

  it("published_at no cambia al re-publicar después de una edición, solo updated_at", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);
    await approveAndPublish(id, user.id);

    const firstPublish = await getArticleById(id);
    const firstPublishedAt = firstPublish?.publishedAt;
    expect(firstPublishedAt).not.toBeNull();

    // Despublicar, editar, y volver a publicar
    await unpublishArticle(id);
    await updateArticleContent(id, {
      slug: "post-de-prueba",
      title: "Título editado",
      description: "Descripción de prueba",
      author: "Ana Dev",
      authorSlug: "ana-dev",
      tags: ["Arquitectura"],
      content: [{ type: "paragraph", text: "Contenido editado." }],
    });
    await submitForReview(id);
    await approveAndPublish(id, user.id);

    const secondPublish = await getArticleById(id);
    expect(secondPublish?.publishedAt).toBe(firstPublishedAt);
    expect(secondPublish?.title).toBe("Título editado");
  });
});

describe("rejectArticle", () => {
  it("vuelve review -> draft con el motivo, y limpia rejection_reason al aprobar después", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);

    const rejected = await rejectArticle(id, "Falta profundidad técnica.");
    expect(rejected).toBe(true);

    const article = await getArticleById(id);
    expect(article?.status).toBe("draft");
    expect(article?.rejectionReason).toBe("Falta profundidad técnica.");

    await submitForReview(id);
    await approveAndPublish(id, user.id);
    const published = await getArticleById(id);
    expect(published?.rejectionReason).toBeNull();
  });
});

describe("unpublishArticle", () => {
  it("published -> draft, deja de aparecer en getPublishedArticles pero conserva el contenido", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);
    await approveAndPublish(id, user.id);

    const result = await unpublishArticle(id);
    expect(result).toEqual({ slug: "post-de-prueba", locale: "es" });

    expect(await getPublishedArticles("es")).toHaveLength(0);
    const article = await getArticleById(id);
    expect(article?.status).toBe("draft");
    expect(article?.title).toBe("Título de prueba");
  });
});

describe("updateArticleContent", () => {
  it("edita slug/título/contenido mientras está en draft o review", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);

    const updated = await updateArticleContent(id, {
      slug: "post-renombrado",
      title: "Nuevo título",
      description: "Nueva descripción",
      author: "Otro Autor",
      authorSlug: "otro-autor",
      tags: ["Backend", "APIs"],
      content: [{ type: "heading", level: 2, text: "Nuevo encabezado" }],
    });
    expect(updated).toBe(true);

    const article = await getArticleById(id);
    expect(article?.slug).toBe("post-renombrado");
    expect(article?.tags).toEqual(["Backend", "APIs"]);
  });

  it("no permite editar un artículo ya publicado", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);
    await approveAndPublish(id, user.id);

    const updated = await updateArticleContent(id, {
      slug: "post-de-prueba",
      title: "Intento de edición post-publicación",
      description: "Descripción de prueba",
      author: "Ana Dev",
      authorSlug: "ana-dev",
      tags: [],
      content: [],
    });
    expect(updated).toBe(false);

    const article = await getArticleById(id);
    expect(article?.title).toBe("Título de prueba");
  });
});

describe("deleteArticle", () => {
  it("borrado lógico de un draft: wasPublished=false, no aparece más y no se puede volver a borrar", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);

    const result = await deleteArticle(id);
    expect(result).toEqual({ slug: "post-de-prueba", locale: "es", wasPublished: false });

    expect(await getArticleById(id)).toBeNull();
    expect(await deleteArticle(id)).toBeNull();
  });

  it("borrado lógico de un artículo publicado: wasPublished=true", async () => {
    const user = await createTestUser({ role: "admin" });
    const id = await createArticleDraft(draftData(), user.id);
    await submitForReview(id);
    await approveAndPublish(id, user.id);

    const result = await deleteArticle(id);
    expect(result).toEqual({ slug: "post-de-prueba", locale: "es", wasPublished: true });
    expect(await getPublishedArticles("es")).toHaveLength(0);
  });

  it("devuelve null para un id inexistente (no confunde 'no encontrado' con 'borrador sin publicar')", async () => {
    expect(await deleteArticle(999999)).toBeNull();
  });
});

describe("articleExists / articleExistsForKeyword", () => {
  it("detecta duplicados por slug+locale y por target_keyword+locale", async () => {
    const user = await createTestUser({ role: "admin" });
    await createArticleDraft(draftData({ targetKeyword: "deuda técnica" }), user.id);

    expect(await articleExists("post-de-prueba", "es")).toBe(true);
    expect(await articleExists("post-de-prueba", "en")).toBe(false);
    expect(await articleExists("otro-slug", "es")).toBe(false);

    expect(await articleExistsForKeyword("deuda técnica", "es")).toBe(true);
    expect(await articleExistsForKeyword("deuda técnica", "en")).toBe(false);
    expect(await articleExistsForKeyword("otra query", "es")).toBe(false);
  });
});

describe("getArticlesPage", () => {
  it("filtra por status y pagina, más reciente actualizado primero", async () => {
    const user = await createTestUser({ role: "admin" });
    const draftId = await createArticleDraft(draftData({ slug: "draft-1" }), user.id);
    const reviewId = await createArticleDraft(draftData({ slug: "review-1" }), user.id);
    await submitForReview(reviewId);

    const draftsOnly = await getArticlesPage({ status: "draft", locale: "ALL", q: "", page: 1, pageSize: 20 });
    expect(draftsOnly.total).toBe(1);
    expect(draftsOnly.articles[0].id).toBe(draftId);

    const all = await getArticlesPage({ status: "ALL", locale: "ALL", q: "", page: 1, pageSize: 20 });
    expect(all.total).toBe(2);
  });

  it("búsqueda libre por título/slug", async () => {
    const user = await createTestUser({ role: "admin" });
    await createArticleDraft(draftData({ slug: "arquitectura-hexagonal", title: "Arquitectura Hexagonal en la práctica" }), user.id);
    await createArticleDraft(draftData({ slug: "otro-tema", title: "Otro tema completamente distinto" }), user.id);

    const result = await getArticlesPage({ status: "ALL", locale: "ALL", q: "hexagonal", page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.articles[0].slug).toBe("arquitectura-hexagonal");
  });
});
