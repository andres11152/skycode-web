"use client";

import { useRef } from "react";
import NumberFlow, { type Format } from "@number-flow/react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  initialValue?: number;
  prefix?: string;
  suffix?: string;
  format?: Format;
  className?: string;
}

export function NumberTicker({
  value,
  initialValue = 0,
  prefix,
  suffix,
  format,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  // Estado derivado: se calcula en el render, no con useState + useEffect.
  // Ese patrón dispara `react-hooks/set-state-in-effect` y acá además era
  // innecesario — el valor solo depende de props y de `isInView`, que con
  // `once: true` nunca vuelve a false. `NumberFlow` anima la transición
  // cuando `value` cambia, así que no hace falta guardarlo en estado.
  const currentValue = reduced || isInView ? value : initialValue;

  return (
    <span ref={ref} className={cn("inline-flex items-baseline font-mono tracking-tight", className)}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <NumberFlow
        value={currentValue}
        format={format}
        willChange
        transformTiming={{ duration: 750, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        spinTiming={{ duration: 750, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        opacityTiming={{ duration: 350, easing: "ease-out" }}
      />
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}
