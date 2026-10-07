// Matemática pura del visor de imágenes (zoom, paneo y gestos). Sin DOM ni
// React para poder probarla: el componente solo traduce eventos de puntero a
// estas funciones y aplica el resultado a sus valores de movimiento.

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Nivel al que salta el doble toque/clic y el botón de zoom. */
export const DOUBLE_TAP_SCALE = 2.5;
/** Por debajo de esto se considera "sin zoom" (el pellizco nunca cae exactamente en 1). */
export const ZOOM_EPSILON = 1.05;

export interface Size {
  width: number;
  height: number;
}

/** Transformación del contenido: traslación (px) y escala, con origen en el centro del lienzo. */
export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** El contenido ampliado solo puede desplazarse lo que sobra a cada lado del lienzo. */
export function clampPan(x: number, y: number, scale: number, size: Size): { x: number; y: number } {
  const maxX = (size.width * (scale - 1)) / 2;
  const maxY = (size.height * (scale - 1)) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

/**
 * Cambia la escala manteniendo fijo el punto bajo el dedo o el cursor.
 * `point` va relativo al CENTRO del lienzo (así es el origen de la transformación):
 * el punto del contenido bajo `point` es (point - t) / s, y debe seguir bajo `point`
 * tras el cambio, de donde t' = point - (point - t) * s' / s.
 */
export function zoomAtPoint(current: Transform, nextScale: number, point: { x: number; y: number }, size: Size): Transform {
  const scale = clampScale(nextScale);
  const ratio = scale / current.scale;
  const pan = clampPan(point.x - (point.x - current.x) * ratio, point.y - (point.y - current.y) * ratio, scale, size);
  return { scale, ...pan };
}

export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export type SwipeIntent = "next" | "prev" | "close" | "none";

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.5; // px/ms
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.6;

/**
 * Decide qué significa un gesto de un dedo sin zoom: horizontal cambia de imagen
 * (por distancia o por velocidad: un latigazo corto también cuenta), un arrastre
 * hacia abajo cierra. Arrastrar hacia arriba no hace nada.
 */
export function resolveSwipe(gesture: { dx: number; dy: number; vx: number; vy: number }): SwipeIntent {
  const { dx, dy, vx, vy } = gesture;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dx) >= SWIPE_DISTANCE || Math.abs(vx) >= SWIPE_VELOCITY) return dx < 0 ? "next" : "prev";
    return "none";
  }
  if (dy > 0 && (dy >= CLOSE_DISTANCE || vy >= CLOSE_VELOCITY)) return "close";
  return "none";
}

/** Dos toques seguidos, cerca en el tiempo y en el espacio. */
export function isDoubleTap(
  previous: { t: number; x: number; y: number } | null,
  current: { t: number; x: number; y: number },
): boolean {
  if (!previous) return false;
  return current.t - previous.t <= 320 && Math.hypot(current.x - previous.x, current.y - previous.y) <= 40;
}
