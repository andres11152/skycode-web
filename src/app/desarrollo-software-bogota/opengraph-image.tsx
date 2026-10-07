import { ImageResponse } from "next/og";
import { rawBogotaContent } from "@/content/bogota";
import { ACCENT, INK, loadHeadingFont, OG_SIZE, PAPER } from "@/lib/blogOgImage";
import { siteName } from "@/lib/site";

// Imagen OG propia de la página local: la composición del hero (grilla fina,
// resplandor de marca y un globo de líneas con Bogotá marcada) con el titular.
export const alt = "Desarrollo de software a la medida en Bogotá — SkyCode Agency";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OpengraphImage() {
  const font = await loadHeadingFont();
  const { hero } = rawBogotaContent;
  const pills = ["100% tuyo", "90 días de garantía", "Pago 50/50"];

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
        <div
          style={{
            position: "absolute",
            right: -100,
            top: -80,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: ACCENT,
            opacity: 0.3,
            filter: "blur(120px)",
          }}
        />
        {/* Globo de líneas: meridianos, paralelos y arcos desde Bogotá. */}
        <svg
          width="440"
          height="440"
          viewBox="0 0 100 100"
          fill="none"
          stroke={PAPER}
          strokeWidth="0.35"
          style={{ position: "absolute", right: 48, top: 95, opacity: 0.85 }}
        >
          <circle cx="50" cy="50" r="46" />
          <ellipse cx="50" cy="50" rx="20" ry="46" />
          <ellipse cx="50" cy="50" rx="36" ry="46" />
          <line x1="50" y1="4" x2="50" y2="96" />
          <ellipse cx="50" cy="50" rx="46" ry="14" />
          <ellipse cx="50" cy="50" rx="46" ry="30" />
          <line x1="4" y1="50" x2="96" y2="50" />
          <path d="M42 58 Q 50 22 70 30" stroke={ACCENT} strokeWidth="0.9" />
          <path d="M42 58 Q 38 34 28 36" stroke={ACCENT} strokeWidth="0.9" />
          <path d="M42 58 Q 62 62 76 52" stroke={ACCENT} strokeWidth="0.9" />
          <circle cx="42" cy="58" r="2.6" fill={ACCENT} stroke="none" />
          <circle cx="70" cy="30" r="1.2" fill={PAPER} stroke="none" />
          <circle cx="28" cy="36" r="1.2" fill={PAPER} stroke="none" />
          <circle cx="76" cy="52" r="1.2" fill={PAPER} stroke="none" />
        </svg>

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
              Bogotá · Colombia
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>{siteName}</div>
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 640,
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: -2,
            }}
          >
            {hero.h1}
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {pills.map((pill) => (
              <div
                key={pill}
                style={{
                  display: "flex",
                  fontSize: 24,
                  padding: "10px 22px",
                  borderRadius: 9999,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                {pill}
              </div>
            ))}
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
