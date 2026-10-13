import { BASE_URL } from "./config";

/**
 * Invalida la caché (ISR) de las páginas públicas que leen de Postgres (blog, equipo, portafolio, servicios,
 * sitemap…). El servidor E2E se construye ANTES de que cada test inserte sus datos y el sitemap y varias páginas
 * se generan estáticas con `revalidate = 3600`: sin esto, un test que insertó filas vería el HTML cacheado de un
 * test anterior (o del build). Es la misma ruta que usan los scripts de datos (`/api/cron/revalidate-public`).
 */
export async function revalidatePublicPages(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/cron/revalidate-public`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  if (!res.ok) throw new Error(`/api/cron/revalidate-public respondió ${res.status}`);
}
