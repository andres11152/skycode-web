import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// Mismo criterio que storage.test.ts: bucket falso en memoria, el
// procesamiento de imagen (sharp) SÍ corre de verdad — solo se mockea la
// subida a R2, no la lógica de negocio que se está probando.
const fakeBucket = new Map<string, { body: Buffer; contentType?: string }>();

class FakePutObjectCommand {
  constructor(public input: { Bucket?: string; Key: string; Body: Buffer; ContentType?: string }) {}
}
class FakeDeleteObjectCommand {
  constructor(public input: { Bucket?: string; Key: string }) {}
}

class FakeS3Client {
  send(command: FakePutObjectCommand | FakeDeleteObjectCommand) {
    if (command instanceof FakePutObjectCommand) {
      fakeBucket.set(command.input.Key, { body: Buffer.from(command.input.Body), contentType: command.input.ContentType });
      return Promise.resolve({});
    }
    if (command instanceof FakeDeleteObjectCommand) {
      fakeBucket.delete(command.input.Key);
      return Promise.resolve({});
    }
    return Promise.resolve({});
  }
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: FakeS3Client,
  PutObjectCommand: FakePutObjectCommand,
  DeleteObjectCommand: FakeDeleteObjectCommand,
}));

// Leídas a nivel de módulo en portfolioStorage.ts — deben quedar seteadas
// antes del `await import`, mismo motivo que storage.test.ts.
process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_PORTFOLIO_ACCESS_KEY_ID = "test-access-key";
process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_PORTFOLIO_BUCKET_NAME = "test-portfolio-bucket";
process.env.R2_PORTFOLIO_PUBLIC_BASE_URL = "https://media.test.local";

const { processAndUploadPortfolioImage, deletePortfolioImageFiles } = await import("./portfolioStorage");

/** Imagen sintética real (no un buffer inventado) — sharp la crea y la procesa como si fuera una subida real. */
async function makeTestImage(width: number, height: number, format: "png" | "jpeg" | "webp" = "png"): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } } });
  if (format === "jpeg") return image.jpeg().toBuffer();
  if (format === "webp") return image.webp().toBuffer();
  return image.png().toBuffer();
}

describe("processAndUploadPortfolioImage", () => {
  it("genera y sube las 3 variantes (sm/md/lg) en WebP", async () => {
    fakeBucket.clear();
    const buffer = await makeTestImage(2000, 1125);

    const result = await processAndUploadPortfolioImage(buffer);

    expect(result.variants.sm).toBe(`https://media.test.local/${result.storageKey}-sm.webp`);
    expect(result.variants.md).toBe(`https://media.test.local/${result.storageKey}-md.webp`);
    expect(result.variants.lg).toBe(`https://media.test.local/${result.storageKey}-lg.webp`);
    expect(fakeBucket.size).toBe(3);
    expect(fakeBucket.get(`${result.storageKey}-lg.webp`)?.contentType).toBe("image/webp");
  });

  it("las dimensiones devueltas son las de la variante lg real, no el ancho objetivo nominal", async () => {
    fakeBucket.clear();
    // Fuente más chica que el ancho objetivo de "lg" (1600) — no debe agrandarse.
    const buffer = await makeTestImage(1000, 750);

    const result = await processAndUploadPortfolioImage(buffer);

    expect(result.width).toBe(1000);
    expect(result.height).toBe(750);
  });

  it("no agranda una imagen fuente más chica que el ancho objetivo (withoutEnlargement)", async () => {
    fakeBucket.clear();
    const buffer = await makeTestImage(300, 200);

    const result = await processAndUploadPortfolioImage(buffer);
    const smMeta = await sharp(fakeBucket.get(`${result.storageKey}-sm.webp`)!.body).metadata();
    const lgMeta = await sharp(fakeBucket.get(`${result.storageKey}-lg.webp`)!.body).metadata();

    // Objetivo sm=400 > fuente 300 -> se queda en 300, nunca se agranda a 400.
    expect(smMeta.width).toBe(300);
    expect(lgMeta.width).toBe(300);
  });

  it("acepta JPEG y WebP, no solo PNG", async () => {
    fakeBucket.clear();
    const jpeg = await makeTestImage(500, 500, "jpeg");
    const webp = await makeTestImage(500, 500, "webp");

    await expect(processAndUploadPortfolioImage(jpeg)).resolves.toBeDefined();
    await expect(processAndUploadPortfolioImage(webp)).resolves.toBeDefined();
  });

  it("rechaza un archivo que no es una imagen real, sin importar la extensión que diga tener", async () => {
    const notAnImage = Buffer.from("esto no es una imagen, es texto plano");
    await expect(processAndUploadPortfolioImage(notAnImage)).rejects.toThrow(/formato/i);
  });

  it("rechaza un archivo más grande que el máximo permitido", async () => {
    const oversized = Buffer.alloc(16 * 1024 * 1024);
    await expect(processAndUploadPortfolioImage(oversized)).rejects.toThrow(/tamaño máximo/i);
  });

  it("cada llamada genera un storageKey distinto (UUID), no reutiliza uno fijo", async () => {
    fakeBucket.clear();
    const buffer = await makeTestImage(400, 400);
    const first = await processAndUploadPortfolioImage(buffer);
    const second = await processAndUploadPortfolioImage(buffer);
    expect(first.storageKey).not.toBe(second.storageKey);
  });
});

describe("deletePortfolioImageFiles", () => {
  it("borra las 3 variantes por su storageKey compartido", async () => {
    fakeBucket.clear();
    const buffer = await makeTestImage(500, 500);
    const { storageKey } = await processAndUploadPortfolioImage(buffer);
    expect(fakeBucket.size).toBe(3);

    await deletePortfolioImageFiles(storageKey);
    expect(fakeBucket.size).toBe(0);
  });

  it("es idempotente: borrar un storageKey inexistente no lanza", async () => {
    await expect(deletePortfolioImageFiles("no-existe-este-id")).resolves.not.toThrow();
  });
});
