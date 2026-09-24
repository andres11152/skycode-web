import { describe, expect, it } from "vitest";
import { buildEstimatorQuoteEmail } from "./estimatorQuoteEmail";
import { computeEstimatorQuote } from "./estimatorQuote";

describe("buildEstimatorQuoteEmail", () => {
  it("incluye el tipo de proyecto, el precio formateado y las semanas en el HTML y el texto", () => {
    const quote = computeEstimatorQuote({
      typeId: "web",
      addonIds: ["auth"],
      pace: "standard",
      currency: "COP",
      locale: "es",
    })!;

    const { subject, html, text } = buildEstimatorQuoteEmail({ quote, locale: "es" });

    expect(subject).toContain(quote.typeTitle);
    expect(html).toContain(quote.formattedTotal);
    expect(html).toContain(quote.typeTitle);
    expect(html).toContain("~4"); // totalWeeks
    expect(text).toContain(quote.formattedTotal);
  });

  it("muestra 'Ninguno' cuando no se eligió ningún módulo adicional", () => {
    const quote = computeEstimatorQuote({
      typeId: "web",
      addonIds: [],
      pace: "standard",
      currency: "COP",
      locale: "es",
    })!;

    const { html, text } = buildEstimatorQuoteEmail({ quote, locale: "es" });
    expect(html).toContain("Ninguno");
    expect(text).toContain("Ninguno");
  });

  it("incluye el logo real del sitio", () => {
    const quote = computeEstimatorQuote({ typeId: "web", addonIds: [], pace: "standard", currency: "COP", locale: "es" })!;
    const { html } = buildEstimatorQuoteEmail({ quote, locale: "es" });
    expect(html).toContain("skycode.agency/logo-full.png");
  });

  it("genera el correo en el idioma indicado", () => {
    const quote = computeEstimatorQuote({ typeId: "web", addonIds: [], pace: "standard", currency: "USD", locale: "en" })!;
    const { subject, html } = buildEstimatorQuoteEmail({ quote, locale: "en" });
    expect(subject).toContain("Your SkyCode quote");
    expect(html).toContain("Talk to the team");
  });

  it("no depende de texto arbitrario del navegador — todo sale del catálogo real vía computeEstimatorQuote", () => {
    const quote = computeEstimatorQuote({ typeId: "apis", addonIds: ["security"], pace: "express", currency: "COP", locale: "es" })!;
    const { html } = buildEstimatorQuoteEmail({ quote, locale: "es" });
    // El título real del catálogo para "apis" debe aparecer, no un texto inventado.
    expect(html).toContain("Integraciones");
  });
});
