import { describe, expect, it } from "vitest";
import { hasPermission, isValidRole, type Permission, type Role } from "./rbac";

const ALL_PERMISSIONS: Permission[] = [
  "leads:read",
  "leads:write",
  "projects:read",
  "projects:write",
  "audit:read",
  "team:read",
  "team:write",
  "campaigns:read",
  "campaigns:write",
  "proposals:read",
  "proposals:write",
  "invoices:read",
  "invoices:write",
  "profitability:read",
];

// Matriz esperada duplicada a propósito acá: si alguien cambia
// ROLE_PERMISSIONS en rbac.ts sin darse cuenta del impacto (el motivo
// exacto por el que existe ese archivo — evitar el patrón disperso que ya
// causó un fallo de autorización real), este test lo tiene que atrapar.
const EXPECTED_MATRIX: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  sales_manager: [
    "leads:read",
    "leads:write",
    "projects:read",
    "campaigns:read",
    "proposals:read",
    "proposals:write",
    "invoices:read",
  ],
  traffiker: ["campaigns:read", "campaigns:write"],
  client: [],
};

describe("rbac", () => {
  describe("hasPermission — matriz exhaustiva", () => {
    for (const role of Object.keys(EXPECTED_MATRIX) as Role[]) {
      const granted = new Set(EXPECTED_MATRIX[role]);
      for (const permission of ALL_PERMISSIONS) {
        const expected = granted.has(permission);
        it(`${role} ${expected ? "SÍ" : "NO"} tiene ${permission}`, () => {
          expect(hasPermission(role, permission)).toBe(expected);
        });
      }
    }
  });

  describe("invariantes de seguridad", () => {
    it("client no tiene ningún permiso — su acceso es por dueño, no por rol", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission("client", permission)).toBe(false);
      }
    });

    it("admin tiene todos los permisos declarados", () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission("admin", permission)).toBe(true);
      }
    });

    it("team:write es exclusivo de admin", () => {
      expect(hasPermission("admin", "team:write")).toBe(true);
      expect(hasPermission("sales_manager", "team:write")).toBe(false);
      expect(hasPermission("traffiker", "team:write")).toBe(false);
      expect(hasPermission("client", "team:write")).toBe(false);
    });

    it("profitability:read es exclusivo de admin (costos de horas de todo el equipo)", () => {
      expect(hasPermission("admin", "profitability:read")).toBe(true);
      expect(hasPermission("sales_manager", "profitability:read")).toBe(false);
      expect(hasPermission("traffiker", "profitability:read")).toBe(false);
    });

    it("invoices:write es exclusivo de admin — sales_manager solo lee cobranza", () => {
      expect(hasPermission("admin", "invoices:write")).toBe(true);
      expect(hasPermission("sales_manager", "invoices:write")).toBe(false);
      expect(hasPermission("sales_manager", "invoices:read")).toBe(true);
    });

    it("traffiker no tiene acceso a leads, proyectos, propuestas, facturación ni equipo", () => {
      const forbidden: Permission[] = [
        "leads:read",
        "leads:write",
        "projects:read",
        "projects:write",
        "proposals:read",
        "proposals:write",
        "invoices:read",
        "invoices:write",
        "team:read",
        "team:write",
        "audit:read",
        "profitability:read",
      ];
      for (const permission of forbidden) {
        expect(hasPermission("traffiker", permission)).toBe(false);
      }
    });
  });

  describe("hasPermission con roles inválidos", () => {
    it("devuelve false para un string que no es un rol válido", () => {
      expect(hasPermission("superadmin", "leads:read")).toBe(false);
      expect(hasPermission("", "leads:read")).toBe(false);
      expect(hasPermission("Admin", "leads:read")).toBe(false); // sensible a mayúsculas, a propósito
    });
  });

  describe("isValidRole", () => {
    it("acepta los cuatro roles reales", () => {
      expect(isValidRole("admin")).toBe(true);
      expect(isValidRole("sales_manager")).toBe(true);
      expect(isValidRole("traffiker")).toBe(true);
      expect(isValidRole("client")).toBe(true);
    });

    it("rechaza roles inventados o mal escritos", () => {
      expect(isValidRole("superadmin")).toBe(false);
      expect(isValidRole("Admin")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("sales-manager")).toBe(false);
    });
  });
});
