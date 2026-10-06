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
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/currency";
import { Tabs, tabId, tabPanelId } from "../dashboard/ui/Tabs";
import { StatCard } from "../dashboard/ui/StatCard";
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

const isTabKey = (value: string | undefined): value is TabKey => TABS.some((t) => t.key === value);
type BoldConfirmation = "checking" | "approved" | "other";

/**
 * `/portal` sigue siendo UNA sola ruta (sin sub-rutas, ver CLAUDE.md) —
 * este componente cliente arma pestañas dentro de esa única página en vez
 * de introducir rutas nuevas, para no romper esa decisión ya establecida
 * mientras el portal crece de "solo proyectos" a 4 secciones.
 */
export function PortalView({
  clientName,
  linked,
  initialTab,
  projects,
  invoices,
  documents,
  tickets,
  activity,
  projectOptions,
  boldOrderId,
}: {
  clientName: string;
  /** `false` si la cuenta aún no está enlazada a un cliente (no hay nada que mostrar). */
  linked: boolean;
  /** `?tab=` de la URL, para que recargar o compartir el enlace conserve la pestaña. */
  initialTab?: string;
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
  const [activeTab, setActiveTab] = useState<TabKey>(boldOrderId ? "facturas" : isTabKey(initialTab) ? initialTab : "proyectos");
  // La pestaña activa vive en la URL (sin navegar: solo reemplaza la entrada de historial).
  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    window.history.replaceState(null, "", key === "proyectos" ? "/portal" : `/portal?tab=${key}`);
  };
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
              ? "border-success/30 bg-success/10 text-success"
              : boldConfirmation === "checking"
              ? "border-foreground/10 bg-foreground/[0.03] text-foreground/70"
              : "border-warning/30 bg-warning/10 text-warning"
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

      {!linked ? (
        <div role="status" className="mx-auto max-w-md space-y-2 rounded-xl border border-foreground/10 bg-background p-8 text-center shadow-sm shadow-black/5">
          <h1 className="text-lg font-bold text-foreground">Tu cuenta aún no está vinculada</h1>
          <p className="text-sm leading-relaxed text-foreground/80">
            Todavía no asociamos tu usuario a un proyecto. Escríbenos a{" "}
            <a href="mailto:contact@skycode.agency" className="font-semibold text-accent-strong underline-offset-4 hover:underline">
              contact@skycode.agency
            </a>{" "}
            y lo dejamos listo.
          </p>
        </div>
      ) : (
        <>
          <PortalSummary
            clientName={clientName}
            projects={projects}
            invoices={invoices}
            tickets={tickets}
            onGoTo={selectTab}
          />

          <Tabs
            idBase="portal"
            label="Contenido del portal"
            items={TABS.map(({ key, label, icon: Icon }) => ({ id: key, label, icon: <Icon size={16} aria-hidden="true" /> }))}
            value={activeTab}
            onChange={selectTab}
          />

          <div role="tabpanel" id={tabPanelId("portal", activeTab)} aria-labelledby={tabId("portal", activeTab)}>
            {activeTab === "proyectos" && <ProjectsBoard initialProjects={projects} variant="portal" />}
            {activeTab === "actividad" && <PortalActivityFeed events={activity} />}
            {activeTab === "facturas" && <PortalInvoicesPanel invoices={invoices} />}
            {activeTab === "documentos" && <PortalDocumentsPanel documents={documents} projects={projectOptions} />}
            {activeTab === "soporte" && <PortalSupportPanel tickets={tickets} projects={projectOptions} />}
          </div>
        </>
      )}
    </div>
  );
}


/**
 * Resumen de bienvenida: lo que un cliente viene a mirar (¿qué debo?, ¿cómo
 * va mi proyecto?, ¿hay algo abierto?) antes de entrar a cada pestaña. Cada
 * tarjeta lleva a la pestaña correspondiente.
 */
function PortalSummary({
  clientName,
  projects,
  invoices,
  tickets,
  onGoTo,
}: {
  clientName: string;
  projects: Project[];
  invoices: Invoice[];
  tickets: SupportTicket[];
  onGoTo: (tab: TabKey) => void;
}) {
  const firstName = clientName.trim().split(/\s+/)[0] || clientName;

  const unpaid = invoices.filter((i) => i.status !== "paid" && i.balance > 0);
  const overdueCount = unpaid.filter((i) => i.status === "overdue").length;
  // Un total por moneda: nunca se suman COP y USD.
  const owed = unpaid.reduce<Partial<Record<Currency, number>>>((acc, i) => {
    acc[i.currency] = (acc[i.currency] ?? 0) + i.balance;
    return acc;
  }, {});
  const owedText = (Object.entries(owed) as [Currency, number][]).map(([c, v]) => formatMoney(v, c)).join(" · ");

  const mainProject = projects.find((p) => p.status !== "Entregado") ?? projects[0];
  const openTickets = tickets.filter((t) => t.status !== "Resuelto" && t.status !== "Cerrado").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Hola, {firstName}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          onClick={() => onGoTo("facturas")}
          label="Por pagar"
          value={unpaid.length === 0 ? "Al día" : owedText}
          tone={overdueCount > 0 ? "danger" : unpaid.length === 0 ? "success" : "neutral"}
          hint={
            unpaid.length === 0
              ? "No tienes facturas pendientes"
              : `${unpaid.length} ${unpaid.length === 1 ? "factura" : "facturas"}${overdueCount > 0 ? ` · ${overdueCount} vencida${overdueCount === 1 ? "" : "s"}` : ""}`
          }
        />
        <StatCard
          onClick={() => onGoTo("proyectos")}
          label={mainProject ? `Avance · ${mainProject.title}` : "Avance"}
          value={mainProject ? `${mainProject.progress}%` : "—"}
          hint={mainProject ? mainProject.status : "Aún no hay proyectos"}
        />
        <StatCard
          onClick={() => onGoTo("soporte")}
          label="Soporte"
          value={openTickets}
          hint={openTickets === 1 ? "incidencia abierta" : "incidencias abiertas"}
        />
      </div>
    </div>
  );
}
