import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guardia contra SQL injection por interpolación. TODA entrada del usuario
// llega a Postgres como parámetro (`$1`, `$2`…), que `pg` envía por separado
// del texto SQL y por tanto nunca se interpreta como SQL. La única forma de
// reabrir la puerta es interpolar (`${...}`) algo dentro del texto de una
// consulta. Hoy las interpolaciones existentes son fragmentos internos —
// constantes `*_SELECT`, listas de columnas fijas, números de placeholder
// (`limitIdx`) y cláusulas `WHERE` armadas solo con literales y placeholders —
// nunca valores del usuario.
//
// Este test congela esa lista: si alguien agrega una interpolación NUEVA
// dentro de una consulta, falla y obliga a decidir a conciencia (¿viene de
// una constante interna o de la petición?) y a agregarla acá con esa
// justificación. No sustituye una revisión, pero convierte "se coló una
// interpolación" de un hallazgo silencioso en un fallo de CI.
const ALLOWED_INTERPOLATIONS = new Set([
  "guard", // retainers.ts: fragmento fijo (" AND status <> 'cancelled'") elegido por código, nunca por el usuario
  "tableName", // databaseBackup.ts: nombres de tabla leídos de information_schema, entre comillas
  "columns",
  "publishedAtExpr",
  "PROJECTS_WITH_CLIENT_SELECT",
  "clientFilter",
  "where",
  "limitIdx",
  "offsetIdx",
  "TICKETS_SELECT",
  "resolvedAtExpr",
  "closedAtExpr",
  "LEADS_SELECT",
  'conditions.join(" AND ")',
  "DOCUMENTS_SELECT",
  "ADMIN_PROFILE_SELECT",
  'usdToCopSqlMultiplier(1, "u.hourly_cost_currency")',
  'usdToCopSqlMultiplier(1, "currency")',
  "params.length",
  "EXPENSES_SELECT",
  "TASKS_SELECT",
  "completedAtExpr",
  "TIME_ENTRY_SELECT",
  "condition",
  "PROFILE_COLUMNS",
  'values.join(", ")',
  "RETAINERS_SELECT",
  'fields.join(", ")',
  "idx",
]);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("sqlSafety", () => {
  it("ninguna consulta interpola expresiones fuera de la lista interna conocida", () => {
    const offenders: string[] = [];

    for (const file of listSourceFiles("src")) {
      const source = readFileSync(file, "utf-8");
      for (const call of source.matchAll(/(?:query|\.query)\(\s*`([^`]*)`/g)) {
        for (const interpolation of call[1].matchAll(/\$\{([^}]*)\}/g)) {
          const expression = interpolation[1].trim();
          if (!ALLOWED_INTERPOLATIONS.has(expression)) {
            const line = source.slice(0, call.index).split("\n").length;
            offenders.push(`${file}:${line}  \${${expression}}`);
          }
        }
      }
    }

    expect(
      offenders,
      "Interpolación nueva dentro de una consulta SQL. Si es un fragmento interno (constante o placeholder), agrégala a ALLOWED_INTERPOLATIONS con su justificación; si contiene algo de la petición, usa un parámetro ($n).",
    ).toEqual([]);
  });
});
