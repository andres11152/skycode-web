import { describe, expect, it, afterEach } from "vitest";
import { sendEmail } from "./email";

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
});
