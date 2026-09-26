import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runWeeklyDatabaseBackup } from "@/lib/databaseBackup";
import { logError } from "@/lib/logger";

/**
 * POST /api/cron/backup-database - Genera un dump lógico de toda la base
 * y lo sube a un bucket de R2 dedicado a backups (nunca el de documentos,
 * ver lib/backupStorage.ts) — respaldo adicional fuera de la
 * infraestructura de Render, complementario a los backups nativos de
 * Render Postgres (ver CLAUDE.md "Backups"), no un reemplazo. Mismo
 * patrón `x-cron-secret` que el resto de crons; pensado para un Render
 * Cron Job semanal.
 */
export async function POST(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await runWeeklyDatabaseBackup();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logError("❌ [Cron Database Backup] falló", error);
    return NextResponse.json({ error: "Error al generar el backup." }, { status: 500 });
  }
}
