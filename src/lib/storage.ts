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

// Formatos que en realidad son un ZIP con una estructura interna
// particular (Office moderno "Open XML" y ZIP a secas) — misma firma de
// bytes que un .zip cualquiera, la diferencia real está en las entradas
// internas, que no vale la pena inspeccionar para este chequeo.
const ZIP_BASED_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx", ".zip"]);
// Formato binario "OLE Compound File" — Office viejo (.doc/.xls/.ppt
// pre-2007), todos comparten la misma firma de contenedor.
const OLE_BASED_EXTENSIONS = new Set([".doc", ".xls", ".ppt"]);
// Sin firma de bytes que verificar: texto plano no tiene un formato de
// contenedor, así que no hay nada universal contra qué comparar (rechazar
// por firma acá inventaría falsos positivos contra CSVs/TXT legítimos).
// Van protegidos igual en la descarga por `Content-Disposition: attachment`
// + `X-Content-Type-Options: nosniff` (ver next.config.ts) — un navegador
// no los ejecuta ni los renderiza aunque el contenido real fuera HTML/JS
// disfrazado de .txt.
const UNVERIFIED_EXTENSIONS = new Set([".txt", ".csv"]);

function startsWithBytes(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Verifica que los bytes REALES del archivo correspondan a su extensión —
 * cierra la whitelist de arriba contra un archivo renombrado (ej. un
 * ejecutable guardado como `informe.pdf`): `isAllowedDocumentExtension()`
 * solo mira el nombre, que el usuario controla por completo, y `file.type`
 * del navegador (el header `Content-Type` de un `<input type="file">`) es
 * igual de fácil de falsificar. Mismo principio que
 * `processAndUploadPortfolioImage()` en lib/portfolioStorage.ts, que valida
 * el contenido real con `sharp` en vez de confiar en la extensión — acá se
 * implementa a mano (sin una librería de detección de tipo MIME) porque la
 * whitelist es corta y fija: 4 firmas cubren los 13 formatos permitidos.
 */
export function matchesFileSignature(buffer: Buffer, originalFilename: string): boolean {
  const ext = path.extname(originalFilename).toLowerCase();

  if (UNVERIFIED_EXTENSIONS.has(ext)) return true;
  if (ext === ".pdf") return startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
  if (ext === ".png") return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === ".jpg" || ext === ".jpeg") return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
  if (ZIP_BASED_EXTENSIONS.has(ext)) {
    // `PK\x03\x04` es la firma normal de una entrada ZIP; `PK\x05\x06` es
    // la firma de un ZIP vacío (sin entradas) — ambas son archivos ZIP
    // válidos, un .docx/.pptx recién creado sin contenido también podría
    // llegar así en teoría.
    return startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(buffer, [0x50, 0x4b, 0x05, 0x06]);
  }
  if (OLE_BASED_EXTENSIONS.has(ext)) {
    return startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }

  // No debería llegar acá si `isAllowedDocumentExtension()` ya filtró antes
  // — pero si la whitelist de extensiones crece sin agregar su firma acá,
  // se rechaza en vez de aceptar en silencio un formato sin verificar.
  return false;
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
