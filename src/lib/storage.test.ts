import { describe, expect, it, vi } from "vitest";

// Bucket falso en memoria — estas son pruebas unitarias (`npm test`, sin
// Postgres, instantáneas por convención de este proyecto), así que el
// cliente real de R2 (@aws-sdk/client-s3) se mockea acá en vez de pegarle
// a la red de verdad. El mock imita el contrato mínimo que usa
// lib/storage.ts: `send()` recibe el "command" y decide qué hacer según su
// clase — igual de fiel al comportamiento real (guardar/leer/borrar por
// key) sin salir de memoria.
const fakeBucket = new Map<string, Buffer>();

class FakePutObjectCommand {
  constructor(public input: { Bucket?: string; Key: string; Body: Buffer }) {}
}
class FakeGetObjectCommand {
  constructor(public input: { Bucket?: string; Key: string }) {}
}
class FakeDeleteObjectCommand {
  constructor(public input: { Bucket?: string; Key: string }) {}
}

class FakeS3Client {
  send(command: FakePutObjectCommand | FakeGetObjectCommand | FakeDeleteObjectCommand) {
    if (command instanceof FakePutObjectCommand) {
      fakeBucket.set(command.input.Key, Buffer.from(command.input.Body));
      return Promise.resolve({});
    }
    if (command instanceof FakeGetObjectCommand) {
      const data = fakeBucket.get(command.input.Key);
      if (!data) return Promise.reject(new Error("NoSuchKey"));
      return Promise.resolve({ Body: { transformToByteArray: async () => new Uint8Array(data) } });
    }
    if (command instanceof FakeDeleteObjectCommand) {
      // Idempotente a propósito, como el S3/R2 real: borrar una key que no
      // existe no es un error (ver el comentario en deleteDocumentFile).
      fakeBucket.delete(command.input.Key);
      return Promise.resolve({});
    }
    return Promise.resolve({});
  }
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: FakeS3Client,
  PutObjectCommand: FakePutObjectCommand,
  GetObjectCommand: FakeGetObjectCommand,
  DeleteObjectCommand: FakeDeleteObjectCommand,
}));

// `lib/storage.ts` lee las variables R2_* en constantes a nivel de módulo,
// evaluadas apenas se importa el archivo — así que deben quedar seteadas
// ANTES de este `await import`, no dentro de un `beforeAll` (que corre
// después de que el módulo del test ya se evaluó por completo).
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_ACCESS_KEY_ID = "test-access-key";
process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_BUCKET_NAME = "test-bucket";

const { saveDocumentFile, readDocumentFile, deleteDocumentFile, isAllowedDocumentExtension } = await import("./storage");

describe("isAllowedDocumentExtension", () => {
  it("acepta las extensiones de la whitelist, sin distinguir mayúsculas", () => {
    expect(isAllowedDocumentExtension("contrato.pdf")).toBe(true);
    expect(isAllowedDocumentExtension("contrato.PDF")).toBe(true);
    expect(isAllowedDocumentExtension("captura.PNG")).toBe(true);
    expect(isAllowedDocumentExtension("hoja.xlsx")).toBe(true);
  });

  it("rechaza extensiones fuera de la whitelist — incluye tipos ejecutables", () => {
    expect(isAllowedDocumentExtension("script.exe")).toBe(false);
    expect(isAllowedDocumentExtension("script.sh")).toBe(false);
    expect(isAllowedDocumentExtension("archivo")).toBe(false); // sin extensión
    expect(isAllowedDocumentExtension("archivo.")).toBe(false);
  });
});

describe("saveDocumentFile / readDocumentFile / deleteDocumentFile (contra un bucket R2 simulado)", () => {
  it("guarda y lee de vuelta el contenido exacto del buffer", async () => {
    const content = Buffer.from("contenido de prueba ñoño");
    const storageKey = await saveDocumentFile(content, "contrato.pdf");

    const readBack = await readDocumentFile(storageKey);
    expect(readBack.equals(content)).toBe(true);

    await deleteDocumentFile(storageKey);
  });

  it("el storageKey nunca contiene el nombre original del archivo", async () => {
    const storageKey = await saveDocumentFile(Buffer.from("x"), "nombre-secreto-del-cliente.pdf");
    expect(storageKey).not.toContain("nombre-secreto-del-cliente");
    expect(storageKey.endsWith(".pdf")).toBe(true);
    await deleteDocumentFile(storageKey);
  });

  it("dos subidas del mismo nombre original generan storageKeys distintos (sin colisión)", async () => {
    const a = await saveDocumentFile(Buffer.from("a"), "mismo-nombre.pdf");
    const b = await saveDocumentFile(Buffer.from("b"), "mismo-nombre.pdf");
    expect(a).not.toBe(b);
    await deleteDocumentFile(a);
    await deleteDocumentFile(b);
  });

  it("un nombre con intento de path traversal no afecta el storageKey generado", async () => {
    const storageKey = await saveDocumentFile(Buffer.from("x"), "../../etc/passwd.pdf");
    // El storageKey es un UUID + extensión — nunca incorpora el path del nombre original.
    expect(storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    await deleteDocumentFile(storageKey);
  });

  it("borrar un storageKey que no existe no lanza (best-effort / idempotente, como el S3 real)", async () => {
    await expect(deleteDocumentFile("00000000-0000-0000-0000-000000000000.pdf")).resolves.not.toThrow();
  });

  it("leer una key que no existe rechaza (el caller — la ruta de descarga — lo traduce a un error genérico)", async () => {
    await expect(readDocumentFile("no-existe.pdf")).rejects.toThrow();
  });
});

describe("configuración de R2 faltante", () => {
  it("lanza un error claro si falta alguna variable de entorno de R2", async () => {
    vi.resetModules();
    const original = { ...process.env };
    delete process.env.R2_BUCKET_NAME;

    const { saveDocumentFile: saveWithoutConfig } = await import("./storage");
    await expect(saveWithoutConfig(Buffer.from("x"), "a.pdf")).rejects.toThrow(/no configurado/i);

    process.env = original;
    vi.resetModules();
  });
});
