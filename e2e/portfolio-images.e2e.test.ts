import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { loginAs, TestClient } from "./helpers/client";
import { createTestPortfolioProject, createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

beforeEach(async () => {
  await resetTestDb();
});

/** Imagen sintética real (no un buffer arbitrario) — el pipeline real de `sharp` la procesa igual que una subida real. */
async function testImageFile(name = "captura.png", width = 1200, height = 800): Promise<File> {
  const buffer = await sharp({ create: { width, height, channels: 3, background: { r: 0, g: 137, b: 205 } } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

function imageFormData(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

describe("POST /api/portfolio/projects/[id]/images — subida", () => {
  it("admin (portfolio:write) sube una imagen y queda con sus 3 variantes", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    expect(res.status).toBe(200);
    const { image } = await res.json();
    expect(image.variants.sm).toContain("-sm.webp");
    expect(image.variants.md).toContain("-md.webp");
    expect(image.variants.lg).toContain("-lg.webp");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(800);

    const row = await query("SELECT project_id FROM portfolio_project_images WHERE id = $1;", [image.id]);
    expect(row.rows[0].project_id).toBe(project.id);
  });

  it("sales_manager sin portfolio:write recibe 403, no sube nada", async () => {
    const salesManager = await createTestUser({ role: "sales_manager", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const salesClient = await loginAs(salesManager.email, "SuperSecret123456");

    const res = await salesClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    expect(res.status).toBe(403);

    const count = await query("SELECT COUNT(*) FROM portfolio_project_images WHERE project_id = $1;", [project.id]);
    expect(Number(count.rows[0].count)).toBe(0);
  });

  it("un archivo que no es una imagen real da 400, sin importar la extensión", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const fakeImage = new File([new Uint8Array(Buffer.from("esto no es una imagen"))], "captura.png", { type: "image/png" });
    const res = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(fakeImage),
    });
    expect(res.status).toBe(400);
  });

  it("sin sesión, da 401", async () => {
    const project = await createTestPortfolioProject();
    const res = await new TestClient().fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    expect(res.status).toBe(401);
  });

  it("sin archivo adjunto, da 400", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/portfolio/images/[imageId] — texto alternativo", () => {
  it("guarda el alt de un idioma sin borrar el de otro ya guardado", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    const { image } = await uploadRes.json();

    await adminClient.patch(`/api/portfolio/images/${image.id}`, { alt: { es: "Captura del dashboard" } });
    await adminClient.patch(`/api/portfolio/images/${image.id}`, { alt: { en: "Dashboard screenshot" } });

    const row = await query("SELECT alt FROM portfolio_project_images WHERE id = $1;", [image.id]);
    expect(row.rows[0].alt).toEqual({ es: "Captura del dashboard", en: "Dashboard screenshot" });
  });

  it("rechaza una clave de idioma que no es es/en/fr", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    const { image } = await uploadRes.json();

    const res = await adminClient.patch(`/api/portfolio/images/${image.id}`, { alt: { de: "Deutsch" } });
    expect(res.status).toBe(400);
  });

  it("sin portfolio:write, 403", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    const { image } = await uploadRes.json();

    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");
    const res = await traffikerClient.patch(`/api/portfolio/images/${image.id}`, { alt: { es: "X" } });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/portfolio/images/[imageId]", () => {
  it("admin borra la imagen y ya no aparece en la fila", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const uploadRes = await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, {
      method: "POST",
      body: imageFormData(await testImageFile()),
    });
    const { image } = await uploadRes.json();

    const res = await adminClient.delete(`/api/portfolio/images/${image.id}`);
    expect(res.status).toBe(200);

    const row = await query("SELECT id FROM portfolio_project_images WHERE id = $1;", [image.id]);
    expect(row.rows).toEqual([]);
  });

  it("una imagen inexistente da 404", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.delete("/api/portfolio/images/999999");
    expect(res.status).toBe(404);
  });

  it("sin portfolio:write, 403", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await traffikerClient.delete("/api/portfolio/images/1");
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/portfolio/projects/[id]/images/reorder", () => {
  it("reordena la galería completa", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");
    const first = await (
      await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, { method: "POST", body: imageFormData(await testImageFile("a.png")) })
    ).json();
    const second = await (
      await adminClient.fetch(`/api/portfolio/projects/${project.id}/images`, { method: "POST", body: imageFormData(await testImageFile("b.png")) })
    ).json();

    const res = await adminClient.patch(`/api/portfolio/projects/${project.id}/images/reorder`, {
      imageIds: [second.image.id, first.image.id],
    });
    expect(res.status).toBe(200);

    const rows = await query("SELECT id, sort_order FROM portfolio_project_images WHERE project_id = $1 ORDER BY sort_order ASC;", [project.id]);
    expect(rows.rows.map((r: { id: number }) => r.id)).toEqual([second.image.id, first.image.id]);
  });

  it("una lista vacía da 400", async () => {
    const admin = await createTestUser({ role: "admin", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const adminClient = await loginAs(admin.email, "SuperSecret123456");

    const res = await adminClient.patch(`/api/portfolio/projects/${project.id}/images/reorder`, { imageIds: [] });
    expect(res.status).toBe(400);
  });

  it("sin portfolio:write, 403", async () => {
    const traffiker = await createTestUser({ role: "traffiker", password: "SuperSecret123456" });
    const project = await createTestPortfolioProject();
    const traffikerClient = await loginAs(traffiker.email, "SuperSecret123456");

    const res = await traffikerClient.patch(`/api/portfolio/projects/${project.id}/images/reorder`, { imageIds: [1] });
    expect(res.status).toBe(403);
  });
});
