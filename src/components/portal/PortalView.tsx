"use client";

import { useState } from "react";
import { FileText, Lifebuoy, Receipt, Stack } from "@phosphor-icons/react";
import { ProjectsBoard } from "../dashboard/ProjectsBoard";
import { PortalInvoicesPanel } from "./PortalInvoicesPanel";
import { PortalDocumentsPanel } from "./PortalDocumentsPanel";
import { PortalSupportPanel } from "./PortalSupportPanel";
import type { Project, Invoice, ProjectDocument, SupportTicket, ProjectOption } from "../dashboard/types";

const TABS = [
  { key: "proyectos", label: "Proyectos", icon: Stack },
  { key: "facturas", label: "Facturas", icon: Receipt },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "soporte", label: "Soporte", icon: Lifebuoy },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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
  projectOptions,
}: {
  projects: Project[];
  invoices: Invoice[];
  documents: ProjectDocument[];
  tickets: SupportTicket[];
  projectOptions: ProjectOption[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("proyectos");

  return (
    <div className="space-y-6">
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
      {activeTab === "facturas" && <PortalInvoicesPanel invoices={invoices} />}
      {activeTab === "documentos" && <PortalDocumentsPanel documents={documents} />}
      {activeTab === "soporte" && <PortalSupportPanel tickets={tickets} projects={projectOptions} />}
    </div>
  );
}
