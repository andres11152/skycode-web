import { describe, expect, it } from "vitest";
import { buildLeadWhatsappMessage, buildLeadWhatsappUrl, sanitizeLeadPhone } from "./leadWhatsapp";

describe("sanitizeLeadPhone", () => {
  it("elimina cualquier carácter que no sea dígito o '+'", () => {
    expect(sanitizeLeadPhone("+57 (313) 808-1081")).toBe("+573138081081");
  });

  it("devuelve string vacío para null/undefined", () => {
    expect(sanitizeLeadPhone(null)).toBe("");
    expect(sanitizeLeadPhone(undefined)).toBe("");
  });
});

describe("buildLeadWhatsappMessage", () => {
  it("menciona el servicio real cuando el lead lo tiene", () => {
    const message = buildLeadWhatsappMessage({ name: "Ana", service: "Integraciones & Conexión de Sistemas" });
    expect(message).toContain("Integraciones & Conexión de Sistemas");
    expect(message).not.toContain("cotización");
  });

  it("usa un saludo neutral cuando no hay servicio — nunca 'Contacto Web'", () => {
    const message = buildLeadWhatsappMessage({ name: "Ana", service: null });
    expect(message).not.toContain("Contacto Web");
    expect(message).not.toContain("Desarrollo General");
    expect(message.toLowerCase()).toContain("mensaje que nos enviaste");
  });
});

describe("buildLeadWhatsappUrl", () => {
  it("devuelve null cuando el lead no tiene teléfono", () => {
    expect(buildLeadWhatsappUrl({ name: "Ana", phone: "", service: null })).toBeNull();
    expect(buildLeadWhatsappUrl({ name: "Ana", phone: null, service: null })).toBeNull();
  });

  it("construye un enlace wa.me con el teléfono saneado y el texto codificado", () => {
    const url = buildLeadWhatsappUrl({ name: "Ana", phone: "+57 313 808 1081", service: "Aplicaciones Móviles" });
    expect(url).toBe(
      `https://wa.me/+573138081081?text=${encodeURIComponent(
        "Hola Ana, te escribimos de SKYCODE Agency respecto a tu solicitud de Aplicaciones Móviles."
      )}`
    );
  });
});
