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

export interface Sprint {
  id: number;
  title: string;
  status: "Completado" | "En Progreso" | "Pendiente";
  progress: number;
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
