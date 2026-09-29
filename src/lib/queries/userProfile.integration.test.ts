import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import {
  changeUserPassword,
  clearUserAvatar,
  getUserPasswordHash,
  getUserProfile,
  setUserAvatar,
  updateOwnProfile,
} from "./userProfile";
import { getActiveUserSessions } from "./sessions";
import { query, withTransaction } from "../db";
import { createTestSession, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("getUserProfile", () => {
  it("nunca devuelve password_hash ni el secreto TOTP", async () => {
    const user = await createTestUser();
    await query("UPDATE users SET totp_secret = 'SECRETO', totp_enabled = true WHERE id = $1;", [user.id]);

    const profile = await getUserProfile(user.id);

    expect(profile).not.toBeNull();
    // Si alguien cambia el SELECT a `SELECT *`, este test lo atrapa antes
    // de que esos campos terminen en el diff de auditoría o en el payload
    // que viaja al navegador.
    expect(Object.keys(profile!)).not.toContain("password_hash");
    expect(JSON.stringify(profile)).not.toContain("SECRETO");
  });

  it("arranca con los defaults de la migración y sin avatar", async () => {
    const user = await createTestUser();
    const profile = await getUserProfile(user.id);

    expect(profile?.timezone).toBe("America/Bogota");
    expect(profile?.locale).toBe("es");
    expect(profile?.avatar).toBeNull();
    expect(profile?.phone).toBeNull();
  });

  it("devuelve null para un id inexistente", async () => {
    expect(await getUserProfile(999999)).toBeNull();
  });
});

describe("updateOwnProfile", () => {
  it("actualiza solo los campos enviados y deja el resto intacto", async () => {
    const user = await createTestUser({ name: "Nombre Original" });
    await withTransaction((c) => updateOwnProfile(user.id, { phone: "+57 300 000 0000" }, c));

    const profile = await getUserProfile(user.id);
    expect(profile?.phone).toBe("+57 300 000 0000");
    expect(profile?.name).toBe("Nombre Original");
  });

  it("distingue 'no lo mandó' de 'lo mandó vacío' — un campo opcional se puede borrar", async () => {
    const user = await createTestUser();
    await withTransaction((c) => updateOwnProfile(user.id, { phone: "+57 300 000 0000", bio: "Hola" }, c));

    // Mandar solo `bio` no debe tocar `phone`...
    await withTransaction((c) => updateOwnProfile(user.id, { bio: "Actualizada" }, c));
    let profile = await getUserProfile(user.id);
    expect(profile?.phone).toBe("+57 300 000 0000");
    expect(profile?.bio).toBe("Actualizada");

    // ...pero mandarlo explícitamente en null sí debe limpiarlo.
    await withTransaction((c) => updateOwnProfile(user.id, { phone: null }, c));
    profile = await getUserProfile(user.id);
    expect(profile?.phone).toBeNull();
  });

  it("NUNCA escribe sobre otro usuario, aunque se repita el nombre", async () => {
    const victim = await createTestUser({ name: "Víctima" });
    const attacker = await createTestUser({ name: "Atacante" });

    await withTransaction((c) => updateOwnProfile(attacker.id, { name: "Cambiado" }, c));

    expect((await getUserProfile(victim.id))?.name).toBe("Víctima");
    expect((await getUserProfile(attacker.id))?.name).toBe("Cambiado");
  });

  it("mueve `updated_at` al guardar", async () => {
    const user = await createTestUser();
    const before = await getUserProfile(user.id);
    await new Promise((r) => setTimeout(r, 10));
    await withTransaction((c) => updateOwnProfile(user.id, { name: "Nuevo" }, c));
    const after = await getUserProfile(user.id);

    expect(new Date(after!.updatedAt).getTime()).toBeGreaterThan(new Date(before!.updatedAt).getTime());
  });
});

describe("avatar", () => {
  const variants = { sm: "https://cdn.test/a-sm.webp", md: "https://cdn.test/a-md.webp", lg: "https://cdn.test/a-lg.webp" };

  it("guarda las variantes y devuelve null como clave anterior la primera vez", async () => {
    const user = await createTestUser();
    const previous = await withTransaction((c) => setUserAvatar(user.id, { storageKey: "key-1", variants }, c));

    expect(previous).toBeNull();
    expect((await getUserProfile(user.id))?.avatar).toEqual(variants);
  });

  it("al reemplazarlo devuelve la clave vieja, para poder borrar esos archivos del bucket", async () => {
    const user = await createTestUser();
    await withTransaction((c) => setUserAvatar(user.id, { storageKey: "key-1", variants }, c));
    const previous = await withTransaction((c) =>
      setUserAvatar(user.id, { storageKey: "key-2", variants }, c)
    );

    expect(previous).toBe("key-1");
  });

  it("clearUserAvatar deja el perfil sin foto y devuelve la clave que había", async () => {
    const user = await createTestUser();
    await withTransaction((c) => setUserAvatar(user.id, { storageKey: "key-1", variants }, c));

    const previous = await withTransaction((c) => clearUserAvatar(user.id, c));

    expect(previous).toBe("key-1");
    expect((await getUserProfile(user.id))?.avatar).toBeNull();
  });
});

describe("changeUserPassword", () => {
  it("rota el hash y revoca las demás sesiones, dejando viva la actual", async () => {
    const user = await createTestUser();
    const current = await createTestSession(user.id);
    await createTestSession(user.id);
    await createTestSession(user.id);
    expect(await getActiveUserSessions(user.id)).toHaveLength(3);

    const newHash = await bcrypt.hash("una-contrasena-nueva-larga", 10);
    await withTransaction((c) => changeUserPassword(user.id, newHash, current.id, c));

    const remaining = await getActiveUserSessions(user.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(current.id);
    expect(await getUserPasswordHash(user.id)).toBe(newHash);
  });

  it("no toca las sesiones de otra persona", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const current = await createTestSession(user.id);
    await createTestSession(other.id);

    const newHash = await bcrypt.hash("una-contrasena-nueva-larga", 10);
    await withTransaction((c) => changeUserPassword(user.id, newHash, current.id, c));

    expect(await getActiveUserSessions(other.id)).toHaveLength(1);
  });
});
