import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { SHARP_INPUT_OPTIONS, hasAllowedImageSignature } from "./imageGuard";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { AvatarVariants } from "@/components/dashboard/types";

/**
 * Avatares de persona (cuentas del CRM y perfiles públicos de /equipo).
 *
 * Reutiliza el bucket público del portafolio (`R2_PORTFOLIO_*`) en vez de
 * un cuarto set de credenciales: es el mismo tipo de contenido (media
 * pública, sin nada sensible), su hostname `*.r2.dev` ya está declarado en
 * `images.remotePatterns` y en la CSP `img-src` de next.config.ts, y pedir
 * un bucket nuevo ya frenó una vez la migración del portafolio esperando
 * credenciales. Ese bucket pasa a ser, en la práctica, "el bucket de media
 * pública". Las claves llevan prefijo `avatars/` para no mezclarse con las
 * imágenes de casos de estudio.
 *
 * Es una copia deliberada de `lib/portfolioStorage.ts` y no un refactor
 * compartido: cambian los anchos, el recorte (cuadrado vs. proporción
 * libre) y el prefijo de clave — parametrizar el original para cubrir los
 * dos casos lo volvería más difícil de leer que estas ~100 líneas.
 */

const BUCKET = process.env.R2_PORTFOLIO_BUCKET_NAME;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_PORTFOLIO_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY;
// Override exclusivo de tests contra MinIO, mismo patrón que el resto de buckets.
const ENDPOINT = process.env.R2_PORTFOLIO_ENDPOINT;
const PUBLIC_BASE_URL = process.env.R2_PORTFOLIO_PUBLIC_BASE_URL;

let cachedClient: S3Client | null = null;

/** Resuelto perezosamente — un `throw` a nivel de módulo tumbaría `next build` (mismo motivo que `lib/storage.ts`). */
function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = ENDPOINT ?? (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  if (!endpoint || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET || !PUBLIC_BASE_URL) {
    throw new Error(
      "Storage de imágenes públicas (Cloudflare R2) no configurado. Defina R2_ACCOUNT_ID, R2_PORTFOLIO_ACCESS_KEY_ID, R2_PORTFOLIO_SECRET_ACCESS_KEY, R2_PORTFOLIO_BUCKET_NAME y R2_PORTFOLIO_PUBLIC_BASE_URL."
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: Boolean(ENDPOINT),
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  });
  return cachedClient;
}

// Se valida el contenido real del archivo con sharp, nunca la extensión ni
// el `Content-Type` que manda el navegador.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

// Cuadrados: 64 (chrome del dashboard, lista del equipo), 128 (ficha de
// persona) y 256 (tarjeta de /equipo, con margen para pantallas retina).
// Un avatar nunca se muestra más grande que eso — subir 1600px como en el
// portafolio sería puro peso desperdiciado (ver "Imágenes servidas al
// tamaño real" en CLAUDE.md).
const AVATAR_SIZES = { sm: 64, md: 128, lg: 256 } as const;
type AvatarSize = keyof typeof AVATAR_SIZES;

// Más bajo que los 15MB del portafolio: una foto de perfil nunca necesita
// tanto, y el límite es la primera barrera contra subir cualquier cosa.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const KEY_PREFIX = "avatars";

export interface ProcessedAvatar {
  storageKey: string;
  variants: AvatarVariants;
}

/**
 * Procesa UNA vez al subir: recorta al centro en cuadrado (`fit: "cover"`,
 * así una foto horizontal no queda deformada ni con bandas) y genera las 3
 * variantes en WebP. `withoutEnlargement` NO se usa acá a propósito, a
 * diferencia del portafolio: un avatar tiene que medir exactamente lo que
 * dice su variante para que el layout no salte, aunque eso implique
 * agrandar una foto chiquita.
 */
export async function processAndUploadAvatar(buffer: Buffer): Promise<ProcessedAvatar> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen supera el tamaño máximo permitido (8 MB).");
  }

  if (!hasAllowedImageSignature(buffer)) {
    throw new Error("Formato de imagen no soportado. Use JPEG, PNG o WebP.");
  }

  const metadata = await sharp(buffer, SHARP_INPUT_OPTIONS)
    .metadata()
    .catch(() => {
      throw new Error("Formato de imagen no soportado. Use JPEG, PNG o WebP.");
    });
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new Error("Formato de imagen no soportado. Use JPEG, PNG o WebP.");
  }

  const storageKey = randomUUID();
  const client = getClient();
  const variants = {} as Record<AvatarSize, string>;

  for (const [size, px] of Object.entries(AVATAR_SIZES) as [AvatarSize, number][]) {
    const data = await sharp(buffer, SHARP_INPUT_OPTIONS)
      // `rotate()` sin argumentos aplica la orientación EXIF y la descarta —
      // sin esto, una foto vertical tomada con el celular puede quedar
      // acostada, porque al recodificar a WebP se pierde el metadato que le
      // decía al navegador cómo rotarla.
      .rotate()
      .resize({ width: px, height: px, fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();

    const key = `${KEY_PREFIX}/${storageKey}-${size}.webp`;
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: data,
        ContentType: "image/webp",
        // Inmutable por clave: un avatar nuevo siempre tiene un UUID nuevo,
        // nunca se reescribe una clave existente.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    variants[size] = `${PUBLIC_BASE_URL}/${key}`;
  }

  return { storageKey, variants };
}

/** Borra las 3 variantes. Idempotente (`DeleteObject` no falla si la clave ya no existe). */
export async function deleteAvatarFiles(storageKey: string): Promise<void> {
  const client = getClient();
  await Promise.all(
    (Object.keys(AVATAR_SIZES) as AvatarSize[]).map((size) =>
      client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${KEY_PREFIX}/${storageKey}-${size}.webp` }))
    )
  );
}

/**
 * Borra los archivos de un avatar reemplazado sin hacer fallar la petición
 * si el bucket no responde: para entonces la base ya apunta al avatar
 * nuevo, así que el peor caso es un objeto huérfano invisible — mismo
 * criterio que el borrado de documentos.
 */
export async function deleteAvatarFilesQuietly(storageKey: string | null, onError: (error: unknown) => void): Promise<void> {
  if (!storageKey) return;
  try {
    await deleteAvatarFiles(storageKey);
  } catch (error) {
    onError(error);
  }
}

/** Mensajes de validación que deben responder 400 (culpa del archivo), no 500. */
export function isAvatarValidationError(message: string): boolean {
  return message.includes("Formato de imagen") || message.includes("tamaño máximo");
}
