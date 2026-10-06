import {
  Users,
  Layers,
  Megaphone,
  FileText,
  Receipt,
  TrendingUp,
  Building2,
  LifeBuoy,
  Wallet,
  Users2,
} from "lucide-react";
import { ExchangeRateNote } from "./ExchangeRateNote";
import { formatMoney } from "@/lib/utils";
import { StatCard } from "./ui/StatCard";

export interface ExecutiveSummaryProps {
  leadStats: { total: number; newCount: number };
  activeProjectsCount: number;
  activeCampaignsCount: number;
  totalCampaignSpend: number;
  pendingProposalsCount: number;
  totalReceivable: number;
  totalOverdue: number;
  totalMargin: number;
  clientsCount: number;
  openTicketsCount: number;
  overdueTicketsCount: number;
  expensesThisMonth: number;
  activeTeamCount: number;
  usdToCopRate: number;
}

interface SummaryCard {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: typeof Users;
  alert?: boolean;
}

interface SummaryGroup {
  label: string;
  cards: SummaryCard[];
}

/**
 * Único lugar del sistema donde se cruzan todos los módulos en una vista —
 * lo que ve el admin al entrar a /dashboard, en vez de un redirect directo
 * a la primera sección como el resto de roles. Agrupado en las mismas 5
 * categorías de la sidebar (ver DashboardChrome::NAV_GROUPS) para que la
 * portada se lea como un mapa del panel, no una lista plana.
 */
export function ExecutiveSummary({
  leadStats,
  activeProjectsCount,
  activeCampaignsCount,
  totalCampaignSpend,
  pendingProposalsCount,
  totalReceivable,
  totalOverdue,
  totalMargin,
  clientsCount,
  openTicketsCount,
  overdueTicketsCount,
  expensesThisMonth,
  activeTeamCount,
  usdToCopRate,
}: ExecutiveSummaryProps) {
  const groups: SummaryGroup[] = [
    {
      label: "Comercial",
      cards: [
        {
          href: "/dashboard/leads",
          label: "Leads Nuevos",
          value: String(leadStats.newCount),
          sub: `${leadStats.total} en total`,
          icon: Users,
        },
        {
          href: "/dashboard/propuestas",
          label: "Propuestas Pendientes",
          value: String(pendingProposalsCount),
          sub: "esperando respuesta del cliente",
          icon: FileText,
        },
        {
          href: "/dashboard/campanas",
          label: "Campañas Activas",
          value: String(activeCampaignsCount),
          sub: `${formatMoney(totalCampaignSpend, "COP")} invertidos`,
          icon: Megaphone,
        },
      ],
    },
    {
      label: "Clientes",
      cards: [
        {
          href: "/dashboard/clientes",
          label: "Clientes",
          value: String(clientsCount),
          sub: "cuentas activas en el CRM",
          icon: Building2,
        },
      ],
    },
    {
      label: "Entrega",
      cards: [
        {
          href: "/dashboard/proyectos",
          label: "Proyectos Activos",
          value: String(activeProjectsCount),
          sub: "en desarrollo",
          icon: Layers,
        },
        {
          href: "/dashboard/soporte",
          label: "Tickets Abiertos",
          value: String(openTicketsCount),
          sub: overdueTicketsCount > 0 ? `${overdueTicketsCount} con SLA vencido` : "sin SLA vencido",
          icon: LifeBuoy,
          alert: overdueTicketsCount > 0,
        },
      ],
    },
    {
      label: "Finanzas",
      cards: [
        {
          href: "/dashboard/facturacion",
          label: "Por Cobrar",
          value: formatMoney(totalReceivable, "COP"),
          sub: totalOverdue > 0 ? `${formatMoney(totalOverdue, "COP")} vencido` : "sin mora",
          icon: Receipt,
          alert: totalOverdue > 0,
        },
        {
          href: "/dashboard/gastos",
          label: "Gastado Este Mes",
          value: formatMoney(expensesThisMonth, "COP"),
          sub: "licencias, infraestructura y más",
          icon: Wallet,
        },
        {
          href: "/dashboard/rentabilidad",
          label: "Margen Total",
          value: formatMoney(totalMargin, "COP"),
          sub: "facturado − costo de horas",
          icon: TrendingUp,
          alert: totalMargin < 0,
        },
      ],
    },
    {
      label: "Administración",
      cards: [
        {
          href: "/dashboard/equipo",
          label: "Equipo Activo",
          value: String(activeTeamCount),
          sub: "con acceso al panel",
          icon: Users2,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-bold text-foreground">Resumen del negocio</h2>
        <p className="mt-1 text-xs text-foreground/70 font-sans">Estado actual de todos los módulos del sistema.</p>
      </div>
      <ExchangeRateNote usdToCopRate={usdToCopRate} />

      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground/70">
            {group.label}
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((card) => (
              <StatCard
                key={card.href}
                href={card.href}
                label={card.label}
                value={card.value}
                hint={card.sub}
                tone={card.alert ? "danger" : "neutral"}
                icon={<card.icon size={16} className={card.alert ? "text-danger" : "text-accent-strong"} />}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
