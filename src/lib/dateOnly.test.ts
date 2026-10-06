import { describe, expect, it } from "vitest";
import { daysBetweenDates, isBeforeToday, todayBogota } from "./dateOnly";

describe("dateOnly (Bogotá)", () => {
  it("a las 23:00 UTC del 6 de oct todavía es 6 de oct en Bogotá (18:00)", () => {
    expect(todayBogota(new Date("2026-10-06T23:00:00Z"))).toBe("2026-10-06");
  });
  it("a las 03:00 UTC del 7 sigue siendo 6 en Bogotá (22:00)", () => {
    expect(todayBogota(new Date("2026-10-07T03:00:00Z"))).toBe("2026-10-06");
  });
  it("una factura que vence hoy NO está vencida aunque en UTC ya sea mañana", () => {
    expect(isBeforeToday("2026-10-06", new Date("2026-10-07T03:00:00Z"))).toBe(false);
    expect(isBeforeToday("2026-10-05", new Date("2026-10-07T03:00:00Z"))).toBe(true);
  });
  it("calcula días entre fechas", () => {
    expect(daysBetweenDates("2026-10-01", "2026-10-06")).toBe(5);
    expect(daysBetweenDates("2026-10-06", "2026-10-06")).toBe(0);
  });
});
