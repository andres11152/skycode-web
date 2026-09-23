import { describe, expect, it, afterEach, vi } from "vitest";
import { sendEmail } from "./email";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => sendMock(...args) };
  },
}));
const logErrorMock = vi.fn();
vi.mock("./logger", () => ({ logError: (...args: unknown[]) => logErrorMock(...args) }));

describe("sendEmail", () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("sin RESEND_API_KEY configurada, no lanza (solo loguea en consola)", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail({ to: "test@example.com", subject: "Asunto", text: "Cuerpo" })).resolves.not.toThrow();
  });

  it("con la clave dummy del .env.example, tampoco lanza", async () => {
    process.env.RESEND_API_KEY = "your_resend_api_key_here";
    await expect(sendEmail({ to: "test@example.com", subject: "Asunto", text: "Cuerpo" })).resolves.not.toThrow();
  });

  it("con una clave que no tiene el prefijo re_, se trata como no configurada", async () => {
    process.env.RESEND_API_KEY = "not-a-real-key";
    await expect(sendEmail({ to: "test@example.com", subject: "Asunto", text: "Cuerpo" })).resolves.not.toThrow();
  });

  // El SDK de Resend no lanza cuando la API responde con error: devuelve
  // `{ data, error }`. Antes eso pasaba como envío exitoso y el correo nunca
  // salía en silencio — fue el caso real del dominio sin verificar (403).
  it("reporta el error cuando Resend responde con `error` en vez de lanzar", async () => {
    process.env.RESEND_API_KEY = "re_clave_de_prueba";
    logErrorMock.mockClear();
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { statusCode: 403, message: "The skycode.agency domain is not verified." },
    });

    await expect(sendEmail({ to: "test@example.com", subject: "Asunto", text: "Cuerpo" })).resolves.not.toThrow();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock.mock.calls[0][0]).toContain("Resend devolvió un error");
  });

  it("no reporta nada cuando el envío sale bien", async () => {
    process.env.RESEND_API_KEY = "re_clave_de_prueba";
    logErrorMock.mockClear();
    sendMock.mockResolvedValueOnce({ data: { id: "abc123" }, error: null });

    await sendEmail({ to: "test@example.com", subject: "Asunto", text: "Cuerpo" });
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});
