"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function CustomCursor() {
  const reduced = Boolean(useReducedMotion());
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState<string | null>(null);

  // Mouse Coordinates
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // High Precision Spring Physics for smooth trailing ring
  const springConfig = { damping: 30, stiffness: 400, mass: 0.4 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Only enable on non-touch devices with fine pointer
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

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

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.body.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY, isVisible]);

  if (reduced || !isVisible) return null;

  return (
    // z-[80]: por encima de todo lo demás en la escala (Modal en z-[70] es lo más alto
    // hasta ahora) — un cursor reemplazado nunca debe quedar oculto detrás de un modal.
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden hidden md:block">
      {/* Precision Center Dot */}
      <motion.div
        style={{
          x: mouseX,
          y: mouseY,
        }}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[80]"
      >
        <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_#0089CD]" />
      </motion.div>

      {/* Trailing Ring & Glassmorphism Badge */}
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
        }}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[75]"
      >
        <motion.div
          animate={{
            scale: cursorText ? 1 : isHovered ? 1.6 : 1,
            width: cursorText ? "auto" : isHovered ? "36px" : "28px",
            height: cursorText ? "auto" : isHovered ? "36px" : "28px",
          }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className={`flex items-center justify-center rounded-full transition-all ${
            cursorText
              ? "px-3.5 py-1.5 bg-background/90 text-foreground border border-accent/40 shadow-[0_8px_25px_rgba(0,137,205,0.25)] backdrop-blur-md"
              : isHovered
                ? "bg-accent/15 border border-accent/60 backdrop-blur-[2px] shadow-[0_0_15px_rgba(0,137,205,0.2)]"
                : "border border-foreground/30 bg-foreground/5 backdrop-blur-[1px]"
          }`}
        >
          {cursorText ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-widest text-accent uppercase"
            >
              <span>{cursorText}</span>
              <ArrowUpRight size={12} className="text-accent stroke-[2.5]" />
            </motion.div>
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
}
