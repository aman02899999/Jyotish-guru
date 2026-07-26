import { describe, expect, it } from "vitest";
import { findMuhuratWindow, ACTIVITY_TYPES } from "./muhurat-calculator";

describe("findMuhuratWindow", () => {
  it("returns exactly the requested number of days, sequential from the start date", () => {
    const days = findMuhuratWindow("2026-01-01", 7);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-01-01");
    expect(days[6].date).toBe("2026-01-07");
  });

  it("is deterministic", () => {
    const a = findMuhuratWindow("2026-03-10", 5);
    const b = findMuhuratWindow("2026-03-10", 5);
    expect(a).toEqual(b);
  });

  it("assigns every day a valid rating and non-empty reason", () => {
    const days = findMuhuratWindow("2026-06-01", 30);
    const validRatings = new Set(["Highly Auspicious", "Auspicious", "Use Caution"]);
    for (const day of days) {
      expect(validRatings.has(day.rating)).toBe(true);
      expect(day.reason.length).toBeGreaterThan(0);
      expect(day.tithiCategory.length).toBeGreaterThan(0);
    }
  });

  it("flags Amavasya days as Use Caution", () => {
    const days = findMuhuratWindow("2026-01-01", 40);
    const amavasyaDays = days.filter((d) => d.panchang.tithi.includes("Amavasya"));
    expect(amavasyaDays.length).toBeGreaterThan(0);
    for (const day of amavasyaDays) {
      expect(day.rating).toBe("Use Caution");
    }
  });

  it("flags Purnima days as Highly Auspicious", () => {
    const days = findMuhuratWindow("2026-01-01", 40);
    const purnimaDays = days.filter((d) => d.panchang.tithi.includes("Purnima"));
    expect(purnimaDays.length).toBeGreaterThan(0);
    for (const day of purnimaDays) {
      expect(day.rating).toBe("Highly Auspicious");
    }
  });

  it("exposes a non-empty list of activity types with unique ids", () => {
    expect(ACTIVITY_TYPES.length).toBeGreaterThan(0);
    const ids = ACTIVITY_TYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
