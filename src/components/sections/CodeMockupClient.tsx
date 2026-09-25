"use client";

// CodeMockupClient — renderizado en servidor desde Hero.tsx. Sin Framer
// Motion: typing, láser y float son @keyframes CSS (globals.css), así que el
// HTML del servidor ya se ve completo en el primer pintado.

import { useState, useEffect, useSyncExternalStore } from "react";
import { getHeroContent } from "@/content/hero";
import { type Locale } from "@/lib/i18n";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function CodeMockup({ locale }: { locale: Locale }) {
  const { comment } = getHeroContent(locale).codeMockup;
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const codeLines: { length: number; isBreak?: boolean; jsx: React.ReactNode }[] = [
    {
      // La duración del "tipeo" depende del largo real del string
      // (cambia por idioma), no de un número fijo.
      length: comment.length,
      jsx: <span className="text-background/60">{comment}</span>,
    },
    {
      length: 29,
      jsx: (
        <>
          <span className="text-accent">import</span>
          <span className="text-background/80">{" { z } "}</span>
          <span className="text-accent">from</span>
          <span className="text-background/80">{" \"zod\";"}</span>
        </>
      ),
    },
    {
      length: 44,
      jsx: (
        <>
          <span className="text-accent">import</span>
          <span className="text-background/80">{" { requireAuth } "}</span>
          <span className="text-accent">from</span>
          <span className="text-background/80">{" \"@/lib/auth\";"}</span>
        </>
      ),
    },
    { length: 1, isBreak: true, jsx: <span className="text-background/20">{"\n"}</span> },
    {
      length: 28,
      jsx: (
        <>
          <span className="text-accent">const</span>
          <span className="text-background/80">{" OrderSchema = z.object({"}</span>
        </>
      ),
    },
    {
      length: 38,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">{"productId"}</span>
          <span className="text-background/80">{": z.string().uuid(),"}</span>
        </span>
      ),
    },
    {
      length: 31,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">{"qty"}</span>
          <span className="text-background/80">{": z.number().int().min(1),"}</span>
        </span>
      ),
    },
    { length: 2, jsx: <span className="text-background/80">{"});"}</span> },
    { length: 1, isBreak: true, jsx: <span className="text-background/20">{"\n"}</span> },
    {
      length: 50,
      jsx: (
        <>
          <span className="text-accent">export</span>
          <span className="text-background/80">{" async function POST(req: Request) {"}</span>
        </>
      ),
    },
    {
      length: 36,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">const</span>
          <span className="text-background/80">{" user = await requireAuth(req);"}</span>
        </span>
      ),
    },
    {
      length: 52,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">const</span>
          <span className="text-background/80">{" body = OrderSchema.parse(await req.json());"}</span>
        </span>
      ),
    },
    { length: 1, isBreak: true, jsx: <span className="text-background/20">{"\n"}</span> },
    {
      length: 41,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">const</span>
          <span className="text-background/80">{" order = "}</span>
          <span className="text-accent">await</span>
          <span className="text-background/80">{" db.orders.create({"}</span>
        </span>
      ),
    },
    {
      length: 42,
      jsx: <span className="pl-8 text-background/80">{"data: { ...body, ownerId: user.id },"}</span>,
    },
    { length: 9, jsx: <span className="pl-4 text-background/80">{"});"}</span> },
    { length: 1, isBreak: true, jsx: <span className="text-background/20">{"\n"}</span> },
    {
      length: 50,
      jsx: (
        <span className="pl-4">
          <span className="text-accent">return</span>
          <span className="text-background/80">{" Response.json(order, { status: "}</span>
          <span className="text-accent">201</span>
          <span className="text-background/80">{" });"}</span>
        </span>
      ),
    },
    { length: 1, jsx: <span className="text-background/80">{"}"}</span> },
  ];

  let currentDelay = 0.5;
  const linesWithDelays = codeLines.map((line) => {
    const delay = currentDelay;
    const duration = line.length * 0.022;
    currentDelay += duration + 0.1;
    return { ...line, delay, duration };
  });

  // Derivado, no inicializado desde `reduced`: al renderizar en servidor,
  // `reduced` arranca en false (snapshot de servidor) y un `useState` inicial
  // dejaría a un usuario con reduced-motion atascado en "POSTing...".
  const [typingDone, setTypingDone] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => setTypingDone(true), Math.round(currentDelay * 1000));
    return () => clearTimeout(timer);
  }, [currentDelay, reduced]);
  const status = reduced || typingDone ? "success" : "loading";

  return (
    // Float animation: CSS @keyframes (globals.css) — GPU compositor, sin JS.
    <div className={`w-full max-w-md select-none ${!reduced ? "animate-float" : ""}`}>
      <div className="group relative w-full overflow-hidden rounded-xl bg-foreground border border-background/10 shadow-2xl shadow-black/40 transition-all duration-300 hover:shadow-accent/5 hover:border-accent/20">
        {/* Línea de escaneo láser — GPU compositor via transform */}
        {!reduced && (
          <div className="animate-laser absolute inset-x-0 z-20 h-[1.5px] bg-gradient-to-r from-transparent via-accent/80 to-transparent blur-[1px] pointer-events-none" />
        )}

        {/* Cabecera del archivo */}
        <div className="flex items-center justify-between border-b border-background/10 px-3 py-2 sm:px-4 sm:py-2.5 bg-background/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1 sm:gap-1.5">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-background/20" />
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-background/60">
              api/orders/route.ts
            </span>
          </div>
          <div
            className={`hidden xs:flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold transition-colors ${
              status === "success"
                ? "border-accent/30 text-accent"
                : "border-background/20 text-background/60"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status === "success" ? "bg-accent" : "bg-background/40"}`} />
            {status === "success" ? "201 Created" : "POSTing..."}
          </div>
        </div>

        {/* Cuerpo con efecto typing */}
        <pre className="overflow-x-auto p-3 sm:p-4 font-mono text-[11px] xs:text-[12px] sm:text-[12.5px] leading-normal w-full max-w-full">
          <code className="flex flex-col text-left">
            {linesWithDelays.map((line, index) => {
              if (line.isBreak) {
                return <span key={index} className="text-background/20">{"\n"}</span>;
              }
              return (
                <div
                  key={index}
                  className="animate-codeline overflow-hidden whitespace-nowrap text-left flex items-center pr-1"
                  style={{
                    maxWidth: "max-content",
                    animation: `codeline-type ${line.duration}s linear ${line.delay}s forwards`,
                  }}
                >
                  {line.jsx}
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
