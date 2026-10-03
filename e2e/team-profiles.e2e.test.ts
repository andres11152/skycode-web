import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loginAs, TestClient } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { query } from "../src/lib/db";

const PASSWORD = "SuperSecret123456";

beforeEach(async () => {
  await resetTestDb();
});

async function admin() {
  const user = await createTestUser({ role: "admin", password: PASSWORD });
  return { user, client: await loginAs(user.email, PASSWORD) };
}

async function createProfile(client: TestClient, slug: string, name: string, publicRole = "Backend") {
  const res = await client.post("/api/team-profiles", { slug });
  const { id } = await res.json();
  await client.patch(`/api/team-profiles/${id}/translations/es`, { name, publicRole, publicBio: "Bio" });
  return id as number;
}

async function portraitFile(): Promise<File> {
  const buffer = await sharp({ create: { width: 900, height: 1200, channels: 3, background: { r: 30, g: 30, b: 30 } } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "retrato.png", { type: "image/png" });
}

describe("CRUD /api/team-profiles", () => {
  it("un admin crea, traduce y publica un perfil, y aparece en /equipo con su ancla", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "ana-gomez", "Ana Gómez");

    expect((await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true })).status).toBe(200);

    const page = await new TestClient().get("/equipo");
    const html = await page.text();
    expect(html).toContain("Ana Gómez");
    // El id del ancla es el que enlaza el blog (lib/blogPaths.ts::authorUrl).
    expect(html).toContain('id="ana-gomez"');
  });

  it("un borrador no aparece en la web", async () => {
    const { client } = await admin();
    await createProfile(client, "en-borrador", "Persona Borrador");

    const html = await (await new TestClient().get("/equipo")).text();
    expect(html).not.toContain("Persona Borrador");
  });

  it("no deja publicar sin cargo en español", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "sin-cargo", "Sin Cargo", "");

    const res = await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true });
    expect(res.status).toBe(400);
  });

  it("la versión en inglés usa su traducción y cae al español si falta", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "ana-gomez", "Ana Gómez", "Backend & Arquitectura");
    await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true });

    expect(await (await new TestClient().get("/en/equipo")).text()).toContain("Backend &amp; Arquitectura");

    await client.patch(`/api/team-profiles/${id}/translations/en`, { name: "Ana Gomez", publicRole: "Backend & Architecture", publicBio: "Bio" });
    expect(await (await new TestClient().get("/en/equipo")).text()).toContain("Backend &amp; Architecture");
  });

  it("slug duplicado da 409 y slug con formato inválido da 400", async () => {
    const { client } = await admin();
    await client.post("/api/team-profiles", { slug: "ana-gomez" });

    expect((await client.post("/api/team-profiles", { slug: "ana-gomez" })).status).toBe(409);
    expect((await client.post("/api/team-profiles", { slug: "Ana Gómez" })).status).toBe(400);
  });

  it("solo acepta enlaces https y rechaza idioma inválido", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "ana-gomez", "Ana Gómez");

    expect((await client.patch(`/api/team-profiles/${id}`, { linkedinUrl: "http://linkedin.com/in/ana" })).status).toBe(400);
    expect((await client.patch(`/api/team-profiles/${id}`, { linkedinUrl: "https://www.linkedin.com/in/ana" })).status).toBe(200);
    expect((await client.patch(`/api/team-profiles/${id}/translations/de`, { name: "X Y", publicRole: "", publicBio: "" })).status).toBe(400);
  });

  it("enlazar una cuenta: rechaza clientes y cuentas ya enlazadas a otro perfil", async () => {
    const { user, client } = await admin();
    const portal = await createTestUser({ role: "client" });
    const a = await createProfile(client, "uno", "Uno Uno");
    const b = await createProfile(client, "dos", "Dos Dos");

    expect((await client.patch(`/api/team-profiles/${a}`, { userId: portal.id })).status).toBe(400);
    expect((await client.patch(`/api/team-profiles/${a}`, { userId: user.id })).status).toBe(200);
    expect((await client.patch(`/api/team-profiles/${b}`, { userId: user.id })).status).toBe(409);
  });

  it("borrar un perfil publicado lo saca de la web", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "se-va", "Se Va");
    await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true });

    expect((await client.delete(`/api/team-profiles/${id}`)).status).toBe(200);
    expect(await (await new TestClient().get("/equipo")).text()).not.toContain("Se Va");
    expect((await client.delete(`/api/team-profiles/${id}`)).status).toBe(404);
  });

  it("sube una foto retrato conservando la proporción (no la recorta a cuadrado)", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "con-foto", "Con Foto");
    const form = new FormData();
    form.append("file", await portraitFile());

    const res = await client.fetch(`/api/team-profiles/${id}/photo`, { method: "POST", body: form });
    expect(res.status).toBe(200);
    const { photo } = await res.json();
    expect(photo.lg).toContain("-lg.webp");

    // El MinIO de prueba no sirve lectura anónima como el R2 real, así que
    // se lee el objeto con el SDK y las credenciales de .env.test.
    const s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_PORTFOLIO_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.R2_PORTFOLIO_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY! },
    });
    const key = String(photo.md).split("/").pop()!;
    const object = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_PORTFOLIO_BUCKET_NAME, Key: key }));
    const meta = await sharp(Buffer.from(await object.Body!.transformToByteArray())).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(1067); // 900x1200 escalado a 800 de ancho: sigue siendo retrato 3:4

    expect((await client.delete(`/api/team-profiles/${id}/photo`)).status).toBe(200);
    const row = await query("SELECT avatar_variants FROM team_profiles WHERE id = $1;", [id]);
    expect(row.rows[0].avatar_variants).toBeNull();
  });

  it("audita la creación y la publicación", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "auditado", "Auditado Uno");
    await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true });

    const actions = (await query("SELECT action FROM audit_log WHERE entity_type = 'team_profile' ORDER BY id;")).rows.map((r) => r.action);
    expect(actions).toEqual(["team_profile.create", "team_profile.translation_update", "team_profile.publish"]);
  });
});

describe("RBAC de perfiles públicos", () => {
  it("un sales_manager recibe 403 en todas las escrituras", async () => {
    const { client: adminClient } = await admin();
    const id = await createProfile(adminClient, "ana-gomez", "Ana Gómez");
    const manager = await createTestUser({ role: "sales_manager", password: PASSWORD });
    const client = await loginAs(manager.email, PASSWORD);

    expect((await client.get("/api/team-profiles")).status).toBe(403);
    expect((await client.post("/api/team-profiles", { slug: "otro" })).status).toBe(403);
    expect((await client.patch(`/api/team-profiles/${id}`, { sortOrder: 3 })).status).toBe(403);
    expect((await client.patch(`/api/team-profiles/${id}/publish`, { isPublished: true })).status).toBe(403);
    expect((await client.delete(`/api/team-profiles/${id}`)).status).toBe(403);
  });

  it("sin sesión, 401", async () => {
    expect((await new TestClient().post("/api/team-profiles", { slug: "x" })).status).toBe(401);
  });

  it("el panel de perfiles responde 200 a un admin", async () => {
    const { client } = await admin();
    const id = await createProfile(client, "ana-gomez", "Ana Gómez");
    expect((await client.get("/dashboard/perfiles-publicos")).status).toBe(200);
    expect((await client.get(`/dashboard/perfiles-publicos/${id}`)).status).toBe(200);
  });
});
