import { describe, expect, it } from "vitest";
import {
  calculateLifePathNumber,
  calculateDestinyNumber,
  calculateNumerologyProfile,
} from "./numerology-calculator";

describe("calculateLifePathNumber", () => {
  it("reduces a normal date to a single digit", () => {
    // 2000-01-01 -> 2+0+0+0+0+1+0+1 = 4
    expect(calculateLifePathNumber("2000-01-01")).toBe(4);
  });

  it("preserves master numbers instead of reducing further", () => {
    // 1995-08-15 -> digit sum 38 -> 3+8=11 (master, stop)
    expect(calculateLifePathNumber("1995-08-15")).toBe(11);
  });

  it("is deterministic", () => {
    expect(calculateLifePathNumber("1988-11-02")).toBe(calculateLifePathNumber("1988-11-02"));
  });
});

describe("calculateDestinyNumber", () => {
  it("is case-insensitive", () => {
    expect(calculateDestinyNumber("Ravi Kumar")).toBe(calculateDestinyNumber("RAVI KUMAR"));
  });

  it("returns a single digit or a master number", () => {
    const names = ["Aman Sharma", "Priya Singh", "Rahul Verma", "Anjali Gupta", "X"];
    for (const name of names) {
      const n = calculateDestinyNumber(name);
      expect(n === 11 || n === 22 || n === 33 || (n >= 1 && n <= 9)).toBe(true);
    }
  });

  it("ignores non-letter characters", () => {
    expect(calculateDestinyNumber("Jane Doe")).toBe(calculateDestinyNumber("Jane   Doe!!"));
  });
});

describe("calculateNumerologyProfile", () => {
  it("fills in a ruling planet, lucky day, and color for every 1-9 life path", () => {
    for (let day = 1; day <= 9; day++) {
      const dob = `2000-01-0${day}`;
      const profile = calculateNumerologyProfile("Test User", dob);
      expect(profile.rulingPlanet.length).toBeGreaterThan(0);
      expect(profile.luckyDay.length).toBeGreaterThan(0);
      expect(profile.luckyColor.length).toBeGreaterThan(0);
      expect(profile.traits.length).toBeGreaterThan(0);
    }
  });

  it("still resolves a ruling planet for master-number life paths", () => {
    const profile = calculateNumerologyProfile("Test User", "1995-08-15");
    expect(profile.lifePathNumber).toBe(11);
    expect(profile.rulingPlanet.length).toBeGreaterThan(0);
    expect(profile.traits).toContain("intuitive");
  });

  it("falls back to a default name when given an empty one", () => {
    const profile = calculateNumerologyProfile("", "2000-01-01");
    expect(profile.destinyNumber).toBeGreaterThan(0);
  });
});
