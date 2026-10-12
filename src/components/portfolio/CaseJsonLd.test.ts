import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseJsonLd } from "./CaseJsonLd";
import { buildSiteGraph } from "@/lib/jsonLd";
import { definedIds, extractJsonLd, flattenJsonLd, hasType, validateJsonLd, type JsonLdNode } from "@/lib/jsonLdValidate";
import type { PortfolioProject } from "@/content/portfolioShared";
import { locales } from "@/lib/i18n";
import { portfolioCasePath } from "@/lib/portfolioPaths";
import { siteUrl } from "@/lib/site";

const siteIds = definedIds(flattenJsonLd(buildSiteGraph()));

const project: PortfolioProject = {
  slug: "sentry-crm",
  status: "published",
  isFeatured: true,
  liveUrl: "https://sentrycrm.example",
  industryIcon: "ChatsCircle",
  title: "Sentry CRM",
  clientLabel: "Producto propio",
  summary: "Plataforma de gestión de leads por WhatsApp.",
  challenge: "El problema.",
  solution: "La solución.",
  results: "{{TODO: resultados medibles reales}}",
  clientContext: "",
  architecture: "",
  process: "",
  testimonialQuote: "{{TODO: cita real}}",
  testimonialAuthor: "",
  testimonialRole: "",
  capabilities: ["Bandeja única", "{{TODO: capacidad pendiente}}"],
  technologies: [
    { id: 1, slug: "nextdotjs", name: "Next.js", category: "frontend", iconSource: "simple-icons", iconRef: "nextdotjs", websiteUrl: null, icon: null },
    { id: 2, slug: "postgresql", name: "PostgreSQL", category: "database", iconSource: "simple-icons", iconRef: "postgresql", websiteUrl: null, icon: null },
  ],
  images: [],
  coverImage: null,
  metrics: [],
  publishedAt: "2026-03-01T00:00:00.000Z",
  translated: true,
};

const render = (p: PortfolioProject, locale: (typeof locales)[number] = "es", modifiedAt: string | null = "2026-05-01T00:00:00.000Z") =>
  extractJsonLd(renderToStaticMarkup(createElement(CaseJsonLd, { project: p, locale, modifiedAt })));

describe("JSON-LD de un caso de estudio", () => {
  it.each(locales)("[%s] es válido: WebPage → Article → SoftwareApplication, con SkyCode como autor y editor", (locale) => {
    const nodes = render(project, locale);
    expect(validateJsonLd(nodes, { externalIds: siteIds })).toEqual([]);
    const url = `${siteUrl}${portfolioCasePath(locale, "sentry-crm")}`;
    const article = nodes.find((n) => hasType(n, "Article"))!;
    expect(article["@id"]).toBe(`${url}#article`);
    expect((article.about as JsonLdNode)["@id"]).toBe(`${url}#software`);
    expect((article.author as JsonLdNode)["@id"]).toBe(`${siteUrl}/#organization`);
    expect((article.publisher as JsonLdNode)["@id"]).toBe(`${siteUrl}/#organization`);
    expect(article.datePublished).toBe("2026-03-01T00:00:00.000Z");
    expect(article.dateModified).toBe("2026-05-01T00:00:00.000Z");
    expect(article.keywords).toBe("Next.js, PostgreSQL, Bandeja única");
    expect(hasType(nodes[0], "WebPage")).toBe(true);
  });

  it("no publica marcadores pendientes ni inventa métricas, testimonio o valoraciones", () => {
    const nodes = render(project);
    const json = JSON.stringify(nodes);
    expect(json).not.toContain("{{TODO");
    expect(json).not.toContain("Review");
    expect(json).not.toContain("aggregateRating");
    const software = nodes.find((n) => hasType(n, "SoftwareApplication"))!;
    expect(software.featureList).toEqual(["Bandeja única"]);
    expect(software.additionalProperty).toBeUndefined();
  });

  it("las métricas reales cargadas en el dashboard salen como additionalProperty", () => {
    const nodes = render({ ...project, metrics: [{ value: "−40 %", label: "Tiempo de primera respuesta" }] });
    const software = nodes.find((n) => hasType(n, "SoftwareApplication"))!;
    expect(software.additionalProperty).toEqual([{ "@type": "PropertyValue", name: "Tiempo de primera respuesta", value: "−40 %" }]);
  });

  it("sin fecha de publicación no se inventa ninguna", () => {
    const article = render({ ...project, publishedAt: null }, "es", null).find((n) => hasType(n, "Article"))!;
    expect(article.datePublished).toBeUndefined();
    expect(article.dateModified).toBeUndefined();
  });
});
