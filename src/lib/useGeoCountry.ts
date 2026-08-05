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
      fetch("/api/geo")
        .then((res) => (res.ok ? (res.json() as Promise<{ country: string | null }>) : null))
        .then((data) => {
          if (cancelled || !data?.country) return;
          setCountry(data.country);
          document.cookie = `${COOKIE_NAME}=${encodeURIComponent(data.country)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    };
    return applyGeoCountry();
  }, []);

  return country;
}
