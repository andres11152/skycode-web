"use client";

import {
  CheckCircle,
  ChatCircleText,
  ClockCounterClockwise,
  FileText,
  Lifebuoy,
  Receipt,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import { EmptyState } from "../dashboard/EmptyState";
import { formatMoney } from "@/lib/utils";
import type { ClientActivityEvent } from "@/lib/queries/clientActivity";

const ICONS: Record<ClientActivityEvent["type"], Icon> = {
  document: FileText,
  invoice: Receipt,
  payment: Receipt,
  ticket_created: Lifebuoy,
  ticket_resolved: CheckCircle,
  sprint_approval: CheckCircle,
  sprint_comment: ChatCircleText,
};

function eventTitle(event: ClientActivityEvent): string {
  switch (event.type) {
    case "document":
      return "Documento nuevo";
    case "invoice":
      return "Factura nueva";
    case "payment":
      return "Pago registrado";
    case "ticket_created":
      return "Ticket de soporte abierto";
    case "ticket_resolved":
      return "Ticket de soporte resuelto";
    case "sprint_approval":
      return event.status === "rechazado" ? "Entregable rechazado" : "Entregable aprobado";
    case "sprint_comment":
      return "Nuevo comentario";
  }
}

function eventDescription(event: ClientActivityEvent): string {
  const amount = event.amount !== null && event.currency ? formatMoney(event.amount, event.currency) : null;
  switch (event.type) {
    case "document":
      return `"${event.label}" — ${event.projectTitle}`;
    case "invoice":
      return `${event.label} (${amount ?? ""}) — ${event.projectTitle}`;
    case "payment":
      return `${amount ?? ""} sobre ${event.label} — ${event.projectTitle}`;
    case "ticket_created":
    case "ticket_resolved":
      return `"${event.label}" — ${event.projectTitle}`;
    case "sprint_approval":
    case "sprint_comment":
      return `"${event.label}" — ${event.projectTitle}`;
  }
}

/**
 * Feed de solo lectura, derivado de tablas ya existentes (ver
 * lib/queries/clientActivity.ts) — no hay tabla propia de "eventos", así
 * que no hay nada que crear/editar acá, solo listar. Máximo 30 eventos
 * (límite fijado en la query), sin paginación: es un vistazo de lo
 * reciente, no un historial completo — para eso ya existen las otras
 * pestañas (Facturas, Documentos, Soporte) con el detalle completo.
 */
export function PortalActivityFeed({ events }: { events: ClientActivityEvent[] }) {
  return (
    <section aria-labelledby="portal-activity-heading" className="space-y-4">
      <div>
        <h2 id="portal-activity-heading" className="text-lg font-bold text-foreground">
          Actividad reciente
        </h2>
        <p className="mt-1 text-xs text-foreground/70">Lo último que pasó en tus proyectos, más reciente primero.</p>
      </div>

      <div className="rounded-xl border border-foreground/10 bg-background shadow-sm shadow-black/5">
        {events.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="Sin actividad todavía"
            description="Aquí verás facturas, documentos, tickets y aprobaciones de tus proyectos a medida que ocurran."
          />
        ) : (
          <ol className="divide-y divide-foreground/10">
            {events.map((event) => {
              const EventIcon = ICONS[event.type];
              const isNegative = event.type === "sprint_approval" && event.status === "rechazado";
              return (
                <li key={`${event.type}-${event.id}`} className="flex items-start gap-3 px-5 py-4">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isNegative ? "bg-red-500/10 text-red-600" : "bg-accent/10 text-accent-strong"
                    }`}
                  >
                    {isNegative ? <XCircle size={16} /> : <EventIcon size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{eventTitle(event)}</p>
                    <p className="mt-0.5 truncate text-xs text-foreground/70">{eventDescription(event)}</p>
                  </div>
                  <time dateTime={event.createdAt} className="shrink-0 text-[11px] text-foreground/50">
                    {new Date(event.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
