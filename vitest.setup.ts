// JWT_SECRET debe existir antes de que cualquier módulo bajo test importe
// src/lib/session.ts, que lanza si falta (ver src/lib/session.ts).
process.env.JWT_SECRET ??= "test-only-secret-do-not-use-in-production";
