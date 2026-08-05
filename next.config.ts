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
};

export default nextConfig;