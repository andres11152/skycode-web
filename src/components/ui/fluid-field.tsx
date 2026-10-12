"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { readAppliedTheme, subscribeAppliedTheme } from "@/lib/themeStore";

// Fondo global del sitio público (claro y oscuro): el shader de fluido (ruido simplex) de threeui / Aura UI, reescrito en WebGL
// plano. El original se montaba en un <iframe> que descargaba three.js, GSAP, Iconify y el runtime de
// Tailwind desde CDNs externos (cientos de KB en la ruta crítica de cada visita y bloqueado por la CSP
// del sitio). Aquí el mismo shader pesa ~2 KB, sin dependencias.
//  - Dos paletas con el mismo movimiento: en oscuro, ondas azules sobre casi negro; en claro, ondas
//    azules sobre blanco (`u_light`). El tema se lee con `readAppliedTheme` y cambia sin recrear WebGL.
//  - Paleta: el azul de marca (acento y acento fuerte). El original mezclaba con violeta, prohibido
//    en este proyecto.
//  - Rinde a media resolución (es un campo difuso), se pausa con la pestaña oculta y con
//    prefers-reduced-motion dibuja un solo cuadro.
//  - Arranca tras `load` y en reposo del hilo principal, para no competir con el LCP.

const VERTEX_SOURCE = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAGMENT_SOURCE = `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_light;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv.x *= u_resolution.x / u_resolution.y;

  // Casi el negro del tema; el brillo se suma encima.
  vec3 baseColor = vec3(0.025, 0.025, 0.03);
  vec2 st = uv * 0.7;
  st += vec2(snoise(st + u_time * 0.05), snoise(st - u_time * 0.05)) * 0.3;

  float beam = smoothstep(0.1, 0.8, snoise(vec2(st.x + st.y * 1.5 - u_time * 0.15, u_time * 0.02)));
  // Acento y acento fuerte de marca en el espacio 0 a 1 (GLSL no lee variables CSS).
  vec3 glow = mix(vec3(0.0, 0.537, 0.804), vec3(0.0, 0.412, 0.596), snoise(uv * 1.5 + u_time * 0.1) * 0.5 + 0.5);

  vec3 darkColor = baseColor + glow * beam * 0.62;
  // En claro las mismas ondas tiñen el blanco hacia el azul de marca.
  vec3 lightColor = mix(vec3(1.0), glow, beam * 0.3);
  gl_FragColor = vec4(mix(darkColor, lightColor, u_light), 1.0);
}`;

/** Fracción de la resolución real a la que se dibuja: el campo es difuso y el canvas se estira por CSS. */
const RENDER_SCALE = 0.5;
const START_DELAY_MS = 600;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function FluidCanvas({ theme, className }: { theme: "light" | "dark"; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  // El tema viaja por ref y por `applyTheme`: cambiarlo no recrea el contexto WebGL ni repite la espera de arranque.
  const themeRef = useRef(theme);
  const applyThemeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    themeRef.current = theme;
    applyThemeRef.current?.();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let frame = 0;
    let startTimer = 0;
    let idleHandle = 0;
    let teardown: (() => void) | null = null;

    const start = () => {
      if (cancelled) return;
      const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
      if (!gl) return; // sin WebGL queda el fondo liso del tema
      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
      const program = gl.createProgram();
      if (!vertex || !fragment || !program) return;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(program, "u_time");
      const uResolution = gl.getUniformLocation(program, "u_resolution");
      const uLight = gl.getUniformLocation(program, "u_light");
      const origin = performance.now();

      const draw = (now: number) => {
        gl.uniform1f(uTime, (now - origin) / 1000);
        gl.uniform1f(uLight, themeRef.current === "light" ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const resize = () => {
        canvas.width = Math.max(1, Math.round(canvas.clientWidth * RENDER_SCALE));
        canvas.height = Math.max(1, Math.round(canvas.clientHeight * RENDER_SCALE));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        draw(performance.now()); // sin esto, redimensionar deja un cuadro en blanco hasta el siguiente tick
      };
      const tick = (now: number) => {
        if (cancelled) return;
        if (!document.hidden) draw(now);
        frame = requestAnimationFrame(tick);
      };

      resize();
      applyThemeRef.current = () => draw(performance.now()); // con reduced motion no hay bucle que lo recoja
      window.addEventListener("resize", resize);
      if (!reduced) frame = requestAnimationFrame(tick);
      setReady(true);

      teardown = () => {
        applyThemeRef.current = null;
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frame);
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        gl.deleteBuffer(buffer);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    };

    const schedule = () => {
      startTimer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) idleHandle = window.requestIdleCallback(start, { timeout: 2000 });
        else start();
      }, START_DELAY_MS);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      window.clearTimeout(startTimer);
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      teardown?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 h-full w-full transition-opacity duration-1000 print:hidden",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

/** Fondo fluido del sitio público: ondas azules sobre blanco (claro) o sobre casi negro (oscuro). */
function FluidFieldBackground({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeAppliedTheme, readAppliedTheme, () => "light" as const);
  return <FluidCanvas theme={theme} className={className} />;
}

export default FluidFieldBackground;
