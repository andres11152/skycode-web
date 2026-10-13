import { describe, expect, it } from "vitest";
import {
  ALERT_THRESHOLDS,
  buildSeoAlerts,
  buildWatchAlert,
  compareByPage,
  compareByQuery,
  findCannibalization,
  findStrikingDistance,
  findWrongTarget,
  isBrandQuery,
  localeOfPage,
  matchCluster,
  segmentTotals,
  type PeriodRow,
} from "./seoAnalysis";
import { listKeywordEntries } from "@/seo/keyword-map";

const SITE = "https://skycode.agency";
const row = (query: string, path: string, impressions: number, position: number, clicks = 0): PeriodRow => ({
  query,
  page: `${SITE}${path}`,
  clicks,
  impressions,
  position,
});
const entries = listKeywordEntries();

const Q = "servicios de migracion de sistemas legacy";

// El caso real del diagnóstico: la guía del blog (pos. ~80) captura una búsqueda comercial que debería ganar
// el servicio (pos. ~33).
const GUIDE = "/blog/migracion-sistemas-legados-sin-interrupcion";
const SERVICE = "/servicios/migracion-datos-legacy";

describe("marca vs no-marca", () => {
  it("reconoce 'skycode' y 'sky code' en cualquier combinación", () => {
    for (const q of ["skycode", "Sky Code", "SKYCODE agency", "skycode colombia", "agencia skycode bogotá"]) expect(isBrandQuery(q), q).toBe(true);
    for (const q of ["desarrollo de software a la medida", "sky coding", "code sky"]) expect(isBrandQuery(q), q).toBe(false);
  });

  it("segmenta clics, impresiones, CTR y posición ponderada", () => {
    const { brand, nonBrand } = segmentTotals([
      row("skycode", "/", 40, 4, 8),
      row("sky code", "/", 60, 5, 2),
      row("software a la medida", "/servicios/desarrollo-software-medida", 100, 50),
    ]);
    expect(brand).toMatchObject({ clicks: 10, impressions: 100, queries: 2 });
    expect(brand.ctr).toBeCloseTo(0.1);
    expect(brand.position).toBeCloseTo((40 * 4 + 60 * 5) / 100);
    expect(nonBrand).toMatchObject({ clicks: 0, impressions: 100, queries: 1, position: 50 });
  });
});

describe("distancia de ataque", () => {
  it("lista las queries en posición 8–20 con impresiones suficientes, la más vista primero", () => {
    const result = findStrikingDistance([
      row("migración sistema legacy", "/fr/x", 30, 10.2),
      row("migration de code legacy", "/fr/y", 12, 30),
      row("pocas impresiones", "/a", 2, 12),
      row("ya en top 3", "/b", 50, 2),
      row("otra candidata", "/c", 20, 8),
    ]);
    expect(result.map((q) => q.query)).toEqual(["migración sistema legacy", "otra candidata"]);
    expect(result[0].topPage).toBe(`${SITE}/fr/x`);
  });

  it("pondera la posición cuando la query tiene varias páginas y respeta los umbrales por parámetro", () => {
    const rows = [row("q", "/a", 10, 6), row("q", "/b", 10, 18)];
    expect(findStrikingDistance(rows)).toHaveLength(1); // media 12
    expect(findStrikingDistance(rows, { minPosition: 13 })).toHaveLength(0);
    expect(findStrikingDistance(rows, { minImpressions: 50 })).toHaveLength(0);
  });
});

describe("canibalización", () => {
  it("detecta más de una URL del mismo idioma para la misma query", () => {
    const result = findCannibalization([
      row("servicios de migracion de sistemas legacy", GUIDE, 79, 79.9),
      row("servicios de migracion de sistemas legacy", SERVICE, 60, 33.2),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].pages.map((p) => p.page)).toEqual([`${SITE}${GUIDE}`, `${SITE}${SERVICE}`]);
    expect(result[0].totalImpressions).toBe(139);
  });

  it("las versiones en otros idiomas son alternativas hreflang, no competidoras; la marca se excluye", () => {
    expect(findCannibalization([row("software", "/servicios/x", 10, 20), row("software", "/en/services/y", 10, 20)])).toEqual([]);
    expect(findCannibalization([row("skycode", "/", 10, 1), row("skycode", "/equipo", 10, 3)])).toEqual([]);
  });

  it("ignora las páginas con impresiones por debajo del mínimo", () => {
    const rows = [row("q", "/a", 20, 10), row("q", "/b", 1, 40)];
    expect(findCannibalization(rows)).toHaveLength(1);
    expect(findCannibalization(rows, { minPageImpressions: 5 })).toHaveLength(0);
  });
});

describe("página equivocada respecto del mapa de keywords", () => {
  it("asigna una query al clúster por su keyword primaria o secundaria (gana la más específica)", () => {
    expect(matchCluster("servicios de migracion de sistemas legacy", entries)).toBe("migracion-datos-legacy");
    expect(matchCluster("migrar sistemas legados sin downtime", entries)).toBe("migracion-legacy-guia");
    expect(matchCluster("desarrollo de software a la medida bogotá", entries)).toBe("desarrollo-software-medida");
    expect(matchCluster("receta de arepas", entries)).toBeNull();
  });

  it("señala la búsqueda comercial que rankea la guía del blog (el caso del diagnóstico)", () => {
    const wrong = findWrongTarget([row("servicios de migracion de sistemas legacy", GUIDE, 79, 79.9), row("servicios de migracion de sistemas legacy", SERVICE, 60, 33.2)], entries);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toMatchObject({ cluster: "migracion-datos-legacy", actualPath: GUIDE });
    expect(wrong[0].expectedPaths).toContain(SERVICE);
  });

  it("no avisa si la página que más se ve es la asignada (en cualquier idioma del clúster) ni por la marca", () => {
    expect(findWrongTarget([row("servicios de migracion de sistemas legacy", SERVICE, 60, 33)], entries)).toEqual([]);
    expect(findWrongTarget([row("legacy software migration services", "/en/services/legacy-software-migration", 9, 50)], entries)).toEqual([]);
    expect(findWrongTarget([row("skycode software a la medida", "/equipo", 9, 3)], entries)).toEqual([]);
  });
});

describe("semana contra semana", () => {
  it("calcula el cambio de posición (negativo = mejoró) y trata lo nuevo como sin periodo anterior", () => {
    const deltas = compareByQuery([row("a", "/x", 10, 8), row("nueva", "/y", 5, 12)], [row("a", "/x", 10, 14)]);
    const a = deltas.find((d) => d.query === "a")!;
    expect(a.positionDelta).toBeCloseTo(-6);
    expect(a.previousPosition).toBe(14);
    const nueva = deltas.find((d) => d.query === "nueva")!;
    expect(nueva.positionDelta).toBeNull();
    expect(nueva.previousImpressions).toBe(0);
  });

  it("agrega por página con la posición ponderada", () => {
    const [page] = compareByPage([row("q1", "/p", 30, 10), row("q2", "/p", 10, 30)], [row("q1", "/p", 10, 10)]);
    expect(page.position).toBeCloseTo(15);
    expect(page.positionDelta).toBeCloseTo(5);
  });
});

describe("alertas", () => {
  const codes = (current: PeriodRow[], previous: PeriodRow[], nonOkUrls?: { url: string; status: number | null }[]) =>
    buildSeoAlerts({ current, previous, entries, nonOkUrls }).map((a) => a.kind);

  it("una query que entra al top 10 avisa una vez (info); si ya estaba, no", () => {
    const entered = buildSeoAlerts({ current: [row("q", "/a", 5, 7.5)], previous: [row("q", "/a", 5, 14)], entries });
    expect(entered).toHaveLength(1);
    expect(entered[0]).toMatchObject({ kind: "top10_entry", severity: "info", dedupeKey: "q" });
    expect(codes([row("q", "/a", 5, 7.5)], [row("q", "/a", 5, 9)])).not.toContain("top10_entry");
    expect(codes([row("nueva", "/a", 5, 3)], [])).toContain("top10_entry");
    expect(codes([row("q", "/a", ALERT_THRESHOLDS.minImpressions - 1, 3)], [])).not.toContain("top10_entry");
  });

  it("una página que cae más de 10 posiciones avisa; una caída menor, no", () => {
    expect(codes([row("q", "/a", 10, 35)], [row("q", "/a", 10, 20)])).toContain("page_drop");
    expect(codes([row("q", "/a", 10, 28)], [row("q", "/a", 10, 20)])).not.toContain("page_drop");
  });

  it("caída de página y página equivocada exigen >=10 impresiones en AMBAS semanas (muestras pequeñas = ruido)", () => {
    const min = ALERT_THRESHOLDS.minImpressionsBothWeeks;
    expect(min).toBe(10);
    // Caída de 25 posiciones, pero con 9 impresiones en la semana actual o en la anterior: no avisa.
    expect(codes([row("q", "/a", min - 1, 45)], [row("q", "/a", 50, 20)])).not.toContain("page_drop");
    expect(codes([row("q", "/a", 50, 45)], [row("q", "/a", min - 1, 20)])).not.toContain("page_drop");
    expect(codes([row("q", "/a", min, 45)], [row("q", "/a", min, 20)])).toContain("page_drop");

    const wrong = (cur: number, prev: number) =>
      codes([row(Q, GUIDE, cur, 79.9)], [row(Q, GUIDE, prev, 79.9)]).includes("wrong_target");
    expect(wrong(min - 1, 50)).toBe(false);
    expect(wrong(50, min - 1)).toBe(false);
    expect(wrong(0 + min, min)).toBe(true);
    // Sin semana anterior (query nueva) tampoco: aún no es una tendencia.
    expect(codes([row(Q, GUIDE, 50, 79.9)], [])).not.toContain("wrong_target");
  });

  it("canibalización y página equivocada salen como avisos con una clave estable", () => {
    const both = [row("servicios de migracion de sistemas legacy", GUIDE, 79, 79.9), row("servicios de migracion de sistemas legacy", SERVICE, 60, 33.2)];
    const alerts = buildSeoAlerts({
      current: both,
      previous: both,
      entries,
    });
    expect(alerts.map((a) => a.kind).sort()).toEqual(["cannibalization", "wrong_target"]);
    expect(alerts.every((a) => a.severity === "warning")).toBe(true);
    expect(alerts.find((a) => a.kind === "cannibalization")?.dedupeKey).toBe("es:servicios de migracion de sistemas legacy");
  });

  it("una URL del sitemap que no responde 200 es crítica", () => {
    const [alert] = buildSeoAlerts({ current: [], previous: [], entries, nonOkUrls: [{ url: `${SITE}/servicios/x`, status: 500 }] });
    expect(alert).toMatchObject({ kind: "url_not_ok", severity: "critical", dedupeKey: `${SITE}/servicios/x` });
    expect(alert.title).toContain("500");
  });
});

describe("localeOfPage", () => {
  it("deduce el idioma por el prefijo", () => {
    expect(localeOfPage(`${SITE}/en/services/x`)).toBe("en");
    expect(localeOfPage(`${SITE}/fr`)).toBe("fr");
    expect(localeOfPage(`${SITE}/servicios/x`)).toBe("es");
    expect(localeOfPage(`${SITE}/entregables`)).toBe("es");
  });
});

describe("vigilancia tras un cambio de título", () => {
  const watch = { id: 7, query: "migration système legacy", label: "Título de /fr/blog/…", changedAt: "2026-10-12", watchUntil: "2026-10-26", baselinePosition: 10.2, baselineImpressions: 5, alertAbovePosition: 15 };

  it("avisa si, ya con el título nuevo, la posición media queda peor que 15", () => {
    const alert = buildWatchAlert(watch, { impressions: 4, position: 17.3 }, "2026-10-20")!;
    expect(alert).toMatchObject({ kind: "watch_drop", severity: "warning", dedupeKey: "watch:7" });
    expect(alert.title).toContain("17.3");
    expect(alert.detail).toContain("10.2");
    expect(alert.detail).toContain("2026-10-26");
  });

  it("no avisa en 15 o mejor, sin datos posteriores al cambio, ni fuera de la ventana de dos semanas", () => {
    expect(buildWatchAlert(watch, { impressions: 4, position: 15 }, "2026-10-20")).toBeNull();
    expect(buildWatchAlert(watch, { impressions: 4, position: 9 }, "2026-10-20")).toBeNull();
    expect(buildWatchAlert(watch, null, "2026-10-20")).toBeNull();
    expect(buildWatchAlert(watch, { impressions: 0, position: 30 }, "2026-10-20")).toBeNull();
    expect(buildWatchAlert(watch, { impressions: 4, position: 30 }, "2026-10-27")).toBeNull();
    expect(buildWatchAlert(watch, { impressions: 4, position: 30 }, "2026-10-26")).not.toBeNull(); // el último día cuenta
  });
});
