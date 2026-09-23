import type { NextConfig } from "next";

// El sitio no tenía ninguna cabecera de seguridad HTTP: /dashboard y
// /portal (autenticados) eran embebibles en un <iframe> de cualquier
// dominio (clickjacking sobre acciones destructivas — borrar leads,
// cambiar roles de equipo), y el UUID de /propuesta/[id] (que ES la
// credencial de acceso a esa propuesta, ver lib/queries/proposals.ts) podía
// filtrarse en el header `Referer` hacia cualquier enlace externo.
// `next dev` usa eval() para Fast Refresh y para reconstruir stack traces de
// React en consola — sin 'unsafe-eval' ahí, la app entera falla con "eval()
// is not supported" apenas arranca. React nunca usa eval() en producción
// (`next build` + `next start`), así que ahí sí se puede — y se debe — dejar
// afuera del CSP; agregarlo solo en dev mantiene la protección real donde
// importa (el sitio servido a usuarios reales).
const SCRIPT_SRC = ["'self'", "'unsafe-inline'", ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : [])];

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inyecta scripts inline para hidratar/streamear RSC, y el
      // script de detección de idioma del layout raíz también es inline
      // (ver BROWSER_LOCALE_REDIRECT_SCRIPT en app/layout.tsx) — sin
      // 'unsafe-inline' el sitio entero queda en blanco. No hay un sistema
      // de nonces implementado todavía para poder retirar esto.
      `script-src ${SCRIPT_SRC.join(" ")}`,
      // Framer Motion anima vía el atributo `style` inline (opacity/transform,
      // ver lib/animations.ts) — 'unsafe-inline' es necesario para eso, no
      // hay hojas de estilo de terceros que lo requieran.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      // Ninguna llamada desde el navegador sale del propio origen — la
      // única API externa (open.er-api.com, tasa de cambio) se consulta
      // solo desde el servidor (lib/exchangeRate.ts), nunca desde el cliente.
      "connect-src 'self'",
      // Reemplaza y refuerza X-Frame-Options en navegadores modernos.
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // El UUID de /propuesta/[id] es la única credencial de acceso a esa
  // propuesta (sin cuenta ni sesión, ver la ruta pública) — no debe viajar
  // en el header Referer hacia un dominio externo enlazado desde ahí.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
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