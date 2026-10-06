"use client";

import { useEffect } from "react";

/**
 * Convierte las tablas del panel en tarjetas por debajo de `md`.
 *
 * Una tabla de 6 columnas a 375px solo deja ver 1,5 y esconde la acción
 * principal en la última (en el portal, "Pagar ahora"). Reescribir 14 tablas
 * a mano era más riesgo que valor, así que este componente (montado UNA vez en
 * DashboardChrome y PortalChrome) hace la mejora de forma progresiva:
 *
 * 1. Copia el texto de cada `<th>` al `data-label` de las celdas de su columna.
 * 2. Marca la tabla con `data-rt`; `dashboard.css` es quien apila las filas
 *    como tarjetas (la primera celda hace de título, las demás "etiqueta: valor").
 *
 * Sin JS la tabla sigue siendo la de siempre (con scroll horizontal). Una
 * tabla que debe seguir siendo tabla (comparar cifras: rentabilidad, matriz de
 * roles) se excluye con `data-keep-table`. Un `MutationObserver` etiqueta las
 * filas que React agrega después (paginación, filtros, filas expandibles).
 */
function enhance(table: HTMLTableElement) {
  if (table.hasAttribute("data-keep-table")) return;
  // Un `<th>` solo con texto `sr-only` (columna de acciones/detalle) no lleva etiqueta visible.
  const labels = Array.from(table.querySelectorAll("thead th")).map((th) => {
    const visible = Array.from(th.childNodes)
      .filter((n) => !(n instanceof HTMLElement && n.classList.contains("sr-only")))
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    // Columnas de acción/detalle: el control habla por sí solo, una etiqueta "ACCIÓN" sobra.
    return /^(acci[oó]n(es)?|detalle|descargar|eliminar)$/i.test(visible) ? "" : visible;
  });
  if (labels.length === 0) return;
  table.setAttribute("data-rt", "");
  for (const row of table.querySelectorAll("tbody tr")) {
    let index = 0;
    for (const cell of Array.from(row.children)) {
      if (!(cell instanceof HTMLTableCellElement)) continue;
      const span = cell.colSpan || 1;
      if (span === 1 && cell.getAttribute("data-label") !== (labels[index] ?? "")) {
        cell.setAttribute("data-label", labels[index] ?? "");
      } else if (span > 1) {
        cell.setAttribute("data-wide", "");
      }
      index += span;
    }
  }
}

export function TableEnhancer() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      for (const table of document.querySelectorAll<HTMLTableElement>("main table")) enhance(table);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
