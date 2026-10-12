import { describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "./consent";
import { adsConsentState, buildAdsInitScript } from "./googleAds";

describe("Modo de consentimiento v2 de Google Ads", () => {
  const script = buildAdsInitScript("AW-123456789");

  it("deja todo denegado ANTES de configurar la cuenta", () => {
    const defaultAt = script.indexOf("'consent', 'default'");
    const configAt = script.indexOf("gtag('config'");
    expect(defaultAt).toBeGreaterThan(-1);
    expect(configAt).toBeGreaterThan(defaultAt);
    const defaultLine = script.slice(defaultAt, script.indexOf("\n", defaultAt));
    for (const key of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      expect(defaultLine).toContain(`${key}: 'denied'`);
    }
  });

  it("aplica el consentimiento ya guardado en el mismo script y en orden (update después de default)", () => {
    expect(script.indexOf("'consent', 'update'")).toBeGreaterThan(script.indexOf("'consent', 'default'"));
    expect(script).toContain(CONSENT_STORAGE_KEY);
    expect(script).toContain(`stored.version === ${CONSENT_VERSION}`);
    expect(script).toContain("stored.measurement === true");
  });

  it("borra los identificadores de clic mientras no haya permiso y no usa analítica", () => {
    expect(script).toContain("'ads_data_redaction', true");
    expect(adsConsentState(true).analytics_storage).toBe("denied");
    expect(adsConsentState(false).ad_storage).toBe("denied");
    expect(adsConsentState(true)).toMatchObject({ ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  });

  it("incrusta el id de la cuenta como literal seguro y no espera a un CMP externo", () => {
    expect(script).toContain('"AW-123456789"');
    expect(script).not.toContain("wait_for_update");
  });
});
