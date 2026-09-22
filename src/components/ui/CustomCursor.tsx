"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState<string | null>(null);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable on non-touch devices with fine pointer
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }

      setIsVisible((prev) => {
        if (!prev) return true;
        return prev;
      });

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest("[data-cursor]") as HTMLElement | null;
      if (cursorTarget) {
        const type = cursorTarget.getAttribute("data-cursor");
        const customText = cursorTarget.getAttribute("data-cursor-text");
        setCursorText(customText || (type === "project" ? "EXPLORAR" : null));
        setIsHovered(true);
      } else if (target.closest("button, a, input, select, textarea, [role='button']")) {
        setCursorText(null);
        setIsHovered(true);
      } else {
        setCursorText(null);
        setIsHovered(false);
      }
    };

    const loop = () => {
      // Smooth lerp trailing ring
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.body.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    // z-[80]: por encima de todo lo demás en la escala — un cursor nunca debe quedar oculto.
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden hidden md:block">
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[80] will-change-transform"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_#0089CD]" />
      </div>

      {/* Trailing Ring & Glassmorphism Badge */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[75] will-change-transform"
      >
        <div
          className={`flex items-center justify-center rounded-full transition-all duration-200 ${
            cursorText
              ? "px-3.5 py-1.5 bg-background/90 text-foreground border border-accent/40 shadow-[0_8px_25px_rgba(0,137,205,0.25)] backdrop-blur-md"
              : isHovered
                ? "h-8 w-8 bg-accent/5 border border-accent/40 shadow-[0_0_10px_rgba(0,137,205,0.15)] scale-110"
                : "h-6 w-6 border border-foreground/20 bg-transparent"
          }`}
        >
          {cursorText ? (
            <div className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-widest text-accent-strong uppercase animate-in fade-in zoom-in-95 duration-150">
              <span>{cursorText}</span>
              <ArrowUpRight size={12} className="text-accent stroke-[2.5]" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
