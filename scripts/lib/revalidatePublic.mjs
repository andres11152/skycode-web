// Pide al sitio publicado que invalide su caché de páginas públicas
// (POST /api/cron/revalidate-public). Lo llaman los scripts de datos tras
// escribir en la base: sin esto, un cambio tarda hasta 1 h (el `revalidate`
// de respaldo) en verse. Nunca falla el script: si no hay secreto, URL o el
// sitio aún no tiene el endpoint, solo avisa.
export async function revalidatePublicSite() {
  const base = (process.env.REVALIDATE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://skycode.agency").replace(/\/+$/, "");
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.log("(CRON_SECRET no está en el entorno: la caché pública se refresca sola en hasta 1 h.)");
    return;
  }
  try {
    const res = await fetch(`${base}/api/cron/revalidate-public`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) console.log(`Caché pública de ${base} invalidada.`);
    else console.log(`No se pudo invalidar la caché de ${base} (HTTP ${res.status}); se refresca sola en hasta 1 h.`);
  } catch (error) {
    console.log(`No se pudo invalidar la caché de ${base} (${error instanceof Error ? error.message : error}).`);
  }
}
