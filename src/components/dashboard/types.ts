import type { Currency } from "@/lib/currency";

export interface LeadOwner {
  id: number;
  name: string;
  email: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  budget?: string;
  currency?: string;
  estimated_weeks?: number;
  message?: string;
  source?: string;
  status: "Nuevo" | "En Cotización" | "Ganado" | "Perdido";
  created_at: string;
  owner: LeadOwner | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  /** Fecha (sin hora) para el próximo recontacto — `null` si no hay uno
   * agendado. Formato ISO 8601 tal como lo serializa la API (recorta a
   * los primeros 10 caracteres para un `<input type="date">`). */
  next_follow_up_at?: string | null;
  follow_up_note?: string | null;
}

export type LeadActivityType = "note" | "call" | "email" | "status_change";

export interface LeadActivity {
  id: number;
  lead_id: number;
  actor_name: string | null;
  type: LeadActivityType;
  body: string;
  created_at: string;
}

export type SprintApprovalStatus = "aprobado" | "rechazado";

export interface Sprint {
  id: number;
  title: string;
  status: "Completado" | "En Progreso" | "Pendiente";
  progress: number;
  approval_status: SprintApprovalStatus | null;
  approval_comment: string | null;
  approved_at: string | null;
}

export interface ProjectClient {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  client: ProjectClient;
  title: string;
  description?: string;
  progress: number;
  repo_url?: string;
  staging_url?: string;
  sla_warranty_start?: string;
  sla_warranty_end?: string;
  status: "Planificación" | "En Desarrollo" | "Fase QA" | "Entregado" | "Garantía SLA";
  created_at: string;
  sprints: Sprint[];
}

export type TaskStatus = "Pendiente" | "En Progreso" | "Completada";

export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
}

export interface Task {
  id: number;
  project_id: number;
  sprint_id: number | null;
  sprint_title: string | null;
  title: string;
  description: string;
  assignee: TaskAssignee | null;
  status: TaskStatus;
  estimated_hours: number | null;
  actual_hours: number;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ProjectOption {
  id: number;
  title: string;
  client_name: string;
}

export type TicketPriority = "Baja" | "Media" | "Alta" | "Urgente";
export type TicketStatus = "Abierto" | "En Progreso" | "Resuelto" | "Cerrado";

export interface SupportTicket {
  id: number;
  project_id: number;
  project_title: string;
  client_name: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: TaskAssignee | null;
  resolution_note: string | null;
  sla_due_at: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

/**
 * Carga de trabajo de una persona — ver lib/queries/capacity.ts. Todo
 * derivado de `tasks`/`support_tickets`/`time_entries`, no hay una tabla
 * propia de "capacidad".
 */
export interface TeamCapacity {
  id: number;
  name: string;
  email: string;
  role: string;
  open_tasks_count: number;
  open_estimated_hours: number;
  open_tickets_count: number;
  hours_this_week: number;
}

/** Documento subido a un proyecto — ver lib/storage.ts y lib/queries/documents.ts. */
export type ExpenseCategory = "licencias" | "infraestructura" | "subcontratos" | "otro";

export interface Expense {
  id: number;
  project_id: number | null;
  project_title: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: Currency;
  expense_date: string;
  created_by: TaskAssignee | null;
  created_at: string;
}

export interface ProjectDocument {
  id: number;
  project_id: number;
  project_title: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: TaskAssignee | null;
  created_at: string;
}

export type CampaignChannel = "google_ads" | "meta_ads" | "linkedin_ads" | "organico" | "referido" | "otro";
export type CampaignStatus = "active" | "paused" | "ended";

export interface Campaign {
  id: number;
  name: string;
  channel: CampaignChannel;
  utm_campaign: string | null;
  objective: string | null;
  budget: number | null;
  currency: Currency;
  starts_at: string | null;
  ends_at: string | null;
  status: CampaignStatus;
  created_at: string;
  totalSpend: number;
  leadCount: number;
  wonCount: number;
  cpl: number | null;
  conversionRate: number | null;
  overBudget: boolean;
  cplSpike: boolean;
}

export interface CampaignSpendEntry {
  id: number;
  campaign_id: number;
  spend_date: string;
  amount: number;
  currency: Currency;
}

export interface ProposalItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
}

export type ProposalStatus = "sent" | "viewed" | "accepted" | "rejected" | "expired";

export interface Proposal {
  id: string;
  client_email: string;
  client_name: string;
  title: string;
  notes: string;
  currency: Currency;
  tax_rate: number;
  valid_until: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  accepted_project_id: number | null;
  created_at: string;
  items: ProposalItem[];
  subtotal: number;
  total: number;
  status: ProposalStatus;
}

export type InvoiceStatus = "pending" | "overdue" | "paid";

export interface InvoicePayment {
  id: number;
  amount: number;
  paid_at: string;
  method: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string | null;
  project_id: number;
  project_title: string;
  client_name: string;
  description: string;
  amount: number;
  currency: Currency;
  due_date: string;
  created_at: string;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  daysOverdue: number;
  payments: InvoicePayment[];
}

export interface TimeEntry {
  id: number;
  user_id: number;
  user_name: string;
  project_id: number;
  project_title: string;
  sprint_id: number | null;
  sprint_title: string | null;
  entry_date: string;
  hours: number;
  description: string;
  billable: boolean;
  created_at: string;
}

/**
 * Todos los montos de este reporte están convertidos a COP (moneda de
 * reporte del sistema) con la tasa de cambio vigente — un proyecto
 * cotizado en USD y facturado en COP no se puede comparar sin convertir
 * primero. `quotedAmountOriginal`/`quotedCurrencyOriginal` conservan el
 * monto tal como se cotizó, solo para mostrarlo junto al convertido.
 */
export interface ProjectProfitability {
  id: number;
  title: string;
  client_name: string;
  status: string;
  quotedAmountOriginal: number | null;
  quotedCurrencyOriginal: Currency | null;
  quotedAmountCop: number | null;
  totalHours: number;
  totalCostCop: number;
  totalExpensesCop: number;
  totalBilledCop: number;
  marginVsQuotedCop: number | null;
  marginVsBilledCop: number;
  deviationPct: number | null;
}

/** Igual que ProjectProfitability: todo convertido a COP para poder sumar. */
export interface CampaignProfitability {
  id: number;
  name: string;
  channel: CampaignChannel;
  totalSpendCop: number;
  totalBilledCop: number;
  totalCostCop: number;
  netMarginCop: number;
  roi: number | null;
}

export type TeamRole = "admin" | "sales_manager" | "traffiker";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "disabled";
  hourly_cost: number | null;
  hourly_cost_currency: Currency;
  created_at: string;
}

export interface SessionUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
}

export interface UserSessionRow {
  id: string;
  created_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface AuditLogEntry {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: unknown;
  ip: string | null;
  created_at: string;
}

/** Fila de `clients` — se crea implícitamente al crear un proyecto o aceptar una propuesta (upsert por email). */
export interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string;
  created_at: string;
  projectCount: number;
  totalBilledCop: number;
  totalOutstandingCop: number;
}

/**
 * Ficha 360: el cliente más todo lo que se le vinculó, cruzando proyectos,
 * propuestas y facturas. `totalBilledCop`/`totalOutstandingCop` ya vienen
 * convertidos a COP con la tasa vigente — sumar `invoices[].amount`
 * directo mezclaría facturas en COP y USD sin convertir.
 */
export interface ClientDetail {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string;
  created_at: string;
  projects: Project[];
  proposals: Proposal[];
  invoices: Invoice[];
  totalBilledCop: number;
  totalOutstandingCop: number;
}

/**
 * Notificación in-app (campanita del dashboard) — el mismo evento que ya
 * dispara un correo desde lib/queries/notifications.ts, ver ese archivo.
 * `read` deriva de `read_at IS NOT NULL` en la query, no es una columna
 * booleana propia.
 */
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
