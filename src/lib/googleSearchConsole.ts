import { SignJWT, importPKCS8 } from "jose";
import { logError } from "./logger";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SEARCH_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export interface GscRow {
  /** Ruta absoluta con dominio, tal como la devuelve GSC (dimensión `page`). */
  page: string;
  /** Query de búsqueda literal (dimensión `query`). */
  query: string;
  /** Fecha en formato `YYYY-MM-DD` (dimensión `date`). */
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * No usa el paquete `googleapis` (pesado, ~130 dependencias transitivas)
 * para una sola llamada — el flujo OAuth2 de cuenta de servicio
 * (JWT firmado con RS256 → intercambiado por un access token) se hace acá
 * a mano con `jose`, que el proyecto ya usa para los JWT de sesión
 * (lib/session.ts). La cuenta de servicio necesita permiso "Restringido"
 * o superior sobre la propiedad en Search Console (Configuración →
 * Usuarios y permisos) — no es automático por crearla en Google Cloud.
 */
async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GSC_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!clientEmail || !rawPrivateKey) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_EMAIL / GSC_SERVICE_ACCOUNT_PRIVATE_KEY no configuradas. Ver .env.example."
    );
  }

  // La clave privada de una cuenta de servicio de Google viene con saltos
  // de línea reales en el JSON descargado; en una variable de entorno de
  // una sola línea esos saltos se guardan escapados (`\n` literal) — hay
  // que des-escaparlos antes de que `importPKCS8` pueda parsear el PEM.
  const privateKeyPem = rawPrivateKey.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SEARCH_ANALYTICS_SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`No se pudo obtener el access token de Google (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("La respuesta de Google no incluyó access_token.");
  }
  return data.access_token;
}

/**
 * Consulta la Search Analytics API de la propiedad configurada
 * (`GSC_SITE_URL`, formato `https://dominio.com/` para una propiedad de
 * tipo "prefijo de URL" o `sc-domain:dominio.com` para una propiedad de
 * dominio) con dimensiones `date`+`page`+`query`, en el rango de fechas
 * dado. Usada por `POST /api/cron/seo-pulse` — nunca se llama desde el
 * navegador ni desde una request de un usuario.
 *
 * `rowLimit: 25000` es el máximo que acepta la API por página de
 * resultados; para un sitio de este tamaño (unas pocas decenas de URLs
 * indexables) una sola llamada cubre cualquier ventana de días razonable
 * sin necesitar paginación.
 */
export async function fetchSearchAnalytics(startDate: string, endDate: string): Promise<GscRow[]> {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("GSC_SITE_URL no configurada. Ver .env.example.");
  }

  const accessToken = await getAccessToken();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["date", "page", "query"],
      rowLimit: 25000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Search Analytics API respondió ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    rows?: Array<{ keys: [string, string, string]; clicks: number; impressions: number; ctr: number; position: number }>;
  };

  return (data.rows ?? []).map((row) => ({
    date: row.keys[0],
    page: row.keys[1],
    query: row.keys[2],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/**
 * Envoltorio de mejor esfuerzo para el cron: registra el error con
 * `logError` (→ Sentry si está configurado) y devuelve un array vacío en
 * vez de propagar — un fallo de la API externa de Google no debe tumbar
 * la respuesta 200 del cron ni bloquear otros pasos futuros que se
 * agreguen a esa misma ruta.
 */
export async function fetchSearchAnalyticsSafe(startDate: string, endDate: string): Promise<GscRow[]> {
  try {
    return await fetchSearchAnalytics(startDate, endDate);
  } catch (error) {
    logError("❌ [GSC] fetchSearchAnalytics falló", error);
    return [];
  }
}
