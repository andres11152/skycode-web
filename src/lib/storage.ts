import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Directorio donde viven los archivos subidos. En producción (Render)
 * apunta al disco persistente montado (`DOCUMENTS_STORAGE_PATH`, ver
 * .env.example) — sin esa variable, el filesystem del contenedor es
 * efímero y cualquier archivo desaparece en el próximo deploy. En
 * desarrollo local cae a `storage/documents/` en la raíz del proyecto
 * (gitignorado). El disco de Render está inaccesible durante el build
 * (ver docs de Render), pero eso no afecta acá: los archivos solo se
 * escriben en tiempo de ejecución, dentro de un Route Handler.
 */
const STORAGE_DIR = process.env.DOCUMENTS_STORAGE_PATH || path.join(process.cwd(), "storage", "documents");

let dirEnsured = false;
async function ensureStorageDir(): Promise<void> {
  if (dirEnsured) return;
  // `STORAGE_DIR` es una ruta resuelta en runtime (variable de entorno o
  // process.cwd()), no un literal estático — el tracer de build de
  // Next.js/Turbopack no puede saber eso y, por defecto, empaqueta el
  // proyecto entero como dependencia "por si acaso" cualquier acceso a
  // filesystem con una ruta no-literal. `turbopackIgnore` es la forma
  // que la propia documentación de Next.js sugiere para optar afuera de
  // ese rastreo cuando la ruta es genuinamente dinámica (ver el warning
  // de build "Static analysis determined that this filesystem access...").
  await mkdir(/* turbopackIgnore: true */ STORAGE_DIR, { recursive: true });
  dirEnsured = true;
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
 * incorpora un byte que vino del usuario sin pasar por este generador.
 */
export async function saveDocumentFile(buffer: Buffer, originalFilename: string): Promise<string> {
  await ensureStorageDir();
  const ext = path.extname(originalFilename).toLowerCase();
  const storageKey = `${randomUUID()}${ext}`;
  await writeFile(path.join(/* turbopackIgnore: true */ STORAGE_DIR, storageKey), buffer);
  return storageKey;
}

/**
 * Lee un archivo por su `storageKey` — que siempre viene de una fila de
 * `documents` en la base (nunca de un parámetro de URL sin validar contra
 * la base primero), así que ya pasó por el generador de arriba.
 */
export async function readDocumentFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(/* turbopackIgnore: true */ STORAGE_DIR, storageKey));
}

/**
 * Borra el archivo del disco. No lanza si ya no existe (borrado
 * best-effort — la fila de `documents` ya se borró lógicamente en la base,
 * que es la fuente de verdad; que el archivo físico ya no esté no debe
 * bloquear la operación).
 */
export async function deleteDocumentFile(storageKey: string): Promise<void> {
  await unlink(path.join(/* turbopackIgnore: true */ STORAGE_DIR, storageKey)).catch(() => {});
}
