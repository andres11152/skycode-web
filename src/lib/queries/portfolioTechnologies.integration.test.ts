import { beforeEach, describe, expect, it } from "vitest";
import { getAllTechnologies, getTechnologyUsageCounts, createTechnology, updateTechnology, deleteTechnology } from "./portfolioTechnologies";
import { createPortfolioProject, setPortfolioProjectTechnologies } from "./portfolio";
import { withTransaction } from "../db";
import { createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("createTechnology / getAllTechnologies", () => {
  it("crea una tecnología y la trae ordenada por categoría y nombre", async () => {
    await withTransaction((c) => createTechnology({ slug: "postgresql", name: "PostgreSQL", category: "database", iconSource: "simple-icons", iconRef: "postgresql" }, c));
    await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));

    // "database" ordena antes que "frontend" alfabéticamente.
    const all = await getAllTechnologies();
    expect(all.map((t) => t.slug)).toEqual(["postgresql", "nextjs"]);
  });

  it("acepta un ícono custom con su storage_key como icon_ref", async () => {
    const tech = await withTransaction((c) =>
      createTechnology({ slug: "stack-propio", name: "Stack Propio", category: "other", iconSource: "custom", iconRef: "abcd1234.svg" }, c)
    );
    expect(tech.iconSource).toBe("custom");
    expect(tech.iconRef).toBe("abcd1234.svg");
  });
});

describe("updateTechnology", () => {
  it("actualiza el nombre sin tocar el slug", async () => {
    const tech = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const updated = await withTransaction((c) => updateTechnology(tech.id, { name: "Next.js 16" }, c));
    expect(updated?.name).toBe("Next.js 16");
    expect(updated?.slug).toBe("nextjs");
  });

  it("devuelve null para un id inexistente", async () => {
    const updated = await withTransaction((c) => updateTechnology(999999, { name: "X" }, c));
    expect(updated).toBeNull();
  });
});

describe("getTechnologyUsageCounts / deleteTechnology", () => {
  it("cuenta en cuántos proyectos se usa cada tecnología", async () => {
    const admin = await createTestUser({ role: "admin" });
    const tech = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const p1 = await withTransaction((c) => createPortfolioProject({ slug: "p1", industryIcon: "Buildings" }, admin.id, c));
    const p2 = await withTransaction((c) => createPortfolioProject({ slug: "p2", industryIcon: "Buildings" }, admin.id, c));
    await withTransaction((c) => setPortfolioProjectTechnologies(p1, [tech.id], c));
    await withTransaction((c) => setPortfolioProjectTechnologies(p2, [tech.id], c));

    const counts = await getTechnologyUsageCounts();
    expect(counts.get(tech.id)).toBe(2);
  });

  it("borra una tecnología sin uso", async () => {
    const tech = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const result = await withTransaction((c) => deleteTechnology(tech.id, c));
    expect(result).toEqual({ outcome: "ok" });
    expect(await getAllTechnologies()).toEqual([]);
  });

  it("no borra una tecnología en uso, devuelve el conteo", async () => {
    const admin = await createTestUser({ role: "admin" });
    const tech = await withTransaction((c) => createTechnology({ slug: "nextjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs" }, c));
    const p1 = await withTransaction((c) => createPortfolioProject({ slug: "p1", industryIcon: "Buildings" }, admin.id, c));
    await withTransaction((c) => setPortfolioProjectTechnologies(p1, [tech.id], c));

    const result = await withTransaction((c) => deleteTechnology(tech.id, c));
    expect(result).toEqual({ outcome: "in_use", projectCount: 1 });
    expect(await getAllTechnologies()).toHaveLength(1);
  });

  it("devuelve not_found para un id inexistente", async () => {
    const result = await withTransaction((c) => deleteTechnology(999999, c));
    expect(result).toEqual({ outcome: "not_found" });
  });
});
