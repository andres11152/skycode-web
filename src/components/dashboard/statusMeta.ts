import type { BadgeTone } from "./ui/Badge";
import type {
  CampaignStatus,
  ExpenseCategory,
  InvoiceStatus,
  Project,
  ProposalStatus,
  RetainerStatus,
  Sprint,
  TaskStatus,
  TicketPriority,
  TicketStatus,
} from "./types";
import type { ArticleStatus } from "@/lib/queries/articles";
import type { PortfolioStatus } from "@/content/portfolioShared";

/**
 * Única fuente de "cómo se llama y de qué color es" cada estado del panel y
 * del portal. Antes había 16 mapas `*_LABELS`/`*_TONES` copiados por archivo,
 * y el mismo significado tenía colores distintos según la entidad ("En
 * Progreso" azul en tareas y ámbar en tickets).
 *
 * El tono sigue UNA regla para todas las entidades (ver theme.css):
 * - info    = en curso
 * - warning = espera revisión/decisión o en riesgo
 * - danger  = vencido o fallido
 * - success = terminado
 * - neutral = inactivo, borrador o simple categoría (sin estado)
 */
export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta & { clientLabel: string }> = {
  // `clientLabel`: el portal habla desde el lado de quien paga.
  pending: { label: "Por cobrar", clientLabel: "Por pagar", tone: "info" },
  overdue: { label: "Vencida", clientLabel: "Vencida", tone: "danger" },
  paid: { label: "Cobrada", clientLabel: "Pagada", tone: "success" },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, StatusMeta> = {
  sent: { label: "Enviada", tone: "info" },
  viewed: { label: "Vista", tone: "warning" },
  accepted: { label: "Aceptada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  expired: { label: "Expirada", tone: "neutral" },
};

export const ARTICLE_STATUS: Record<ArticleStatus, StatusMeta> = {
  draft: { label: "Borrador", tone: "neutral" },
  review: { label: "En revisión", tone: "warning" },
  published: { label: "Publicado", tone: "success" },
};

export const PORTFOLIO_STATUS: Record<PortfolioStatus, StatusMeta> = {
  draft: { label: "Borrador", tone: "neutral" },
  published: { label: "Publicado", tone: "success" },
  archived: { label: "Archivado", tone: "neutral" },
};

export const TICKET_PRIORITY: Record<TicketPriority, StatusMeta> = {
  Baja: { label: "Baja", tone: "neutral" },
  Media: { label: "Media", tone: "info" },
  Alta: { label: "Alta", tone: "warning" },
  Urgente: { label: "Urgente", tone: "danger" },
};

export const TICKET_STATUS: Record<TicketStatus, StatusMeta> = {
  Abierto: { label: "Abierto", tone: "warning" },
  "En Progreso": { label: "En Progreso", tone: "info" },
  Resuelto: { label: "Resuelto", tone: "success" },
  Cerrado: { label: "Cerrado", tone: "neutral" },
};

export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  Pendiente: { label: "Pendiente", tone: "neutral" },
  "En Progreso": { label: "En Progreso", tone: "info" },
  Completada: { label: "Completada", tone: "success" },
};

export const SPRINT_STATUS: Record<Sprint["status"], StatusMeta> = {
  Pendiente: { label: "Pendiente", tone: "neutral" },
  "En Progreso": { label: "En Progreso", tone: "info" },
  Completado: { label: "Completado", tone: "success" },
};

export const PROJECT_STATUS: Record<Project["status"], StatusMeta> = {
  Planificación: { label: "Planificación", tone: "neutral" },
  "En Desarrollo": { label: "En Desarrollo", tone: "info" },
  "Fase QA": { label: "Fase QA", tone: "warning" },
  Entregado: { label: "Entregado", tone: "success" },
  "Garantía SLA": { label: "Garantía SLA", tone: "success" },
};

export const RETAINER_STATUS: Record<RetainerStatus, StatusMeta> = {
  active: { label: "Activo", tone: "success" },
  paused: { label: "Pausado", tone: "warning" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, StatusMeta> = {
  active: { label: "Activa", tone: "success" },
  paused: { label: "Pausada", tone: "warning" },
  ended: { label: "Finalizada", tone: "neutral" },
};

/** Una categoría no es un estado: todas en `neutral`, solo cambia la etiqueta. */
export const EXPENSE_CATEGORY: Record<ExpenseCategory, StatusMeta> = {
  licencias: { label: "Licencias", tone: "neutral" },
  infraestructura: { label: "Infraestructura", tone: "neutral" },
  subcontratos: { label: "Subcontratos", tone: "neutral" },
  otro: { label: "Otro", tone: "neutral" },
};
