/**
 * Vimshottari Mahadasha/Antardasha timeline: the classical 120-year, 9-graha
 * planetary period system used almost universally in Vedic astrology for
 * timing life events. The starting Mahadasha lord and its already-elapsed
 * balance are both derived from the Moon's exact Nakshatra position at
 * birth - reuses the same dob-only sidereal Moon longitude model as
 * kundli-milan-calculator.ts/birth-chart-calculator.ts, so the starting
 * lord always agrees with the Moon Nakshatra shown elsewhere.
 */
import { moonSiderealLongitudeDeg } from "./panchang-calculator";

export interface DashaPeriod {
  lord: string;
  symbol: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  years: number;
  isCurrent: boolean;
}

// Fixed classical order and year-length of each Mahadasha; sums to 120 years.
const DASHA_SEQUENCE = [
  { lord: "Ketu", symbol: "☋", years: 7 },
  { lord: "Venus", symbol: "♀", years: 20 },
  { lord: "Sun", symbol: "☉", years: 6 },
  { lord: "Moon", symbol: "☾", years: 10 },
  { lord: "Mars", symbol: "♂", years: 7 },
  { lord: "Rahu", symbol: "☊", years: 18 },
  { lord: "Jupiter", symbol: "♃", years: 16 },
  { lord: "Saturn", symbol: "♄", years: 19 },
  { lord: "Mercury", symbol: "☿", years: 17 },
];

const NAKSHATRA_SPAN_DEG = 360 / 27;
const DAYS_PER_YEAR = 365.25;

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

function addYears(dateStr: string, years: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.round(years * DAYS_PER_YEAR));
  return date.toISOString().slice(0, 10);
}

/** @param dob "YYYY-MM-DD" */
export function calculateVimshottariDasha(dob: string): DashaPeriod[] {
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = Number.parseInt(yearStr, 10) || 2000;
  const month = Math.min(Math.max(Number.parseInt(monthStr, 10) || 1, 1), 12);
  const day = Math.min(Math.max(Number.parseInt(dayStr, 10) || 1, 1), 31);

  const doy = dayOfYear(year, month, day);
  const daysSince2000Noon = (year - 2000) * 365.25 + doy + 0.5;
  const moonLongitude = moonSiderealLongitudeDeg(daysSince2000Noon);

  const nakshatraIndex = Math.min(Math.floor(moonLongitude / NAKSHATRA_SPAN_DEG), 26);
  const traversedFraction = (moonLongitude % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG;
  const remainingFraction = 1 - traversedFraction;
  const startLordIndex = nakshatraIndex % 9;

  const todayStr = new Date().toISOString().slice(0, 10);

  const periods: DashaPeriod[] = [];
  let cursor = dob;
  for (let i = 0; i < 9; i++) {
    const entry = DASHA_SEQUENCE[(startLordIndex + i) % 9];
    const years = i === 0 ? entry.years * remainingFraction : entry.years;
    const startDate = cursor;
    const endDate = addYears(cursor, years);

    periods.push({
      lord: entry.lord,
      symbol: entry.symbol,
      startDate,
      endDate,
      years: Math.round(years * 100) / 100,
      isCurrent: todayStr >= startDate && todayStr < endDate,
    });

    cursor = endDate;
  }

  return periods;
}

export interface AntardashaPeriod {
  lord: string;
  symbol: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/** Subdivides one Mahadasha into its 9 Antardashas, proportional to each lord's classical dasha-years. */
export function calculateAntardashas(mahadasha: DashaPeriod): AntardashaPeriod[] {
  const startIndex = DASHA_SEQUENCE.findIndex((d) => d.lord === mahadasha.lord);
  const todayStr = new Date().toISOString().slice(0, 10);

  const periods: AntardashaPeriod[] = [];
  let cursor = mahadasha.startDate;
  for (let i = 0; i < 9; i++) {
    const entry = DASHA_SEQUENCE[(startIndex + i) % 9];
    const years = (entry.years / 120) * mahadasha.years;
    const startDate = cursor;
    const endDate = addYears(cursor, years);

    periods.push({
      lord: entry.lord,
      symbol: entry.symbol,
      startDate,
      endDate,
      isCurrent: todayStr >= startDate && todayStr < endDate,
    });

    cursor = endDate;
  }

  return periods;
}
