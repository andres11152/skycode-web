import { query } from "../db";
import type { OnboardingItem } from "@/components/dashboard/types";

interface QueryRunner {
  query: typeof query;
}

/**
 * Catálogo fijo de pasos de onboarding — mismo criterio que las
 * categorías de gastos o las prioridades de soporte: un `CHECK` cerrado
 * es más simple que dejarlo configurable sin que haya todavía una
 * necesidad real de personalizarlo por proyecto. `responsible` es
 * orientativo (para que la UI diga "esto depende de ti"), no una
 * restricción real de quién puede marcarlo — ver `toggleOnboardingItem`.
 */
export const ONBOARDING_STEPS: { key: string; title: string; responsible: "client" | "team" }[] = [
  { key: "welcome_sent", title: "Correo de bienvenida enviado", responsible: "team" },
  { key: "domain_access", title: "Acceso a dominio / DNS", responsible: "client" },
  { key: "hosting_access", title: "Acceso a hosting o servidor (si aplica)", responsible: "client" },
  { key: "brand_assets", title: "Logo, brand assets y contenido inicial", responsible: "client" },
  { key: "social_access", title: "Credenciales de redes sociales (si aplica)", responsible: "client" },
  { key: "kickoff_call", title: "Llamada de kickoff agendada", responsible: "team" },
];

/**
 * Crea el checklist completo para un proyecto nuevo — se llama en la
 * MISMA transacción que crea el proyecto, tanto al aceptar una propuesta
 * (`acceptProposalAndCreateProject`) como al crear uno a mano desde el
 * dashboard (`createProjectWithClient`), para que ningún proyecto quede
 * sin su checklist según cómo se haya originado.
 */
export async function createOnboardingChecklist(projectId: number, dbRunner: QueryRunner): Promise<void> {
  for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
    const step = ONBOARDING_STEPS[i];
    await dbRunner.query(
      `INSERT INTO onboarding_items (project_id, step_key, title, responsible, position) VALUES ($1, $2, $3, $4, $5);`,
      [projectId, step.key, step.title, step.responsible, i]
    );
  }
}

export async function getOnboardingItems(projectId: number): Promise<OnboardingItem[]> {
  const res = await query(
    `SELECT o.id, o.step_key, o.title, o.responsible, o.completed_at,
            u.id AS completed_by_id, u.name AS completed_by_name
     FROM onboarding_items o
     LEFT JOIN users u ON u.id = o.completed_by
     WHERE o.project_id = $1
     ORDER BY o.position ASC;`,
    [projectId]
  );
  return res.rows.map((row) => ({
    id: Number(row.id),
    stepKey: String(row.step_key),
    title: String(row.title),
    responsible: row.responsible as "client" | "team",
    completed: row.completed_at !== null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    completedBy: row.completed_by_id ? { id: Number(row.completed_by_id), name: String(row.completed_by_name) } : null,
  }));
}

export async function isOnboardingItemInProject(itemId: number, projectId: number): Promise<boolean> {
  const res = await query(`SELECT 1 FROM onboarding_items WHERE id = $1 AND project_id = $2;`, [itemId, projectId]);
  return res.rows.length > 0;
}

/**
 * Marca o desmarca un ítem — `completed_by`/`completed_at` se limpian
 * juntos al desmarcar (no queda un rastro fantasma de "completado por X"
 * en un ítem que ya no está completo).
 */
export async function toggleOnboardingItem(itemId: number, completed: boolean, userId: number | string): Promise<boolean> {
  const res = await query(
    completed
      ? `UPDATE onboarding_items SET completed_at = now(), completed_by = $2 WHERE id = $1 RETURNING id;`
      : `UPDATE onboarding_items SET completed_at = NULL, completed_by = NULL WHERE id = $1 RETURNING id;`,
    completed ? [itemId, userId] : [itemId]
  );
  return res.rows.length > 0;
}
