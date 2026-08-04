import { describe, expect, it } from "vitest";
import { isRateLimited } from "./rateLimit";

describe("isRateLimited", () => {
  it("allows requests under the limit and blocks once it's reached", () => {
    const key = "test:under-limit";
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("tracks separate buckets per key", () => {
    isRateLimited("test:bucket-a", 1, 60_000);
    expect(isRateLimited("test:bucket-b", 1, 60_000)).toBe(false);
  });
});
