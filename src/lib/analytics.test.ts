import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_ALL, CONSENT_DENIED, CONSENT_STORAGE_KEY, buildConsentRecord, type ConsentChoices } from "./consent";
import { isPrivateAppPath } from "./privateRoutes";

describe("isPrivateAppPath", () => {
  it("marca panel, portal, acceso y enlaces con token", () => {
    for (const path of [
      "/login",
      "/olvide-password",
      "/resetear-password/abc",
      "/dashboard",
      "/dashboard/leads",
      "/portal/cuenta",
      "/invitar/token",
      "/propuesta/0b4f-uuid",
    ]) {
      expect(isPrivateAppPath(path)).toBe(true);
    }
  });

  it("deja fuera el sitio público en los tres idiomas", () => {
    for (const path of ["/", "/en", "/fr", "/gracias", "/en/gracias", "/landing/precio", "/cotizador", "/blog/x", "/portafolio"]) {
      expect(isPrivateAppPath(path)).toBe(false);
    }
  });
});

describe("classifyContactLink", async () => {
  const { classifyContactLink } = await import("./analytics");

  it("reconoce WhatsApp y quita el texto prellenado de la URL reportada", () => {
    expect(classifyContactLink("https://wa.me/573001112233?text=Hola%20quiero%20cotizar")).toEqual({
      kind: "whatsapp",
      linkUrl: "https://wa.me/573001112233",
    });
    expect(classifyContactLink("https://api.whatsapp.com/send?phone=57300")?.kind).toBe("whatsapp");
  });

  it("reconoce correo y teléfono sin asunto ni cuerpo", () => {
    expect(classifyContactLink("mailto:contact@skycode.agency?subject=Hola")).toEqual({
      kind: "email",
      linkUrl: "mailto:contact@skycode.agency",
    });
    expect(classifyContactLink("tel:+573001112233")).toEqual({ kind: "phone", linkUrl: "tel:+573001112233" });
  });

  it("ignora cualquier otro enlace", () => {
    expect(classifyContactLink("https://skycode.agency/#contacto")).toBeNull();
    expect(classifyContactLink("https://evil.example/wa.me/57300")).toBeNull();
    expect(classifyContactLink("no es una url")).toBeNull();
  });
});

describe("trackEvent y trackContactLinkClick", () => {
  let calls: unknown[][];

  function installWindow(pathname: string, choices: ConsentChoices | null) {
    const store = new Map<string, string>();
    if (choices) store.set(CONSENT_STORAGE_KEY, JSON.stringify(buildConsentRecord(choices)));
    calls = [];
    vi.stubGlobal("window", {
      location: { pathname, href: `https://skycode.agency${pathname}` },
      localStorage: { getItem: (key: string) => store.get(key) ?? null },
      gtag: (...args: unknown[]) => calls.push(args),
      __skycodeGtagReady: true,
    });
  }

  async function loadAnalytics() {
    vi.resetModules();
    return import("./analytics");
  }

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA4_ID", "G-TEST123");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_ID", "AW-1");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL", "wa-label");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("envía el evento a GA4 con consentimiento de medición", async () => {
    installWindow("/", CONSENT_ALL);
    const { trackEvent } = await loadAnalytics();
    trackEvent("generate_lead", { form_location: "contact_section", lead_source: "Formulario Web" });
    expect(calls).toEqual([
      ["event", "generate_lead", { form_location: "contact_section", lead_source: "Formulario Web", send_to: "G-TEST123" }],
    ]);
  });

  it("no hace nada sin decisión, con la medición rechazada ni en una ruta privada", async () => {
    for (const [path, choices] of [
      ["/", null],
      ["/", CONSENT_DENIED],
      ["/propuesta/uuid", CONSENT_ALL],
    ] as const) {
      installWindow(path, choices);
      const { trackEvent } = await loadAnalytics();
      trackEvent("quote_start", { project_type: "web" });
      expect(calls).toEqual([]);
    }
  });

  it("no hace nada si gtag no está inicializado", async () => {
    installWindow("/", CONSENT_ALL);
    (window as unknown as { __skycodeGtagReady: boolean }).__skycodeGtagReady = false;
    const { trackEvent } = await loadAnalytics();
    trackEvent("quote_start", { project_type: "web" });
    expect(calls).toEqual([]);
  });

  it("el clic a WhatsApp envía el evento de GA4 y la conversión de Ads, una vez cada uno", async () => {
    installWindow("/en", CONSENT_ALL);
    const { trackContactLinkClick } = await loadAnalytics();
    trackContactLinkClick("https://wa.me/573001112233?text=hi");
    expect(calls).toEqual([
      ["event", "whatsapp_click", { link_url: "https://wa.me/573001112233", send_to: "G-TEST123" }],
      ["event", "conversion", { send_to: "AW-1/wa-label" }],
    ]);
  });

  it("sin consentimiento, el clic a WhatsApp no envía nada", async () => {
    installWindow("/", CONSENT_DENIED);
    const { trackContactLinkClick } = await loadAnalytics();
    trackContactLinkClick("https://wa.me/573001112233");
    expect(calls).toEqual([]);
  });

  it("correo y teléfono envían su propio evento", async () => {
    installWindow("/fr", CONSENT_ALL);
    const { trackContactLinkClick } = await loadAnalytics();
    trackContactLinkClick("mailto:contact@skycode.agency");
    trackContactLinkClick("tel:+573001112233");
    expect(calls.map((call) => call[1])).toEqual(["email_click", "phone_click"]);
  });
});

describe("contexto de página en navegaciones (set antes del page_view)", () => {
  let calls: unknown[][];

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA4_ID", "G-TEST123");
    calls = [];
    vi.stubGlobal("window", {
      location: { pathname: "/cotizador", href: "https://skycode.agency/cotizador" },
      localStorage: { getItem: () => null },
      gtag: (...args: unknown[]) => calls.push(args),
      __skycodeGtagReady: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("actualiza la URL y el referente para todos los eventos, y el page_view hereda el título", async () => {
    vi.resetModules();
    const { setPageContext, trackPageView } = await import("./analytics");
    setPageContext({ href: "https://skycode.agency/cotizador", referrer: "https://skycode.agency/servicios" });
    trackPageView("Cotizador | SkyCode");
    expect(calls).toEqual([
      ["set", { page_location: "https://skycode.agency/cotizador", page_referrer: "https://skycode.agency/servicios" }],
      ["set", { page_title: "Cotizador | SkyCode" }],
      ["event", "page_view", { send_to: "G-TEST123" }],
    ]);
  });
});

describe("waitForDocumentTitle", async () => {
  const { isNewDocumentTitle, waitForDocumentTitle, TITLE_WAIT_MS } = await import("./analytics");

  it("solo acepta un título no vacío y distinto del anterior", () => {
    expect(isNewDocumentTitle("", "Inicio")).toBe(false);
    expect(isNewDocumentTitle("   ", "Inicio")).toBe(false);
    expect(isNewDocumentTitle("Inicio", "Inicio")).toBe(false);
    expect(isNewDocumentTitle("Servicios", "Inicio")).toBe(true);
    expect(isNewDocumentTitle("Servicios", null)).toBe(true);
  });

  describe("en el navegador", () => {
    let observerCallback: (() => void) | null;
    let doc: { title: string; head: object };

    beforeEach(() => {
      vi.useFakeTimers();
      observerCallback = null;
      doc = { title: "", head: {} };
      vi.stubGlobal("document", doc);
      vi.stubGlobal(
        "MutationObserver",
        class {
          constructor(callback: () => void) {
            observerCallback = callback;
          }
          observe() {}
          disconnect() {
            observerCallback = null;
          }
        },
      );
      vi.stubGlobal("window", {
        setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
        clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
        requestAnimationFrame: (fn: () => void) => setTimeout(fn, 16),
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("espera a que el <title> vacío de la transición se reemplace por el de la página nueva", () => {
      const onReady = vi.fn();
      waitForDocumentTitle("Inicio", onReady);
      expect(onReady).not.toHaveBeenCalled();
      doc.title = "Servicios | SkyCode";
      observerCallback?.();
      expect(onReady).toHaveBeenCalledExactlyOnceWith("Servicios | SkyCode");
    });

    it("con el título ya cambiado envía en el siguiente frame, una sola vez", () => {
      doc.title = "Cotizador | SkyCode";
      const onReady = vi.fn();
      const flush = waitForDocumentTitle("Inicio", onReady);
      vi.advanceTimersByTime(16);
      flush();
      expect(onReady).toHaveBeenCalledExactlyOnceWith("Cotizador | SkyCode");
    });

    it("al cumplirse el tope envía igual (dos páginas con el mismo título)", () => {
      doc.title = "Inicio";
      const onReady = vi.fn();
      waitForDocumentTitle("Inicio", onReady);
      vi.advanceTimersByTime(TITLE_WAIT_MS);
      expect(onReady).toHaveBeenCalledExactlyOnceWith("Inicio");
    });

    it("flush envía en el acto lo pendiente si llega otra navegación, sin duplicar después", () => {
      const onReady = vi.fn();
      const flush = waitForDocumentTitle("Inicio", onReady);
      flush();
      vi.advanceTimersByTime(TITLE_WAIT_MS);
      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });
});
