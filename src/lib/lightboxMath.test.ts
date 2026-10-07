import { describe, expect, it } from "vitest";
import {
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  clampPan,
  clampScale,
  isDoubleTap,
  resolveSwipe,
  wrapIndex,
  zoomAtPoint,
} from "./lightboxMath";

const SIZE = { width: 1000, height: 600 };

describe("clampScale / clampPan", () => {
  it("limita la escala entre 1 y el máximo", () => {
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(9)).toBe(MAX_SCALE);
    expect(clampScale(2)).toBe(2);
  });

  it("sin zoom no permite paneo; con zoom solo lo que sobra a cada lado", () => {
    expect(clampPan(50, 50, 1, SIZE)).toEqual({ x: 0, y: 0 });
    expect(clampPan(9999, -9999, 2, SIZE)).toEqual({ x: 500, y: -300 });
    expect(clampPan(120, -40, 2, SIZE)).toEqual({ x: 120, y: -40 });
  });
});

describe("zoomAtPoint", () => {
  it("al acercar en el centro no hay traslación", () => {
    const next = zoomAtPoint({ scale: 1, x: 0, y: 0 }, DOUBLE_TAP_SCALE, { x: 0, y: 0 }, SIZE);
    expect(next).toEqual({ scale: DOUBLE_TAP_SCALE, x: 0, y: 0 });
  });

  it("mantiene fijo el punto del contenido bajo el cursor", () => {
    const start = { scale: 1, x: 0, y: 0 };
    const point = { x: 200, y: -100 };
    const next = zoomAtPoint(start, 2, point, SIZE);
    // El punto del contenido bajo `point` antes: (point - t) / s. Después debe ser el mismo.
    const before = { x: (point.x - start.x) / start.scale, y: (point.y - start.y) / start.scale };
    const after = { x: (point.x - next.x) / next.scale, y: (point.y - next.y) / next.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("nunca deja el contenido fuera del lienzo al acercar cerca de un borde", () => {
    const next = zoomAtPoint({ scale: 1, x: 0, y: 0 }, 2, { x: 490, y: 290 }, SIZE);
    expect(Math.abs(next.x)).toBeLessThanOrEqual(500);
    expect(Math.abs(next.y)).toBeLessThanOrEqual(300);
  });

  it("volver a escala 1 recentra", () => {
    const next = zoomAtPoint({ scale: 2.5, x: 300, y: 120 }, 1, { x: 0, y: 0 }, SIZE);
    expect(next).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("no pasa del máximo", () => {
    expect(zoomAtPoint({ scale: 3.5, x: 0, y: 0 }, 99, { x: 0, y: 0 }, SIZE).scale).toBe(MAX_SCALE);
  });
});

describe("wrapIndex", () => {
  it("da la vuelta en ambos extremos", () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(3, 5)).toBe(3);
    expect(wrapIndex(2, 0)).toBe(0);
  });
});

describe("resolveSwipe", () => {
  it("horizontal largo cambia de imagen en la dirección contraria al dedo", () => {
    expect(resolveSwipe({ dx: -90, dy: 10, vx: 0, vy: 0 })).toBe("next");
    expect(resolveSwipe({ dx: 90, dy: 10, vx: 0, vy: 0 })).toBe("prev");
  });

  it("un latigazo corto pero rápido también cuenta", () => {
    expect(resolveSwipe({ dx: -25, dy: 0, vx: -0.8, vy: 0 })).toBe("next");
  });

  it("un arrastre corto y lento no hace nada", () => {
    expect(resolveSwipe({ dx: 30, dy: 5, vx: 0.1, vy: 0 })).toBe("none");
  });

  it("hacia abajo cierra, hacia arriba no", () => {
    expect(resolveSwipe({ dx: 5, dy: 150, vx: 0, vy: 0 })).toBe("close");
    expect(resolveSwipe({ dx: 5, dy: -150, vx: 0, vy: -1 })).toBe("none");
  });

  it("un gesto mayormente vertical no cambia de imagen aunque tenga algo de horizontal", () => {
    expect(resolveSwipe({ dx: 70, dy: 160, vx: 0, vy: 0 })).toBe("close");
  });
});

describe("isDoubleTap", () => {
  it("exige dos toques cercanos en tiempo y espacio", () => {
    const first = { t: 1000, x: 100, y: 100 };
    expect(isDoubleTap(null, first)).toBe(false);
    expect(isDoubleTap(first, { t: 1200, x: 110, y: 105 })).toBe(true);
    expect(isDoubleTap(first, { t: 1500, x: 100, y: 100 })).toBe(false);
    expect(isDoubleTap(first, { t: 1200, x: 300, y: 100 })).toBe(false);
  });
});
