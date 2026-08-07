import Link from "next/link";
import { Users, Layers, Megaphone, FileText, Receipt, TrendingUp } from "lucide-react";
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
  usdToCopRate: number;
}

/**
 * Único lugar del sistema donde se cruzan los seis módulos en una vista —
 * lo que ve el admin al entrar a /dashboard, en vez de un redirect directo
 * a la primera sección como el resto de roles.
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
  usdToCopRate,
}: ExecutiveSummaryProps) {
  const cards: {
    href: string;
    label: string;
    value: string;
    sub: string;
    icon: typeof Users;
    alert?: boolean;
  }[] = [
    {
      href: "/dashboard/leads",
      label: "Leads Nuevos",
      value: String(leadStats.newCount),
      sub: `${leadStats.total} en total`,
      icon: Users,
    },
    {
      href: "/dashboard/proyectos",
      label: "Proyectos Activos",
      value: String(activeProjectsCount),
      sub: "en desarrollo",
      icon: Layers,
    },
    {
      href: "/dashboard/campanas",
      label: "Campañas Activas",
      value: String(activeCampaignsCount),
      sub: `${formatMoney(totalCampaignSpend, "COP")} invertidos`,
      icon: Megaphone,
    },
    {
      href: "/dashboard/propuestas",
      label: "Propuestas Pendientes",
      value: String(pendingProposalsCount),
      sub: "esperando respuesta del cliente",
      icon: FileText,
    },
    {
      href: "/dashboard/facturacion",
      label: "Por Cobrar",
      value: formatMoney(totalReceivable, "COP"),
      sub: totalOverdue > 0 ? `${formatMoney(totalOverdue, "COP")} vencido` : "sin mora",
      icon: Receipt,
      alert: totalOverdue > 0,
    },
    {
      href: "/dashboard/rentabilidad",
      label: "Margen Total",
      value: formatMoney(totalMargin, "COP"),
      sub: "facturado − costo de horas",
      icon: TrendingUp,
      alert: totalMargin < 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-background">Resumen Ejecutivo</h1>
        <p className="mt-1 text-xs text-background/70 font-sans">Estado actual de los seis módulos del sistema.</p>
      </div>
      <ExchangeRateNote usdToCopRate={usdToCopRate} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl border border-background/15 bg-background/5 p-5 space-y-2 hover:bg-background/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            <div className="flex items-center justify-between text-xs text-background/60">
              <span>{card.label}</span>
              <card.icon size={18} className={card.alert ? "text-red-400" : "text-accent"} />
            </div>
            <div className={`text-2xl font-bold font-mono ${card.alert ? "text-red-400" : "text-background"}`}>
              {card.value}
            </div>
            <div className="text-[10px] text-background/50">{card.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
