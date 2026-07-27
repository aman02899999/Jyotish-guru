/**
 * events.js — computed astrological events, muhurat search and numerology.
 *
 * Everything here is derived from the same ephemeris as the kundli: retrograde
 * stations, sign ingresses, eclipses and moon phases are found by scanning and
 * bisecting real planetary motion, not read from a hard-coded table.
 */

import * as E from './ephemeris.js';

const A = E.Astronomy;
const DAY = 86400000;

/* ------------------------------------------------------------------ *
 * Retrograde stations
 * ------------------------------------------------------------------ */

const RETRO_BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

/**
 * Find retrograde and direct stations by locating sign changes in daily motion.
 * Coarse scan, then bisection to the minute.
 */
export function findRetrogrades(from, to, bodies = RETRO_BODIES) {
  const out = [];
  for (const body of bodies) {
    const step = body === 'Mercury' ? 1 : body === 'Venus' ? 2 : 3;
    let prev = E.dailyMotion(body, from);
    for (let t = from.getTime() + step * DAY; t <= to.getTime(); t += step * DAY) {
      const d = new Date(t);
      const cur = E.dailyMotion(body, d);
      if (Math.sign(cur) !== Math.sign(prev) && prev !== 0) {
        const exact = bisect(
          (x) => E.dailyMotion(body, new Date(x)),
          t - step * DAY, t
        );
        const when = new Date(exact);
        const lon = E.norm360(
          E.tropicalLongitude(body, when) - E.ayanamsa(when, 'lahiri')
        );
        out.push({
          type: cur < 0 ? 'retrograde' : 'direct',
          body, date: when,
          sign: E.SIGNS[E.signIndex(lon)].en,
          lon,
          label: `${body} turns ${cur < 0 ? 'retrograde' : 'direct'}`,
          detail: `${body} stations ${cur < 0 ? 'retrograde' : 'direct'} at ${E.formatSignPos(lon)}.`,
        });
      }
      prev = cur;
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

/** Bisect for a sign change in f over [lo, hi] (times in ms). */
function bisect(f, lo, hi, iters = 42) {
  let a = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const m = f(mid);
    if (Math.sign(m) === Math.sign(a)) { lo = mid; a = m; } else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ *
 * Sign ingresses (sankranti / rashi change)
 * ------------------------------------------------------------------ */

/**
 * Sidereal sign changes. The Sun's ingress is Sankranti — the backbone of
 * the Hindu solar calendar (Makar Sankranti, Mesha Sankranti and so on).
 */
export function findIngresses(from, to, bodies = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'], ayKey = 'lahiri') {
  const out = [];
  const sidLon = (body, d) => (body === 'Rahu'
    ? E.norm360(E.trueNodeLongitude(d) - E.ayanamsa(d, ayKey))
    : E.norm360(E.tropicalLongitude(body, d) - E.ayanamsa(d, ayKey)));

  for (const body of bodies) {
    // Moon changes sign every ~2.3 days, outers take months.
    const step = body === 'Moon' ? 0.25 : body === 'Sun' || body === 'Mercury' || body === 'Venus' ? 2 : 5;
    let prevSign = E.signIndex(sidLon(body, from));
    for (let t = from.getTime() + step * DAY; t <= to.getTime(); t += step * DAY) {
      const d = new Date(t);
      const s = E.signIndex(sidLon(body, d));
      if (s !== prevSign) {
        // Bisect on distance to the boundary of the new sign.
        const boundary = s * 30;
        const f = (x) => {
          let diff = sidLon(body, new Date(x)) - boundary;
          while (diff > 180) diff -= 360;
          while (diff < -180) diff += 360;
          return diff;
        };
        const exact = new Date(bisect(f, t - step * DAY, t));
        const isSun = body === 'Sun';
        out.push({
          type: 'ingress',
          body, date: exact, sign: E.SIGNS[s].en, signIndex: s,
          label: isSun ? `${E.SIGNS[s].sa} Sankranti` : `${body} enters ${E.SIGNS[s].en}`,
          detail: isSun
            ? `The Sun enters ${E.SIGNS[s].en} (${E.SIGNS[s].sa}) — ${E.SIGNS[s].sa} Sankranti, the start of the solar month.`
            : `${body} moves into ${E.SIGNS[s].en} (${E.SIGNS[s].sa}), shifting the house it activates in your chart.`,
        });
        prevSign = s;
      }
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

/* ------------------------------------------------------------------ *
 * Eclipses and moon phases
 * ------------------------------------------------------------------ */

export function findEclipses(from, to) {
  const out = [];
  try {
    let e = A.SearchLunarEclipse(from);
    let guard = 0;
    while (e && e.peak.date <= to && guard++ < 40) {
      out.push({
        type: 'eclipse', kind: 'lunar', date: e.peak.date,
        label: `${cap(e.kind)} Lunar Eclipse`,
        detail: `A ${e.kind} lunar eclipse (Chandra Grahan) peaks now. Traditional practice avoids new undertakings and favours mantra during the sutak period.`,
      });
      e = A.NextLunarEclipse(e.peak);
    }
  } catch { /* out of ephemeris range */ }
  try {
    let s = A.SearchGlobalSolarEclipse(from);
    let guard = 0;
    while (s && s.peak.date <= to && guard++ < 40) {
      out.push({
        type: 'eclipse', kind: 'solar', date: s.peak.date,
        label: `${cap(s.kind)} Solar Eclipse`,
        detail: `A ${s.kind} solar eclipse (Surya Grahan) peaks now. Classical texts advise fasting, silence and mantra rather than new beginnings.`,
      });
      s = A.NextGlobalSolarEclipse(s.peak);
    }
  } catch { /* ignore */ }
  return out.sort((a, b) => a.date - b.date);
}

export function findMoonPhases(from, to) {
  const out = [];
  let q = A.SearchMoonQuarter(from);
  let guard = 0;
  while (q && q.time.date <= to && guard++ < 200) {
    if (q.quarter === 0 || q.quarter === 2) {
      out.push({
        type: 'moon',
        kind: q.quarter === 0 ? 'new' : 'full',
        date: q.time.date,
        label: q.quarter === 0 ? 'Amavasya (New Moon)' : 'Purnima (Full Moon)',
        detail: q.quarter === 0
          ? 'New Moon — the darkest tithi, traditionally for ancestor rites (tarpan) and inner reset rather than launches.'
          : 'Full Moon — peak lunar strength, favoured for completion, charity, fasting and spiritual practice.',
      });
    }
    q = A.NextMoonQuarter(q);
  }
  return out;
}

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/**
 * One merged, chronologically sorted feed of everything upcoming.
 * This is what the events calendar renders.
 */
export function upcomingEvents(from = new Date(), months = 6, opts = {}) {
  const to = new Date(from.getTime() + months * 30.44 * DAY);
  const all = [
    ...findRetrogrades(from, to),
    ...findIngresses(from, to, opts.ingressBodies || ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu']),
    ...findEclipses(from, to),
    ...findMoonPhases(from, to),
  ];
  return all.sort((a, b) => a.date - b.date);
}

/** Personalise an event against a natal chart: which house does it hit? */
export function personaliseEvent(ev, chart) {
  if (!chart) return null;
  const lon = ev.lon != null
    ? ev.lon
    : ev.signIndex != null
      ? ev.signIndex * 30
      : null;
  if (lon == null) return null;
  const s = E.signIndex(lon);
  const fromLagna = ((s - chart.ascendantSign) % 12 + 12) % 12 + 1;
  const fromMoon = ((s - chart.moonSign) % 12 + 12) % 12 + 1;
  return { fromLagna, fromMoon };
}

/* ------------------------------------------------------------------ *
 * Muhurat finder
 * ------------------------------------------------------------------ */

/**
 * Activities and the panchang qualities that favour them, drawn from
 * classical muhurta rules.
 */
export const ACTIVITIES = {
  travel: {
    label: 'Travel & journeys',
    goodNak: ['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Anuradha', 'Shravana', 'Dhanishta', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 9, 14],
  },
  business: {
    label: 'Business & new venture',
    goodNak: ['Ashwini', 'Rohini', 'Mrigashira', 'Pushya', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Shravana', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 8, 9, 14],
  },
  marriage: {
    label: 'Marriage & engagement',
    goodNak: ['Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 6, 8, 9, 12, 14],
  },
  property: {
    label: 'Property & housewarming',
    goodNak: ['Rohini', 'Mrigashira', 'Pushya', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 8, 9, 14],
  },
  education: {
    label: 'Study & learning',
    goodNak: ['Ashwini', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Shravana', 'Dhanishta', 'Revati'],
    goodVara: ['Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 9, 14],
  },
  vehicle: {
    label: 'Vehicle purchase',
    goodNak: ['Ashwini', 'Rohini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Anuradha', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday', 'Friday'],
    badTithi: [4, 8, 9, 14],
  },
  medical: {
    label: 'Medical treatment',
    goodNak: ['Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Chitra', 'Anuradha', 'Shravana', 'Revati'],
    goodVara: ['Monday', 'Wednesday', 'Thursday'],
    badTithi: [4, 8, 9, 14],
  },
};

/**
 * Score every day in a range for an activity and return the best windows.
 * The score blends nakshatra suitability, weekday lord, tithi, and — when a
 * natal chart is supplied — the transiting Moon's house from the natal Moon.
 */
export function findMuhurat(activity, fromDate, days, lat, lon, chart = null, ayKey = 'lahiri') {
  const rule = ACTIVITIES[activity] || ACTIVITIES.business;
  const results = [];

  for (let i = 0; i < days; i++) {
    const day = new Date(fromDate.getTime() + i * DAY);
    // Evaluate at local solar noon-ish for a stable daily signature.
    const pan = E.panchang(day, lat, lon, ayKey);
    let score = 46;
    const reasons = [];

    if (rule.goodNak.includes(pan.nakshatra.name)) {
      score += 20;
      reasons.push(`${pan.nakshatra.name} is an auspicious nakshatra for this`);
    } else if (['Bharani', 'Krittika', 'Ardra', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Vishakha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Purva Bhadrapada'].includes(pan.nakshatra.name)) {
      score -= 14;
      reasons.push(`${pan.nakshatra.name} is a sharp/fierce nakshatra`);
    }

    if (rule.goodVara.includes(pan.weekday.en)) {
      score += 12;
      reasons.push(`${pan.weekday.en} (${pan.weekday.lord}) suits the activity`);
    }

    const tNum = (pan.tithi.index % 15) + 1;
    if (rule.badTithi.includes(tNum)) {
      score -= 16;
      reasons.push(`${pan.tithi.name} is a rikta/avoided tithi`);
    } else {
      score += 6;
    }

    if (pan.tithi.paksha === 'Shukla') { score += 8; reasons.push('waxing Moon supports growth'); }
    else { score -= 4; }

    // Amavasya and Purnima are generally avoided for launches.
    if (pan.tithi.name === 'Amavasya') { score -= 20; reasons.push('Amavasya — avoid new beginnings'); }

    if (chart) {
      const moonSign = E.signIndex(pan.moonLon);
      const fromMoon = ((moonSign - chart.moonSign) % 12 + 12) % 12 + 1;
      if ([1, 3, 6, 7, 10, 11].includes(fromMoon)) {
        score += 10;
        reasons.push(`transiting Moon in house ${fromMoon} from your natal Moon is favourable`);
      } else if ([4, 8, 12].includes(fromMoon)) {
        score -= 12;
        reasons.push(`transiting Moon in house ${fromMoon} from your natal Moon is weak`);
      }
    }

    results.push({
      date: day,
      score: Math.max(4, Math.min(98, Math.round(score))),
      nakshatra: pan.nakshatra.name,
      tithi: `${pan.tithi.paksha} ${pan.tithi.name}`,
      weekday: pan.weekday.en,
      abhijit: pan.abhijit,
      rahuKaal: pan.rahuKaal,
      reasons,
      band: score >= 74 ? 'Excellent' : score >= 58 ? 'Good' : score >= 44 ? 'Average' : 'Avoid',
    });
  }
  return results;
}

/* ------------------------------------------------------------------ *
 * Numerology (Vedic / Chaldean)
 * ------------------------------------------------------------------ */

// Chaldean values — the system used alongside Jyotisha in India.
const CHALDEAN = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

const NUM_PLANET = {
  1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury',
  6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars',
};

const NUM_TRAITS = {
  1: 'Leadership, originality and a need to be first. Independent, proud, hard to command.',
  2: 'Sensitivity, intuition and partnership. Diplomatic, changeable, guided by feeling.',
  3: 'Wisdom, teaching and expansion. Optimistic, philosophical, drawn to knowledge and law.',
  4: 'Unconventional drive and sudden turns. Innovative, restless, magnetic under pressure.',
  5: 'Communication, commerce and adaptability. Quick, witty, thriving on variety.',
  6: 'Beauty, relationship and comfort. Artistic, charming, attracting resources with ease.',
  7: 'Detachment, research and mysticism. Introspective, spiritual, uninterested in show.',
  8: 'Discipline, endurance and delayed reward. Serious, structural, powerful over time.',
  9: 'Energy, courage and conflict. Competitive, technical, protective of their own.',
};

function reduceNum(n, keepMaster = false) {
  while (n > 9) {
    if (keepMaster && (n === 11 || n === 22 || n === 33)) return n;
    n = String(n).split('').reduce((a, d) => a + +d, 0);
  }
  return n;
}

/**
 * Full numerology profile from name and date of birth.
 * Driver = birth day, Destiny = full date, Name = Chaldean letter sum.
 */
export function numerology(name, dobString) {
  const [y, m, d] = dobString.split('-').map(Number);
  const driver = reduceNum(d);
  const destiny = reduceNum(
    String(y).split('').reduce((a, x) => a + +x, 0) + reduceNum(m) + reduceNum(d)
  );
  const clean = (name || '').toUpperCase().replace(/[^A-Z]/g, '');
  const nameSum = clean.split('').reduce((a, c) => a + (CHALDEAN[c] || 0), 0);
  const nameNum = reduceNum(nameSum);

  const relation = numRelation(driver, destiny);
  return {
    driver: pack(driver, 'Driver (Mulank)', 'Your surface personality and how you act day to day — from your birth date.'),
    destiny: pack(destiny, 'Destiny (Bhagyank)', 'Your life direction and the results you attract — from your complete date of birth.'),
    name: clean ? { ...pack(nameNum, 'Name number', 'The vibration your name broadcasts — Chaldean values.'), raw: nameSum } : null,
    harmony: relation,
    luckyNumbers: luckyFor(driver, destiny),
    luckyDays: LUCKY_DAYS[driver] || [],
    luckyColors: LUCKY_COLORS[driver] || [],
  };
}

function pack(n, label, meaning) {
  return {
    value: n, label, meaning,
    planet: NUM_PLANET[n] || '—',
    traits: NUM_TRAITS[n] || '',
  };
}

const FRIENDLY = {
  1: [1, 2, 3, 5, 6, 9], 2: [1, 2, 3, 5, 7], 3: [1, 2, 3, 5, 6, 7, 9],
  4: [1, 5, 6, 7, 8], 5: [1, 2, 3, 5, 6, 9], 6: [1, 3, 4, 5, 6, 7, 8],
  7: [2, 3, 4, 6, 7], 8: [4, 5, 6, 8], 9: [1, 2, 3, 5, 9],
};

function numRelation(a, b) {
  const ok = (FRIENDLY[a] || []).includes(b);
  return {
    compatible: ok,
    text: ok
      ? `Your Driver ${a} (${NUM_PLANET[a]}) and Destiny ${b} (${NUM_PLANET[b]}) are in harmony — your natural style and your life results pull in the same direction.`
      : `Your Driver ${a} (${NUM_PLANET[a]}) and Destiny ${b} (${NUM_PLANET[b]}) are not naturally friendly — effort and outcome can feel mismatched until you consciously align them.`,
  };
}

function luckyFor(driver, destiny) {
  const set = new Set([...(FRIENDLY[driver] || []), ...(FRIENDLY[destiny] || [])]);
  return [...set].sort((a, b) => a - b);
}

const LUCKY_DAYS = {
  1: ['Sunday', 'Monday'], 2: ['Monday', 'Friday'], 3: ['Thursday', 'Tuesday'],
  4: ['Saturday', 'Sunday'], 5: ['Wednesday', 'Friday'], 6: ['Friday', 'Wednesday'],
  7: ['Monday', 'Sunday'], 8: ['Saturday', 'Friday'], 9: ['Tuesday', 'Thursday'],
};
const LUCKY_COLORS = {
  1: ['Golden', 'Orange'], 2: ['White', 'Cream'], 3: ['Yellow', 'Saffron'],
  4: ['Grey', 'Electric blue'], 5: ['Green', 'Turquoise'], 6: ['Pastel pink', 'White'],
  7: ['Smoke grey', 'Sea green'], 8: ['Dark blue', 'Black'], 9: ['Red', 'Coral'],
};
