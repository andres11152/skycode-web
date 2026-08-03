"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Play, CheckCircle2, Cpu, Smartphone, Zap, ShieldCheck, Server, RefreshCw, Send } from "lucide-react";

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

  const handleRun = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab("output");
    setLogs(["⏳ Compiling microservices...", "📦 Bundling WebAssembly modules..."]);

    setTimeout(() => {
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
          <button
            onClick={() => setActiveTab("code")}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              activeTab === "code" ? "bg-background/20 text-background font-bold" : "text-background/50 hover:text-background"
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              activeTab === "output" ? "bg-background/20 text-background font-bold" : "text-background/50 hover:text-background"
            }`}
          >
            Output
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="ml-2 flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50"
          >
            <Play size={10} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? "Running..." : "Run"}
          </button>
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSynced(!synced);
                  }}
                  className="mx-auto flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-[9px] text-accent font-bold hover:bg-accent/30 transition-colors"
                >
                  <RefreshCw size={10} className={!synced ? "animate-spin" : ""} />
                  {synced ? "Synced (0 pending)" : "Syncing DB..."}
                </button>
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
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("dashboard"); }}
            className={`p-1 rounded transition-colors ${activeTab === "dashboard" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <Smartphone size={12} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("sync"); }}
            className={`p-1 rounded transition-colors ${activeTab === "sync" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab("push"); }}
            className={`p-1 rounded transition-colors ${activeTab === "push" ? "text-accent font-bold" : "text-background/40"}`}
          >
            <Zap size={12} />
          </button>
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

  const handleTestApi = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setStatus(null);
    setTimeout(() => {
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
        <button
          onClick={handleTestApi}
          disabled={loading}
          className="flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-[10px] font-bold text-white hover:bg-accent/90 transition-all active:scale-95 shrink-0"
        >
          <Send size={10} className={loading ? "animate-ping" : ""} />
          {loading ? "Testing..." : "Send"}
        </button>
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
