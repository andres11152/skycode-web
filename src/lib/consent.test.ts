import { describe, expect, it } from "vitest";
import {
  CONSENT_ALL,
  CONSENT_DENIED,
  CONSENT_VERSION,
  buildConsentRecord,
  isCategoryAllowed,
  parseConsentRecord,
} from "./consent";

describe("consent", () => {
  it("round-trips a record and always keeps necessary on", () => {
    const record = buildConsentRecord(CONSENT_ALL, new Date("2026-10-02T10:00:00Z"));
    const parsed = parseConsentRecord(JSON.stringify(record));
    expect(parsed).toEqual(record);
    expect(parsed?.necessary).toBe(true);
  });

  it("treats missing, corrupt or non-object values as no decision", () => {
    expect(parseConsentRecord(null)).toBeNull();
    expect(parseConsentRecord("")).toBeNull();
    expect(parseConsentRecord("{not json")).toBeNull();
    expect(parseConsentRecord("42")).toBeNull();
    expect(parseConsentRecord("null")).toBeNull();
  });

  it("asks again when the policy version changes", () => {
    const stale = { ...buildConsentRecord(CONSENT_ALL), version: CONSENT_VERSION - 1 };
    expect(parseConsentRecord(JSON.stringify(stale))).toBeNull();
  });

  it("never reads a tampered record as accepted", () => {
    const record = buildConsentRecord(CONSENT_ALL);
    expect(parseConsentRecord(JSON.stringify({ ...record, measurement: "yes" }))).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ ...record, decidedAt: "ayer" }))).toBeNull();
    // `necessary: false` manipulado se ignora: siempre queda en true.
    expect(parseConsentRecord(JSON.stringify({ ...record, necessary: false }))?.necessary).toBe(true);
  });

  it("only allows a category with an explicit, current opt-in", () => {
    expect(isCategoryAllowed(null, "measurement")).toBe(false);
    expect(isCategoryAllowed(buildConsentRecord(CONSENT_DENIED), "measurement")).toBe(false);
    expect(isCategoryAllowed(buildConsentRecord(CONSENT_ALL), "measurement")).toBe(true);
    expect(
      isCategoryAllowed(buildConsentRecord({ preferences: true, measurement: false }), "preferences"),
    ).toBe(true);
  });
});
