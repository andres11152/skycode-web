import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { withAuth } from "@/lib/withAuth";
import { getAllTechnologies, getTechnologyUsageCounts, createTechnology } from "@/lib/queries/portfolioTechnologies";
import { PORTFOLIO_TECH_CATEGORIES, type PortfolioTechCategory } from "@/content/portfolioShared";
import { logError } from "@/lib/logger";

/**
 * GET /api/portfolio/technologies - Catálogo completo con el conteo de
 * uso de cada una (`projectCount`), para que la UI del catálogo pueda
 * avisar antes de intentar borrar una en uso. Requiere `portfolio:read`.
 */
export const GET = withAuth("portfolio:read", async () => {
  try {
    const [technologies, usageCounts] = await Promise.all([getAllTechnologies(), getTechnologyUsageCounts()]);
    const withUsage = technologies.map((tech) => ({ ...tech, projectCount: usageCounts.get(tech.id) ?? 0 }));
    return NextResponse.json({ success: true, technologies: withUsage });
  } catch (error) {
    logError("❌ [API GET Portfolio Technologies Error]", error);
    return NextResponse.json({ error: "Error al obtener el catálogo de tecnologías." }, { status: 500 });
  }
});

const CreateTechnologySchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/, "El slug solo puede tener minúsculas, números y guiones."),
  name: z.string().trim().min(1).max(100),
  category: z.enum(PORTFOLIO_TECH_CATEGORIES as [PortfolioTechCategory, ...PortfolioTechCategory[]]),
  iconSource: z.enum(["simple-icons", "custom"]),
  iconRef: z.string().trim().min(1).max(300),
  websiteUrl: z.string().trim().url().nullable().optional(),
});

/**
 * POST /api/portfolio/technologies - Agrega una tecnología al catálogo
 * reutilizable. Requiere `portfolio:write`. `slug` acá es el identificador
 * PROPIO del catálogo (no necesariamente el mismo que `iconRef` cuando
 * `iconSource` es `simple-icons` — en la práctica suelen coincidir, pero
 * son campos independientes: `slug` es la clave única de esta tabla,
 * `iconRef` es lo que resuelve el ícono).
 */
export const POST = withAuth("portfolio:write", async (request) => {
  try {
    const parsed = CreateTechnologySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }

    const technology = await withTransaction((client) => createTechnology(parsed.data, client));
    return NextResponse.json({ success: true, technology: { ...technology, projectCount: 0 } });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Ya existe una tecnología con ese slug." }, { status: 409 });
    }
    logError("❌ [API POST Portfolio Technologies Error]", error);
    return NextResponse.json({ error: "Error al crear la tecnología." }, { status: 500 });
  }
});
