import { describe, expect, it } from "vitest";
import { getServiceSeo, getServicesIndexSeo } from "./serviceSeo";
import { getServicesContent } from "./services";
import { locales } from "@/lib/i18n";
import { TITLE_MAX_LENGTH, titleSuffix } from "@/lib/site";

const DESCRIPTION_MAX = 155;

describe("SEO de servicios", () => {
  for (const locale of locales) {
    it(`[${locale}] cada servicio tiene título, descripción y H1 dentro de los límites`, () => {
      for (const service of getServicesContent(locale).services) {
        const seo = getServiceSeo(service.slug, locale);
        expect(seo, `${locale}/${service.slug}`).toBeDefined();
        expect(seo!.title.length + titleSuffix.length, `título ${locale}/${service.slug}`).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
        expect(seo!.description.length, `descripción ${locale}/${service.slug}`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      }
    });

    it(`[${locale}] el índice de servicios respeta los límites`, () => {
      const seo = getServicesIndexSeo(locale);
      expect(seo.title.length + titleSuffix.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
      expect(seo.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(seo.h1.length).toBeGreaterThan(10);
    });

    it(`[${locale}] no hay dos servicios con el mismo título`, () => {
      const titles = getServicesContent(locale).services.map((s) => getServiceSeo(s.slug, locale)!.title);
      expect(new Set(titles).size).toBe(titles.length);
    });
  }
});
