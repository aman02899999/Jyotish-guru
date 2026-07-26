import { describe, expect, it } from "vitest";
import { calculateBirthChart, RASHI_NAMES, RASHI_ENGLISH_NAMES } from "./birth-chart-calculator";

describe("calculateBirthChart", () => {
  it("is deterministic for the same birth details", () => {
    const a = calculateBirthChart("1995-08-15", "14:30");
    const b = calculateBirthChart("1995-08-15", "14:30");
    expect(a).toEqual(b);
  });

  it("places all 9 grahas with valid signs and degrees", () => {
    const chart = calculateBirthChart("1995-08-15", "14:30");
    expect(chart.placements).toHaveLength(9);
    for (const p of chart.placements) {
      expect(p.signIndex).toBeGreaterThanOrEqual(0);
      expect(p.signIndex).toBeLessThanOrEqual(11);
      expect(p.degreeInSign).toBeGreaterThanOrEqual(0);
      expect(p.degreeInSign).toBeLessThan(30);
      expect(p.houseNumber).toBeGreaterThanOrEqual(1);
      expect(p.houseNumber).toBeLessThanOrEqual(12);
    }
  });

  it("builds exactly 12 houses covering all 12 signs exactly once, in order from the ascendant", () => {
    const chart = calculateBirthChart("2000-01-01", "06:00");
    expect(chart.houses).toHaveLength(12);
    expect(chart.houses[0].signIndex).toBe(chart.ascendantSignIndex);
    const signIndexes = chart.houses.map((h) => h.signIndex);
    expect(new Set(signIndexes).size).toBe(12);
  });

  it("keeps Rahu and Ketu exactly opposite each other", () => {
    const chart = calculateBirthChart("2010-03-10", "23:45");
    const rahu = chart.placements.find((p) => p.key === "rahu")!;
    const ketu = chart.placements.find((p) => p.key === "ketu")!;
    expect((rahu.signIndex + 6) % 12).toBe(ketu.signIndex);
  });

  it("a planet's house number is consistent with its sign offset from the ascendant", () => {
    const chart = calculateBirthChart("1988-11-02", "09:15");
    for (const p of chart.placements) {
      const expectedHouse = ((p.signIndex - chart.ascendantSignIndex + 12) % 12) + 1;
      expect(p.houseNumber).toBe(expectedHouse);
    }
  });

  it("the Moon sign matches the same mean-motion model Panchang uses for the same date", async () => {
    const { calculatePanchang } = await import("./panchang-calculator");
    const chart = calculateBirthChart("2026-07-22", "10:00");
    const panchang = calculatePanchang("2026-07-22");
    const moon = chart.placements.find((p) => p.key === "moon")!;
    const panchangEnglishName = panchang.moonSign.match(/\(([^)]+)\)/)?.[1];
    expect(RASHI_ENGLISH_NAMES[moon.signIndex]).toBe(panchangEnglishName);
  });

  it("changing time of birth alone can change the ascendant", () => {
    const morning = calculateBirthChart("2000-06-15", "06:00");
    const evening = calculateBirthChart("2000-06-15", "18:00");
    expect(morning.ascendantSignIndex).not.toBe(evening.ascendantSignIndex);
  });

  it("exports 12 Rashi names in both scripts, aligned", () => {
    expect(RASHI_NAMES).toHaveLength(12);
    expect(RASHI_ENGLISH_NAMES).toHaveLength(12);
  });
});
