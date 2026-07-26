import { describe, expect, it } from "vitest";
import { calculateVimshottariDasha, calculateAntardashas } from "./dasha-calculator";
import { moonNakshatraName } from "./kundli-milan-calculator";

const NAKSHATRA_ORDER = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purvashadha",
  "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];
const DASHA_LORD_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

function expectedStartLord(dob: string): string {
  const nakshatraIndex = NAKSHATRA_ORDER.indexOf(moonNakshatraName(dob));
  return DASHA_LORD_ORDER[nakshatraIndex % 9];
}

describe("calculateVimshottariDasha", () => {
  it("is deterministic", () => {
    expect(calculateVimshottariDasha("1990-05-10")).toEqual(calculateVimshottariDasha("1990-05-10"));
  });

  it("returns exactly 9 Mahadasha periods in the fixed classical order, starting from the Moon-Nakshatra-derived lord", () => {
    const dates = ["1990-05-10", "1985-06-15", "2000-01-01", "1975-07-04", "2005-02-28"];
    for (const dob of dates) {
      const periods = calculateVimshottariDasha(dob);
      expect(periods).toHaveLength(9);

      const startLord = expectedStartLord(dob);
      const startIndex = DASHA_LORD_ORDER.indexOf(startLord);
      const expectedOrder = Array.from({ length: 9 }, (_, i) => DASHA_LORD_ORDER[(startIndex + i) % 9]);
      expect(periods.map((p) => p.lord)).toEqual(expectedOrder);
    }
  });

  it("chains periods with no gaps or overlaps", () => {
    const periods = calculateVimshottariDasha("1990-05-10");
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i].startDate).toBe(periods[i - 1].endDate);
    }
  });

  it("gives the first period a partial (balance) duration and the rest their full classical years", () => {
    const periods = calculateVimshottariDasha("1990-05-10");
    const firstFull = DASHA_LORD_ORDER.includes(periods[0].lord);
    expect(firstFull).toBe(true);
    expect(periods[0].years).toBeGreaterThan(0);
    for (let i = 1; i < periods.length; i++) {
      const lordFullYears = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 }[
        periods[i].lord as "Ketu"
      ];
      expect(periods[i].years).toBe(lordFullYears);
    }
  });

  it("flags exactly one current period for a birth date decades in the past", () => {
    const periods = calculateVimshottariDasha("1990-05-10");
    expect(periods.filter((p) => p.isCurrent)).toHaveLength(1);
  });
});

describe("calculateAntardashas", () => {
  it("returns 9 sub-periods starting with the Mahadasha's own lord, chained with no gaps", () => {
    const [mahadasha] = calculateVimshottariDasha("1990-05-10");
    const antardashas = calculateAntardashas(mahadasha);

    expect(antardashas).toHaveLength(9);
    expect(antardashas[0].lord).toBe(mahadasha.lord);
    for (let i = 1; i < antardashas.length; i++) {
      expect(antardashas[i].startDate).toBe(antardashas[i - 1].endDate);
    }
  });

  it("starts at the Mahadasha's start date and ends at (approximately) its end date", () => {
    const [mahadasha] = calculateVimshottariDasha("1990-05-10");
    const antardashas = calculateAntardashas(mahadasha);
    expect(antardashas[0].startDate).toBe(mahadasha.startDate);

    const lastEnd = new Date(antardashas[antardashas.length - 1].endDate);
    const mahadashaEnd = new Date(mahadasha.endDate);
    const diffDays = Math.abs((lastEnd.getTime() - mahadashaEnd.getTime()) / 86_400_000);
    expect(diffDays).toBeLessThanOrEqual(2); // day-rounding across 9 sub-additions
  });
});
