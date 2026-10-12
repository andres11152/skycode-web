import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSiteGraph, ORGANIZATION_ID, WEBSITE_ID, serviceNodeId } from "./jsonLd";
import { definedIds, extractJsonLd, flattenJsonLd, hasType, validateJsonLd, type JsonLdNode } from "./jsonLdValidate";
import { ServiceJsonLd } from "@/components/services/ServiceJsonLd";
import { ArticleJsonLd } from "@/components/blog/ArticleJsonLd";
import { TeamJsonLd } from "@/components/team/TeamJsonLd";
import { getServiceBySlug, getServicesContent } from "@/content/services";
import type { BlogPost } from "@/content/blogShared";
import { siteUrl } from "@/lib/site";
import { servicePath } from "@/lib/serviceMetadata";
import { locales } from "@/lib/i18n";

const siteNodes = flattenJsonLd(buildSiteGraph());
const siteIds = definedIds(siteNodes);
const byId = (nodes: JsonLdNode[], id: string) => nodes.find((n) => n["@id"] === id);

describe("grafo del sitio (layout raíz)", () => {
  it("es válido y define #organization y #website", () => {
    // Las ofertas citan el `@id` del Service que define cada página de servicio (otra página).
    const serviceIds = new Set(getServicesContent("es").services.map((s) => serviceNodeId("es", s.slug)));
    expect(validateJsonLd(siteNodes, { externalIds: serviceIds })).toEqual([]);
    expect(siteIds.has(ORGANIZATION_ID)).toBe(true);
    expect(siteIds.has(WEBSITE_ID)).toBe(true);
  });

  it("la organización trae el nombre legal, los alias de marca, el fundador y sameAs", () => {
    const org = byId(siteNodes, ORGANIZATION_ID)!;
    expect(hasType(org, "ProfessionalService") && hasType(org, "Organization")).toBe(true);
    expect(org.legalName).toBeTruthy();
    expect(org.alternateName).toEqual(["SkyCode", "Sky Code", "SkyCode Agency"]);
    expect((org.founder as JsonLdNode).name).toBeTruthy();
    const sameAs = org.sameAs as string[];
    expect(sameAs.length).toBeGreaterThanOrEqual(2);
    // Los perfiles pendientes ({{TODO}}) nunca se publican.
    expect(sameAs.every((url) => url.startsWith("https://"))).toBe(true);
    expect(JSON.stringify(org)).not.toContain("{{TODO");
  });

  it("WebSite declara el nombre corto y la organización como publisher", () => {
    const site = byId(siteNodes, WEBSITE_ID)!;
    expect(site.name).toBe("SkyCode");
    expect(site.alternateName).toContain("SkyCode Agency");
    expect((site.publisher as JsonLdNode)["@id"]).toBe(ORGANIZATION_ID);
  });

  it("cada oferta de la organización apunta al Service de su página", () => {
    const org = byId(siteNodes, ORGANIZATION_ID)!;
    const offers = org.makesOffer as { itemOffered: JsonLdNode }[];
    expect(offers.length).toBe(9);
    for (const offer of offers) expect(String(offer.itemOffered["@id"])).toMatch(/#service$/);
  });
});

describe("JSON-LD de una página de servicio", () => {
  for (const locale of locales) {
    it(`[${locale}] es válido, se cuelga de #organization/#website y define el @id que cita la organización`, () => {
      const service = getServiceBySlug("migracion-datos-legacy", locale)!;
      const html = renderToStaticMarkup(createElement(ServiceJsonLd, { service, locale }));
      const nodes = extractJsonLd(html);
      expect(validateJsonLd(nodes, { externalIds: siteIds })).toEqual([]);
      const svc = nodes.find((n) => hasType(n, "Service"))!;
      expect(svc["@id"]).toBe(serviceNodeId(locale, "migracion-datos-legacy"));
      expect(svc["@id"]).toBe(`${siteUrl}${servicePath(locale, "migracion-datos-legacy")}#service`);
      expect((svc.provider as JsonLdNode)["@id"]).toBe(ORGANIZATION_ID);
      expect(nodes.some((n) => hasType(n, "FAQPage"))).toBe(true);
    });
  }
});

const post: BlogPost = {
  slug: "ejemplo",
  title: "Guía de ejemplo",
  description: "Descripción de ejemplo del artículo.",
  publishedAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-02-01T12:00:00.000Z",
  author: "César León",
  authorSlug: "cesar-leon",
  tags: ["a", "b"],
  content: [
    { type: "heading", level: 2, text: "Preguntas" },
    { type: "faq", items: [{ question: "¿Algo?", answer: "Sí, [aquí](/servicios) hay algo." }] },
  ],
};

describe("JSON-LD de un artículo", () => {
  it("es válido, referencia a la organización y al sitio y trae FAQPage", () => {
    const html = renderToStaticMarkup(createElement(ArticleJsonLd, { post, locale: "es" }));
    const nodes = extractJsonLd(html);
    // La Person del autor la define su propia página (/equipo…), no el artículo.
    const external = new Set([...siteIds, `${siteUrl}/equipo#cesar-leon`]);
    expect(validateJsonLd(nodes, { externalIds: external })).toEqual([]);
    const article = nodes.find((n) => hasType(n, "BlogPosting"))!;
    expect((article.publisher as JsonLdNode)["@id"]).toBe(ORGANIZATION_ID);
    expect((article.isPartOf as JsonLdNode)["@id"]).toBe(WEBSITE_ID);
    expect(nodes.some((n) => hasType(n, "FAQPage"))).toBe(true);
  });
});

describe("JSON-LD del equipo", () => {
  it("cada integrante es una Person que trabaja para #organization", () => {
    const html = renderToStaticMarkup(
      createElement(TeamJsonLd, {
        locale: "es",
        members: [
          { slug: "cesar-leon", name: "César León", role: "Frontend", description: "Frontend.", photo: null, linkedinUrl: null, githubUrl: null },
        ],
      })
    );
    const nodes = extractJsonLd(html);
    expect(validateJsonLd(nodes, { externalIds: siteIds })).toEqual([]);
    expect((nodes[0].worksFor as JsonLdNode)["@id"]).toBe(ORGANIZATION_ID);
  });
});

describe("validateJsonLd", () => {
  it("detecta referencias sin definir, migas desordenadas y campos ausentes", () => {
    const problems = validateJsonLd([
      { "@type": "Service", "@id": "https://x/a#service", name: "A", description: "d", provider: { "@id": "https://x/#nada" } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 2, name: "A", item: "https://x" }] },
      { "@type": "WebSite", "@id": "https://x/#website", url: "https://x" },
    ]);
    expect(problems.join("\n")).toMatch(/no está definida/);
    expect(problems.join("\n")).toMatch(/posición 2 en el lugar 1/);
    expect(problems.join("\n")).toMatch(/falta "name"/);
  });
});
