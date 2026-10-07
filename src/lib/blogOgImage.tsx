import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/content/blog";
import { readingTime } from "@/content/blogShared";
import { siteName } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const OG_SIZE = { width: 1200, height: 630 } as const;

// Los mismos colores del sistema (`globals.css`): negro/blanco y el azul de
// marca. ImageResponse no lee variables CSS, así que van literales.
export const INK = "#0a0a0a";
export const PAPER = "#ffffff";
export const ACCENT = "#0089cd";

let headingFont: Promise<ArrayBuffer | null> | undefined;

/**
 * Geist Bold — la tipografía del sitio. `ImageResponse`
 * solo trae una fuente regular por defecto, y un título OG sin negrita se ve
 * débil. Se pide a Google Fonts (sin User-Agent de navegador devuelve TTF,
 * que es lo que Satori acepta; WOFF2 no) y se guarda en memoria del proceso.
 * Si no hay red (build en CI, fallo puntual) devuelve `null` y la imagen se
 * dibuja con la fuente por defecto: nunca rompe la generación.
 */
export function loadHeadingFont(): Promise<ArrayBuffer | null> {
  headingFont ??= (async () => {
    try {
      const css = await fetch("https://fonts.googleapis.com/css2?family=Geist:wght@700", {
        signal: AbortSignal.timeout(4000),
      }).then((res) => res.text());
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) return null;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      headingFont = undefined; // un fallo puntual no se queda guardado para siempre
      return null;
    }
  })();
  return headingFont;
}

/**
 * Imagen OG de un post (1200×630): la composición de `PostCover` — grilla
 * fina, resplandor de marca, glifo lineal del tema — con el título grande.
 * Antes los 6 posts compartían la misma imagen genérica, así que al pegar
 * cualquier artículo en LinkedIn o WhatsApp se veía idéntico.
 *
 * Un slug inexistente devuelve la tarjeta de marca sin título en vez de
 * fallar: el crawler que la pida igual recibe una imagen válida.
 */
export async function renderBlogOgImage(slug: string, locale: Locale): Promise<ImageResponse> {
  const post = await getPostBySlug(slug, locale);
  const font = await loadHeadingFont();
  const title = post?.title ?? siteName;
  // Títulos largos bajan un paso de tamaño para no pasar de 3 líneas.
  const titleSize = title.length > 70 ? 50 : title.length > 48 ? 58 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: PAPER,
          fontFamily: font ? "Geist" : "sans-serif",
        }}
      >
        {/* Grilla */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.08,
            backgroundImage: `linear-gradient(to right, ${PAPER} 1px, transparent 1px), linear-gradient(to bottom, ${PAPER} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Resplandor de marca */}
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: ACCENT,
            opacity: 0.28,
            filter: "blur(120px)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85 }}>
              {post?.tags[0] ?? "Blog"}
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: PAPER }}>{siteName}</div>
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 690,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26, opacity: 0.8 }}>
            {post ? (
              <>
                <div style={{ display: "flex" }}>{post.author}</div>
                <div style={{ display: "flex", color: ACCENT, margin: "0 6px" }}>·</div>
                <div style={{ display: "flex" }}>{formatDate(post.publishedAt, locale)}</div>
                <div style={{ display: "flex", color: ACCENT, margin: "0 6px" }}>·</div>
                <div style={{ display: "flex" }}>{readingTime(post)} min</div>
              </>
            ) : (
              <div style={{ display: "flex" }}>skycode.agency</div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font ? [{ name: "Geist", data: font, weight: 700, style: "normal" }] : undefined,
    },
  );
}
