// JWT_SECRET debe existir antes de que cualquier módulo bajo test importe
// src/lib/session.ts, que lanza si falta (ver src/lib/session.ts).
process.env.JWT_SECRET ??= "test-only-secret-do-not-use-in-production";

// Directorio descartable para lib/storage.test.ts — nunca storage/documents/
// real de desarrollo local.
process.env.DOCUMENTS_STORAGE_PATH ??= "/tmp/skycode-unit-test-documents";
