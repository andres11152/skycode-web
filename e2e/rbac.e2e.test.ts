import { beforeEach, describe, expect, it } from "vitest";
import { TestClient, loginAs } from "./helpers/client";
import { createTestUser, resetTestDb } from "../src/lib/testHelpers/db";
import { hasPermission, type Permission, type Role } from "../src/lib/rbac";

const ROLES: Role[] = ["admin", "sales_manager", "traffiker", "client"];

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface EndpointCase {
  method: HttpMethod;
  path: string;
  permission: Permission;
}

/**
 * Todo endpoint gateado por un permiso de lib/rbac.ts (vía `withAuth` o el
 * patrón manual `requireSession()` + `hasPermission()`, ver leads/[id]/activities
 * y time-entries). No incluye GET /api/projects a propósito: ese endpoint
 * no usa un permiso fijo, resuelve acceso por dueño (ver comentario en
 * projects/route.ts) — es un modelo de autorización distinto, no un hueco.
 * `/api/time-entries` no tiene un permiso `time:*` propio: pide
 * `projects:read` (ver `canLogTime` en ese archivo), documentado ahí mismo.
 */
const ENDPOINTS: EndpointCase[] = [
  { method: "GET", path: "/api/leads", permission: "leads:read" },
  { method: "PATCH", path: "/api/leads", permission: "leads:write" },
  { method: "DELETE", path: "/api/leads", permission: "leads:write" },
  { method: "GET", path: "/api/leads/export", permission: "leads:read" },
  { method: "GET", path: "/api/leads/1/activities", permission: "leads:read" },
  { method: "POST", path: "/api/leads/1/activities", permission: "leads:write" },
  { method: "POST", path: "/api/projects", permission: "projects:write" },
  { method: "PATCH", path: "/api/projects", permission: "projects:write" },
  { method: "DELETE", path: "/api/projects", permission: "projects:write" },
  { method: "GET", path: "/api/audit", permission: "audit:read" },
  { method: "GET", path: "/api/team", permission: "team:read" },
  { method: "PATCH", path: "/api/team", permission: "team:write" },
  { method: "POST", path: "/api/team/invite", permission: "team:write" },
  { method: "GET", path: "/api/campaigns", permission: "campaigns:read" },
  { method: "POST", path: "/api/campaigns", permission: "campaigns:write" },
  { method: "PATCH", path: "/api/campaigns", permission: "campaigns:write" },
  { method: "DELETE", path: "/api/campaigns", permission: "campaigns:write" },
  { method: "GET", path: "/api/campaigns/1/spend", permission: "campaigns:read" },
  { method: "POST", path: "/api/campaigns/1/spend", permission: "campaigns:write" },
  { method: "GET", path: "/api/proposals", permission: "proposals:read" },
  { method: "POST", path: "/api/proposals", permission: "proposals:write" },
  { method: "GET", path: "/api/invoices", permission: "invoices:read" },
  { method: "POST", path: "/api/invoices", permission: "invoices:write" },
  { method: "POST", path: "/api/invoices/1/payments", permission: "invoices:write" },
  { method: "GET", path: "/api/profitability", permission: "profitability:read" },
  { method: "GET", path: "/api/time-entries", permission: "projects:read" },
  { method: "POST", path: "/api/time-entries", permission: "projects:read" },
  { method: "DELETE", path: "/api/time-entries", permission: "projects:read" },
];

function callEndpoint(client: TestClient, method: HttpMethod, path: string) {
  switch (method) {
    case "GET":
      return client.get(path);
    case "POST":
      return client.post(path, {});
    case "PATCH":
      return client.patch(path, {});
    case "DELETE":
      return client.delete(path);
  }
}

beforeEach(async () => {
  await resetTestDb();
});

describe("Matriz RBAC end-to-end — cada endpoint gateado responde según lib/rbac.ts", () => {
  for (const { method, path, permission } of ENDPOINTS) {
    describe(`${method} ${path} (requiere ${permission})`, () => {
      it("401 sin sesión (ni siquiera llega a evaluar el permiso)", async () => {
        const client = new TestClient();
        const res = await callEndpoint(client, method, path);
        expect(res.status).toBe(401);
      });

      for (const role of ROLES) {
        const allowed = hasPermission(role, permission);

        it(`${role}: ${allowed ? "permitido (no 401/403)" : "bloqueado con 403"}`, async () => {
          const user = await createTestUser({ role, password: "SuperSecret123456" });
          const client = await loginAs(user.email, "SuperSecret123456");

          const res = await callEndpoint(client, method, path);

          if (allowed) {
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
          } else {
            expect(res.status).toBe(403);
          }
        });
      }
    });
  }
});
