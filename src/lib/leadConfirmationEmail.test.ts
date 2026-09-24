import { describe, expect, it } from "vitest";
import { buildLeadConfirmationEmail } from "./leadConfirmationEmail";

describe("buildLeadConfirmationEmail", () => {
  it("saluda por el nombre real en el asunto y en el HTML", () => {
    const { subject, html, text } = buildLeadConfirmationEmail({
      name: "Carlos Gómez",
      message: "Necesito una tienda en línea para mi negocio.",
      service: null,
      locale: "es",
    });

    expect(subject).toContain("Carlos Gómez");
    expect(html).toContain("Hola Carlos Gómez,");
    expect(text).toContain("Hola Carlos Gómez,");
  });

  it("incluye el logo real del sitio, no un placeholder", () => {
    const { html } = buildLeadConfirmationEmail({
      name: "Ana",
      message: "Hola",
      service: null,
      locale: "es",
    });
    expect(html).toContain("skycode.agency/logo-full.png");
  });

  it("escapa el nombre y el mensaje antes de interpolarlos en el HTML (XSS)", () => {
    const { html } = buildLeadConfirmationEmail({
      name: '<img src=x onerror="alert(1)">',
      message: "<script>alert(2)</script>",
      service: null,
      locale: "es",
    });
    expect(html).not.toContain("<img src=x onerror");
    expect(html).not.toContain("<script>alert(2)</script>");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("muestra el servicio solicitado solo cuando existe", () => {
    const withService = buildLeadConfirmationEmail({
      name: "Ana",
      message: "Hola",
      service: "Ecommerce · Tienda en Línea",
      locale: "es",
    });
    expect(withService.html).toContain("Ecommerce");
    expect(withService.text).toContain("Ecommerce");

    const withoutService = buildLeadConfirmationEmail({
      name: "Ana",
      message: "Hola",
      service: null,
      locale: "es",
    });
    expect(withoutService.html).not.toContain("Servicio solicitado");
  });

  it("genera el correo en el idioma indicado", () => {
    const en = buildLeadConfirmationEmail({ name: "Anna", message: "Hi", service: null, locale: "en" });
    expect(en.subject).toContain("We've received your message");
    expect(en.html).toContain("Hi Anna,");

    const fr = buildLeadConfirmationEmail({ name: "Anne", message: "Bonjour", service: null, locale: "fr" });
    expect(fr.subject).toContain("Nous avons bien reçu votre message");
  });

  it("trunca mensajes muy largos con puntos suspensivos", () => {
    const longMessage = "a".repeat(500);
    const { text } = buildLeadConfirmationEmail({ name: "Ana", message: longMessage, service: null, locale: "es" });
    expect(text).toContain("…");
    expect(text).not.toContain("a".repeat(500));
    expect(text).toContain("a".repeat(400));
  });
});
