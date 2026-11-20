import { describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "./consent";
import { buildGtagInitScript, googleConsentState, gtagLoaderId } from "./googleTag";

describe("Etiqueta de Google (GA4 + Ads) con Modo de consentimiento v2", () => {
  const script = buildGtagInitScript({ ga4Id: "G-TEST123", adsId: "AW-123456789" });

  it("deja todo denegado, con wait_for_update, ANTES de configurar cualquier cuenta", () => {
    const defaultAt = script.indexOf("'consent', 'default'");
    expect(defaultAt).toBeGreaterThan(-1);
    for (const id of ['"G-TEST123"', '"AW-123456789"']) {
      expect(script.indexOf(`gtag('config', ${id}`)).toBeGreaterThan(defaultAt);
    }
    const defaultLine = script.slice(defaultAt, script.indexOf("\n", defaultAt));
    for (const key of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      expect(defaultLine).toContain(`${key}: 'denied'`);
    }
    expect(defaultLine).toContain("wait_for_update: 500");
  });

  it("aplica el consentimiento ya guardado en el mismo script y en orden (update después de default)", () => {
    expect(script.indexOf("'consent', 'update'")).toBeGreaterThan(script.indexOf("'consent', 'default'"));
    expect(script).toContain(CONSENT_STORAGE_KEY);
    expect(script).toContain(`stored.version === ${CONSENT_VERSION}`);
    expect(script).toContain("stored.measurement === true");
    expect(script).toContain('"analytics_storage":"granted"');
  });

  it("borra los identificadores de clic mientras no haya permiso", () => {
    expect(script).toContain("'ads_data_redaction', true");
  });

  it("una sola categoría gobierna las cuatro señales, incluida la analítica", () => {
    expect(googleConsentState(false)).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    expect(googleConsentState(true)).toEqual({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
  });

  it("el page_view inicial de GA4 lleva la URL de la carga, no la que haya cuando llegue gtag.js", () => {
    expect(script).toContain("gtag('config', \"G-TEST123\", { page_location: window.location.href");
  });

  it("solo configura las cuentas que existen", () => {
    const adsOnly = buildGtagInitScript({ adsId: "AW-1" });
    expect(adsOnly).toContain("gtag('config', \"AW-1\")");
    expect(adsOnly).not.toContain("page_location");
    const ga4Only = buildGtagInitScript({ ga4Id: "G-1" });
    expect(ga4Only).not.toContain("AW-");
  });

  it("pide gtag.js una sola vez, con el id de GA4 si existe", () => {
    expect(gtagLoaderId({ ga4Id: "G-1", adsId: "AW-1" })).toBe("G-1");
    expect(gtagLoaderId({ adsId: "AW-1" })).toBe("AW-1");
    expect(gtagLoaderId({})).toBeUndefined();
  });
});
