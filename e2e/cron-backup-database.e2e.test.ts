import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BASE_URL } from "./helpers/config";
import { listBackupKeys, deleteBackupObject } from "../src/lib/backupStorage";
import { createTestClient, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

afterEach(async () => {
  const keys = await listBackupKeys();
  for (const key of keys) await deleteBackupObject(key);
});

const CRON_SECRET = process.env.CRON_SECRET!;

describe("POST /api/cron/backup-database", () => {
  it("sin el header x-cron-secret, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/backup-database`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("con el secreto correcto, genera y sube el backup real a R2", async () => {
    await createTestClient({ name: "Cliente E2E Backup" });

    const res = await fetch(`${BASE_URL}/api/cron/backup-database`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sizeBytes).toBeGreaterThan(0);

    const keys = await listBackupKeys();
    expect(keys).toContain(body.key);
  });
});
