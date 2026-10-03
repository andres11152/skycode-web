"use client";

import { useEffect, useState } from "react";
import { isCategoryAllowed, readConsentNow } from "@/lib/consent";

const COOKIE_NAME = "skycode-geo-country";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function readGeoCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

/**
 * País del visitante (código ISO-2) para personalizar moneda/indicativo por
 * defecto, consultando `/api/geo`. El resultado solo se cachea en la cookie
 * `skycode-geo-country` si la persona aceptó "preferencias" (ver consent.ts);
 * sin ese permiso se usa durante la visita y no se guarda nada.
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
      // Sin consentimiento de "preferencias" el país se usa solo en esta visita:
      // se consulta y se aplica, pero no se guarda en una cookie.
      if (country && isCategoryAllowed(readConsentNow(), "preferences")) {
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(country)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
      }
      return country;
    })
    .catch(() => null);
  return geoRequest;
}

export function clearGeoCountryCache(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
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
