import type { NextConfig } from "next";

import { LAX_CSP_SOURCE, buildLaxCsp } from "./src/lib/csp";

// La política CSP vive en src/lib/csp.ts (fuente única de sus dos variantes:
// laxa para el sitio estático, estricta con nonce para login/dashboard/portal —
// esta última la emite proxy.ts por request, ver el porqué de las dos ahí).
// Acá solo se aplica la LAXA, y solo a las rutas que NO son estrictas.
//
// El sitio no tenía ninguna cabecera de seguridad HTTP: /dashboard y /portal
// (autenticados) eran embebibles en un <iframe> de cualquier dominio
// (clickjacking sobre acciones destructivas) y el UUID de /propuesta/[id]
// (que ES la credencial de acceso a esa propuesta) podía filtrarse en el
// header `Referer` hacia cualquier enlace externo.

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // El UUID de /propuesta/[id] es la única credencial de acceso a esa
  // propuesta (sin cuenta ni sesión, ver la ruta pública) — no debe viajar
  // en el header Referer hacia un dominio externo enlazado desde ahí.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Aísla la ventana de este sitio de cualquier otra que la abra o que ella
  // abra (cierra la clase de ataques que usan `window.opener`) y evita que
  // otros orígenes incrusten nuestros recursos (Spectre-class side channels).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

// Rutas de autenticación: nunca deben guardarse en cachés compartidas ni del
// navegador (respuestas con `pendingToken`, tokens de reseteo, formularios
// con estado de seguridad). `private, no-store` además impide que un proxy o
// CDN intermedio las conserve.
const AUTH_NO_STORE_SOURCES = [
  "/api/auth/:path*",
  "/login",
  "/olvide-password",
  "/resetear-password/:path*",
  "/invitar/:path*",
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Imágenes del portafolio (ver lib/portfolioStorage.ts) viven en un
    // bucket público de Cloudflare R2, no en `public/` — `next/image`
    // rechaza cualquier host externo no declarado acá, sin importar
    // `unoptimized`. El wildcard cubre la URL de desarrollo `pub-*.r2.dev`
    // que Cloudflare genera por defecto; si más adelante se conecta un
    // dominio propio (ver `.env.example`, `R2_PORTFOLIO_PUBLIC_BASE_URL`),
    // hay que agregar también ese hostname acá.
    remotePatterns: [{ protocol: "https", hostname: "*.r2.dev" }],
  },
  experimental: {
    // `@phosphor-icons/react` exporta 3.000+ iconos desde un solo índice —
    // sin esto, importar 3 iconos arrastra el barrel completo al bundle.
    // `lucide-react` sigue en la lista porque el panel interno
    // (/dashboard, ver CLAUDE.md) no se migró a Phosphor: ahí los iconos
    // son chrome funcional denso, no identidad de marca.
    optimizePackageImports: ["framer-motion", "@phosphor-icons/react", "lucide-react"],
    // `proxy.ts` cubre /api: Next recorta el cuerpo a 10 MB por defecto, pero
    // los documentos admiten 20 MB y las imágenes de portafolio/perfil 15 MB
    // (los límites reales los aplica cada ruta).
    proxyClientMaxBodySize: "25mb",
  },
  // Casos retirados del portafolio: redirección permanente al índice del idioma
  // para conservar el enlace y la autoridad que ya tenía (en vez de un 404).
  async redirects() {
    return [
      { source: "/portafolio/moncyre", destination: "/portafolio", permanent: true },
      { source: "/en/portfolio/moncyre", destination: "/en/portfolio", permanent: true },
      { source: "/fr/portfolio/moncyre", destination: "/fr/portfolio", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      // CSP laxa SOLO fuera de las rutas estrictas (esas reciben la suya,
      // con nonce, desde proxy.ts — ver src/lib/csp.ts).
      { source: LAX_CSP_SOURCE, headers: [{ key: "Content-Security-Policy", value: buildLaxCsp() }] },
      ...AUTH_NO_STORE_SOURCES.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      })),
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // `geoip-country` (usada en app/api/geo) lee su base de datos desde disco
  // con una ruta relativa a `__dirname` — si Next.js la empaqueta junto con
  // la Route Handler, esa ruta queda rota (falla con ENOENT contra un
  // filesystem virtual de build). Excluirla del bundling hace que se resuelva
  // con `require()` nativo de Node en tiempo de ejecución, igual que en
  // cualquier script de Node normal.
  serverExternalPackages: ["geoip-country"],
  // El server E2E (e2e/globalSetup.ts) corre con SKYCODE_E2E=1 para usar su
  // propio distDir: Next.js guarda el lockfile de "solo un dev server a la
  // vez" en `<distDir>/lock`, sin distinguir por puerto — sin esto, correr
  // los tests E2E mientras el usuario tiene su propio `next dev` abierto en
  // otro puerto para revisar cambios visuales (ver flujo de verificación en
  // CLAUDE.md) hace que el server de pruebas se rehúse a arrancar.
  ...(process.env.SKYCODE_E2E === "1" ? { distDir: ".next-e2e" } : {}),
};

export default nextConfig;