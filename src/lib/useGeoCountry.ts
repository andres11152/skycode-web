"use client";

import { useEffect, useState } from "react";

const COOKIE_NAME = "skycode-geo-country";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function readGeoCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

/**
 * País del visitante (código ISO-2) para personalizar moneda/indicativo por
 * defecto. `proxy.ts` ya deja la cookie `skycode-geo-country` en hosts que
 * exponen `x-vercel-ip-country` (Vercel, gratis). En cualquier otro host (hoy
 * Render), esa cookie no llega, así que acá se cae a `/api/geo` — y el
 * resultado se cachea en la misma cookie para no repetir la llamada en la
 * siguiente visita.
 */
// Una sola petición por carga de página: el cotizador y el campo de
// teléfono del formulario usan este hook a la vez, y cada uno hacía su
// propio fetch a /api/geo al montar (dos peticiones idénticas en la carga).
let geoRequest: Promise<string | null> | null = null;

function fetchGeoCountry(): Promise<string | null> {
  geoRequest ??= fetch("/api/geo")
    .then((res) => (res.ok ? (res.json() as Promise<{ country: string | null }>) : null))
    .then((data) => {
      const country = data?.country ?? null;
      if (country) {
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(country)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
      }
      return country;
    })
    .catch(() => null);
  return geoRequest;
}

export function useGeoCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const applyGeoCountry = () => {
      const cached = readGeoCookie();
      if (cached) {
        setCountry(cached);
        return;
      }

      let cancelled = false;
      fetchGeoCountry().then((result) => {
        if (!cancelled && result) setCountry(result);
      });

      return () => {
        cancelled = true;
      };
    };
    return applyGeoCountry();
  }, []);

  return country;
}
