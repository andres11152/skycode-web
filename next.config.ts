import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
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