import { siteUrl } from "@/lib/site";
import { logError } from "@/lib/logger";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Avisa a Bing/Yandex/Naver (los motores que sí soportan IndexNow — Google
 * no, ver la nota en app/robots.ts si se agrega ahí después) que una o más
 * URLs cambiaron, para que las rastreen en minutos en vez de esperar su
 * ciclo normal. Complementa, no reemplaza, el sitemap — Google sigue
 * dependiendo solo de éste + Search Console.
 *
 * `keyLocation` apunta a una ruta fija (`/indexnow-key.txt`, ver ese route
 * handler) que devuelve el valor de `INDEXNOW_KEY` en texto plano — el
 * protocolo no exige que el archivo se llame como la key, solo que esa URL
 * devuelva exactamente el valor de la key.
 *
 * De mejor esfuerzo a propósito: un fallo acá nunca debe bloquear la
 * publicación de un artículo, que ya tuvo éxito en la base de datos antes
 * de llegar a este paso.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || urls.length === 0) return;

  try {
    const host = new URL(siteUrl).host;
    await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${siteUrl}/indexnow-key.txt`,
        urlList: urls,
      }),
    });
  } catch (error) {
    logError("❌ [IndexNow] pingIndexNow falló", error);
  }
}
