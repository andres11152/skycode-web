import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// Mismo criterio que portfolioStorage.test.ts: el procesamiento con sharp
// corre de verdad, solo se reemplaza la subida a R2 por un bucket en memoria.
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
    } else if (command instanceof FakeDeleteObjectCommand) {
      fakeBucket.delete(command.input.Key);
    }
    return Promise.resolve({});
  }
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: FakeS3Client,
  PutObjectCommand: FakePutObjectCommand,
  DeleteObjectCommand: FakeDeleteObjectCommand,
}));

process.env.R2_ACCOUNT_ID = "test-account";
process.env.R2_PORTFOLIO_ACCESS_KEY_ID = "test-access-key";
process.env.R2_PORTFOLIO_SECRET_ACCESS_KEY = "test-secret-key";
process.env.R2_PORTFOLIO_BUCKET_NAME = "test-bucket";
process.env.R2_PORTFOLIO_PUBLIC_BASE_URL = "https://media.test.local";

const { processAndUploadAvatar, deleteAvatarFiles, deleteAvatarFilesQuietly, isAvatarValidationError } = await import(
  "./avatarStorage"
);

async function makeTestImage(width: number, height: number, format: "png" | "jpeg" | "webp" = "png"): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } } });
  if (format === "jpeg") return image.jpeg().toBuffer();
  if (format === "webp") return image.webp().toBuffer();
  return image.png().toBuffer();
}

describe("processAndUploadAvatar", () => {
  it("sube 3 variantes WebP con prefijo avatars/ y URLs públicas absolutas", async () => {
    fakeBucket.clear();
    const result = await processAndUploadAvatar(await makeTestImage(800, 800));

    expect(result.variants.sm).toBe(`https://media.test.local/avatars/${result.storageKey}-sm.webp`);
    expect(result.variants.lg).toBe(`https://media.test.local/avatars/${result.storageKey}-lg.webp`);
    expect(fakeBucket.size).toBe(3);
    expect(fakeBucket.get(`avatars/${result.storageKey}-md.webp`)?.contentType).toBe("image/webp");
  });

  it("recorta una foto horizontal a cuadrados exactos de 64/128/256", async () => {
    fakeBucket.clear();
    const result = await processAndUploadAvatar(await makeTestImage(1600, 900));

    for (const [size, px] of [["sm", 64], ["md", 128], ["lg", 256]] as const) {
      const meta = await sharp(fakeBucket.get(`avatars/${result.storageKey}-${size}.webp`)!.body).metadata();
      expect(meta.width).toBe(px);
      expect(meta.height).toBe(px);
      expect(meta.format).toBe("webp");
    }
  });

  it("agranda una foto más chica que 256px — el avatar siempre mide lo que dice su variante", async () => {
    fakeBucket.clear();
    const result = await processAndUploadAvatar(await makeTestImage(100, 100));

    const meta = await sharp(fakeBucket.get(`avatars/${result.storageKey}-lg.webp`)!.body).metadata();
    expect(meta.width).toBe(256);
  });

  it("acepta JPEG y WebP además de PNG", async () => {
    await expect(processAndUploadAvatar(await makeTestImage(300, 300, "jpeg"))).resolves.toBeDefined();
    await expect(processAndUploadAvatar(await makeTestImage(300, 300, "webp"))).resolves.toBeDefined();
  });

  it("rechaza un archivo que no es imagen, sin importar su extensión", async () => {
    fakeBucket.clear();
    const fake = Buffer.from("%PDF-1.4 esto no es una foto");

    await expect(processAndUploadAvatar(fake)).rejects.toThrow("Formato de imagen no soportado");
    expect(fakeBucket.size).toBe(0);
  });

  it("rechaza un formato de imagen válido pero no permitido (GIF)", async () => {
    const gif = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#000" } }).gif().toBuffer();
    await expect(processAndUploadAvatar(gif)).rejects.toThrow("Formato de imagen no soportado");
  });

  it("rechaza archivos de más de 8 MB antes de procesarlos", async () => {
    const huge = Buffer.alloc(8 * 1024 * 1024 + 1);
    await expect(processAndUploadAvatar(huge)).rejects.toThrow("tamaño máximo");
  });

  it("cada subida genera una clave nueva (nunca reescribe una existente)", async () => {
    const image = await makeTestImage(200, 200);
    const a = await processAndUploadAvatar(image);
    const b = await processAndUploadAvatar(image);
    expect(a.storageKey).not.toBe(b.storageKey);
  });
});

describe("deleteAvatarFiles / deleteAvatarFilesQuietly", () => {
  it("borra las 3 variantes", async () => {
    fakeBucket.clear();
    const { storageKey } = await processAndUploadAvatar(await makeTestImage(200, 200));
    expect(fakeBucket.size).toBe(3);

    await deleteAvatarFiles(storageKey);
    expect(fakeBucket.size).toBe(0);
  });

  it("la versión silenciosa no hace nada con una clave nula", async () => {
    const onError = vi.fn();
    await deleteAvatarFilesQuietly(null, onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("isAvatarValidationError", () => {
  it("distingue errores del archivo (400) de errores del servidor (500)", () => {
    expect(isAvatarValidationError("Formato de imagen no soportado. Use JPEG, PNG o WebP.")).toBe(true);
    expect(isAvatarValidationError("La imagen supera el tamaño máximo permitido (8 MB).")).toBe(true);
    expect(isAvatarValidationError("connect ECONNREFUSED")).toBe(false);
  });
});
