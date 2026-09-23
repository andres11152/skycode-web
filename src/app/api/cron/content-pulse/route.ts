import { NextResponse } from "next/server";
import { getContentGaps } from "@/lib/queries/seoMetrics";
import { articleExistsForKeyword, createArticleDraft } from "@/lib/queries/articles";
import { generateArticleDraftSafe } from "@/lib/contentGeneration";
import { logError } from "@/lib/logger";

// Autor por defecto de los borradores generados — editable desde
// /dashboard/contenido antes de aprobar. No existe todavía un concepto de
// "autor IA" separado en el esquema (author/author_slug son el mismo campo
// que usan los posts escritos a mano, ver db/migrations/0019_articles.sql)
// — como ningún borrador se publica sin que una persona lo revise y
// apruebe, el byline real lo decide quien aprueba, no el cron.
const DEFAULT_DRAFT_AUTHOR = "Andres Betancourt";
const DEFAULT_DRAFT_AUTHOR_SLUG = "andres-betancourt";

// Cuántos borradores nuevos genera como máximo cada corrida — limita el
// gasto en tokens de la API de Anthropic por ejecución del cron, pensado
// para correr semanalmente (no diario, a diferencia de los otros crons de
// este proyecto) porque Search Console tampoco acumula gaps nuevos todos
// los días.
const MAX_DRAFTS_PER_RUN = 3;
const GAP_WINDOW_DAYS = 28;
const GAP_LIMIT = 15;

/**
 * POST /api/cron/content-pulse - Primer paso del pipeline de escalado de
 * contenido (Fase 3 del plan de SEO): toma las queries con impresiones y
 * cero clics de `gsc_metrics` (ver lib/queries/seoMetrics.ts::getContentGaps)
 * y genera un borrador por cada una que todavía no tenga cobertura, vía la
 * API de Anthropic. Cada borrador entra como `status='draft'` en
 * `/dashboard/contenido` — este cron NUNCA publica nada, esa decisión es
 * exclusivamente humana (ver lib/queries/articles.ts::approveAndPublish).
 *
 * Mismo patrón de secreto compartido que el resto de crons del proyecto
 * (`CRON_SECRET`, header `x-cron-secret`). Solo genera para locale "es" por
 * ahora — las queries de Search Console reflejan sobre todo búsquedas en
 * español, y generar en los tres idiomas por cada gap triplicaría el gasto
 * de API sin necesidad real todavía; un borrador aprobado en español se
 * puede traducir a mano desde el dashboard como se hizo con los 6 posts
 * iniciales.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-cron-secret")?.trim();
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada. Ver .env.example." }, { status: 503 });
  }

  const locale = "es" as const;
  const results = { candidatesEvaluated: 0, draftsCreated: 0, skippedExisting: 0, failed: 0 };

  try {
    const gaps = await getContentGaps(GAP_WINDOW_DAYS, GAP_LIMIT);

    for (const gap of gaps) {
      if (results.draftsCreated >= MAX_DRAFTS_PER_RUN) break;
      results.candidatesEvaluated += 1;

      const alreadyCovered = await articleExistsForKeyword(gap.query, locale);
      if (alreadyCovered) {
        results.skippedExisting += 1;
        continue;
      }

      const draft = await generateArticleDraftSafe({ targetKeyword: gap.query, locale });
      if (!draft) {
        results.failed += 1;
        continue;
      }

      // El slug lo elige el modelo — si por coincidencia choca con uno ya
      // existente (aunque venga de otra keyword), el UNIQUE (slug, locale)
      // de la tabla rechaza el INSERT; se cuenta como fallo de esta
      // corrida en vez de reventar el resto del loop.
      try {
        await createArticleDraft(
          {
            slug: draft.slug,
            locale,
            title: draft.title,
            description: draft.description,
            author: DEFAULT_DRAFT_AUTHOR,
            authorSlug: DEFAULT_DRAFT_AUTHOR_SLUG,
            tags: draft.tags,
            content: draft.content,
            targetKeyword: gap.query,
          },
          // `created_by` NULL — este borrador no lo creó una persona
          // logueada, lo creó el cron. La columna es nullable a propósito
          // para este caso (ver 0019_articles.sql).
          null
        );
        results.draftsCreated += 1;
      } catch (error) {
        logError(`❌ [Cron Content Pulse] no se pudo insertar el borrador para "${gap.query}"`, error);
        results.failed += 1;
      }
    }
  } catch (error) {
    logError("❌ [Cron Content Pulse] falló", error);
    return NextResponse.json({ success: false, error: "Fallo generando borradores de contenido.", ...results }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...results });
}
