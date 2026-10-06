// Lógica de restauración de un dump lógico (ver src/lib/databaseBackup.ts),
// separada del script interactivo para poder probarla contra Postgres real.
//
// Tres problemas del restore original (nunca probado con datos reales):
//  1. Columnas JSON/JSONB: `pg` convierte un array de JS a literal de array de
//     Postgres (`{...}`), no a JSON → "invalid input syntax for type json".
//  2. `TRUNCATE ... RESTART IDENTITY` + ids explícitos dejaba las secuencias en
//     1: el primer INSERT de la app tras restaurar fallaba con clave duplicada.
//  3. `SET session_replication_role = replica` exige superusuario, que el
//     usuario gestionado de Render normalmente no tiene. Ahora se insertan las
//     tablas en orden de dependencia de FK.

const SAFE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdent(name) {
  if (!SAFE_IDENT.test(name)) throw new Error(`Identificador no permitido en el backup: ${name}`);
  return `"${name}"`;
}

/** Ordena las tablas para que los padres (referenciados por FK) vayan antes. */
export async function sortTablesByDependency(client, tableNames) {
  const res = await client.query(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
     FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE c.contype = 'f' AND n.nspname = 'public';`
  );
  const wanted = new Set(tableNames);
  const deps = new Map(tableNames.map((t) => [t, new Set()]));
  for (const { child, parent } of res.rows) {
    const ch = child.replace(/^public\./, "").replace(/"/g, "");
    const pa = parent.replace(/^public\./, "").replace(/"/g, "");
    if (ch !== pa && wanted.has(ch) && wanted.has(pa)) deps.get(ch).add(pa);
  }
  const ordered = [];
  const remaining = new Set(tableNames);
  while (remaining.size > 0) {
    const ready = [...remaining].filter((t) => [...deps.get(t)].every((p) => !remaining.has(p)));
    // Ciclo entre tablas (poco probable): se sueltan las que queden en orden original.
    const batch = ready.length > 0 ? ready : [...remaining];
    for (const t of batch) {
      ordered.push(t);
      remaining.delete(t);
    }
  }
  return ordered;
}

export async function restoreTables(client, tables, log = () => {}) {
  const tableNames = Object.keys(tables);
  for (const name of tableNames) assertIdent(name);

  const quotedNames = tableNames.map(assertIdent).join(", ");
  log("Vaciando tablas...");
  await client.query(`TRUNCATE TABLE ${quotedNames} RESTART IDENTITY CASCADE;`);

  const ordered = await sortTablesByDependency(client, tableNames);

  for (const tableName of ordered) {
    const rows = tables[tableName];
    if (rows.length === 0) continue;
    log(`Restaurando ${tableName} (${rows.length} filas)...`);

    const colTypes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`,
      [tableName]
    );
    const jsonColumns = new Set(colTypes.rows.filter((c) => c.data_type === "json" || c.data_type === "jsonb").map((c) => c.column_name));

    const columns = Object.keys(rows[0]);
    const columnList = columns.map(assertIdent).join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    for (const row of rows) {
      const values = columns.map((c) => (jsonColumns.has(c) && row[c] !== null && row[c] !== undefined ? JSON.stringify(row[c]) : row[c]));
      await client.query(`INSERT INTO ${assertIdent(tableName)} (${columnList}) VALUES (${placeholders});`, values);
    }
  }

  // Secuencias: sin esto el próximo INSERT choca con los ids restaurados.
  for (const tableName of tableNames) {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`,
      [tableName]
    );
    for (const { column_name: col } of cols.rows) {
      const seq = await client.query(`SELECT pg_get_serial_sequence($1, $2) AS seq;`, [`public.${assertIdent(tableName)}`, col]);
      const seqName = seq.rows[0]?.seq;
      if (!seqName) continue;
      await client.query(
        `SELECT setval($1, COALESCE((SELECT MAX(${assertIdent(col)}) FROM ${assertIdent(tableName)}), 1),
                          (SELECT MAX(${assertIdent(col)}) IS NOT NULL FROM ${assertIdent(tableName)}));`,
        [seqName]
      );
    }
  }
}
