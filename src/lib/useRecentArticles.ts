"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Locale } from "@/lib/i18n";

export interface RecentArticle {
  slug: string;
  title: string;
}

/**
 * Últimos posts publicados de un locale, para el Footer — mismo patrón de
 * fetch cliente que `useGeoCountry`. El Footer se monta una sola vez en el
 * layout raíz, fuera del árbol de la home, así que no tiene el locale (ni
 * los posts) disponibles vía props de servidor — a diferencia de
 * `BlogTeaser`, que sí los recibe ya resueltos desde `HomeSections`.
 *
 * Sin caché en `localStorage` a propósito: la lista cambia cada vez que se
 * aprueba un artículo nuevo desde el dashboard, y es una llamada liviana
 * (GET /api/articles/recent) — cachearla localmente arriesga mostrar
 * artículos desactualizados sin ganancia real de rendimiento.
 */
export function useRecentArticles(
  locale: Locale,
  limit: number,
  target: RefObject<HTMLElement | null>,
): RecentArticle[] {
  const [posts, setPosts] = useState<RecentArticle[]>([]);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let cancelled = false;

    // Solo cuando el Footer se acerca al viewport: antes se pedía al
    // hidratar cada página, compitiendo por red con la carga inicial por
    // una lista que está al fondo de la página.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        fetch(`/api/articles/recent?locale=${locale}&limit=${limit}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ posts: RecentArticle[] }>) : null))
          .then((data) => {
            if (cancelled || !data) return;
            setPosts(data.posts);
          })
          .catch(() => {});
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [locale, limit, target]);

  return posts;
}
