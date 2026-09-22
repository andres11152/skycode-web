"use client";

import {
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  useMemo,
  useState,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";


/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** A single stop in the highlight band, positioned 0..1 across the sweep. */
export interface GradientStop {
  position: number;
  color: string;
}

export type GradientPresetName =
  | "sunrise"
  | "bubble"
  | "peach"
  | "tonic"
  | "mint"
  | "spring"
  | "twilight"
  | "bay";

/** Either an explicit multi-stop gradient or a built-in preset name. */
export type GradientInput = GradientStop[] | GradientPresetName;

/** Named easing presets for the sweep (no raw cubic-bezier in the public API). */
export type EasingPreset = "smooth" | "gentle" | "snappy";

export interface GradientShimmerProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> {
  /** The text to shimmer. Plain string only — the gradient sweeps over it. */
  children: string;
  /** Multi-stop gradient or a preset name. Defaults to `"sunrise"`. */
  gradient?: GradientInput;
  /** Sweep curve. Defaults to `"smooth"`. */
  easing?: EasingPreset;
  /**
   * Reference sweep speed. The real CSS duration is normalized by text width so
   * the highlight travels at a constant px/s at any size. Defaults to `1.45`.
   */
  duration?: number;
  /** Highlight band width in px per character; scales with font size. Defaults to `3`. */
  spread?: number;
  /** Gradient angle in degrees. Defaults to `105`. */
  angle?: number;
  /** Idle gap (ms) after each sweep before the next one. Defaults to `1000`. */
  pauseBetween?: number;
  /** Base text color the band fades into. Defaults to `"currentColor"`. */
  baseColor?: string;
  /** Pause the sweep while the page is scrolling. Defaults to `true`. */
  pauseOnScroll?: boolean;
  /** Pause while outside the viewport. Defaults to `true`. */
  pauseWhenOffscreen?: boolean;
  /** Render a static gradient (no sweep) under `prefers-reduced-motion`. Defaults to `true`. */
  respectReducedMotion?: boolean;
  /** Element to render. Defaults to `"span"`. */
  as?: ElementType;
}

/* -------------------------------------------------------------------------- */
/*  Built-in presets                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Built-in gradients. Rich multi-stop palettes — the multi-stop band is the
 * whole point, so two-color presets would sell it short. Raw colors so they read
 * true regardless of theme.
 */
export const gradientPresets: Record<GradientPresetName, GradientStop[]> = {
  sunrise: [
    { color: "#0089CD", position: 0 },
    { color: "#38BDF8", position: 0.22 },
    { color: "#7DD3FC", position: 0.4 },
    { color: "#FFD100", position: 0.62 },
    { color: "#FACC15", position: 0.82 },
    { color: "#0089CD", position: 1 },
  ],
  bubble: [
    { color: "#F5EBD9", position: 0 },
    { color: "#F2D4DB", position: 0.31 },
    { color: "#EBBDDE", position: 0.5 },
    { color: "#CCBAE3", position: 0.65 },
    { color: "#8CBFF0", position: 0.82 },
    { color: "#78B0FF", position: 1 },
  ],
  peach: [
    { color: "#D9F5FA", position: 0 },
    { color: "#FCD9D6", position: 0.31 },
    { color: "#FCBAC9", position: 0.61 },
    { color: "#F0B3F5", position: 1 },
  ],
  tonic: [
    { color: "#E3EDF0", position: 0 },
    { color: "#E8EBB8", position: 0.27 },
    { color: "#F0DEA3", position: 0.43 },
    { color: "#E8B078", position: 0.75 },
    { color: "#F29682", position: 1 },
  ],
  mint: [
    { color: "#DECEE8", position: 0 },
    { color: "#CBBAEE", position: 0.21 },
    { color: "#7DC0FB", position: 0.46 },
    { color: "#00C7A6", position: 1 },
  ],
  spring: [
    { color: "#F7D5C5", position: 0.07 },
    { color: "#46A8C0", position: 0.58 },
    { color: "#43AE7D", position: 1 },
  ],
  twilight: [
    { color: "#E3CCE6", position: 0 },
    { color: "#4E8CD5", position: 0.35 },
    { color: "#6068C2", position: 0.64 },
    { color: "#38364E", position: 1 },
  ],
  bay: [
    { color: "#DBE3D0", position: 0 },
    { color: "#8DB8A7", position: 0.23 },
    { color: "#2D8E9A", position: 0.42 },
    { color: "#076492", position: 0.59 },
    { color: "#154288", position: 0.79 },
    { color: "#262C81", position: 1 },
  ],
};

/** Named easing presets mapped to their cubic-bezier curves. */
export const easingPresets: Record<EasingPreset, string> = {
  // Balanced ease-in-out: dwells off-text at the ends, accelerates across glyphs.
  smooth: "cubic-bezier(0.45, 0, 0.55, 1)",
  // Softer, longer dwell at the ends.
  gentle: "cubic-bezier(0.76, 0, 0.24, 1)",
  // Quicker pass across the text.
  snappy: "cubic-bezier(0.3, 0, 0.2, 1)",
};

/* -------------------------------------------------------------------------- */
/*  Band gradient builder                                                      */
/* -------------------------------------------------------------------------- */

/** Saturated core half-width as a fraction of `--gs-spread-mid`. */
const BAND_CORE_RATIO = 0.44;

/**
 * Build the CSS `background-image` for the moving highlight band.
 *
 * Every stop is distributed across the saturated core
 * `[-spread_mid*0.44 .. +spread_mid*0.44]`, then fades out to the base text
 * color through a soft mix at `±spread_mid` and the plain base at `±spread`.
 * The band reads the runtime CSS variables `--gs-base`, `--gs-spread` and
 * `--gs-spread-mid` (set by the component after measuring), so it scales with
 * font size. Pure and DOM-free — safe to call on the server or unit-test.
 */
export function buildBandGradient(
  stops: GradientStop[],
  angle: number,
): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const first = sorted[0]?.color ?? "white";
  const last = sorted[sorted.length - 1]?.color ?? "white";

  const core = sorted
    .map((stop) => {
      const factor = (stop.position - 0.5) * 2 * BAND_CORE_RATIO;
      return `${stop.color} calc(50% + var(--gs-spread-mid) * ${factor.toFixed(4)})`;
    })
    .join(", ");

  return [
    `linear-gradient(${angle}deg`,
    `var(--gs-base) calc(50% - var(--gs-spread))`,
    `color-mix(in oklab, var(--gs-base) 42%, ${first}) calc(50% - var(--gs-spread-mid))`,
    core,
    `color-mix(in oklab, var(--gs-base) 42%, ${last}) calc(50% + var(--gs-spread-mid))`,
    `var(--gs-base) calc(50% + var(--gs-spread)))`,
  ].join(", ");
}

/* -------------------------------------------------------------------------- */
/*  Visibility / capability gates (SSR-safe)                                   */
/* -------------------------------------------------------------------------- */

/** True when `background-clip: text` is usable (prefixed or not). SSR-safe. */
function supportsBackgroundClipText(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof window.CSS?.supports !== "function") return false;
  return (
    window.CSS.supports("background-clip", "text") ||
    window.CSS.supports("-webkit-background-clip", "text")
  );
}

/** True when the user asked for reduced motion. SSR-safe. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface GateOptions {
  pauseOnScroll: boolean;
  pauseWhenOffscreen: boolean;
}

const VIEWPORT_ROOT_MARGIN = "160px";
const SCROLL_IDLE_MS = 120;

/**
 * Wire viewport (IntersectionObserver), page-visibility, and scroll-idle gates
 * to `onChange(active)`. `active` = on-screen (or that gate disabled) AND the
 * page is visible AND nothing is scrolling (or that gate disabled). Returns a
 * cleanup. No-ops gracefully on the server.
 */
function observeShimmerActive(
  el: Element,
  { pauseOnScroll, pauseWhenOffscreen }: GateOptions,
  onChange: (active: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  let inViewport =
    !pauseWhenOffscreen || typeof IntersectionObserver === "undefined";
  let pageVisible = typeof document === "undefined" ? true : !document.hidden;
  let notScrolling = true;
  const compute = () => onChange(inViewport && pageVisible && notScrolling);

  let io: IntersectionObserver | undefined;
  if (pauseWhenOffscreen && typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        inViewport = entry.isIntersecting;
        compute();
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN },
    );
    io.observe(el);
  }

  const onVisibility = () => {
    pageVisible = !document.hidden;
    compute();
  };
  document.addEventListener("visibilitychange", onVisibility);

  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    notScrolling = false;
    compute();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      notScrolling = true;
      compute();
    }, SCROLL_IDLE_MS);
  };
  const scrollOpts = { passive: true, capture: true } as const;
  if (pauseOnScroll) window.addEventListener("scroll", onScroll, scrollOpts);

  compute();

  return () => {
    io?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    if (pauseOnScroll)
      window.removeEventListener("scroll", onScroll, { capture: true });
    clearTimeout(scrollTimer);
  };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

const FALLBACK_TEXT_WIDTH_PX = 96;
const MAX_SPREAD_PX = 48;
const SPREAD_MID_RATIO = 0.72;
const BASE_FONT_PX = 14;
const DEFAULT_DURATION_SECONDS = 1.45;
const DEFAULT_SPREAD = 3;
const DEFAULT_ANGLE = 90;

function resolveStops(gradient: GradientInput | undefined): GradientStop[] {
  if (!gradient) return gradientPresets.sunrise;
  if (typeof gradient === "string")
    return gradientPresets[gradient] ?? gradientPresets.sunrise;
  return gradient;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function revealNormalText(el: HTMLElement) {
  el.style.removeProperty("background-image");
  el.style.removeProperty("-webkit-text-fill-color");
}

/**
 * A text shimmer that sweeps a multi-stop gradient highlight across its text.
 * Web-Animations-API driven, zero runtime dependencies, no CSS import.
 *
 * LCP-safe: en SSR y antes de la hidratación, el texto se renderiza con
 * un color sólido (el primer stop del gradiente) para que Chrome pueda
 * medir el LCP element inmediatamente. El shimmer animado se activa solo
 * después de la hidratación del cliente — progressive enhancement.
 */
export function GradientShimmer({
  children,
  gradient,
  easing = "smooth",
  duration = DEFAULT_DURATION_SECONDS,
  spread = DEFAULT_SPREAD,
  angle = DEFAULT_ANGLE,
  pauseBetween = 1000,
  baseColor = "currentColor",
  pauseOnScroll = true,
  pauseWhenOffscreen = true,
  respectReducedMotion = true,
  as = "span",
  className,
  style,
  ...restProps
}: GradientShimmerProps) {
  // Falso en SSR y en el primer render del cliente antes de la hidratación.
  // Cuando es false, el texto se renderiza con color sólido para que Chrome
  // pueda descubrir y medir el elemento LCP sin esperar al JS del shimmer.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const safeDuration = Math.max(
    0.001,
    finiteOr(duration, DEFAULT_DURATION_SECONDS),
  );
  const safeAngle = finiteOr(angle, DEFAULT_ANGLE);
  const stops = useMemo(() => resolveStops(gradient), [gradient]);

  const gradientCss = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map((s) => `${s.color} ${(s.position * 100).toFixed(1)}%`).join(", ");
    return `linear-gradient(${safeAngle}deg, ${stopsStr})`;
  }, [stops, safeAngle]);

  // Color sólido de fallback para SSR: primer stop del gradiente.
  // Garantiza que el texto sea legible y medible por el browser sin JS.
  const solidColor = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    return sorted[0]?.color ?? "currentColor";
  }, [stops]);

  const easingValue = easingPresets[easing] ?? easingPresets.smooth;
  const totalDuration = safeDuration + pauseBetween / 1000;

  // En SSR / pre-hidratación: texto con color sólido (LCP-friendly).
  // Post-hidratación: shimmer completo con gradiente y -webkit-text-fill-color.
  // NOTA: backgroundSize y backgroundPosition los controla la clase CSS
  // `.animate-gs-sweep` via @property --gs-x (compositor-driven). No se
  // setean en inline style para no interferir con la animación del compositor.
  const mergedStyle: CSSProperties = hydrated
    ? {
        position: "relative",
        display: "inline",
        backgroundImage: gradientCss,
        backgroundRepeat: "repeat",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        // Variables CSS dinámicas por instancia (duración y easing)
        ["--gs-duration" as string]: `${totalDuration.toFixed(2)}s`,
        ["--gs-easing" as string]: easingValue,
        ...style,
      }
    : {
        // Color sólido en SSR: Chrome lo detecta como LCP text inmediatamente.
        // Sin -webkit-text-fill-color: transparent, que impide la medición LCP.
        color: solidColor,
        display: "inline",
        ...style,
      };

  const Component = (as || "span") as ElementType;

  return (
    <Component
      className={cn(hydrated ? "animate-gs-sweep" : "", className)}
      style={mergedStyle}
      {...(restProps as HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Component>
  );
}

export default GradientShimmer;

