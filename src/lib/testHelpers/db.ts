import bcrypt from "bcryptjs";
import { query } from "../db";

/**
 * Guarda de seguridad: si `DATABASE_URL` no pinta como la Postgres
 * desechable de docker-compose.test.yml, se rehúsa a truncar nada. Un
 * TRUNCATE CASCADE corriendo por accidente contra producción sería
 * irreversible — esto es la última línea de defensa si alguien corre los
 * tests de integración sin `vitest.integration.setup.ts` (que fuerza
 * DATABASE_URL a .env.test).
 */
function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL || "";
  const looksLikeTestDb = url.includes("skycode_test") || url.includes("localhost:5433");
  if (!looksLikeTestDb) {
    throw new Error(
      `resetTestDb() se negó a correr: DATABASE_URL ("${url}") no pinta como la BD de prueba. ` +
        "¿Corriste esto con vitest.integration.config.mts (o test:db:up sin migrar .env.test)?"
    );
  }
}

/**
 * Vacía todas las tablas de la aplicación (no `schema_migrations`) — cada
 * test de integración arranca de un estado limpio sin depender de qué
 * corrió antes. Rápido: la BD de prueba vive en tmpfs.
 */
export async function resetTestDb(): Promise<void> {
  assertTestDatabase();
  await query(`
    TRUNCATE TABLE
      audit_log, sessions, invites, time_entries, payments, invoices,
      proposal_items, proposals, lead_activities, leads, campaign_spend,
      campaigns, sprints, projects, clients, exchange_rates, users
    RESTART IDENTITY CASCADE;
  `);
}

export interface TestUserOverrides {
  name?: string;
  email?: string;
  password?: string;
  role?: "admin" | "sales_manager" | "traffiker" | "client";
  status?: "active" | "disabled";
  clientId?: number | null;
  hourlyCost?: number | null;
  hourlyCostCurrency?: "COP" | "USD";
}

export interface TestUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  plainPassword: string;
}

const DEFAULT_PASSWORD = "TestPassword123456";

/** Inserta un usuario directo por SQL (bypass del flujo de invitación) para tests que solo necesitan una sesión ya lista. */
export async function createTestUser(overrides: TestUserOverrides = {}): Promise<TestUser> {
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const plainPassword = overrides.password ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const res = await query(
    `INSERT INTO users (name, email, password_hash, role, status, client_id, hourly_cost, hourly_cost_currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, email, role, status;`,
    [
      overrides.name ?? "Test User",
      email.toLowerCase(),
      passwordHash,
      overrides.role ?? "admin",
      overrides.status ?? "active",
      overrides.clientId ?? null,
      overrides.hourlyCost ?? null,
      overrides.hourlyCostCurrency ?? "COP",
    ]
  );

  return { ...res.rows[0], plainPassword };
}

export async function createTestClient(overrides: { name?: string; email?: string } = {}) {
  const email = overrides.email ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const res = await query(
    `INSERT INTO clients (name, email) VALUES ($1, $2) RETURNING id, name, email;`,
    [overrides.name ?? "Test Client", email.toLowerCase()]
  );
  return res.rows[0] as { id: number; name: string; email: string };
}

export async function createTestProject(clientId: number, overrides: { title?: string; status?: string } = {}) {
  const res = await query(
    `INSERT INTO projects (client_id, title, status) VALUES ($1, $2, $3) RETURNING *;`,
    [clientId, overrides.title ?? "Test Project", overrides.status ?? "En Desarrollo"]
  );
  return res.rows[0];
}

export interface TestLeadOverrides {
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  budget?: string;
  currency?: "COP" | "USD";
  estimatedWeeks?: number;
  message?: string;
  source?: string;
  status?: string;
  ownerId?: number | null;
  campaignId?: number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export async function createTestLead(overrides: TestLeadOverrides = {}) {
  const email = overrides.email ?? `lead-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const res = await query(
    `INSERT INTO leads (
       name, email, phone, service, budget, currency, estimated_weeks, message, source, status,
       owner_id, campaign_id, utm_source, utm_medium, utm_campaign, referrer, landing_page,
       created_at, deleted_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, COALESCE($18, now()), $19)
     RETURNING *;`,
    [
      overrides.name ?? "Test Lead",
      email.toLowerCase(),
      overrides.phone ?? "+573000000000",
      overrides.service ?? "Sitio Web",
      overrides.budget ?? "1000-5000",
      overrides.currency ?? "COP",
      overrides.estimatedWeeks ?? 4,
      overrides.message ?? "Mensaje de prueba",
      overrides.source ?? "Cotizador Interactivo",
      overrides.status ?? "Nuevo",
      overrides.ownerId ?? null,
      overrides.campaignId ?? null,
      overrides.utmSource ?? null,
      overrides.utmMedium ?? null,
      overrides.utmCampaign ?? null,
      overrides.referrer ?? null,
      overrides.landingPage ?? null,
      overrides.createdAt ?? null,
      overrides.deletedAt ?? null,
    ]
  );
  return res.rows[0];
}

export async function createTestSession(
  userId: number,
  overrides: { expiresAt?: Date; revokedAt?: Date | null } = {}
) {
  const id = crypto.randomUUID();
  const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const res = await query(
    `INSERT INTO sessions (id, user_id, expires_at, revoked_at) VALUES ($1, $2, $3, $4) RETURNING *;`,
    [id, userId, expiresAt, overrides.revokedAt ?? null]
  );
  return res.rows[0] as { id: string; user_id: number; expires_at: string; revoked_at: string | null };
}

export interface TestCampaignOverrides {
  name?: string;
  channel?: string;
  utmCampaign?: string | null;
  budget?: number | null;
  currency?: "COP" | "USD";
  status?: string;
  deletedAt?: Date | null;
}

export async function createTestCampaign(overrides: TestCampaignOverrides = {}) {
  const res = await query(
    `INSERT INTO campaigns (name, channel, utm_campaign, budget, currency, status, deleted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *;`,
    [
      overrides.name ?? "Test Campaign",
      overrides.channel ?? "google_ads",
      overrides.utmCampaign ?? null,
      overrides.budget ?? null,
      overrides.currency ?? "COP",
      overrides.status ?? "active",
      overrides.deletedAt ?? null,
    ]
  );
  return res.rows[0];
}

export async function createTestCampaignSpend(
  campaignId: number,
  overrides: { spendDate?: string; amount?: number; currency?: "COP" | "USD" } = {}
) {
  const res = await query(
    `INSERT INTO campaign_spend (campaign_id, spend_date, amount, currency)
     VALUES ($1,$2,$3,$4) RETURNING *;`,
    [
      campaignId,
      overrides.spendDate ?? new Date().toISOString().slice(0, 10),
      overrides.amount ?? 100,
      overrides.currency ?? "COP",
    ]
  );
  return res.rows[0];
}

export interface TestProposalOverrides {
  clientEmail?: string;
  clientName?: string;
  title?: string;
  currency?: "COP" | "USD";
  taxRate?: number;
  validUntil?: string | null;
  viewedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  acceptedProjectId?: number | null;
  items?: { description?: string; quantity?: number; unitPrice: number }[];
}

export async function createTestProposal(overrides: TestProposalOverrides = {}) {
  const id = crypto.randomUUID();
  const res = await query(
    `INSERT INTO proposals (
       id, client_email, client_name, title, currency, tax_rate, valid_until,
       viewed_at, accepted_at, rejected_at, accepted_project_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *;`,
    [
      id,
      overrides.clientEmail ?? "cliente@test.local",
      overrides.clientName ?? "Cliente Test",
      overrides.title ?? "Propuesta de prueba",
      overrides.currency ?? "COP",
      overrides.taxRate ?? 19,
      overrides.validUntil ?? null,
      overrides.viewedAt ?? null,
      overrides.acceptedAt ?? null,
      overrides.rejectedAt ?? null,
      overrides.acceptedProjectId ?? null,
    ]
  );

  const items = overrides.items ?? [{ description: "Ítem de prueba", quantity: 1, unitPrice: 1000 }];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await query(
      `INSERT INTO proposal_items (proposal_id, description, quantity, unit_price, sort_order)
       VALUES ($1,$2,$3,$4,$5);`,
      [id, item.description ?? `Ítem ${i + 1}`, item.quantity ?? 1, item.unitPrice, i]
    );
  }

  return res.rows[0];
}

export async function createTestInvoice(
  projectId: number,
  overrides: {
    description?: string;
    amount?: number;
    currency?: "COP" | "USD";
    dueDate?: string;
    deletedAt?: Date | null;
  } = {}
) {
  const res = await query(
    `INSERT INTO invoices (project_id, description, amount, currency, due_date, deleted_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *;`,
    [
      projectId,
      overrides.description ?? "Factura de prueba",
      overrides.amount ?? 1000,
      overrides.currency ?? "COP",
      overrides.dueDate ?? new Date().toISOString().slice(0, 10),
      overrides.deletedAt ?? null,
    ]
  );
  return res.rows[0];
}

export async function createTestPayment(
  invoiceId: number,
  overrides: { amount?: number; paidAt?: string; method?: string } = {}
) {
  const res = await query(
    `INSERT INTO payments (invoice_id, amount, paid_at, method) VALUES ($1,$2,$3,$4) RETURNING *;`,
    [
      invoiceId,
      overrides.amount ?? 500,
      overrides.paidAt ?? new Date().toISOString().slice(0, 10),
      overrides.method ?? "Transferencia",
    ]
  );
  return res.rows[0];
}

export async function createTestTimeEntry(
  userId: number,
  projectId: number,
  overrides: { entryDate?: string; hours?: number; billable?: boolean } = {}
) {
  const res = await query(
    `INSERT INTO time_entries (user_id, project_id, entry_date, hours, billable)
     VALUES ($1,$2,$3,$4,$5) RETURNING *;`,
    [
      userId,
      projectId,
      overrides.entryDate ?? new Date().toISOString().slice(0, 10),
      overrides.hours ?? 1,
      overrides.billable ?? true,
    ]
  );
  return res.rows[0];
}
