import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS as ALL_PERMISSIONS_SOURCE,
  ALL_ROLES,
  getRolePermissions,
  hasPermission,
  isValidRole,
  type Permission,
  type Role,
} from "./rbac";

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
  "clients:read",
  "clients:write",
  "tasks:read",
  "tasks:write",
  "support:read",
  "support:write",
  "documents:read",
  "documents:write",
  "expenses:read",
  "expenses:write",
  "settings:write",
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
    "clients:read",
    "clients:write",
    "tasks:read",
    "tasks:write",
    "support:read",
    "support:write",
    "documents:read",
    "documents:write",
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

    it("expenses:* es exclusivo de admin, a diferencia de clients/tasks/support/documents", () => {
      expect(hasPermission("admin", "expenses:read")).toBe(true);
      expect(hasPermission("admin", "expenses:write")).toBe(true);
      expect(hasPermission("sales_manager", "expenses:read")).toBe(false);
      expect(hasPermission("sales_manager", "expenses:write")).toBe(false);
      expect(hasPermission("traffiker", "expenses:read")).toBe(false);
    });

    it("settings:write es exclusivo de admin", () => {
      expect(hasPermission("admin", "settings:write")).toBe(true);
      expect(hasPermission("sales_manager", "settings:write")).toBe(false);
      expect(hasPermission("traffiker", "settings:write")).toBe(false);
      expect(hasPermission("client", "settings:write")).toBe(false);
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
        "clients:read",
        "clients:write",
        "tasks:read",
        "tasks:write",
        "support:read",
        "support:write",
        "documents:read",
        "documents:write",
        "expenses:read",
        "expenses:write",
        "settings:write",
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

  describe("ALL_PERMISSIONS / ALL_ROLES — usados por /dashboard/roles para mostrar la matriz real", () => {
    it("ALL_PERMISSIONS (rbac.ts) cubre exactamente el mismo set que la matriz exhaustiva de este archivo", () => {
      expect(new Set(ALL_PERMISSIONS_SOURCE)).toEqual(new Set(ALL_PERMISSIONS));
    });

    it("ALL_ROLES son los cuatro roles reales, ninguno inventado", () => {
      expect(new Set(ALL_ROLES)).toEqual(new Set(["admin", "sales_manager", "traffiker", "client"]));
    });
  });

  describe("getRolePermissions", () => {
    it("coincide exactamente con hasPermission para cada combinación rol/permiso", () => {
      for (const role of ALL_ROLES) {
        const granted = new Set(getRolePermissions(role));
        for (const permission of ALL_PERMISSIONS) {
          expect(granted.has(permission)).toBe(hasPermission(role, permission));
        }
      }
    });

    it("devuelve un array nuevo cada vez, no la referencia interna del Set", () => {
      const first = getRolePermissions("admin");
      first.push("leads:read"); // si esto mutara el estado interno, la siguiente llamada lo reflejaría
      const second = getRolePermissions("admin");
      expect(second).toEqual(ALL_PERMISSIONS.filter((p) => hasPermission("admin", p)));
    });
  });
});
