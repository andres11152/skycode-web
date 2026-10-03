import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTeamProfileAvatar,
  countArticlesByAuthorSlug,
  getAdminTeamProfile,
  createTeamProfile,
  getAdminTeamProfiles,
  getPublishedTeamProfiles,
  setTeamProfileAvatar,
  setTeamProfilePublished,
  softDeleteTeamProfile,
  updateTeamProfile,
  upsertTeamProfileTranslation,
} from "./teamProfiles";
import { query, withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

/** Crea un perfil ya publicable: con su traducción en español completa. */
async function createPublishableProfile(slug: string, actorId: number, sortOrder = 0) {
  const id = await withTransaction((c) => createTeamProfile({ slug, sortOrder, createdBy: actorId }, c));
  await withTransaction((c) =>
    upsertTeamProfileTranslation(id, "es", { name: "Andrés Betancourt", publicRole: "Backend", publicBio: "Bio ES" }, c)
  );
  return id;
}

describe("getPublishedTeamProfiles", () => {
  it("solo devuelve los publicados y no borrados, en el orden configurado", async () => {
    const admin = await createTestUser();
    const segundo = await createPublishableProfile("segundo", admin.id, 2);
    const primero = await createPublishableProfile("primero", admin.id, 1);
    const borrador = await createPublishableProfile("borrador", admin.id, 0);
    const borrado = await createPublishableProfile("borrado", admin.id, 0);

    await withTransaction((c) => setTeamProfilePublished(segundo, true, admin.id, c));
    await withTransaction((c) => setTeamProfilePublished(primero, true, admin.id, c));
    await withTransaction((c) => setTeamProfilePublished(borrado, true, admin.id, c));
    await withTransaction((c) => softDeleteTeamProfile(borrado, c));
    // `borrador` nunca se publica.
    void borrador;

    const members = await getPublishedTeamProfiles("es");
    expect(members.map((m) => m.slug)).toEqual(["primero", "segundo"]);
  });

  it("cae al español cuando falta la traducción del locale pedido", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));

    const [fr] = await getPublishedTeamProfiles("fr");
    expect(fr.role).toBe("Backend");
    expect(fr.description).toBe("Bio ES");
  });

  it("usa la traducción del locale cuando sí existe", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    await withTransaction((c) =>
      upsertTeamProfileTranslation(id, "en", { name: "Andres Betancourt", publicRole: "Backend & Architecture", publicBio: "Bio EN" }, c)
    );
    await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));

    const [en] = await getPublishedTeamProfiles("en");
    expect(en.role).toBe("Backend & Architecture");
    expect(en.description).toBe("Bio EN");
  });

  it("expone la variante grande del avatar como `photo`, o null si no tiene", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));

    expect((await getPublishedTeamProfiles("es"))[0].photo).toBeNull();

    const variants = { sm: "https://cdn.test/x-sm.webp", md: "https://cdn.test/x-md.webp", lg: "https://cdn.test/x-lg.webp" };
    await withTransaction((c) => setTeamProfileAvatar(id, { storageKey: "x", variants }, c));

    expect((await getPublishedTeamProfiles("es"))[0].photo).toBe(variants.lg);
  });
});

describe("setTeamProfilePublished", () => {
  it("bloquea publicar sin traducción en español", async () => {
    const admin = await createTestUser();
    const id = await withTransaction((c) => createTeamProfile({ slug: "sin-traducir", sortOrder: 0, createdBy: admin.id }, c));

    const result = await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));
    expect(result.outcome).toBe("missing_spanish_translation");
    expect(await getPublishedTeamProfiles("es")).toHaveLength(0);
  });

  it("bloquea publicar si el cargo español está vacío", async () => {
    const admin = await createTestUser();
    const id = await withTransaction((c) => createTeamProfile({ slug: "a-medias", sortOrder: 0, createdBy: admin.id }, c));
    await withTransaction((c) =>
      upsertTeamProfileTranslation(id, "es", { name: "Alguien", publicRole: "   ", publicBio: "" }, c)
    );

    const result = await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));
    expect(result.outcome).toBe("missing_spanish_translation");
  });

  it("despublicar nunca valida nada", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));

    const result = await withTransaction((c) => setTeamProfilePublished(id, false, admin.id, c));
    expect(result.outcome).toBe("ok");
    expect(await getPublishedTeamProfiles("es")).toHaveLength(0);
  });

  it("devuelve not_found para un id inexistente", async () => {
    const admin = await createTestUser();
    const result = await withTransaction((c) => setTeamProfilePublished(999999, true, admin.id, c));
    expect(result.outcome).toBe("not_found");
  });
});

describe("enlace opcional con una cuenta de usuario", () => {
  it("un perfil público puede existir sin cuenta enlazada", async () => {
    const admin = await createTestUser();
    await createPublishableProfile("ximena-calderon", admin.id);

    const [profile] = await getAdminTeamProfiles();
    expect(profile.userId).toBeNull();
    expect(profile.linkedUserName).toBeNull();
  });

  it("al enlazar una cuenta expone su nombre sin un segundo fetch", async () => {
    const admin = await createTestUser({ name: "Admin Real" });
    const id = await createPublishableProfile("andres-betancourt", admin.id);

    await withTransaction((c) => updateTeamProfile(id, { userId: admin.id }, admin.id, c));

    const [profile] = await getAdminTeamProfiles();
    expect(profile.userId).toBe(admin.id);
    expect(profile.linkedUserName).toBe("Admin Real");
  });

  it("borrar la cuenta enlazada NO borra la ficha pública, solo la desvincula", async () => {
    const admin = await createTestUser();
    const persona = await createTestUser({ name: "Se Va" });
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    await withTransaction((c) => updateTeamProfile(id, { userId: persona.id }, admin.id, c));
    await withTransaction((c) => setTeamProfilePublished(id, true, admin.id, c));

    await query("DELETE FROM users WHERE id = $1;", [persona.id]);

    const [profile] = await getAdminTeamProfiles();
    expect(profile.userId).toBeNull();
    expect(await getPublishedTeamProfiles("es")).toHaveLength(1);
  });
});

describe("updateTeamProfile", () => {
  it("cambiar el slug es posible pero sigue siendo único", async () => {
    const admin = await createTestUser();
    const a = await createPublishableProfile("uno", admin.id);
    await createPublishableProfile("dos", admin.id);

    await withTransaction((c) => updateTeamProfile(a, { slug: "uno-editado" }, admin.id, c));
    expect((await getAdminTeamProfiles()).map((p) => p.slug).sort()).toEqual(["dos", "uno-editado"]);

    await expect(withTransaction((c) => updateTeamProfile(a, { slug: "dos" }, admin.id, c))).rejects.toThrow();
  });

  it("devuelve false para un perfil borrado", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("borrado", admin.id);
    await withTransaction((c) => softDeleteTeamProfile(id, c));

    const updated = await withTransaction((c) => updateTeamProfile(id, { sortOrder: 9 }, admin.id, c));
    expect(updated).toBe(false);
  });
});

describe("getAdminTeamProfile / clearTeamProfileAvatar / countArticlesByAuthorSlug", () => {
  it("lee un perfil con sus traducciones y null si está borrado", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);

    const profile = await getAdminTeamProfile(id);
    expect(profile?.translations.es?.name).toBe("Andrés Betancourt");
    expect(profile?.translations.en).toBeNull();

    await withTransaction((c) => softDeleteTeamProfile(id, c));
    expect(await getAdminTeamProfile(id)).toBeNull();
  });

  it("quitar la foto devuelve la clave anterior y deja el perfil sin foto", async () => {
    const admin = await createTestUser();
    const id = await createPublishableProfile("andres-betancourt", admin.id);
    const variants = { sm: "https://cdn.test/a-sm.webp", md: "https://cdn.test/a-md.webp", lg: "https://cdn.test/a-lg.webp" };
    await withTransaction((c) => setTeamProfileAvatar(id, { storageKey: "k1", variants }, c));

    expect(await withTransaction((c) => clearTeamProfileAvatar(id, c))).toBe("k1");
    expect((await getAdminTeamProfile(id))?.avatar).toBeNull();
  });

  it("cuenta los artículos que citan el slug como autor", async () => {
    await query(
      `INSERT INTO articles (slug, locale, title, description, author, author_slug, tags, content, status)
       VALUES ('post-a','es','A','d','Andrés','andres-betancourt','{}','[]','published'),
              ('post-b','es','B','d','Otra','otra-persona','{}','[]','published');`
    );
    expect(await countArticlesByAuthorSlug("andres-betancourt")).toBe(1);
    expect(await countArticlesByAuthorSlug("nadie")).toBe(0);
  });
});
