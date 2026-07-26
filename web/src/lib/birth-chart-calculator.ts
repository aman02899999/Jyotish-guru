/**
 * Derives an approximate Vedic birth chart (Rashi / Kundli): the sidereal
 * zodiac sign of the ascendant and the nine grahas (Navagraha), placed into
 * the 12 whole-sign houses. Same "reasonable mean-motion approximation, not
 * a professional ephemeris" spirit as panchang-calculator.ts, and reuses its
 * Sun/Moon formulas directly so a user's Panchang moon sign and Kundli moon
 * sign always agree.
 *
 * Mercury/Venus/Mars/Jupiter/Saturn use mean circular heliocentric orbits
 * (semi-major axis + mean daily motion) converted to *geocentric* longitude
 * via planar vector subtraction from Earth's own mean orbit. This matters
 * most for Mercury and Venus: their apparent position stays near the Sun's
 * (bounded by max elongation), so naively treating their heliocentric mean
 * longitude as if it were geocentric - a common shortcut - would place them
 * in essentially random signs most of the time.
 *
 * The Ascendant additionally needs a location; since intake only collects a
 * free-text place of birth (no geocoding), it uses the same representative
 * central-India reference point already used for Panchang sunrise/sunset,
 * plus IST's standard meridian (82.5E) for the sidereal time calculation.
 */
import { sunSiderealLongitudeDeg, moonSiderealLongitudeDeg } from "./panchang-calculator";

export interface PlanetPlacement {
  key: string;
  name: string;
  symbol: string;
  signIndex: number; // 0=Aries .. 11=Pisces
  degreeInSign: number; // 0..30
  houseNumber: number; // 1..12, relative to the ascendant
}

export interface BirthChart {
  ascendantSignIndex: number;
  ascendantDegreeInSign: number;
  houses: { houseNumber: number; signIndex: number }[];
  placements: PlanetPlacement[];
}

export const RASHI_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
];

export const RASHI_ENGLISH_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Lahiri ayanamsa drifts about 0.014deg/year; a fixed current-epoch value is
// well within the precision this mean-motion model already operates at.
const LAHIRI_AYANAMSA_DEG = 24.1;

// Mean heliocentric orbital elements (semi-major axis in AU, mean longitude
// at J2000.0 in degrees, mean daily motion in degrees/day). Low-precision,
// circular-orbit approximation - ignores eccentricity and inclination.
const ORBITS: Record<string, { a: number; l0: number; n: number }> = {
  mercury: { a: 0.387, l0: 252.25084, n: 4.0923344368 },
  venus: { a: 0.723, l0: 181.97973, n: 1.6021302244 },
  earth: { a: 1.0, l0: 100.46435, n: 0.9856002628 },
  mars: { a: 1.524, l0: 355.45332, n: 0.524020777 },
  jupiter: { a: 5.203, l0: 34.40438, n: 0.0830853 },
  saturn: { a: 9.537, l0: 50.07571, n: 0.0334442 },
};

const RAHU_L0 = 125.04452;
const RAHU_DAILY_MOTION = -0.0529537642; // regresses through the zodiac

const REFERENCE_LATITUDE_DEG = 22.0; // central India, same reference point as Panchang
const REFERENCE_LONGITUDE_DEG = 82.5; // IST's standard meridian
const OBLIQUITY_DEG = 23.4393;

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function heliocentricXY(body: { a: number; l0: number; n: number }, daysSinceJ2000: number): [number, number] {
  const lonDeg = normalizeDeg(body.l0 + body.n * daysSinceJ2000);
  const lonRad = toRad(lonDeg);
  return [body.a * Math.cos(lonRad), body.a * Math.sin(lonRad)];
}

/** Geocentric tropical longitude of a planet via planar (coplanar-orbit) approximation. */
function geocentricTropicalLongitudeDeg(planetKey: string, daysSinceJ2000: number): number {
  const [ex, ey] = heliocentricXY(ORBITS.earth, daysSinceJ2000);
  const [px, py] = heliocentricXY(ORBITS[planetKey], daysSinceJ2000);
  return normalizeDeg(toDeg(Math.atan2(py - ey, px - ex)));
}

function ascendantTropicalLongitudeDeg(daysSinceJ2000UT: number): number {
  const gstDeg = normalizeDeg(280.46061837 + 360.98564736629 * daysSinceJ2000UT);
  const lstDeg = normalizeDeg(gstDeg + REFERENCE_LONGITUDE_DEG);
  const lstRad = toRad(lstDeg);
  const obliquityRad = toRad(OBLIQUITY_DEG);
  const latRad = toRad(REFERENCE_LATITUDE_DEG);

  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(obliquityRad) + Math.tan(latRad) * Math.sin(obliquityRad);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

function daysSinceJ2000(year: number, month: number, day: number, hour: number, minute: number): number {
  // IST (UTC+5:30) assumed for birth time, since that's this app's audience and
  // the intake form collects no timezone. J2000.0 epoch = 2000-01-01 12:00 UTC.
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 5.5 * 60 * 60 * 1000;
  const j2000Ms = Date.UTC(2000, 0, 1, 12, 0, 0);
  return (utcMs - j2000Ms) / 86_400_000;
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

const PLANET_META = [
  { key: "sun", name: "Surya", symbol: "☉" },
  { key: "moon", name: "Chandra", symbol: "☾" },
  { key: "mars", name: "Mangal", symbol: "♂" },
  { key: "mercury", name: "Budh", symbol: "☿" },
  { key: "jupiter", name: "Guru", symbol: "♃" },
  { key: "venus", name: "Shukra", symbol: "♀" },
  { key: "saturn", name: "Shani", symbol: "♄" },
  { key: "rahu", name: "Rahu", symbol: "☊" },
  { key: "ketu", name: "Ketu", symbol: "☋" },
];

/**
 * @param dob "YYYY-MM-DD"
 * @param tob "HH:MM" (24-hour), assumed IST
 */
export function calculateBirthChart(dob: string, tob: string): BirthChart {
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = Number.parseInt(yearStr, 10) || 2000;
  const month = Math.min(Math.max(Number.parseInt(monthStr, 10) || 1, 1), 12);
  const day = Math.min(Math.max(Number.parseInt(dayStr, 10) || 1, 1), 31);

  const [hourStr, minuteStr] = (tob || "12:00").split(":");
  const hour = Math.min(Math.max(Number.parseInt(hourStr, 10) || 0, 0), 23);
  const minute = Math.min(Math.max(Number.parseInt(minuteStr, 10) || 0, 0), 59);

  const doy = dayOfYear(year, month, day);
  const daysSince2000Noon = (year - 2000) * 365.25 + doy + 0.5;
  const d = daysSinceJ2000(year, month, day, hour, minute);

  const sunSidereal = sunSiderealLongitudeDeg(doy);
  const moonSidereal = moonSiderealLongitudeDeg(daysSince2000Noon);

  const longitudes: Record<string, number> = {
    sun: sunSidereal,
    moon: moonSidereal,
    mars: normalizeDeg(geocentricTropicalLongitudeDeg("mars", d) - LAHIRI_AYANAMSA_DEG),
    mercury: normalizeDeg(geocentricTropicalLongitudeDeg("mercury", d) - LAHIRI_AYANAMSA_DEG),
    jupiter: normalizeDeg(geocentricTropicalLongitudeDeg("jupiter", d) - LAHIRI_AYANAMSA_DEG),
    venus: normalizeDeg(geocentricTropicalLongitudeDeg("venus", d) - LAHIRI_AYANAMSA_DEG),
    saturn: normalizeDeg(geocentricTropicalLongitudeDeg("saturn", d) - LAHIRI_AYANAMSA_DEG),
  };
  const rahuTropical = normalizeDeg(RAHU_L0 + RAHU_DAILY_MOTION * d);
  longitudes.rahu = normalizeDeg(rahuTropical - LAHIRI_AYANAMSA_DEG);
  longitudes.ketu = normalizeDeg(longitudes.rahu + 180);

  const ascendantTropical = ascendantTropicalLongitudeDeg(d);
  const ascendantSidereal = normalizeDeg(ascendantTropical - LAHIRI_AYANAMSA_DEG);
  const ascendantSignIndex = Math.floor(ascendantSidereal / 30);

  const houses = Array.from({ length: 12 }, (_, i) => ({
    houseNumber: i + 1,
    signIndex: (ascendantSignIndex + i) % 12,
  }));

  const placements: PlanetPlacement[] = PLANET_META.map(({ key, name, symbol }) => {
    const longitude = longitudes[key];
    const signIndex = Math.floor(longitude / 30);
    const houseNumber = ((signIndex - ascendantSignIndex + 12) % 12) + 1;
    return {
      key,
      name,
      symbol,
      signIndex,
      degreeInSign: longitude % 30,
      houseNumber,
    };
  });

  return {
    ascendantSignIndex,
    ascendantDegreeInSign: ascendantSidereal % 30,
    houses,
    placements,
  };
}
