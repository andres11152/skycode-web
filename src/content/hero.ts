import heroDataEs from "./locales/es/hero.json";
import heroDataEn from "./locales/en/hero.json";
import heroDataFr from "./locales/fr/hero.json";
import { getPageSeo } from "@/seo/keyword-map";
import type { Locale } from "@/lib/i18n";

const heroByLocale = { es: heroDataEs, en: heroDataEn, fr: heroDataFr };

/**
 * El H1 de la home sale del mapa de keywords (`brand`), igual que su `<title>`: una sola fuente.
 * El Hero lo pinta en dos tonos, así que se parte en `titleBefore` + `titleAccent` (la frase en
 * gris, que vive en hero.json y debe cerrar el H1; `keywordMap.test.ts` lo verifica).
 */
export function getHeroContent(locale: Locale) {
  const hero = heroByLocale[locale];
  const { h1 } = getPageSeo("brand", locale);
  const accent = hero.titleAccent;
  const hasAccent = accent.length > 0 && h1.endsWith(accent);
  return {
    ...hero,
    titleBefore: hasAccent ? h1.slice(0, h1.length - accent.length) : h1,
    titleAccent: hasAccent ? accent : "",
    titleAfter: "",
  };
}
