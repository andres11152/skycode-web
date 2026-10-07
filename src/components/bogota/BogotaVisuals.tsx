import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Índice entre hermanos para el escalonado de los `reveal-*` (ver globals.css). */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * Visuales decorativos de la página local. Todos son `aria-hidden`: el mensaje
 * ya está en el texto de la tarjeta. Mismo lenguaje que el `CodeMockup` del
 * Hero: superficie oscura (`bg-foreground`) y acento solo en un detalle.
 */

/** Terminal con las líneas de propiedad del repositorio. */
export function RepoMockup({ lines }: { lines: string[] }) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl bg-foreground">
      <div className="flex items-center gap-1.5 border-b border-background/10 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-background/20" />
        <span className="h-2 w-2 rounded-full bg-background/20" />
        <span className="h-2 w-2 rounded-full bg-background/20" />
      </div>
      <ul className="flex flex-col gap-1.5 p-4 font-mono text-xs leading-relaxed">
        {lines.map((line, index) => {
          const [key, ...rest] = line.split(": ");
          return (
            <li key={line} className="reveal-left truncate" style={stagger(index)}>
              <span className="text-accent">{key}</span>
              <span className="text-background/60">: </span>
              <span className="text-background/80">{rest.join(": ")}</span>
            </li>
          );
        })}
        {/* Cursor de terminal: la línea que "sigue escribiéndose". */}
        <li className="flex h-4 items-center">
          <span className="caret-blink h-3.5 w-1.5 bg-accent" />
        </li>
      </ul>
    </div>
  );
}

/** Tres iniciales del equipo con el lema de contacto directo. */
export function PeopleVisual({ people, label }: { people: { initial: string; name: string }[]; label: string }) {
  return (
    <div aria-hidden="true" className="group/people flex items-center gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
      {/* Al pasar el cursor las iniciales se separan (translate, no margen: no mueve el layout). */}
      <div className="flex -space-x-2">
        {people.map((person, index) => (
          <span
            key={person.name}
            style={{ ...stagger(index), "--k": index } as CSSProperties}
            className="reveal-scale flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-foreground font-mono text-sm font-bold text-background motion-safe:transition-[translate] motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover/people:translate-x-[calc(var(--k)*8px)]"
          >
            {person.initial}
          </span>
        ))}
      </div>
      <span className="text-sm font-medium text-foreground/80">{label}</span>
    </div>
  );
}

/** Nube de herramientas locales con las que ya se integra. */
export function ChipsVisual({ chips }: { chips: string[] }) {
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <li
          key={chip}
          style={stagger(index)}
          className="reveal-scale rounded-full border border-foreground/15 px-3 py-1.5 font-mono text-xs text-foreground/80 transition-[translate,border-color] duration-200 hover:border-foreground/40 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

/**
 * Registro de consentimiento de ejemplo (Ley 1581): ilustra "conservar
 * constancia de lo que cada persona aceptó". Los datos son ficticios y así se
 * rotula en la página (`label`).
 */
export function ConsentMockup({ label, className }: { label: string; className?: string }) {
  const rows: [string, string, boolean?][] = [
    ["titular", '"usuario_8421"'],
    ["finalidad", '"contacto comercial"'],
    ["autorizado", "true", true],
    ["version_politica", '"2026-04"'],
    ["fecha", '"2026-10-06T14:32:08-05:00"'],
    ["ip", '"190.xxx.xxx.xx"'],
  ];
  return (
    <figure className={cn("overflow-hidden rounded-xl bg-foreground", className)}>
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-background/10 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-background/20" />
        <span className="h-2 w-2 rounded-full bg-background/20" />
        <span className="h-2 w-2 rounded-full bg-background/20" />
        <span className="ml-3 font-mono text-xs text-background/60">consent_log.json</span>
      </div>
      <pre aria-hidden="true" className="overflow-x-auto p-5 font-mono text-xs leading-relaxed sm:text-sm">
        <code>
          <span className="text-background/60">{"{"}</span>
          {rows.map(([key, value, highlight], index) => (
            <span key={key} className="reveal-left block pl-4" style={stagger(index)}>
              <span className="text-accent">{key}</span>
              <span className="text-background/60">: </span>
              <span className={highlight ? "text-accent" : "text-background/80"}>{value}</span>
              <span className="text-background/60">,</span>
            </span>
          ))}
          <span className="text-background/60">{"}"}</span>
        </code>
      </pre>
      <figcaption className="border-t border-background/10 px-5 py-3 text-xs text-background/70">{label}</figcaption>
    </figure>
  );
}
