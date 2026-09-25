import { beforeEach, describe, expect, it } from "vitest";
import { BASE_URL } from "./helpers/config";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

const CRON_SECRET = process.env.CRON_SECRET!;

describe("POST /api/cron/weekly-digest", () => {
  it("sin el header x-cron-secret, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/weekly-digest`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("con un secreto incorrecto, responde 401", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/weekly-digest`, {
      method: "POST",
      headers: { "x-cron-secret": "secreto-incorrecto" },
    });
    expect(res.status).toBe(401);
  });

  it("con el secreto correcto, responde 200 con el conteo de destinatarios", async () => {
    await createTestUser({ role: "admin" });
    await createTestUser({ role: "sales_manager" });
    await createTestUser({ role: "traffiker" });

    const res = await fetch(`${BASE_URL}/api/cron/weekly-digest`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.recipientCount).toBe(2);
  });
});
