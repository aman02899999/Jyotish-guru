/**
 * ephemeris.js — Sidereal (Vedic) astronomy core.
 *
 * Wraps the Astronomy Engine (VSOP87 / Meeus-grade ephemeris, sub-arcminute
 * accuracy over 1700-2200) and converts everything into the sidereal zodiac
 * used by Jyotisha.
 *
 * No mocked values live in this file. Every number returned is computed from
 * the birth moment supplied by the caller.
 */

import * as A from 'astronomy-engine';

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const norm360 = (x) => ((x % 360) + 360) % 360;

/* ------------------------------------------------------------------ *
 * Ayanamsa
 *
 * Defined the Swiss-Ephemeris way: a fixed direction in inertial space
 * (the sidereal zero point) is pinned at a reference epoch, then read
 * back in the true ecliptic of date. The difference from the tropical
 * zero point is the ayanamsa.
 * ------------------------------------------------------------------ */

const AYANAMSA_DEFS = {
  // Lahiri / Chitrapaksha — official Indian civil calendar ayanamsa.
  lahiri: { label: 'Lahiri', jd0: 2435553.5, deg0: 23.250182778 - 0.004660 },
  // B. V. Raman.
  raman: { label: 'Raman', jd0: 2415020.0, deg0: 21.011389 },
  // K. S. Krishnamurti (KP).
  kp: { label: 'Krishnamurti', jd0: 2415020.0, deg0: 22.460148 },
};

export const AYANAMSA_KEYS = Object.keys(AYANAMSA_DEFS);
export const ayanamsaLabel = (k) => (AYANAMSA_DEFS[k] || AYANAMSA_DEFS.lahiri).label;

/** Ayanamsa in degrees for a given date. */
export function ayanamsa(date, key = 'lahiri') {
  const def = AYANAMSA_DEFS[key] || AYANAMSA_DEFS.lahiri;
  const t0 = A.MakeTime(def.jd0 - 2451545.0);
  const l = def.deg0 * DEG;
  const eqj = A.RotateVector(
    A.Rotation_ECT_EQJ(t0),
    new A.Vector(Math.cos(l), Math.sin(l), 0, t0)
  );
  const t = A.MakeTime(date);
  const now = A.RotateVector(
    A.Rotation_EQJ_ECT(t),
    new A.Vector(eqj.x, eqj.y, eqj.z, t)
  );
  return norm360(Math.atan2(now.y, now.x) * RAD);
}

/* ------------------------------------------------------------------ *
 * Zodiac / nakshatra reference data
 * ------------------------------------------------------------------ */

export const SIGNS = [
  { en: 'Aries', sa: 'Mesha', lord: 'Mars', element: 'Fire', symbol: '♈' },
  { en: 'Taurus', sa: 'Vrishabha', lord: 'Venus', element: 'Earth', symbol: '♉' },
  { en: 'Gemini', sa: 'Mithuna', lord: 'Mercury', element: 'Air', symbol: '♊' },
  { en: 'Cancer', sa: 'Karka', lord: 'Moon', element: 'Water', symbol: '♋' },
  { en: 'Leo', sa: 'Simha', lord: 'Sun', element: 'Fire', symbol: '♌' },
  { en: 'Virgo', sa: 'Kanya', lord: 'Mercury', element: 'Earth', symbol: '♍' },
  { en: 'Libra', sa: 'Tula', lord: 'Venus', element: 'Air', symbol: '♎' },
  { en: 'Scorpio', sa: 'Vrischika', lord: 'Mars', element: 'Water', symbol: '♏' },
  { en: 'Sagittarius', sa: 'Dhanu', lord: 'Jupiter', element: 'Fire', symbol: '♐' },
  { en: 'Capricorn', sa: 'Makara', lord: 'Saturn', element: 'Earth', symbol: '♑' },
  { en: 'Aquarius', sa: 'Kumbha', lord: 'Saturn', element: 'Air', symbol: '♒' },
  { en: 'Pisces', sa: 'Meena', lord: 'Jupiter', element: 'Water', symbol: '♓' },
];

/** 27 nakshatras with their Vimshottari lords. */
export const NAKSHATRAS = [
  ['Ashwini', 'Ketu'], ['Bharani', 'Venus'], ['Krittika', 'Sun'],
  ['Rohini', 'Moon'], ['Mrigashira', 'Mars'], ['Ardra', 'Rahu'],
  ['Punarvasu', 'Jupiter'], ['Pushya', 'Saturn'], ['Ashlesha', 'Mercury'],
  ['Magha', 'Ketu'], ['Purva Phalguni', 'Venus'], ['Uttara Phalguni', 'Sun'],
  ['Hasta', 'Moon'], ['Chitra', 'Mars'], ['Swati', 'Rahu'],
  ['Vishakha', 'Jupiter'], ['Anuradha', 'Saturn'], ['Jyeshtha', 'Mercury'],
  ['Mula', 'Ketu'], ['Purva Ashadha', 'Venus'], ['Uttara Ashadha', 'Sun'],
  ['Shravana', 'Moon'], ['Dhanishta', 'Mars'], ['Shatabhisha', 'Rahu'],
  ['Purva Bhadrapada', 'Jupiter'], ['Uttara Bhadrapada', 'Saturn'], ['Revati', 'Mercury'],
];

export const GRAHAS = [
  { key: 'Sun', sa: 'Surya', glyph: '☉', color: '#f6a938' },
  { key: 'Moon', sa: 'Chandra', glyph: '☾', color: '#dfe6f5' },
  { key: 'Mars', sa: 'Mangala', glyph: '♂', color: '#e2583f' },
  { key: 'Mercury', sa: 'Budha', glyph: '☿', color: '#6fd08c' },
  { key: 'Jupiter', sa: 'Guru', glyph: '♃', color: '#e8c26a' },
  { key: 'Venus', sa: 'Shukra', glyph: '♀', color: '#8fd7f0' },
  { key: 'Saturn', sa: 'Shani', glyph: '♄', color: '#8b8fb0' },
  { key: 'Rahu', sa: 'Rahu', glyph: '☊', color: '#9a7bd0' },
  { key: 'Ketu', sa: 'Ketu', glyph: '☋', color: '#c78a6a' },
];

export const SHORT = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

/* ------------------------------------------------------------------ *
 * Longitudes
 * ------------------------------------------------------------------ */

/** Apparent geocentric tropical ecliptic longitude (true equinox of date). */
export function tropicalLongitude(body, date) {
  const t = A.MakeTime(date);
  if (body === 'Moon') return norm360(A.EclipticGeoMoon(t).lon);
  const gv = A.GeoVector(body, t, true); // true = corrected for light travel + aberration
  return norm360(A.Ecliptic(gv).elon);
}

/**
 * True lunar node (Rahu). Derived from the instantaneous orbital angular
 * momentum vector h = r x v of the geocentric Moon; the ascending node is
 * the direction ẑ × ĥ. This is the "true node" Vedic astrologers use.
 */
export function trueNodeLongitude(date) {
  const t = A.MakeTime(date);
  const dt = 1 / 1440; // one minute, in days
  const toVec = (e) => {
    const la = e.lat * DEG, lo = e.lon * DEG, r = e.dist;
    return [r * Math.cos(la) * Math.cos(lo), r * Math.cos(la) * Math.sin(lo), r * Math.sin(la)];
  };
  const p1 = toVec(A.EclipticGeoMoon(A.MakeTime(t.ut - dt)));
  const p2 = toVec(A.EclipticGeoMoon(A.MakeTime(t.ut + dt)));
  const r = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
  const v = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const h = [
    r[1] * v[2] - r[2] * v[1],
    r[2] * v[0] - r[0] * v[2],
    r[0] * v[1] - r[1] * v[0],
  ];
  return norm360(Math.atan2(h[0], -h[1]) * RAD);
}

/** Daily motion in degrees/day — sign tells us retrograde. */
export function dailyMotion(body, date) {
  const t = A.MakeTime(date);
  const a = body === 'Rahu'
    ? trueNodeLongitude(A.MakeTime(t.ut - 0.5).date)
    : tropicalLongitude(body, A.MakeTime(t.ut - 0.5).date);
  const b = body === 'Rahu'
    ? trueNodeLongitude(A.MakeTime(t.ut + 0.5).date)
    : tropicalLongitude(body, A.MakeTime(t.ut + 0.5).date);
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/* ------------------------------------------------------------------ *
 * Ascendant & houses
 * ------------------------------------------------------------------ */

/** Local apparent sidereal time in degrees. */
export function localSiderealDeg(date, lonEast) {
  const t = A.MakeTime(date);
  return norm360((A.SiderealTime(t) + lonEast / 15) * 15);
}

/**
 * Tropical ascendant (lagna) — the ecliptic degree rising on the eastern
 * horizon. Standard spherical formula; validated to altitude 0 with an
 * eastern azimuth in tests.
 */
export function tropicalAscendant(date, lat, lonEast) {
  const t = A.MakeTime(date);
  const ramc = localSiderealDeg(date, lonEast) * DEG;
  const eps = A.e_tilt(t).tobl * DEG;
  const phi = lat * DEG;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  );
  return norm360(asc * RAD);
}

/** Tropical Midheaven (MC / 10th cusp). */
export function tropicalMidheaven(date, lonEast) {
  const t = A.MakeTime(date);
  const ramc = localSiderealDeg(date, lonEast) * DEG;
  const eps = A.e_tilt(t).tobl * DEG;
  return norm360(Math.atan2(Math.tan(ramc), Math.cos(eps)) * RAD +
    (Math.cos(ramc) < 0 ? 180 : 0));
}

/* ------------------------------------------------------------------ *
 * Position helpers
 * ------------------------------------------------------------------ */

export function signIndex(lon) { return Math.floor(norm360(lon) / 30); }
export function degInSign(lon) { return norm360(lon) % 30; }

export function nakshatraOf(lon) {
  const span = 360 / 27;
  const idx = Math.floor(norm360(lon) / span);
  const within = norm360(lon) - idx * span;
  const pada = Math.floor(within / (span / 4)) + 1;
  const [name, lord] = NAKSHATRAS[idx];
  return { index: idx, name, lord, pada, fraction: within / span, degInto: within };
}

export function formatDMS(deg) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  const mm = s === 60 ? m + 1 : m;
  const ss = s === 60 ? 0 : s;
  return `${d}° ${String(mm).padStart(2, '0')}' ${String(ss).padStart(2, '0')}"`;
}

export function formatSignPos(lon) {
  const si = signIndex(lon);
  return `${SIGNS[si].en} ${formatDMS(degInSign(lon))}`;
}

/* ------------------------------------------------------------------ *
 * Full sidereal chart
 * ------------------------------------------------------------------ */

/**
 * Compute a complete sidereal chart.
 * @param {Date}   date    exact UTC instant of birth
 * @param {number} lat     latitude, north positive
 * @param {number} lon     longitude, EAST positive
 * @param {string} ayKey   ayanamsa key
 */
export function computeChart(date, lat, lon, ayKey = 'lahiri') {
  const ay = ayanamsa(date, ayKey);
  const sid = (tropical) => norm360(tropical - ay);

  const ascTrop = tropicalAscendant(date, lat, lon);
  const mcTrop = tropicalMidheaven(date, lon);
  const ascendant = sid(ascTrop);
  const midheaven = sid(mcTrop);
  const ascSign = signIndex(ascendant);

  const planets = {};
  for (const g of GRAHAS) {
    let lonSid, speed;
    if (g.key === 'Rahu') {
      lonSid = sid(trueNodeLongitude(date));
      speed = dailyMotion('Rahu', date);
    } else if (g.key === 'Ketu') {
      lonSid = norm360(sid(trueNodeLongitude(date)) + 180);
      speed = dailyMotion('Rahu', date);
    } else {
      lonSid = sid(tropicalLongitude(g.key, date));
      speed = dailyMotion(g.key, date);
    }
    const si = signIndex(lonSid);
    const nak = nakshatraOf(lonSid);
    planets[g.key] = {
      key: g.key,
      sa: g.sa,
      glyph: g.glyph,
      color: g.color,
      short: SHORT[g.key],
      lon: lonSid,
      sign: si,
      signName: SIGNS[si].en,
      signSa: SIGNS[si].sa,
      degInSign: degInSign(lonSid),
      nakshatra: nak,
      speed,
      retrograde: speed < 0,
      // Whole-sign house counted from the ascendant sign
      house: ((si - ascSign) % 12 + 12) % 12 + 1,
      dignity: dignityOf(g.key, si),
    };
  }

  return {
    date, lat, lon, ayanamsaKey: ayKey, ayanamsa: ay,
    ascendant, ascendantSign: ascSign, midheaven,
    ascNakshatra: nakshatraOf(ascendant),
    planets,
    houses: wholeSignHouses(ascSign),
    moonSign: planets.Moon.sign,
    sunSign: planets.Sun.sign,
  };
}

function wholeSignHouses(ascSign) {
  return Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    sign: (ascSign + i) % 12,
    signName: SIGNS[(ascSign + i) % 12].en,
    lord: SIGNS[(ascSign + i) % 12].lord,
  }));
}

/* --- Dignity (exaltation / debilitation / own sign) ---------------- */

const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
const OWN = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [10], Ketu: [7],
};

export function dignityOf(planet, sign) {
  if (EXALT[planet] === sign) return 'Exalted';
  if (EXALT[planet] !== undefined && (EXALT[planet] + 6) % 12 === sign) return 'Debilitated';
  if ((OWN[planet] || []).includes(sign)) return 'Own Sign';
  return 'Neutral';
}

/* ------------------------------------------------------------------ *
 * Divisional (varga) charts
 * ------------------------------------------------------------------ */

/**
 * Generic varga longitude. Implements the classical rules for the
 * divisions Parashara describes, falling back to the uniform rule.
 */
export function vargaSign(lon, d) {
  const s = signIndex(lon);
  const deg = degInSign(lon);
  const part = Math.floor(deg / (30 / d)); // 0-based division index
  const odd = s % 2 === 0; // Aries=0 is odd/movable in 1-based counting

  switch (d) {
    case 1: return s;
    case 2: // Hora — Sun's (Leo) / Moon's (Cancer)
      return odd ? (part === 0 ? 4 : 3) : (part === 0 ? 3 : 4);
    case 3: // Drekkana — 1st/5th/9th from sign
      return (s + part * 4) % 12;
    case 4: // Chaturthamsa — kendras
      return (s + part * 3) % 12;
    case 7: // Saptamsa
      return ((odd ? s : s + 6) + part) % 12;
    case 9: // Navamsa — fire→Aries, earth→Capricorn, air→Libra, water→Cancer
      return (navamsaStart(s) + part) % 12;
    case 10: // Dasamsa
      return ((odd ? s : s + 8) + part) % 12;
    case 12: // Dwadasamsa
      return (s + part) % 12;
    case 16: return ((movableStart(s, [0, 4, 8])) + part) % 12;
    case 20: return ((movableStart(s, [0, 8, 4])) + part) % 12;
    case 24: return ((odd ? 4 : 3) + part) % 12;
    case 27: return ((s % 4) * 3 + part) % 12;
    case 30: return trimsamsaSign(s, deg, odd);
    case 40: return ((odd ? 0 : 6) + part) % 12;
    case 45: return ((movableStart(s, [0, 4, 8])) + part) % 12;
    case 60: return (s + part) % 12;
    default: return (s + part) % 12;
  }
}

function navamsaStart(s) {
  // Fire→Aries, Earth→Capricorn, Air→Libra, Water→Cancer
  return [0, 9, 6, 3][s % 4];
}
function movableStart(s, starts) {
  const mode = s % 3; // 0 movable, 1 fixed, 2 dual
  return starts[mode];
}
function trimsamsaSign(s, deg, odd) {
  const bounds = odd
    ? [[5, 0], [10, 10], [18, 8], [25, 2], [30, 6]]   // Mars, Saturn, Jupiter, Mercury, Venus
    : [[5, 1], [12, 5], [20, 11], [25, 9], [30, 7]];
  for (const [lim, sign] of bounds) if (deg < lim) return sign;
  return s;
}

/** Build a full varga chart (all nine grahas + lagna) for division `d`. */
export function computeVarga(chart, d) {
  const ascSign = vargaSign(chart.ascendant, d);
  const planets = {};
  for (const [k, p] of Object.entries(chart.planets)) {
    const s = vargaSign(p.lon, d);
    planets[k] = {
      ...p, sign: s, signName: SIGNS[s].en,
      house: ((s - ascSign) % 12 + 12) % 12 + 1,
      dignity: dignityOf(k, s),
    };
  }
  return { division: d, ascendantSign: ascSign, planets };
}

export const VARGA_LIST = [
  { d: 1, name: 'D1 Rasi', use: 'Body, life, overall destiny' },
  { d: 2, name: 'D2 Hora', use: 'Wealth and resources' },
  { d: 3, name: 'D3 Drekkana', use: 'Siblings, courage, initiative' },
  { d: 4, name: 'D4 Chaturthamsa', use: 'Property, home, inner peace' },
  { d: 7, name: 'D7 Saptamsa', use: 'Children and progeny' },
  { d: 9, name: 'D9 Navamsa', use: 'Marriage, dharma, chart strength' },
  { d: 10, name: 'D10 Dasamsa', use: 'Career, status, profession' },
  { d: 12, name: 'D12 Dwadasamsa', use: 'Parents and ancestry' },
  { d: 16, name: 'D16 Shodasamsa', use: 'Vehicles, comforts, luxuries' },
  { d: 20, name: 'D20 Vimsamsa', use: 'Spiritual practice, worship' },
  { d: 24, name: 'D24 Siddhamsa', use: 'Education and learning' },
  { d: 27, name: 'D27 Bhamsa', use: 'Strengths and weaknesses' },
  { d: 30, name: 'D30 Trimsamsa', use: 'Misfortune, health troubles' },
  { d: 40, name: 'D40 Khavedamsa', use: 'Maternal legacy' },
  { d: 45, name: 'D45 Akshavedamsa', use: 'Paternal legacy, character' },
  { d: 60, name: 'D60 Shashtiamsa', use: 'Past-life karma, fine detail' },
];

/* ------------------------------------------------------------------ *
 * Vimshottari Dasha
 * ------------------------------------------------------------------ */

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const YEAR_DAYS = 365.2425;

/**
 * Full Vimshottari ladder from the Moon's nakshatra.
 * Returns mahadashas each containing antardashas (and pratyantar on demand).
 */
export function vimshottari(chart, levels = 3) {
  const moon = chart.planets.Moon;
  const nak = moon.nakshatra;
  const startLord = nak.lord;
  const elapsedFrac = nak.fraction;

  const startIdx = DASHA_ORDER.indexOf(startLord);
  const birth = chart.date.getTime();
  // Balance of the first mahadasha at birth
  const firstFull = DASHA_YEARS[startLord] * YEAR_DAYS * 86400000;
  let cursor = birth - elapsedFrac * firstFull;

  const maha = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startIdx + i) % 9];
    const span = DASHA_YEARS[lord] * YEAR_DAYS * 86400000;
    const start = cursor;
    const end = cursor + span;
    const node = {
      lord, level: 1,
      start: new Date(start), end: new Date(end),
      years: DASHA_YEARS[lord],
      children: levels > 1 ? subPeriods(lord, start, span, 2, levels) : [],
    };
    maha.push(node);
    cursor = end;
  }
  return maha;
}

function subPeriods(parentLord, start, span, level, maxLevel) {
  const idx = DASHA_ORDER.indexOf(parentLord);
  const out = [];
  let c = start;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(idx + i) % 9];
    const sub = span * (DASHA_YEARS[lord] / 120);
    out.push({
      lord, level,
      start: new Date(c), end: new Date(c + sub),
      years: sub / (YEAR_DAYS * 86400000),
      children: level < maxLevel ? subPeriods(lord, c, sub, level + 1, maxLevel) : [],
    });
    c += sub;
  }
  return out;
}

/** Which dasha/antardasha/pratyantar is running at instant `when`. */
export function dashaAt(maha, when) {
  const t = when.getTime();
  const path = [];
  let level = maha;
  while (level && level.length) {
    const hit = level.find((n) => t >= n.start.getTime() && t < n.end.getTime());
    if (!hit) break;
    path.push(hit);
    level = hit.children;
  }
  return path;
}

/* ------------------------------------------------------------------ *
 * Panchang
 * ------------------------------------------------------------------ */

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
  'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
  'Trayodashi', 'Chaturdashi', 'Purnima',
];
export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarman', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata',
  'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];
export const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
];
export const WEEKDAYS = [
  { en: 'Sunday', sa: 'Ravivara', lord: 'Sun' },
  { en: 'Monday', sa: 'Somavara', lord: 'Moon' },
  { en: 'Tuesday', sa: 'Mangalavara', lord: 'Mars' },
  { en: 'Wednesday', sa: 'Budhavara', lord: 'Mercury' },
  { en: 'Thursday', sa: 'Guruvara', lord: 'Jupiter' },
  { en: 'Friday', sa: 'Shukravara', lord: 'Venus' },
  { en: 'Saturday', sa: 'Shanivara', lord: 'Saturn' },
];

/** Sunrise / sunset / solar noon for a place and day (UTC Date in, Dates out). */
export function sunEvents(date, lat, lon) {
  const obs = new A.Observer(lat, lon, 0);
  const dayStart = A.MakeTime(new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0
  )));
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, dayStart, 2);
  const set = A.SearchRiseSet(A.Body.Sun, obs, -1, rise || dayStart, 2);
  const nextRise = rise ? A.SearchRiseSet(A.Body.Sun, obs, +1, A.MakeTime(rise.ut + 0.1), 2) : null;
  const moonrise = A.SearchRiseSet(A.Body.Moon, obs, +1, dayStart, 2);
  const moonset = A.SearchRiseSet(A.Body.Moon, obs, -1, dayStart, 2);
  return {
    sunrise: rise ? rise.date : null,
    sunset: set ? set.date : null,
    nextSunrise: nextRise ? nextRise.date : null,
    moonrise: moonrise ? moonrise.date : null,
    moonset: moonset ? moonset.date : null,
  };
}

/** Complete panchang for an instant + location. */
export function panchang(date, lat, lon, ayKey = 'lahiri') {
  const ay = ayanamsa(date, ayKey);
  const sunT = tropicalLongitude('Sun', date);
  const moonT = tropicalLongitude('Moon', date);
  const sunS = norm360(sunT - ay);
  const moonS = norm360(moonT - ay);

  // Tithi: 12° of Moon-Sun elongation
  const elong = norm360(moonT - sunT);
  const tithiIdx = Math.floor(elong / 12);
  const paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = tithiIdx % 15;
  const tithiName = tithiInPaksha === 14 && paksha === 'Krishna'
    ? 'Amavasya'
    : TITHI_NAMES[tithiInPaksha];

  // Yoga: (Sun + Moon) sidereal / 13°20'
  const yogaIdx = Math.floor(norm360(sunS + moonS) / (360 / 27));
  // Karana: half-tithis
  const karanaNum = Math.floor(elong / 6);
  const karanaName = karanaOf(karanaNum);

  const ev = sunEvents(date, lat, lon);
  const wd = WEEKDAYS[vedicWeekdayIndex(date, ev)];

  return {
    date,
    sunLon: sunS, moonLon: moonS,
    tithi: { index: tithiIdx, name: tithiName, paksha, percent: (elong % 12) / 12 * 100 },
    nakshatra: nakshatraOf(moonS),
    yoga: { index: yogaIdx, name: YOGA_NAMES[yogaIdx] },
    karana: { index: karanaNum, name: karanaName },
    weekday: wd,
    moonPhase: A.MoonPhase(date),
    illumination: A.Illumination(A.Body.Moon, date).phase_fraction * 100,
    ...ev,
    ...inauspiciousWindows(date, lat, lon, ev),
    abhijit: abhijitMuhurat(ev),
  };
}

function karanaOf(n) {
  // 60 half-tithis per lunar month: 1 Kimstughna, 7x8 movable, 3 fixed at the end
  if (n === 0) return 'Kimstughna';
  if (n >= 57) return ['Shakuni', 'Chatushpada', 'Naga'][n - 57];
  return KARANA_NAMES[(n - 1) % 7];
}

/** Vedic day runs sunrise→sunrise, so before sunrise belongs to the previous weekday. */
function vedicWeekdayIndex(date, ev) {
  let idx = date.getUTCDay();
  if (ev.sunrise && date < ev.sunrise) idx = (idx + 6) % 7;
  return idx;
}

/** Rahu Kaal, Yamaganda, Gulika — the classical eighth-part windows. */
function inauspiciousWindows(date, lat, lon, ev) {
  if (!ev.sunrise || !ev.sunset) return { rahuKaal: null, yamaganda: null, gulika: null };
  const start = ev.sunrise.getTime();
  const dayLen = ev.sunset.getTime() - start;
  const part = dayLen / 8;
  const wd = vedicWeekdayIndex(date, ev);
  //             Sun Mon Tue Wed Thu Fri Sat
  const rahu = [8, 2, 7, 5, 6, 4, 3][wd] - 1;
  const yama = [5, 4, 3, 2, 1, 7, 6][wd] - 1;
  const guli = [7, 6, 5, 4, 3, 2, 1][wd] - 1;
  const win = (i) => ({ start: new Date(start + i * part), end: new Date(start + (i + 1) * part) });
  return { rahuKaal: win(rahu), yamaganda: win(yama), gulika: win(guli) };
}

/** Abhijit muhurat — the 8th of 15 equal day-parts, centred on solar noon. */
function abhijitMuhurat(ev) {
  if (!ev.sunrise || !ev.sunset) return null;
  const s = ev.sunrise.getTime(), len = ev.sunset.getTime() - s, p = len / 15;
  return { start: new Date(s + 7 * p), end: new Date(s + 8 * p) };
}

/* ------------------------------------------------------------------ *
 * Ashtakoota (Guna Milan) compatibility — 36 points
 * ------------------------------------------------------------------ */

const VARNA = [3, 2, 1, 0]; // by nakshatra-derived sign group: Brahmin..Shudra
const SIGN_VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]; // Ksh,Vai,Shu,Bra pattern by sign
const VASHYA_GROUP = ['Q', 'Q', 'H', 'W', 'Q2', 'H', 'H', 'W', 'H2', 'W2', 'H', 'W'];

const NAK_GANA = [
  0, 1, 2, 0, 0, 1, 0, 0, 2, 2, 1, 1, 0, 1, 0, 2, 0, 2, 2, 1, 1, 0, 2, 1, 1, 0, 0,
]; // 0 Deva, 1 Manushya, 2 Rakshasa

const NAK_YONI = [
  0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 7, 8, 9, 9, 10, 11, 10, 12, 11, 13, 12, 13, 0,
];
const YONI_ANIMALS = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow',
  'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];

const NAK_NADI = [
  0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0, 0, 1, 2, 0, 1, 2, 2, 1, 0,
]; // 0 Adi(Vata), 1 Madhya(Pitta), 2 Antya(Kapha)

const PLANET_FRIENDSHIP = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};

function relation(a, b) {
  if (a === b) return 2;
  const f = PLANET_FRIENDSHIP[a];
  if (!f) return 1;
  if (f.friends.includes(b)) return 2;
  if (f.enemies.includes(b)) return 0;
  return 1;
}

/** Compute the 8 kootas between two charts. Returns 36-point breakdown. */
export function ashtakoota(chartA, chartB) {
  const mA = chartA.planets.Moon, mB = chartB.planets.Moon;
  const nA = mA.nakshatra.index, nB = mB.nakshatra.index;
  const sA = mA.sign, sB = mB.sign;

  // 1. Varna (1)
  const varna = SIGN_VARNA[sB] <= SIGN_VARNA[sA] ? 1 : 0;

  // 2. Vashya (2)
  const vashya = vashyaScore(sA, sB);

  // 3. Tara (3)
  const tara = taraScore(nA, nB);

  // 4. Yoni (4)
  const yoni = yoniScore(NAK_YONI[nA], NAK_YONI[nB]);

  // 5. Graha Maitri (5)
  const lordA = SIGNS[sA].lord, lordB = SIGNS[sB].lord;
  const r1 = relation(lordA, lordB), r2 = relation(lordB, lordA);
  const maitriTable = [[0, 1, 0.5], [1, 5, 4], [0.5, 4, 3]];
  const maitri = lordA === lordB ? 5 : maitriTable[r1][r2];

  // 6. Gana (6)
  const gana = ganaScore(NAK_GANA[nA], NAK_GANA[nB]);

  // 7. Bhakoot (7)
  const bhakoot = bhakootScore(sA, sB);

  // 8. Nadi (8)
  const nadi = NAK_NADI[nA] === NAK_NADI[nB] ? 0 : 8;

  const items = [
    { key: 'Varna', got: varna, max: 1, note: 'Spiritual ego & work compatibility' },
    { key: 'Vashya', got: vashya, max: 2, note: 'Mutual influence and magnetism' },
    { key: 'Tara', got: tara, max: 3, note: 'Destiny, health and fortune' },
    { key: 'Yoni', got: yoni, max: 4, note: `Intimacy — ${YONI_ANIMALS[NAK_YONI[nA]]} & ${YONI_ANIMALS[NAK_YONI[nB]]}` },
    { key: 'Graha Maitri', got: maitri, max: 5, note: `Mental affinity — ${lordA} & ${lordB}` },
    { key: 'Gana', got: gana, max: 6, note: 'Temperament and nature' },
    { key: 'Bhakoot', got: bhakoot, max: 7, note: 'Love, family growth and prosperity' },
    { key: 'Nadi', got: nadi, max: 8, note: 'Health, genes and progeny' },
  ];
  const total = items.reduce((a, b) => a + b.got, 0);

  return {
    items, total, max: 36,
    verdict: verdictFor(total),
    manglikA: manglikDosha(chartA),
    manglikB: manglikDosha(chartB),
  };
}

function vashyaScore(a, b) {
  const g = (s) => {
    if ([0, 1, 8, 9].includes(s)) return 'quad';   // Aries, Taurus, Sagittarius(1st half), Capricorn
    if ([3, 7, 11].includes(s)) return 'water';
    if ([4].includes(s)) return 'wild';
    return 'human';
  };
  const ga = g(a), gb = g(b);
  if (ga === gb) return 2;
  if ((ga === 'human' && gb === 'quad') || (ga === 'quad' && gb === 'human')) return 1;
  if (ga === 'wild' || gb === 'wild') return 0.5;
  return 1;
}

function taraScore(nA, nB) {
  const f = ((nB - nA + 27) % 27 + 1) % 9;
  const m = ((nA - nB + 27) % 27 + 1) % 9;
  const good = (x) => ![3, 5, 7, 0].includes(x) ? 1.5 : 0; // 3rd,5th,7th & 9th-multiple are inauspicious
  return good(f) + good(m);
}

function yoniScore(ya, yb) {
  if (ya === yb) return 4;
  const enemies = [[0, 8], [1, 5], [2, 11], [3, 6], [4, 10], [7, 9], [12, 13]];
  if (enemies.some(([x, y]) => (ya === x && yb === y) || (ya === y && yb === x))) return 0;
  const friendly = Math.abs(ya - yb) <= 2;
  return friendly ? 3 : 2;
}

function ganaScore(ga, gb) {
  if (ga === gb) return 6;
  const t = [[6, 5, 1], [5, 6, 0], [1, 0, 6]]; // Deva, Manushya, Rakshasa
  return t[ga][gb];
}

function bhakootScore(a, b) {
  const d1 = ((b - a + 12) % 12) + 1;
  const d2 = ((a - b + 12) % 12) + 1;
  const bad = [[6, 8], [8, 6], [5, 9], [9, 5], [2, 12], [12, 2]];
  return bad.some(([x, y]) => d1 === x && d2 === y) ? 0 : 7;
}

function verdictFor(total) {
  if (total >= 32) return { label: 'Exceptional Match', tone: 'excellent' };
  if (total >= 26) return { label: 'Highly Compatible', tone: 'great' };
  if (total >= 18) return { label: 'Acceptable Match', tone: 'ok' };
  return { label: 'Needs Remedies', tone: 'weak' };
}

/** Manglik (Kuja) dosha — Mars in houses 1,2,4,7,8,12 from lagna. */
export function manglikDosha(chart) {
  const h = chart.planets.Mars.house;
  const flagged = [1, 2, 4, 7, 8, 12].includes(h);
  return {
    present: flagged,
    house: h,
    severity: !flagged ? 'None' : [7, 8].includes(h) ? 'High' : [1, 4].includes(h) ? 'Moderate' : 'Mild',
  };
}

/* ------------------------------------------------------------------ *
 * Yogas & strengths
 * ------------------------------------------------------------------ */

/** Detect classical yogas actually present in the chart. */
export function detectYogas(chart) {
  const p = chart.planets, out = [];
  const inHouse = (n) => Object.values(p).filter((x) => x.house === n);
  const kendra = [1, 4, 7, 10], trikona = [1, 5, 9];

  // Gaja Kesari — Jupiter in a kendra from the Moon
  const jm = ((p.Jupiter.sign - p.Moon.sign) % 12 + 12) % 12 + 1;
  if (kendra.includes(jm)) out.push({
    name: 'Gaja Kesari Yoga', strength: 'Strong',
    text: 'Jupiter sits in a kendra from the Moon — a classical marker of intelligence, reputation and lasting respect.',
  });

  // Budha-Aditya — Sun and Mercury conjunct
  if (p.Sun.sign === p.Mercury.sign) out.push({
    name: 'Budha-Aditya Yoga', strength: 'Strong',
    text: 'Sun conjoins Mercury, sharpening analysis, communication and administrative skill.',
  });

  // Chandra-Mangala — Moon with Mars
  if (p.Moon.sign === p.Mars.sign) out.push({
    name: 'Chandra-Mangala Yoga', strength: 'Moderate',
    text: 'Moon with Mars generates enterprise and an instinct for earning through bold action.',
  });

  // Pancha Mahapurusha yogas
  const mahaMap = { Mars: 'Ruchaka', Mercury: 'Bhadra', Jupiter: 'Hamsa', Venus: 'Malavya', Saturn: 'Sasa' };
  for (const [pl, yn] of Object.entries(mahaMap)) {
    const pp = p[pl];
    if (kendra.includes(pp.house) && ['Exalted', 'Own Sign'].includes(pp.dignity)) {
      out.push({
        name: `${yn} Mahapurusha Yoga`, strength: 'Exceptional',
        text: `${pl} is ${pp.dignity.toLowerCase()} in a kendra — one of the five Mahapurusha combinations conferring distinction.`,
      });
    }
  }

  // Dhana yoga — 2nd/11th lords linked
  const l2 = SIGNS[chart.houses[1].sign].lord, l11 = SIGNS[chart.houses[10].sign].lord;
  if (p[l2] && p[l11] && p[l2].sign === p[l11].sign) out.push({
    name: 'Dhana Yoga', strength: 'Strong',
    text: `Lords of the 2nd (${l2}) and 11th (${l11}) join — a direct wealth-accumulation combination.`,
  });

  // Raja yoga — kendra lord with trikona lord
  for (const k of kendra) for (const tr of trikona) {
    if (k === tr) continue;
    const lk = SIGNS[chart.houses[k - 1].sign].lord, lt = SIGNS[chart.houses[tr - 1].sign].lord;
    if (lk !== lt && p[lk] && p[lt] && p[lk].sign === p[lt].sign) {
      out.push({
        name: 'Raja Yoga', strength: 'Strong',
        text: `${lk} (lord of house ${k}) and ${lt} (lord of house ${tr}) conjoin — authority and rise in status.`,
      });
      k === 10 && tr === 9;
      break;
    }
  }

  // Kemadruma — Moon isolated
  const around = [((p.Moon.sign + 1) % 12), ((p.Moon.sign + 11) % 12)];
  const occupied = Object.values(p).some((x) => x.key !== 'Moon' && x.key !== 'Rahu' && x.key !== 'Ketu' && around.includes(x.sign));
  if (!occupied) out.push({
    name: 'Kemadruma Yoga', strength: 'Caution',
    text: 'No planet flanks the Moon — emotional self-reliance is required; remedies for the Moon are advised.',
  });

  // Deduplicate by name
  const seen = new Set();
  return out.filter((y) => !seen.has(y.name) && seen.add(y.name));
}

/**
 * Simplified Shadbala-style strength (0-100) per planet, blending
 * dignity, house placement, direction and speed.
 */
export function planetStrength(chart) {
  const out = {};
  for (const [k, p] of Object.entries(chart.planets)) {
    let s = 45;
    if (p.dignity === 'Exalted') s += 28;
    else if (p.dignity === 'Own Sign') s += 18;
    else if (p.dignity === 'Debilitated') s -= 22;
    if ([1, 4, 7, 10].includes(p.house)) s += 12;
    if ([5, 9].includes(p.house)) s += 9;
    if ([6, 8, 12].includes(p.house)) s -= 12;
    if (p.retrograde && !['Rahu', 'Ketu'].includes(k)) s += 5;
    // Combustion: too close to the Sun
    if (!['Sun', 'Rahu', 'Ketu'].includes(k)) {
      let d = Math.abs(norm360(p.lon - chart.planets.Sun.lon));
      if (d > 180) d = 360 - d;
      if (d < 8) s -= 15;
      else if (d < 15) s -= 7;
    }
    out[k] = Math.max(5, Math.min(100, Math.round(s)));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Transits (gochara)
 * ------------------------------------------------------------------ */

/** Current transit positions plus their house from the natal Moon and lagna. */
export function transits(chart, when = new Date()) {
  const now = computeChart(when, chart.lat, chart.lon, chart.ayanamsaKey);
  const rows = [];
  for (const g of GRAHAS) {
    const t = now.planets[g.key];
    rows.push({
      ...t,
      fromMoon: ((t.sign - chart.moonSign) % 12 + 12) % 12 + 1,
      fromLagna: ((t.sign - chart.ascendantSign) % 12 + 12) % 12 + 1,
    });
  }
  // Sade Sati: Saturn transiting 12th, 1st or 2nd from natal Moon
  const sat = rows.find((r) => r.key === 'Saturn');
  const sadeSati = [12, 1, 2].includes(sat.fromMoon);
  return {
    when, rows, chart: now,
    sadeSati: {
      active: sadeSati,
      phase: sadeSati ? { 12: 'Rising (first dhaiya)', 1: 'Peak (second dhaiya)', 2: 'Setting (third dhaiya)' }[sat.fromMoon] : null,
    },
  };
}

/**
 * Heliocentric positions for the 3D planetarium (AU, ecliptic J2000).
 *
 * Note: HelioVector/GeoMoon return EQJ (equatorial) vectors. They are rotated
 * into the ecliptic frame here so the x/y/z components genuinely lie in the
 * plane of the zodiac — otherwise every orbit is tilted by the 23.4°
 * obliquity of the ecliptic.
 */
export function heliocentricPositions(date) {
  const t = A.MakeTime(date);
  const rot = A.Rotation_EQJ_ECL();
  const out = {};
  for (const b of ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn']) {
    const eqj = A.HelioVector(b, t);
    const v = A.RotateVector(rot, eqj);
    const e = A.Ecliptic(eqj);
    out[b] = { x: v.x, y: v.y, z: v.z, lon: e.elon, lat: e.elat, dist: Math.hypot(v.x, v.y, v.z) };
  }
  const moon = A.RotateVector(rot, A.GeoMoon(t));
  out.Moon = { x: moon.x, y: moon.y, z: moon.z, dist: Math.hypot(moon.x, moon.y, moon.z) };
  return out;
}

export { A as Astronomy };
