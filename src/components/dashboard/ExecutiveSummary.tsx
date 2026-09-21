import Link from "next/link";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Resumen Ejecutivo</h1>
        <p className="mt-1 text-xs text-foreground/70 font-sans">Estado actual de todos los módulos del sistema.</p>
      </div>
      <ExchangeRateNote usdToCopRate={usdToCopRate} />

      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/40">
            {group.label}
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="block rounded-xl border border-foreground/10 bg-background p-5 space-y-3 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/60">{card.label}</span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      card.alert ? "bg-red-50 text-red-700" : "bg-accent/10 text-accent"
                    }`}
                  >
                    <card.icon size={16} />
                  </div>
                </div>
                <div className={`text-2xl font-bold font-mono ${card.alert ? "text-red-700" : "text-foreground"}`}>
                  {card.value}
                </div>
                <div className="text-[10px] text-foreground/50">{card.sub}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
