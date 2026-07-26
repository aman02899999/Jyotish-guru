import { describe, expect, it } from "vitest";
import { calculatePanchang } from "./panchang-calculator";

const VALID_TITHIS = new Set([
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi (Ganesh Chaturthi)", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami (Ram Navami)", "Dashami",
  "Ekadashi (Shubh Vrat)", "Dwadashi", "Trayodashi (Pradosh)", "Chaturdashi",
  "Purnima (Full Moon / Sacred Day)", "Amavasya (New Moon / Pitru Day)",
]);

describe("calculatePanchang", () => {
  it("is deterministic for the same date", () => {
    const a = calculatePanchang("2026-07-22");
    const b = calculatePanchang("2026-07-22");
    expect(a).toEqual(b);
  });

  it("tithi changes across several days apart", () => {
    const day1 = calculatePanchang("2026-01-01");
    const day5 = calculatePanchang("2026-01-05");
    expect(day1.tithi).not.toBe(day5.tithi);
  });

  it("returns only known valid element names", () => {
    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-03-${String(day).padStart(2, "0")}`;
      const result = calculatePanchang(dateStr);
      expect(VALID_TITHIS.has(result.tithi)).toBe(true);
      expect(result.nakshatra.length).toBeGreaterThan(0);
      expect(result.yoga.length).toBeGreaterThan(0);
      expect(result.karana.length).toBeGreaterThan(0);
      expect(result.moonSign.length).toBeGreaterThan(0);
    }
  });

  it("Rahu Kaal window repeats on the same weekday every week", () => {
    // Any two dates exactly 7 days apart always fall on the same weekday,
    // and Rahu Kaal is determined purely by weekday in this model.
    const weekA = calculatePanchang("2026-01-05");
    const weekB = calculatePanchang("2026-01-12");
    expect(weekA.rahuKaal).toBe(weekB.rahuKaal);
  });

  it("formats sunrise and sunset as clock times", () => {
    const result = calculatePanchang("2026-06-21");
    const clockPattern = /^\d{2}:\d{2} (AM|PM)$/;
    expect(result.sunrise).toMatch(clockPattern);
    expect(result.sunset).toMatch(clockPattern);
  });
});
