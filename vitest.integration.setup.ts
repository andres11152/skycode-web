import path from "node:path";

// Carga .env.test ANTES de que cualquier test importe lib/db.ts — getPool()
// ahí lee process.env.DATABASE_URL de forma perezosa (al primer query, no
// al importar el módulo), así que alcanza con que esté seteada para
// cuando corra el primer test, pero cargarla acá, lo antes posible, evita
// sorpresas de orden de imports entre archivos de test.
process.loadEnvFile(path.join(import.meta.dirname, ".env.test"));
