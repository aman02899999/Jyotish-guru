import { describe, expect, it } from "vitest";
import { calculateTransitAlerts } from "./transit-calculator";
import { calculateBirthChart } from "./birth-chart-calculator";

function houseFromMoon(transitSignIndex: number, natalMoonSignIndex: number): number {
  return ((transitSignIndex - natalMoonSignIndex + 12) % 12) + 1;
}

describe("calculateTransitAlerts", () => {
  const dob = "1990-05-10";
  const tob = "14:30";

  it("is deterministic for the same natal chart and date", () => {
    expect(calculateTransitAlerts(dob, tob)).toEqual(calculateTransitAlerts(dob, tob));
  });

  it("only ever returns Saturn/Jupiter alerts with valid severities and houses", () => {
    const alerts = calculateTransitAlerts(dob, tob);
    for (const alert of alerts) {
      expect(["Saturn", "Jupiter"]).toContain(alert.planet);
      expect(["auspicious", "neutral", "caution"]).toContain(alert.severity);
      expect(alert.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(alert.houseFromMoon).toBeLessThanOrEqual(12);
    }
  });

  it("matches independently-recomputed house-from-Moon positions for today", () => {
    const natalChart = calculateBirthChart(dob, tob);
    const natalMoonSignIndex = natalChart.placements.find((p) => p.key === "moon")!.signIndex;

    const todayStr = new Date().toISOString().slice(0, 10);
    const transitChart = calculateBirthChart(todayStr, "12:00");
    const transitSaturnSignIndex = transitChart.placements.find((p) => p.key === "saturn")!.signIndex;
    const transitJupiterSignIndex = transitChart.placements.find((p) => p.key === "jupiter")!.signIndex;

    const saturnHouse = houseFromMoon(transitSaturnSignIndex, natalMoonSignIndex);
    const jupiterHouse = houseFromMoon(transitJupiterSignIndex, natalMoonSignIndex);

    const alerts = calculateTransitAlerts(dob, tob);
    const saturnAlert = alerts.find((a) => a.planet === "Saturn");
    const jupiterAlert = alerts.find((a) => a.planet === "Jupiter");

    expect(Boolean(saturnAlert)).toBe([12, 1, 2, 4, 8].includes(saturnHouse));
    if (saturnAlert) expect(saturnAlert.houseFromMoon).toBe(saturnHouse);

    expect(Boolean(jupiterAlert)).toBe([1, 5, 9, 6, 8, 12].includes(jupiterHouse));
    if (jupiterAlert) expect(jupiterAlert.houseFromMoon).toBe(jupiterHouse);
  });

  it("maps each tracked house to the correct classical severity", () => {
    const alerts = calculateTransitAlerts(dob, tob);
    for (const alert of alerts) {
      if (alert.planet === "Saturn") {
        expect(alert.severity).toBe("caution");
      }
      if (alert.planet === "Jupiter") {
        if (alert.houseFromMoon === 1) expect(alert.severity).toBe("neutral");
        if ([5, 9].includes(alert.houseFromMoon)) expect(alert.severity).toBe("auspicious");
        if ([6, 8, 12].includes(alert.houseFromMoon)) expect(alert.severity).toBe("caution");
      }
    }
  });

  it("never returns more than one alert per planet across a range of dobs", () => {
    const dates: [string, string][] = [
      ["1985-06-15", "08:00"],
      ["2000-01-01", "23:45"],
      ["1975-07-04", "00:00"],
      ["2005-02-28", "12:00"],
    ];
    for (const [d, t] of dates) {
      const alerts = calculateTransitAlerts(d, t);
      const planets = alerts.map((a) => a.planet);
      expect(new Set(planets).size).toBe(planets.length);
      expect(alerts.length).toBeLessThanOrEqual(2);
    }
  });
});
