import { beforeEach, describe, expect, it } from "vitest";
import { resetLoadShedForTests, shouldShed } from "./loadShed";

const OPTIONS = { capacity: 3, refillPerSecond: 1 };

beforeEach(() => resetLoadShedForTests());

describe("shouldShed", () => {
  it("deja pasar hasta la capacidad y descarta lo que sigue", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => shouldShed("ip-a", OPTIONS, t))).toEqual([false, false, false]);
    expect(shouldShed("ip-a", OPTIONS, t)).toBe(true);
  });

  it("repone tokens con el tiempo", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) shouldShed("ip-a", OPTIONS, t);
    expect(shouldShed("ip-a", OPTIONS, t)).toBe(true);
    expect(shouldShed("ip-a", OPTIONS, t + 1_100)).toBe(false);
  });

  it("no cuenta más tokens que la capacidad aunque pase mucho tiempo", () => {
    const t = 1_000_000;
    shouldShed("ip-a", OPTIONS, t);
    const later = t + 3_600_000;
    expect([1, 2, 3].map(() => shouldShed("ip-a", OPTIONS, later))).toEqual([false, false, false]);
    expect(shouldShed("ip-a", OPTIONS, later)).toBe(true);
  });

  it("cada IP tiene su propio bucket", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) shouldShed("ip-a", OPTIONS, t);
    expect(shouldShed("ip-a", OPTIONS, t)).toBe(true);
    expect(shouldShed("ip-b", OPTIONS, t)).toBe(false);
  });
});
