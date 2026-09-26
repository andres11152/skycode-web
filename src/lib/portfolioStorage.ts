import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cliente de R2 dedicado a imágenes del portafolio — **deliberadamente
 * separado** de `lib/storage.ts` (documentos privados de clientes, nunca
 * públicos) y de `lib/backupStorage.ts` (backups de base de datos, con
 * datos sensibles). Este bucket SÍ es público a propósito: sirve las
 * imágenes de `/portafolio` directo por URL, sin pasar por una ruta de
 * Next que las autentique — más rápido, y no hay nada privado que
 * proteger acá. Reutiliza `R2_ACCOUNT_ID` (misma cuenta de Cloudflare que
 * el resto de buckets), solo cambian el bucket y las credenciales —mismo
 * criterio que `backupStorage.ts`.
 */

const PORTFOLIO_BUCKET = process.env.R2_PORTFOLIO_BUCKET_NAME;
const PORTFOLIO_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const PORTFOLIO_ACCESS_KEY_ID = process.env.R2_PORTFOLIO_ACCESS_KEY_ID;
const PORTFOLIO_SECRET_ACCESS_KEY = process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY;
// Override exclusivo de tests contra un doble S3 real (MinIO) — nunca se
// define en producción, mismo patrón que R2_ENDPOINT/R2_BACKUPS_ENDPOINT.
const PORTFOLIO_ENDPOINT = process.env.R2_PORTFOLIO_ENDPOINT;
// Dominio público desde el que se sirven las imágenes (ej. un dominio
// propio en Cloudflare apuntando al bucket, o la URL pública r2.dev) —
// las URLs guardadas en `portfolio_project_images.variants` se arman con
// este prefijo, nunca con el endpoint de la API de R2 (ese no es público).
const PUBLIC_BASE_URL = process.env.R2_PORTFOLIO_PUBLIC_BASE_URL;

let cachedClient: S3Client | null = null;

/** Resuelto perezosamente — mismo motivo que `lib/storage.ts::getR2Client()`: un `throw` a nivel de módulo tumbaría `next build`. */
function getPortfolioR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = PORTFOLIO_ENDPOINT ?? (PORTFOLIO_ACCOUNT_ID ? `https://${PORTFOLIO_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !PORTFOLIO_ACCESS_KEY_ID || !PORTFOLIO_SECRET_ACCESS_KEY || !PORTFOLIO_BUCKET || !PUBLIC_BASE_URL) {
    throw new Error(
      "Storage de imágenes del portafolio (Cloudflare R2) no configurado. Defina R2_ACCOUNT_ID, R2_PORTFOLIO_ACCESS_KEY_ID, R2_PORTFOLIO_SECRET_ACCESS_KEY, R2_PORTFOLIO_BUCKET_NAME y R2_PORTFOLIO_PUBLIC_BASE_URL."
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: Boolean(PORTFOLIO_ENDPOINT),
    credentials: { accessKeyId: PORTFOLIO_ACCESS_KEY_ID, secretAccessKey: PORTFOLIO_SECRET_ACCESS_KEY },
  });
  return cachedClient;
}

// Nunca se confía en la extensión del archivo ni en el `Content-Type` que
// manda el navegador — `sharp` lee los bytes reales y reporta el formato
// verdadero (`metadata().format`), mismo principio de "validar contenido
// real, no lo que dice el cliente" que ya sigue el resto del proyecto
// (ver `saveDocumentFile`, que además nunca deriva el nombre guardado del
// nombre original).
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

// 3 anchos fijos — cumple la regla de CLAUDE.md de servir cada imagen a su
// tamaño real de uso (con margen para retina): 400px para tarjetas
// pequeñas del carrusel, 800px para el índice de portafolio, 1600px para
// el detalle del caso y el lightbox a pantalla completa.
const VARIANT_WIDTHS = { sm: 400, md: 800, lg: 1600 } as const;
type VariantSize = keyof typeof VARIANT_WIDTHS;

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface ProcessedPortfolioImage {
  /** UUID compartido entre las 3 variantes — es lo que se guarda en `portfolio_project_images.storage_key`. */
  storageKey: string;
  variants: Record<VariantSize, string>;
  width: number;
  height: number;
}

/**
 * Procesa UNA vez al subir (nunca en request time: `next.config.ts` tiene
 * `images.unoptimized: true` en todo el proyecto) — genera las 3 variantes
 * en WebP y las sube al bucket público. `withoutEnlargement: true` evita
 * agrandar una imagen más pequeña que el ancho objetivo (una foto de
 * 800px de ancho nunca se estira a 1600 solo para "completar" la
 * variante grande); las dimensiones finales devueltas son las de la
 * variante `lg` real, no el ancho objetivo nominal.
 */
export async function processAndUploadPortfolioImage(buffer: Buffer): Promise<ProcessedPortfolioImage> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen supera el tamaño máximo permitido (15 MB).");
  }

  // `sharp` lanza su propio error si el buffer ni siquiera es una imagen
  // parseable (antes de llegar a chequear `format`) — se normaliza acá
  // para que cualquier archivo no-imagen (con extensión falsa o no) dé el
  // mismo mensaje amigable, en vez de filtrar el error interno de la
  // librería de procesamiento hacia quien suba el archivo.
  const metadata = await sharp(buffer)
    .metadata()
    .catch(() => {
      throw new Error("Formato de imagen no soportado. Use JPEG, PNG o WebP.");
    });
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error("Formato de imagen no soportado. Use JPEG, PNG o WebP.");
  }

  const storageKey = randomUUID();
  const client = getPortfolioR2Client();
  const variants = {} as Record<VariantSize, string>;
  let width = 0;
  let height = 0;

  for (const [size, targetWidth] of Object.entries(VARIANT_WIDTHS) as [VariantSize, number][]) {
    const { data, info } = await sharp(buffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const key = `${storageKey}-${size}.webp`;
    await client.send(
      new PutObjectCommand({
        Bucket: PORTFOLIO_BUCKET,
        Key: key,
        Body: data,
        ContentType: "image/webp",
        // Bucket público de contenido inmutable por key (un storageKey
        // nunca se reescribe, solo se borra y se sube uno nuevo) — cache
        // agresivo del lado del navegador/CDN es seguro acá.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    variants[size] = `${PUBLIC_BASE_URL}/${key}`;

    // La variante `lg` es la más fiel al tamaño real de la imagen fuente
    // (las otras son recortes más chicos de la misma relación de
    // aspecto) — sus dimensiones son las que se guardan como `width`/
    // `height` de la fila, para el hint de aspect-ratio del `<Image>` del
    // frontend.
    if (size === "lg") {
      width = info.width;
      height = info.height;
    }
  }

  return { storageKey, variants, width, height };
}

/** Borra las 3 variantes de una imagen del bucket — `DeleteObjectCommand` es idempotente (no falla si la key ya no existe), mismo criterio que `deleteDocumentFile()`. */
export async function deletePortfolioImageFiles(storageKey: string): Promise<void> {
  const client = getPortfolioR2Client();
  await Promise.all(
    (Object.keys(VARIANT_WIDTHS) as VariantSize[]).map((size) =>
      client.send(new DeleteObjectCommand({ Bucket: PORTFOLIO_BUCKET, Key: `${storageKey}-${size}.webp` }))
    )
  );
}
