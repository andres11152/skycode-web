"use client";

import { useState, useEffect, useRef } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { ArrowsClockwise, DeviceMobile, Lightning, PaperPlaneTilt, Play, ShieldCheck, ShoppingCart, Sparkle, Terminal } from "@phosphor-icons/react";
import { getBentoContent } from "@/content/bento";
import { defaultLocale, type Locale } from "@/lib/i18n";

interface WidgetProps {
  locale?: Locale;
}

/* -------------------------------------------------------------------------- */
/*  1. Interactive Code Console Widget (Software a Medida)                      */
/* -------------------------------------------------------------------------- */
export function CodeConsoleWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).codeConsole;
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "output">("code");
  const [logs, setLogs] = useState<string[]>(content.logsInitial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleRun = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab("output");
    setLogs(content.logsRunning);

    timerRef.current = setTimeout(() => {
      setLogs((prev) => [...prev, ...content.logsSuccessAppend]);
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 sm:p-4 text-xs font-mono shadow-2xl text-background overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-background/10 pb-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-2 w-2 rounded-full bg-background/20 shrink-0" />
          <div className="h-2 w-2 rounded-full bg-background/20 shrink-0" />
          <div className="h-2 w-2 rounded-full bg-background/20 shrink-0" />
          <span className="ml-1 text-[10px] xs:text-[11px] text-background/60 flex items-center gap-1 truncate">
            <Terminal size={12} className="text-accent shrink-0" /> app-core.ts
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("code"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("code"); } }}
            className={`flex min-h-6 items-center px-1.5 sm:px-2 rounded text-[10px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
              activeTab === "code" ? "bg-background/20 text-background font-bold" : "text-background/50 hover:text-background"
            }`}
          >
            Code
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("output"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("output"); } }}
            className={`flex min-h-6 items-center px-1.5 sm:px-2 rounded text-[10px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
              activeTab === "output" ? "bg-background/20 text-background font-bold" : "text-background/50 hover:text-background"
            }`}
          >
            Output
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={handleRun}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRun(e); }}
            className={`ml-1 flex min-h-6 items-center gap-1 rounded bg-accent-strong px-2 sm:px-2.5 text-[10px] font-bold text-white shadow-sm hover:brightness-90 cursor-pointer active:scale-95 transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
              isRunning ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Play size={10} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? content.running : content.run}
          </span>
        </div>
      </div>

      {/* Body */}
      {activeTab === "code" ? (
        <div className="space-y-1 text-background/90 font-mono text-[11px] leading-relaxed">
          <div><span className="text-accent">import</span> &#123; z &#125; <span className="text-accent">from</span> <span className="text-background/70">&apos;zod&apos;</span>;</div>
          <div className="text-background/60">{content.codeComment}</div>
          <div><span className="text-accent">const</span> OrderSchema = z.object(&#123;</div>
          <div className="pl-4">customerId: z.string().uuid(),</div>
          <div className="pl-4">items: z.array(ItemSchema).min(1),</div>
          <div>&#125;);</div>
        </div>
      ) : (
        <div className="space-y-1 text-[11px] font-mono leading-relaxed min-h-[90px]">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={log.includes("OK") || content.logsSuccessAppend.includes(log) ? "text-background" : "text-background/70"}
            >
              {log}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  2. Interactive Smartphone Preview Widget (Apps Móviles)                     */
/* -------------------------------------------------------------------------- */
export function MobileAppPreviewWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).mobilePreview;
  const [activeTab, setActiveTab] = useState<"dashboard" | "sync" | "push">("dashboard");
  const [synced, setSynced] = useState(true);

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md">
      {/* Marco de dispositivo — el radio grande imita el bisel real de un teléfono,
          no es un botón/tarjeta de UI, así que no aplica la regla de rounded-xl. */}
      <div className="mx-auto w-[200px] rounded-[24px] border-4 border-foreground/20 bg-foreground/95 p-3 text-background shadow-xl">
        {/* Dynamic Island / Speaker notch */}
        <div className="mx-auto mb-2 h-3 w-16 rounded-full bg-background/20 flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-background/40" />
        </div>

        {/* Screen Header */}
        <div className="flex items-center justify-between text-[9px] font-bold text-background/60 mb-2 px-1">
          <span>9:41</span>
          <div className="flex items-center gap-1 text-accent">
            <Lightning size={10} /> 5G
          </div>
        </div>

        {/* Dynamic Screen Content */}
        <div className="rounded-lg bg-background/10 p-2.5 text-xs text-background">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold">
                  <span>{content.appPanelLabel}</span>
                  <span className="h-2 w-2 rounded-full bg-accent" />
                </div>
                <div className="rounded bg-background/15 p-2 text-center">
                  <div className="text-[9px] text-background/60">{content.sessionLabel}</div>
                  <div className="text-sm font-bold text-accent">{content.authenticated}</div>
                </div>
              </motion.div>
            )}

            {activeTab === "sync" && (
              <motion.div
                key="sync"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-2 text-center py-1"
              >
                <div className="text-[10px] font-semibold">{content.syncEngineLabel}</div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSynced(!synced);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setSynced(!synced);
                    }
                  }}
                  className="mx-auto flex items-center justify-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-[9px] text-background font-bold cursor-pointer hover:bg-accent/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground"
                >
                  <ArrowsClockwise size={10} className={!synced ? "animate-spin" : ""} />
                  {synced ? content.synced : content.syncing}
                </span>
              </motion.div>
            )}

            {activeTab === "push" && (
              <motion.div
                key="push"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-1.5"
              >
                <div className="rounded bg-accent/20 border border-accent/30 p-1.5 text-[9px] text-background">
                  <div className="font-bold text-accent">{content.pushNotificationLabel}</div>
                  <div className="text-background/80 text-[8px]">{content.pushOrderUpdated}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Tab Bar Selector */}
        <div className="mt-3 flex items-center justify-around border-t border-background/10 pt-2 text-[10px]">
          <span
            role="button"
            tabIndex={0}
            aria-label={content.ariaViewDashboard}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("dashboard"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("dashboard"); } }}
            className={`flex h-6 w-6 items-center justify-center rounded cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${activeTab === "dashboard" ? "text-accent font-bold" : "text-background/60"}`}
          >
            <DeviceMobile size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={content.ariaViewSync}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("sync"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("sync"); } }}
            className={`flex h-6 w-6 items-center justify-center rounded cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${activeTab === "sync" ? "text-accent font-bold" : "text-background/60"}`}
          >
            <ArrowsClockwise size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label={content.ariaViewPush}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("push"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("push"); } }}
            className={`flex h-6 w-6 items-center justify-center rounded cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${activeTab === "push" ? "text-accent font-bold" : "text-background/60"}`}
          >
            <Lightning size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Interactive API Inspector Widget (APIs e Integraciones)                 */
/* -------------------------------------------------------------------------- */
export function ApiInspectorWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).apiInspector;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(200);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTestApi = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setStatus(null);
    timerRef.current = setTimeout(() => {
      setStatus(200);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs font-mono text-background">
      {/* Endpoint URL bar */}
      <div className="flex items-center gap-2 rounded bg-background/10 p-2 mb-3">
        <span className="rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-bold text-background">POST</span>
        <span className="truncate text-[10px] text-background/80 flex-1">/api/orders/sync</span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleTestApi}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTestApi(e); }}
          className={`flex items-center gap-1 rounded bg-accent-strong px-2.5 py-1 text-[10px] font-bold text-white hover:brightness-90 cursor-pointer transition-all active:scale-95 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
            loading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <PaperPlaneTilt size={10} className={loading ? "animate-ping" : ""} />
          {loading ? content.testing : content.send}
        </span>
      </div>

      {/* Response Box */}
      <div className="rounded bg-background/5 p-2.5 text-[10px] space-y-1 border border-background/10">
        <div className="flex items-center justify-between text-background/50 border-b border-background/10 pb-1">
          <span>Response Header</span>
          <span className="text-background font-bold">
            {loading ? "CONNECTING..." : status ? `${status} OK` : ""}
          </span>
        </div>
        <div className="text-background/90 pt-1 leading-normal font-mono">
          <div>&#123;</div>
          <div className="pl-3 text-background/70">&quot;status&quot;: <span className="text-background">&quot;success&quot;</span>,</div>
          <div className="pl-3 text-background/70">&quot;synced&quot;: <span className="text-background">true</span></div>
          <div>&#125;</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  4. Interactive Performance Lighthouse Widget (Frontend Alto Rendimiento)   */
/* -------------------------------------------------------------------------- */
// Cifras reales, medidas contra el build de producción de este mismo sitio
// (ver "Rendimiento" en CLAUDE.md) — no se inventan, y si el sitio cambia hay
// que re-auditar con Lighthouse y actualizar estos tres números.
const LIGHTHOUSE_SCORES = [
  { label: "Performance", score: 91 },
  { label: "Accessibility", score: 100 },
  { label: "SEO", score: 100 },
];

export function PerformanceMeterWidget() {
  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md">
      <div className="flex items-center justify-around gap-2 text-center">
        {LIGHTHOUSE_SCORES.map(({ label, score }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-accent-strong font-bold text-sm">
              {score}
            </div>
            <span className="mt-1 text-[10px] font-semibold text-foreground/80">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  5. Interactive Security Shield Widget (Seguridad y Cumplimiento)            */
/* -------------------------------------------------------------------------- */
export function SecurityComplianceWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).security;
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAudit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scanning) return;
    setScanning(true);
    timerRef.current = setTimeout(() => {
      setScanning(false);
    }, 800);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs text-background font-mono">
      <div className="flex items-center justify-between border-b border-background/10 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-background font-bold text-[11px]">
          <ShieldCheck size={14} className="text-accent" /> Security Checklist
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={handleAudit}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleAudit(e); }}
          className={`rounded bg-accent-strong px-2 py-0.5 text-[9px] font-bold text-white hover:brightness-90 cursor-pointer transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
            scanning ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {scanning ? content.reviewing : content.viewChecklist}
        </span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">{content.tlsLabel}</span>
          <span className="text-background font-bold">{content.tlsValue}</span>
        </div>
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">{content.owaspLabel}</span>
          <span className="text-background font-bold">{content.owaspValue}</span>
        </div>
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">{content.dataFrameworkLabel}</span>
          <span className="text-background font-bold">{content.dataFrameworkValue}</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  6. Interactive Architecture Diagram Widget (Arquitectura & Documentación)  */
/* -------------------------------------------------------------------------- */
export function ArchitectureDocWidget() {
  const [activeNode, setActiveNode] = useState<string>("gateway");

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-background/50 p-3.5 backdrop-blur-md text-xs">
      <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-foreground/80">
        <span>System Topology</span>
        <span className="text-accent font-mono">Clean Architecture</span>
      </div>
      <div className="flex items-center justify-between gap-1 text-[9px] font-mono text-center">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveNode("client"); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveNode("client"); } }}
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
            activeNode === "client" ? "border-accent bg-accent/20 text-accent font-bold" : "border-foreground/15 bg-background/40 text-foreground/70"
          }`}
        >
          Web / App
        </span>
        <span className="text-foreground/40 font-bold">→</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveNode("gateway"); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveNode("gateway"); } }}
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
            activeNode === "gateway" ? "border-accent bg-accent/20 text-accent font-bold" : "border-foreground/15 bg-background/40 text-foreground/70"
          }`}
        >
          API Gateway
        </span>
        <span className="text-foreground/40 font-bold">→</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveNode("db"); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveNode("db"); } }}
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
            activeNode === "db" ? "border-accent bg-accent/20 text-accent font-bold" : "border-foreground/15 bg-background/40 text-foreground/70"
          }`}
        >
          DB Cluster
        </span>
      </div>
      <div className="mt-2 rounded bg-foreground/5 p-2 text-[10px] text-foreground/80 font-mono text-center">
        {activeNode === "client" && "Client: React / React Native UI Layer"}
        {activeNode === "gateway" && "Gateway: Rate Limiter + Auth JWT Middleware"}
        {activeNode === "db" && "Database: PostgreSQL Primary + Replica Sync"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  7. Interactive Data Migration Progress Widget (Migración de Datos Legacy)  */
/* -------------------------------------------------------------------------- */
export function LegacyMigrationWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).migration;
  const [progress, setProgress] = useState(100);
  const [migrating, setMigrating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleMigrate = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (migrating) return;
    setMigrating(true);
    setProgress(15);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setMigrating(false);
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs text-background font-mono">
      <div className="flex items-center justify-between border-b border-background/10 pb-2 mb-2 text-[11px]">
        <span className="font-bold text-background/90">Legacy → Cloud DB</span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleMigrate}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleMigrate(e); }}
          className={`rounded bg-accent-strong px-2 py-0.5 text-[9px] font-bold text-white hover:brightness-90 cursor-pointer transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
            migrating ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {migrating ? content.migrating : content.simulate}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-background/80">
          <span>{content.tablesMigrated}</span>
          <span className="text-background font-bold">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-background/20 overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="text-[9px] text-background/70 text-center font-bold pt-0.5">
          {progress === 100 ? content.verified : content.transferring}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  8. Interactive AI Agent Simulator Widget (Inteligencia Artificial)        */
/* -------------------------------------------------------------------------- */
export function AiAppliedWidget({ locale = defaultLocale }: WidgetProps) {
  const content = getBentoContent(locale).aiAgent;
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<string>(content.initialResponse);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleRunAi = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (running) return;
    setRunning(true);
    setResponse(content.runningResponse);
    timerRef.current = setTimeout(() => {
      setResponse(content.finalResponse);
      setRunning(false);
    }, 700);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs text-background font-mono">
      <div className="flex items-center justify-between border-b border-background/10 pb-2 mb-2 text-[11px]">
        <span className="font-bold text-accent flex items-center gap-1">
          <Sparkle size={12} /> {content.heading}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleRunAi}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRunAi(e); }}
          className={`rounded bg-accent-strong px-2 py-0.5 text-[9px] font-bold text-white hover:brightness-90 cursor-pointer transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
            running ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {running ? content.thinking : content.runAgent}
        </span>
      </div>
      <div className="rounded bg-background/10 p-2 text-[10px] space-y-1">
        <div className="text-background/50 text-[9px]">{content.promptLabel}: &quot;{content.promptText}&quot;</div>
        <div className="text-background font-bold leading-relaxed">{response}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  9. Interactive Checkout Widget (Ecommerce · Tienda en Línea)              */
/* -------------------------------------------------------------------------- */
// Sin i18n (getBentoContent) a propósito, mismo criterio que
// PerformanceMeterWidget/ArchitectureDocWidget: términos técnicos de pasarelas
// de pago (nombres de marca reales) y de ecommerce, se leen igual en los 3
// idiomas del sitio sin necesitar traducción.
const CHECKOUT_GATEWAYS = [
  { id: "stripe", label: "Stripe" },
  { id: "wompi", label: "Wompi" },
  { id: "payu", label: "PayU" },
] as const;

export function EcommerceCheckoutWidget() {
  const [gateway, setGateway] = useState<(typeof CHECKOUT_GATEWAYS)[number]["id"]>("stripe");

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs font-mono text-background">
      <div className="flex items-center justify-between border-b border-background/10 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-background font-bold text-[11px]">
          <ShoppingCart size={14} className="text-accent" /> Checkout
        </div>
        <span className="rounded bg-background/10 px-1.5 py-0.5 text-[9px] text-background/70">3 items</span>
      </div>

      <div className="space-y-1 text-[10px] mb-2.5">
        <div className="flex items-center justify-between text-background/70">
          <span>Producto A</span>
          <span>$120.000</span>
        </div>
        <div className="flex items-center justify-between text-background/70">
          <span>Producto B</span>
          <span>$85.000</span>
        </div>
        <div className="flex items-center justify-between border-t border-background/10 pt-1.5 font-bold text-background">
          <span>Total</span>
          <span className="text-accent">$205.000</span>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-2.5">
        {CHECKOUT_GATEWAYS.map((g) => (
          <span
            key={g.id}
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGateway(g.id); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setGateway(g.id); } }}
            className={`flex-1 rounded px-1.5 py-1 text-center text-[9px] cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-foreground ${
              gateway === g.id ? "bg-accent-strong text-white font-bold" : "bg-background/10 text-background/60"
            }`}
          >
            {g.label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 rounded bg-background/10 px-2 py-1.5 text-[10px] text-background/80">
        <ShieldCheck size={12} className="text-accent shrink-0" />
        <span>Pago cifrado · inventario sincronizado en tiempo real</span>
      </div>
    </div>
  );
}
