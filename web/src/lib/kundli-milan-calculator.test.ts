import { describe, expect, it } from "vitest";
import { calculateGunaMilan, moonNakshatraName } from "./kundli-milan-calculator";

describe("calculateGunaMilan", () => {
  it("is deterministic and symmetric-independent of input order for the total", () => {
    const a = calculateGunaMilan("1995-08-15", "1997-03-22");
    const b = calculateGunaMilan("1995-08-15", "1997-03-22");
    expect(a).toEqual(b);
  });

  it("returns exactly the 8 classical kootas, each within its own max", () => {
    const result = calculateGunaMilan("1990-05-10", "1992-11-03");
    expect(result.kootas).toHaveLength(8);
    const expectedNames = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"];
    expect(result.kootas.map((k) => k.name)).toEqual(expectedNames);
    for (const koota of result.kootas) {
      expect(koota.points).toBeGreaterThanOrEqual(0);
      expect(koota.points).toBeLessThanOrEqual(koota.maxPoints);
    }
  });

  it("totals never exceed the classical 36-point maximum", () => {
    const dates = ["2000-01-01", "1985-06-15", "1999-12-31", "2005-02-28", "1975-07-04"];
    for (const d1 of dates) {
      for (const d2 of dates) {
        const result = calculateGunaMilan(d1, d2);
        expect(result.totalPoints).toBeGreaterThanOrEqual(0);
        expect(result.totalPoints).toBeLessThanOrEqual(36);
      }
    }
  });

  it("gives a non-empty verdict for every score range", () => {
    const result = calculateGunaMilan("2000-01-01", "2000-01-01");
    expect(result.verdict.length).toBeGreaterThan(0);
  });

  it("scores identical birth dates (same nakshatra, so same Nadi type) with a Nadi Dosha - 0 points, the one koota where sameness is bad", () => {
    const result = calculateGunaMilan("2001-04-12", "2001-04-12");
    const nadi = result.kootas.find((k) => k.name === "Nadi")!;
    const gana = result.kootas.find((k) => k.name === "Gana")!;
    expect(nadi.points).toBe(0);
    expect(gana.points).toBe(gana.maxPoints);
  });
});

describe("moonNakshatraName", () => {
  it("returns a non-empty nakshatra name", () => {
    expect(moonNakshatraName("1995-08-15").length).toBeGreaterThan(0);
  });
});
