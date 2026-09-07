import { describe, expect, it } from "vitest";
import { saveDocumentFile, readDocumentFile, deleteDocumentFile, isAllowedDocumentExtension } from "./storage";

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

describe("saveDocumentFile / readDocumentFile / deleteDocumentFile", () => {
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

  it("borrar un storageKey que no existe no lanza (best-effort)", async () => {
    await expect(deleteDocumentFile("00000000-0000-0000-0000-000000000000.pdf")).resolves.not.toThrow();
  });
});
