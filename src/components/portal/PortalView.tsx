"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ClockCounterClockwise, FileText, Lifebuoy, Receipt, Spinner, Stack, WarningCircle } from "@phosphor-icons/react";
import { ProjectsBoard } from "../dashboard/ProjectsBoard";
import { PortalInvoicesPanel } from "./PortalInvoicesPanel";
import { PortalDocumentsPanel } from "./PortalDocumentsPanel";
import { PortalSupportPanel } from "./PortalSupportPanel";
import { PortalActivityFeed } from "./PortalActivityFeed";
import { parseInvoiceIdFromBoldOrderId } from "@/lib/bold";
import { logError } from "@/lib/logger";
import type { Project, Invoice, ProjectDocument, SupportTicket, ProjectOption } from "../dashboard/types";
import type { ClientActivityEvent } from "@/lib/queries/clientActivity";

const TABS = [
  { key: "proyectos", label: "Proyectos", icon: Stack },
  { key: "actividad", label: "Actividad", icon: ClockCounterClockwise },
  { key: "facturas", label: "Facturas", icon: Receipt },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "soporte", label: "Soporte", icon: Lifebuoy },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type BoldConfirmation = "checking" | "approved" | "other";

/**
 * `/portal` sigue siendo UNA sola ruta (sin sub-rutas, ver CLAUDE.md) —
 * este componente cliente arma pestañas dentro de esa única página en vez
 * de introducir rutas nuevas, para no romper esa decisión ya establecida
 * mientras el portal crece de "solo proyectos" a 4 secciones.
 */
export function PortalView({
  projects,
  invoices,
  documents,
  tickets,
  activity,
  projectOptions,
  boldOrderId,
}: {
  projects: Project[];
  invoices: Invoice[];
  documents: ProjectDocument[];
  tickets: SupportTicket[];
  activity: ClientActivityEvent[];
  projectOptions: ProjectOption[];
  /** `?bold-order-id=...` que Bold agrega al volver del checkout (ver
   * lib/bold.ts) — server component (app/portal/page.tsx) lo lee de
   * `searchParams` y lo pasa como prop, sin usar `useSearchParams` acá
   * (evita el requisito de envolver en <Suspense> solo por esto). */
  boldOrderId?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(boldOrderId ? "facturas" : "proyectos");
  const [boldConfirmation, setBoldConfirmation] = useState<BoldConfirmation | null>(boldOrderId ? "checking" : null);
  const router = useRouter();
  // Evita reintentar la confirmación en un segundo render (StrictMode en
  // desarrollo monta los efectos dos veces) — la ruta ya es idempotente
  // del lado del servidor, pero no hay razón para pegarle dos veces.
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!boldOrderId || confirmedRef.current) return;
    confirmedRef.current = true;

    // Todo el trabajo (incluido el caso de un order-id que no calza con
    // ningún formato válido) queda del lado de la promesa — nunca un
    // `setState` síncrono directo en el cuerpo del efecto (regla
    // `react-hooks/set-state-in-effect`), aunque ese caso en particular no
    // necesite red: uniformar el camino evita una rama sync + una async
    // mezcladas en el mismo efecto.
    const invoiceId = parseInvoiceIdFromBoldOrderId(boldOrderId);
    const statusRequest = invoiceId
      ? fetch(`/api/invoices/${invoiceId}/bold-status?orderId=${encodeURIComponent(boldOrderId)}`).then((res) => res.json())
      : Promise.resolve({ status: null });

    statusRequest
      .then((result) => {
        setBoldConfirmation(result.status === "APPROVED" ? "approved" : "other");
        // Limpia la URL (?bold-order-id=...) para que un refresh o "atrás"
        // no vuelva a disparar la confirmación — el pago ya quedó
        // registrado, re-consultarlo no hace daño pero no aporta nada.
        router.replace("/portal");
        router.refresh();
      })
      .catch((error) => {
        logError("Error al confirmar el pago de Bold", error);
        setBoldConfirmation("other");
      });
  }, [boldOrderId, router]);

  return (
    <div className="space-y-6">
      {boldConfirmation && (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm font-medium ${
            boldConfirmation === "approved"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : boldConfirmation === "checking"
              ? "border-foreground/10 bg-foreground/[0.03] text-foreground/70"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700"
          }`}
        >
          {boldConfirmation === "checking" && <Spinner size={16} className="animate-spin shrink-0" />}
          {boldConfirmation === "approved" && <CheckCircle size={16} className="shrink-0" />}
          {boldConfirmation === "other" && <WarningCircle size={16} className="shrink-0" />}
          <span>
            {boldConfirmation === "checking" && "Confirmando tu pago con Bold…"}
            {boldConfirmation === "approved" && "¡Pago confirmado! Tu factura se actualizó."}
            {boldConfirmation === "other" &&
              "No pudimos confirmar el pago todavía. Si alcanzaste a pagar, se reflejará en unos minutos; si no, intenta de nuevo."}
          </span>
        </div>
      )}

      <nav aria-label="Secciones del portal" className="flex flex-wrap gap-2 border-b border-foreground/10 pb-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            aria-current={activeTab === key ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === key
                ? "bg-accent-strong text-white"
                : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeTab === "proyectos" && <ProjectsBoard initialProjects={projects} variant="portal" />}
      {activeTab === "actividad" && <PortalActivityFeed events={activity} />}
      {activeTab === "facturas" && <PortalInvoicesPanel invoices={invoices} />}
      {activeTab === "documentos" && <PortalDocumentsPanel documents={documents} projects={projectOptions} />}
      {activeTab === "soporte" && <PortalSupportPanel tickets={tickets} projects={projectOptions} />}
    </div>
  );
}
