"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GridPatternProps extends ComponentPropsWithoutRef<"svg"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

type Square = {
  id: number;
  pos: [number, number];
  iteration: number;
};

function randomPos(width: number, height: number, cellW: number, cellH: number): [number, number] {
  return [Math.floor((Math.random() * width) / cellW), Math.floor((Math.random() * height) / cellH)];
}

export function GridPattern({
  width = 48,
  height = 48,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 26,
  className,
  maxOpacity = 0.35,
  duration = 3.5,
  repeatDelay = 0.5,
  ...props
}: GridPatternProps) {
  const id = useId();
  const reduced = Boolean(useReducedMotion());
  const containerRef = useRef<SVGSVGElement | null>(null);
  const measuredRef = useRef({ width: 0, height: 0 });
  const [squares, setSquares] = useState<Square[]>([]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || reduced) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = entry.contentRect.width;
      const nextHeight = entry.contentRect.height;
      if (measuredRef.current.width === nextWidth && measuredRef.current.height === nextHeight) {
        return;
      }
      measuredRef.current = { width: nextWidth, height: nextHeight };
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSquares(
          Array.from({ length: numSquares }, (_, i) => ({
            id: i,
            pos: randomPos(nextWidth, nextHeight, width, height),
            iteration: 0,
          })),
        );
      }, 60);
    });

    resizeObserver.observe(element);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [reduced, numSquares, width, height]);

  function updateSquarePosition(squareId: number) {
    const { width: w, height: h } = measuredRef.current;
    setSquares((current) => {
      const square = current[squareId];
      if (!square || square.id !== squareId) return current;
      const next = current.slice();
      next[squareId] = { ...square, pos: randomPos(w, h, width, height), iteration: square.iteration + 1 };
      return next;
    });
  }

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-accent/40 stroke-foreground/[0.07]",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {!reduced && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(({ pos: [squareX, squareY], id: squareId, iteration }, index) => (
            <motion.rect
              key={`${squareId}-${iteration}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: maxOpacity }}
              transition={{
                duration,
                repeat: 1,
                delay: index * 0.12,
                repeatType: "reverse",
                repeatDelay,
              }}
              onAnimationComplete={() => updateSquarePosition(squareId)}
              width={width - 1}
              height={height - 1}
              x={squareX * width + 1}
              y={squareY * height + 1}
              fill="var(--accent)"
              fillOpacity={0.4}
              strokeWidth={0}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
