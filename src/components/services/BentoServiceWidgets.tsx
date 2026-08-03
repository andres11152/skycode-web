"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Play, Smartphone, Zap, ShieldCheck, RefreshCw, Send, Sparkles } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  1. Interactive Code Console Widget (Software a Medida)                      */
/* -------------------------------------------------------------------------- */
export function CodeConsoleWidget() {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "output">("code");
  const [logs, setLogs] = useState<string[]>([
    "🚀 SKYCODE Engine v2.4 initialized",
    "✔ TypeScript 5.4 compilation: CLEAN",
    "⚡ Latency: 0.3ms | Memory: 42MB",
  ]);
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
    setLogs(["⏳ Compiling microservices...", "📦 Bundling WebAssembly modules..."]);

    timerRef.current = setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        "✅ Build succeeded in 0.28s",
        "🌐 Deployed to Global Edge Network",
        "STATUS: 200 OK (Clean Architecture)",
      ]);
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-4 text-xs font-mono shadow-2xl text-background">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-background/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          <span className="ml-2 text-[11px] text-background/60 flex items-center gap-1">
            <Terminal size={12} className="text-accent" /> app-core.ts
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("code"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("code"); } }}
            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
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
            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
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
            className={`ml-2 flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-accent/90 cursor-pointer active:scale-95 transition-all ${
              isRunning ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Play size={10} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? "Running..." : "Run"}
          </span>
        </div>
      </div>

      {/* Body */}
      {activeTab === "code" ? (
        <div className="space-y-1 text-background/90 font-mono text-[11px] leading-relaxed">
          <div><span className="text-purple-400">import</span> &#123; SkycodeCore &#125; <span className="text-purple-400">from</span> <span className="text-accent-secondary">&apos;@skycode/sdk&apos;</span>;</div>
          <div className="text-background/40">// Auto-scaling microservice config</div>
          <div><span className="text-purple-400">export const</span> app = <span className="text-blue-400">new</span> SkycodeCore(&#123;</div>
          <div className="pl-4">architecture: <span className="text-accent-secondary">&apos;Hexagonal&apos;</span>,</div>
          <div className="pl-4">testCoverage: <span className="text-yellow-400">100</span>,</div>
          <div className="pl-4">autoScale: <span className="text-purple-400">true</span></div>
          <div>&#125;);</div>
        </div>
      ) : (
        <div className="space-y-1 text-[11px] font-mono leading-relaxed min-h-[90px]">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={log.includes("OK") || log.includes("CLEAN") || log.includes("succeeded") ? "text-green-400" : "text-background/80"}
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
export function MobileAppPreviewWidget() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "sync" | "push">("dashboard");
  const [synced, setSynced] = useState(true);

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md">
      <div className="mx-auto w-[200px] rounded-[24px] border-4 border-foreground/20 bg-foreground/95 p-3 text-background shadow-xl">
        {/* Dynamic Island / Speaker notch */}
        <div className="mx-auto mb-2 h-3 w-16 rounded-full bg-background/20 flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-background/40" />
        </div>

        {/* Screen Header */}
        <div className="flex items-center justify-between text-[9px] font-bold text-background/60 mb-2 px-1">
          <span>9:41</span>
          <div className="flex items-center gap-1 text-accent">
            <Zap size={10} /> 5G
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
                  <span>SkyApp Live</span>
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <div className="rounded bg-background/15 p-2 text-center">
                  <div className="text-[9px] text-background/60">Active Users</div>
                  <div className="text-sm font-bold text-accent-secondary">14,280</div>
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
                <div className="text-[10px] font-semibold">Offline Sync Engine</div>
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
                  className="mx-auto flex items-center justify-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-[9px] text-accent font-bold cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <RefreshCw size={10} className={!synced ? "animate-spin" : ""} />
                  {synced ? "Synced (0 pending)" : "Syncing DB..."}
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
                  <div className="font-bold text-accent">Push Notification</div>
                  <div className="text-background/80 text-[8px]">Order #8492 updated</div>
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("dashboard"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("dashboard"); } }}
            className={`p-1 rounded cursor-pointer transition-colors ${activeTab === "dashboard" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <Smartphone size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("sync"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("sync"); } }}
            className={`p-1 rounded cursor-pointer transition-colors ${activeTab === "sync" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <RefreshCw size={12} />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("push"); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setActiveTab("push"); } }}
            className={`p-1 rounded cursor-pointer transition-colors ${activeTab === "push" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <Zap size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Interactive API Inspector Widget (APIs e Integraciones)                 */
/* -------------------------------------------------------------------------- */
export function ApiInspectorWidget() {
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
        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">POST</span>
        <span className="truncate text-[10px] text-background/80 flex-1">https://api.skycode.agency/v1/sync</span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleTestApi}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTestApi(e); }}
          className={`flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-[10px] font-bold text-white hover:bg-accent/90 cursor-pointer transition-all active:scale-95 shrink-0 ${
            loading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Send size={10} className={loading ? "animate-ping" : ""} />
          {loading ? "Testing..." : "Send"}
        </span>
      </div>

      {/* Response Box */}
      <div className="rounded bg-background/5 p-2.5 text-[10px] space-y-1 border border-background/10">
        <div className="flex items-center justify-between text-background/50 border-b border-background/10 pb-1">
          <span>Response Header</span>
          <span className="text-green-400 font-bold">
            {loading ? "CONNECTING..." : status ? `${status} OK (14ms)` : ""}
          </span>
        </div>
        <div className="text-background/90 pt-1 leading-normal font-mono">
          <div>&#123;</div>
          <div className="pl-3 text-accent-secondary">&quot;status&quot;: <span className="text-green-400">&quot;success&quot;</span>,</div>
          <div className="pl-3 text-accent-secondary">&quot;payload&quot;: &#123; <span className="text-blue-300">&quot;syncId&quot;: &quot;sc_8941&quot;</span> &#125;</div>
          <div>&#125;</div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  4. Interactive Performance Lighthouse Widget (Frontend Alto Rendimiento)   */
/* -------------------------------------------------------------------------- */
export function PerformanceMeterWidget() {
  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-background/50 p-4 backdrop-blur-md">
      <div className="flex items-center justify-around gap-2 text-center">
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10 text-green-400 font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            100
          </div>
          <span className="mt-1 text-[10px] font-semibold text-foreground/80">Performance</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10 text-green-400 font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            100
          </div>
          <span className="mt-1 text-[10px] font-semibold text-foreground/80">Accessibility</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10 text-green-400 font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            100
          </div>
          <span className="mt-1 text-[10px] font-semibold text-foreground/80">SEO</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  5. Interactive Security Shield Widget (Seguridad y Cumplimiento)            */
/* -------------------------------------------------------------------------- */
export function SecurityComplianceWidget() {
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
        <div className="flex items-center gap-1.5 text-green-400 font-bold text-[11px]">
          <ShieldCheck size={14} /> Security Status: PROTECTED
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={handleAudit}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleAudit(e); }}
          className={`rounded bg-accent px-2 py-0.5 text-[9px] font-bold text-white hover:bg-accent/90 cursor-pointer transition-all active:scale-95 ${
            scanning ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {scanning ? "Scanning..." : "Audit SSL"}
        </span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">AES-256 Encryption</span>
          <span className="text-green-400 font-bold">VERIFIED</span>
        </div>
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">OWASP Top 10 Guard</span>
          <span className="text-green-400 font-bold">PASS (0 VULN)</span>
        </div>
        <div className="flex items-center justify-between rounded bg-background/10 px-2 py-1">
          <span className="text-background/80">Ley 1581 / GDPR Compliance</span>
          <span className="text-green-400 font-bold">COMPLIANT</span>
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
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all ${
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
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all ${
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
          className={`flex-1 rounded border p-1.5 cursor-pointer transition-all ${
            activeNode === "db" ? "border-accent bg-accent/20 text-accent font-bold" : "border-foreground/15 bg-background/40 text-foreground/70"
          }`}
        >
          DB Cluster
        </span>
      </div>
      <div className="mt-2 rounded bg-foreground/5 p-2 text-[10px] text-foreground/80 font-mono text-center">
        {activeNode === "client" && "📱 Client: React / React Native UI Layer"}
        {activeNode === "gateway" && "⚡ Gateway: Rate Limiter + Auth JWT Middleware"}
        {activeNode === "db" && "💾 Database: PostgreSQL Primary + Replica Sync"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  7. Interactive Data Migration Progress Widget (Migración de Datos Legacy)  */
/* -------------------------------------------------------------------------- */
export function LegacyMigrationWidget() {
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
          className={`rounded bg-accent px-2 py-0.5 text-[9px] font-bold text-white hover:bg-accent/90 cursor-pointer transition-all active:scale-95 ${
            migrating ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {migrating ? "Migrating..." : "Run Test"}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-background/80">
          <span>Records: 100,000 / 100,000</span>
          <span className="text-green-400 font-bold">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-background/20 overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="text-[9px] text-green-400 text-center font-bold pt-0.5">
          {progress === 100 ? "✔ ZERO DATA LOSS GUARANTEE" : "🔄 Transferring tables..."}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  8. Interactive AI Agent Simulator Widget (Inteligencia Artificial)        */
/* -------------------------------------------------------------------------- */
export function AiAppliedWidget() {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<string>('🤖 Agent: "Workflow automated. Sentiment: 98% Positive"');
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
    setResponse("⏳ LLM Agent processing prompt...");
    timerRef.current = setTimeout(() => {
      setResponse("✨ Agent: Output generated (Latency: 0.18s, Accuracy: 99.4%)");
      setRunning(false);
    }, 700);
  };

  return (
    <div className="w-full rounded-xl border border-foreground/10 bg-foreground/95 p-3.5 text-xs text-background font-mono">
      <div className="flex items-center justify-between border-b border-background/10 pb-2 mb-2 text-[11px]">
        <span className="font-bold text-accent flex items-center gap-1">
          <Sparkles size={12} /> Autonomous AI Agent
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleRunAi}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRunAi(e); }}
          className={`rounded bg-accent px-2 py-0.5 text-[9px] font-bold text-white hover:bg-accent/90 cursor-pointer transition-all active:scale-95 ${
            running ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {running ? "Thinking..." : "Run AI Agent"}
        </span>
      </div>
      <div className="rounded bg-background/10 p-2 text-[10px] space-y-1">
        <div className="text-background/50 text-[9px]">Prompt: &quot;Optimize workflow &amp; sentiment&quot;</div>
        <div className="text-green-400 font-bold leading-relaxed">{response}</div>
      </div>
    </div>
  );
}

