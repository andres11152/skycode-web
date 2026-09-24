import { randomUUID } from "node:crypto";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Almacenamiento de documentos en Cloudflare R2 (compatible con la API de
 * S3 — mismo SDK que AWS S3, solo cambia el `endpoint`). Reemplaza el disco
 * local/persistente de Render que usaba este módulo antes: un disco de
 * Render solo puede montarse en UNA instancia a la vez, lo que obliga a
 * desactivar zero-downtime deploys — un trade-off aceptable mientras solo
 * el equipo interno subía archivos ocasionalmente, pero no ahora que un
 * cliente sube los suyos desde `/portal` (ver "Documentos" en CLAUDE.md).
 * R2 en particular (y no S3 directo) por no cobrar egress — este módulo
 * sirve descargas constantemente.
 *
 * Las firmas públicas (`saveDocumentFile`/`readDocumentFile`/
 * `deleteDocumentFile`/`isAllowedDocumentExtension`) son EXACTAMENTE las
 * mismas que la versión anterior sobre `node:fs/promises` — ningún caller
 * (rutas de documentos, tests) tuvo que cambiar.
 */

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
// Override exclusivo de tests/desarrollo local contra un doble S3 real
// (MinIO, ver docker-compose.test.yml y .env.test) — en producción nunca
// se define, y el endpoint se deriva de R2_ACCOUNT_ID (Cloudflare R2 real).
const R2_ENDPOINT = process.env.R2_ENDPOINT;

let cachedClient: S3Client | null = null;

/**
 * Resuelto perezosamente (no al importar el módulo) — mismo motivo que
 * `lib/session.ts::getSecretKey()`: `next build` importa cada Route
 * Handler para recolectar sus datos, y un `throw` a nivel de módulo
 * tumbaría el build entero sin que las credenciales de R2 hagan falta
 * todavía en esa fase.
 */
function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = R2_ENDPOINT ?? (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      "Storage de documentos (Cloudflare R2) no configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_BUCKET_NAME en .env.local (desarrollo) o en las variables de entorno del hosting (producción)."
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    // MinIO (tests/desarrollo local vía R2_ENDPOINT) necesita path-style
    // (`http://host:9000/bucket/key`) — Cloudflare R2 en producción usa
    // virtual-hosted style por defecto, sin necesitar este flag.
    forcePathStyle: Boolean(R2_ENDPOINT),
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return cachedClient;
}

// Extensiones permitidas para `storageKey` — whitelist explícita, no lo que
// venga del nombre original del archivo. Cubre los formatos reales de
// "Documentos" (contratos, specs, entregables): PDF, Office, imágenes, zip.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".zip",
  ".txt",
  ".csv",
]);

export function isAllowedDocumentExtension(originalFilename: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(originalFilename).toLowerCase());
}

/**
 * Guarda un archivo con un nombre generado server-side (UUID + extensión
 * de una whitelist) — nunca el nombre original. Esto es lo que hace
 * imposible un path traversal vía nombre de archivo: `storageKey` nunca
 * incorpora un byte que vino del usuario sin pasar por este generador (acá
 * ya no es una ruta de filesystem, es una "key" de objeto en el bucket,
 * pero el mismo principio aplica: nunca se construye a partir de input).
 */
export async function saveDocumentFile(buffer: Buffer, originalFilename: string): Promise<string> {
  const ext = path.extname(originalFilename).toLowerCase();
  const storageKey = `${randomUUID()}${ext}`;

  await getR2Client().send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: storageKey, Body: buffer })
  );

  return storageKey;
}

/**
 * Lee un archivo por su `storageKey` — que siempre viene de una fila de
 * `documents` en la base (nunca de un parámetro de URL sin validar contra
 * la base primero), así que ya pasó por el generador de arriba.
 */
export async function readDocumentFile(storageKey: string): Promise<Buffer> {
  const res = await getR2Client().send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }));
  // `Body` es un stream en Node — `transformToByteArray()` lo agrega el SDK
  // v3 específicamente para este runtime (ver @smithy/util-stream), es la
  // forma recomendada de leerlo completo en vez de armar el pipe a mano.
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Borra el objeto del bucket. `DeleteObjectCommand` de S3/R2 es idempotente
 * por diseño — no lanza si la key no existe (devuelve éxito igual), así
 * que el comportamiento "best-effort, nunca falla si ya no está" de la
 * versión anterior sobre disco sale gratis acá, sin necesitar un catch.
 */
export async function deleteDocumentFile(storageKey: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }));
}
