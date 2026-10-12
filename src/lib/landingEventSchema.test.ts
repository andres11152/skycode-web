import { describe, expect, it } from "vitest";
import { LandingEventSchema } from "./landingEventSchema";

describe("LandingEventSchema", () => {
  it("acepta un clic a WhatsApp solo con la ruta de la landing", () => {
    expect(LandingEventSchema.safeParse({ kind: "whatsapp_click", landing_page: "/landing" }).success).toBe(true);
  });

  it("acepta una variante de la landing y la atribución opcional", () => {
    const parsed = LandingEventSchema.safeParse({
      kind: "whatsapp_click",
      landing_page: "/landing/precio",
      utm_source: "google",
      utm_campaign: "software-bogota",
      gclid: "abc123",
    });
    expect(parsed.success).toBe(true);
  });

  it.each(["/", "/blog", "landing", "/landing/", "/landing/../dashboard", "/landing/Precio", "https://evil.test/landing"])(
    "rechaza la ruta %s",
    (landing_page) => {
      expect(LandingEventSchema.safeParse({ kind: "whatsapp_click", landing_page }).success).toBe(false);
    },
  );

  it("rechaza un tipo de evento desconocido", () => {
    expect(LandingEventSchema.safeParse({ kind: "page_view", landing_page: "/landing" }).success).toBe(false);
  });

  it("rechaza campos que no existen (nada de datos personales por la puerta de atrás)", () => {
    const parsed = LandingEventSchema.safeParse({ kind: "whatsapp_click", landing_page: "/landing", email: "a@b.co" });
    expect(parsed.success).toBe(false);
  });
});
