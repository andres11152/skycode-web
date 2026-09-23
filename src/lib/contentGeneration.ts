import type { BlogBlock } from "@/content/blogShared";
import type { Locale } from "@/lib/i18n";
import { logError } from "@/lib/logger";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Mismo modelo que se usaría para cualquier tarea de generación de texto
// larga y razonada — no el más barato de la familia, un borrador de blog
// mediocre no vale la pena ni con revisión humana después.
const MODEL = "claude-opus-5";

const LOCALE_NAMES: Record<Locale, string> = { es: "español", en: "inglés", fr: "francés" };

export interface DraftGenerationInput {
  /** Query real de Search Console con impresiones y cero clics — ver lib/queries/seoMetrics.ts::getContentGaps. */
  targetKeyword: string;
  locale: Locale;
}

export interface GeneratedDraft {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: BlogBlock[];
}

const BLOCK_SCHEMA_HINT = `Cada bloque del array "content" es uno de estos 4 shapes exactos (nunca inventes un "type" distinto):
- {"type":"paragraph","text":"..."}
- {"type":"heading","level":2,"text":"..."} (level es 2 o 3, nunca 1)
- {"type":"list","items":["...","..."]}
- {"type":"code","language":"ts","code":"..."} (solo si aporta valor técnico real, no lo fuerces)`;

/**
 * No usa el SDK `@anthropic-ai/sdk` (una dependencia nueva para una sola
 * llamada) — igual que `lib/googleSearchConsole.ts` con la API de Google,
 * se llama la Messages API directo con `fetch`, consistente con ese mismo
 * criterio ya establecido en este proyecto.
 *
 * El prompt encapsula el estándar editorial del sitio (especificidad
 * técnica real, nada de relleno genérico, 1500+ palabras) — el resultado
 * SIEMPRE entra como `status='draft'`, nunca se publica solo. La compuerta
 * humana en /dashboard/contenido es la que decide si esto ve la luz, tal
 * como quedó definido en el plan de SEO (Fase 3): generar en automático,
 * publicar solo con revisión de una persona.
 */
export async function generateArticleDraft({ targetKeyword, locale }: DraftGenerationInput): Promise<GeneratedDraft | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no configurada. Ver .env.example.");
  }

  const localeName = LOCALE_NAMES[locale];
  const systemPrompt = `Eres redactor técnico senior de SkyCode, una agencia de desarrollo de software. Escribes artículos de blog técnico en ${localeName}, con el mismo estándar editorial de un ingeniero senior que ya construyó lo que describe: especificidad real (números, decisiones concretas, trade-offs), cero relleno de marketing genérico ("llevamos su marca al siguiente nivel" o frases equivalentes están prohibidas), y al menos 1500 palabras de contenido real repartidas en varias secciones con encabezados H2.

${BLOCK_SCHEMA_HINT}

Respondes ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con este shape exacto:
{"slug":"...", "title":"...", "description":"...", "tags":["...","..."], "content":[...]}

"slug" es kebab-case, en ${localeName === "español" ? "español" : "el idioma original del sitio si aplica, si no en " + localeName}, sin acentos ni caracteres especiales. "description" es un resumen de 1-2 frases para meta description SEO (máx. 160 caracteres). "tags" son 2-4 categorías cortas.`;

  const userPrompt = `Escribe un artículo de blog técnico dirigido a la query de búsqueda: "${targetKeyword}". Esta query tiene impresiones reales en Google Search Console pero cero clics — el artículo debe responderla de forma directa y completa para capturar ese tráfico. El público es tomadores de decisión técnica (CTOs, líderes de ingeniería) evaluando desarrollo de software a la medida.`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API respondió ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    throw new Error("La respuesta de Anthropic no incluyó contenido de texto.");
  }

  return parseDraftResponse(textBlock.text);
}

/** El modelo a veces envuelve el JSON en \`\`\`json ... \`\`\` pese a la instrucción — se limpia antes de parsear. */
function parseDraftResponse(text: string): GeneratedDraft | null {
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    const parsed = JSON.parse(cleaned) as GeneratedDraft;
    if (!parsed.slug || !parsed.title || !parsed.description || !Array.isArray(parsed.content)) {
      throw new Error("Shape inesperado en la respuesta generada.");
    }
    return parsed;
  } catch (error) {
    logError("❌ [Content Generation] no se pudo parsear la respuesta del modelo", error);
    return null;
  }
}

/** Envoltorio de mejor esfuerzo para el cron — un fallo generando un borrador puntual no debe bloquear el resto de la corrida. */
export async function generateArticleDraftSafe(input: DraftGenerationInput): Promise<GeneratedDraft | null> {
  try {
    return await generateArticleDraft(input);
  } catch (error) {
    logError("❌ [Content Generation] generateArticleDraft falló", error);
    return null;
  }
}
