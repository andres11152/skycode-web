"use client";

import { useEffect, useState } from "react";
import type { BogotaClock } from "@/content/bogota";
import { cn } from "@/lib/utils";

/** "GMT-5" → "UTC−5". `shortOffset` no devuelve nada para UTC+0 exacto ("GMT"). */
function offsetLabel(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  if (!part) return "";
  return part.replace("GMT", "UTC").replace("-", "−");
}

function timeLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/**
 * Horas en vivo. Hasta montar en el cliente se muestra "--:--": la hora del
 * servidor (build/ISR) sería distinta a la del visitante y rompería la
 * hidratación. Se actualiza cada 20 s — basta para mostrar minutos.
 */
export function LiveClocks({
  clocks,
  label,
  note,
  className,
}: {
  clocks: BogotaClock[];
  label: string;
  note?: string;
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // setNow dentro del callback del intervalo y de un timeout, no en el cuerpo del efecto.
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className={className}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">{label}</p>
      <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10">
        {clocks.map((clock) => (
          <li
            key={clock.tz}
            // Capa de tinte sobre blanco: un `bg-foreground/[0.03]` solo quedaría translúcido sobre el gris de la rejilla.
            className={cn(
              "flex flex-col gap-1 bg-background p-4",
              clock.home && "bg-[linear-gradient(rgba(10,10,10,0.04),rgba(10,10,10,0.04))]",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              {clock.city}
              {clock.home && now && (
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
              )}
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {now ? timeLabel(now, clock.tz) : "--:--"}
            </span>
            <span className="font-mono text-xs text-foreground/70">{now ? offsetLabel(now, clock.tz) : " "}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{note}</p>}
    </div>
  );
}
