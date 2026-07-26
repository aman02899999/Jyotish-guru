/**
 * Gochar (transit) alerts: compares today's Saturn/Jupiter sign against the
 * natal Moon sign to flag the two most universally-documented Vedic transit
 * cycles - Sade Sati/Kantaka Shani (Saturn) and Guru Gochar (Jupiter). Many
 * other planets and finer regional rules exist for transit reading, but
 * those vary a lot by tradition; these two are consistently agreed upon
 * across classical sources, so this stays scoped to just them rather than
 * risk asserting something less defensible.
 *
 * Reuses calculateBirthChart itself to get "today's chart" - a planetary
 * placement calculation doesn't care whether the date is a birth date or
 * today, so this avoids duplicating any orbital mechanics.
 */
import { calculateBirthChart, RASHI_NAMES } from "./birth-chart-calculator";

export type TransitSeverity = "auspicious" | "neutral" | "caution";

export interface TransitAlert {
  planet: string;
  symbol: string;
  title: string;
  houseFromMoon: number;
  severity: TransitSeverity;
  description: string;
}

function houseFromMoon(transitSignIndex: number, natalMoonSignIndex: number): number {
  return ((transitSignIndex - natalMoonSignIndex + 12) % 12) + 1;
}

/**
 * @param dob "YYYY-MM-DD"
 * @param tob "HH:MM" (24-hour), assumed IST
 */
export function calculateTransitAlerts(dob: string, tob: string): TransitAlert[] {
  const natalChart = calculateBirthChart(dob, tob);
  const natalMoon = natalChart.placements.find((p) => p.key === "moon");
  if (!natalMoon) return [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const transitChart = calculateBirthChart(todayStr, "12:00");
  const transitSaturn = transitChart.placements.find((p) => p.key === "saturn");
  const transitJupiter = transitChart.placements.find((p) => p.key === "jupiter");

  const alerts: TransitAlert[] = [];

  if (transitSaturn) {
    const house = houseFromMoon(transitSaturn.signIndex, natalMoon.signIndex);
    if (house === 12) {
      alerts.push({
        planet: "Saturn",
        symbol: "♄",
        title: "Sade Sati - Rising Phase",
        houseFromMoon: house,
        severity: "caution",
        description: `Saturn is transiting ${RASHI_NAMES[transitSaturn.signIndex]}, the 12th sign from your natal Moon - the opening phase of Sade Sati, a classical ~7.5-year cycle associated with restructuring and life lessons.`,
      });
    } else if (house === 1) {
      alerts.push({
        planet: "Saturn",
        symbol: "♄",
        title: "Sade Sati - Peak Phase",
        houseFromMoon: house,
        severity: "caution",
        description: `Saturn is transiting your natal Moon sign (${RASHI_NAMES[transitSaturn.signIndex]}) itself - classically the most intense phase of Sade Sati.`,
      });
    } else if (house === 2) {
      alerts.push({
        planet: "Saturn",
        symbol: "♄",
        title: "Sade Sati - Setting Phase",
        houseFromMoon: house,
        severity: "caution",
        description: `Saturn is transiting ${RASHI_NAMES[transitSaturn.signIndex]}, the 2nd sign from your natal Moon - the closing phase of Sade Sati, as its pressure gradually eases.`,
      });
    } else if (house === 4 || house === 8) {
      alerts.push({
        planet: "Saturn",
        symbol: "♄",
        title: "Kantaka Shani",
        houseFromMoon: house,
        severity: "caution",
        description: `Saturn is transiting ${RASHI_NAMES[transitSaturn.signIndex]}, the ${house}th sign from your natal Moon - a lesser but still notable Saturn stress transit, worth extra patience in that life area.`,
      });
    }
  }

  if (transitJupiter) {
    const house = houseFromMoon(transitJupiter.signIndex, natalMoon.signIndex);
    if (house === 1) {
      alerts.push({
        planet: "Jupiter",
        symbol: "♃",
        title: "Guru Returns to Moon Sign",
        houseFromMoon: house,
        severity: "neutral",
        description: `Jupiter is transiting your natal Moon sign (${RASHI_NAMES[transitJupiter.signIndex]}) - a significant ~12-year cyclical return, often marking the start of a fresh chapter.`,
      });
    } else if (house === 5 || house === 9) {
      alerts.push({
        planet: "Jupiter",
        symbol: "♃",
        title: "Favorable Guru Gochar",
        houseFromMoon: house,
        severity: "auspicious",
        description: `Jupiter is transiting ${RASHI_NAMES[transitJupiter.signIndex]}, the ${house}th sign from your natal Moon - a classically favorable trine placement, supportive of growth and good fortune.`,
      });
    } else if (house === 6 || house === 8 || house === 12) {
      alerts.push({
        planet: "Jupiter",
        symbol: "♃",
        title: "Use Caution - Guru Gochar",
        houseFromMoon: house,
        severity: "caution",
        description: `Jupiter is transiting ${RASHI_NAMES[transitJupiter.signIndex]}, the ${house}th sign from your natal Moon - classically considered a more challenging placement calling for patience.`,
      });
    }
  }

  return alerts;
}
