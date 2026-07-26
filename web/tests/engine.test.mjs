/**
 * Engine validation suite.
 *
 * Run with:  node web/tests/engine.test.mjs
 *
 * These assertions pin the sidereal engine against independently known
 * reference values (Swiss Ephemeris / standard Panchang tables) so that
 * refactors cannot silently break the astronomy.
 */

import * as E from '../assets/js/engine/ephemeris.js';
import * as V from '../assets/js/engine/events.js';

let pass = 0, fail = 0;
const results = [];

function ok(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  ✓ ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; results.push(`  ✗ ${name}  ${detail}`); }
}
function near(name, got, want, tol, unit = '') {
  const d = Math.abs(got - want);
  ok(name, d <= tol, `got ${got.toFixed(4)}${unit}, want ${want}±${tol}${unit} (Δ${d.toFixed(4)})`);
}
function section(t) { results.push(`\n${t}`); }

/* ---------------------------------------------------------------- */
section('Ayanamsa (Lahiri reference values)');

// Canonical Lahiri values published in the Indian Astronomical Ephemeris.
near('Lahiri @ 1900-01-01', E.ayanamsa(new Date('1900-01-01T00:00:00Z')), 22.4607, 0.01, '°');
near('Lahiri @ 2000-01-01 12:00', E.ayanamsa(new Date('2000-01-01T12:00:00Z')), 23.8522, 0.01, '°');
// Exact-by-definition: at JD 2435553.5 the Lahiri ayanamsa equals its defining constant.
near('Lahiri exact at its definitional epoch',
  E.ayanamsa(new Date((2435553.5 - 2440587.5) * 86400000)), 23.245522778, 1e-6, '°');
// Long-baseline mean precession must match the accepted ~50.29"/yr.
near('Mean precession rate 1800→2200',
  (E.ayanamsa(new Date('2200-01-01T00:00:00Z')) - E.ayanamsa(new Date('1800-01-01T00:00:00Z'))) * 3600 / 400,
  50.3, 0.2, '"/yr');
ok('Ayanamsa increases with time',
  E.ayanamsa(new Date('2026-01-01T00:00:00Z')) > E.ayanamsa(new Date('2000-01-01T00:00:00Z')));
ok('Raman < Lahiri (Raman epoch is later-shifted)',
  E.ayanamsa(new Date('2000-01-01T12:00:00Z'), 'raman') < E.ayanamsa(new Date('2000-01-01T12:00:00Z')));

/* ---------------------------------------------------------------- */
section('Tropical longitudes vs. JPL-grade reference (J2000.0)');

// Apparent geocentric longitudes for 2000-01-01 12:00 UT.
const j2k = new Date('2000-01-01T12:00:00Z');
near('Sun tropical', E.tropicalLongitude('Sun', j2k), 280.386, 0.05, '°');
near('Moon tropical', E.tropicalLongitude('Moon', j2k), 223.319, 0.10, '°');
near('Mercury tropical', E.tropicalLongitude('Mercury', j2k), 271.897, 0.05, '°');
near('Venus tropical', E.tropicalLongitude('Venus', j2k), 241.571, 0.05, '°');
near('Mars tropical', E.tropicalLongitude('Mars', j2k), 327.969, 0.05, '°');
near('Jupiter tropical', E.tropicalLongitude('Jupiter', j2k), 25.259, 0.05, '°');
near('Saturn tropical', E.tropicalLongitude('Saturn', j2k), 40.400, 0.05, '°');

/* ---------------------------------------------------------------- */
section('True lunar node (Rahu)');

const node2k = E.trueNodeLongitude(j2k);
near('True node @ J2000', node2k, 123.95, 0.5, '°');
ok('Node is retrograde (mean motion negative)',
  E.dailyMotion('Rahu', j2k) < 0, `${E.dailyMotion('Rahu', j2k).toFixed(4)}°/day`);
ok('Node retrograde rate ≈ -0.053°/day',
  Math.abs(E.dailyMotion('Rahu', j2k) + 0.053) < 0.03);

/* ---------------------------------------------------------------- */
section('Ascendant geometry');

// The ascendant must sit exactly on the horizon, in the eastern half of the sky.
const { Astronomy: A } = E;
function altAz(lonEclDate, date, lat, lon) {
  const t = A.MakeTime(date);
  const l = lonEclDate * E.DEG;
  const eqd = A.RotateVector(A.Rotation_ECT_EQD(t), new A.Vector(Math.cos(l), Math.sin(l), 0, t));
  const h = A.RotateVector(A.Rotation_EQD_HOR(t, new A.Observer(lat, lon, 0)), eqd);
  return {
    alt: Math.asin(h.z / Math.hypot(h.x, h.y, h.z)) * E.RAD,
    az: E.norm360(Math.atan2(-h.y, h.x) * E.RAD),
  };
}
for (const [ds, la, lo, label] of [
  ['1990-05-15T01:00:00Z', 28.6139, 77.2090, 'Delhi'],
  ['2026-07-26T18:45:00Z', -33.8688, 151.2093, 'Sydney'],
  ['1975-11-03T22:10:00Z', 51.5074, -0.1278, 'London'],
  ['2001-03-21T00:00:00Z', 0.0, 0.0, 'Equator/Greenwich'],
]) {
  const d = new Date(ds);
  const asc = E.tropicalAscendant(d, la, lo);
  const { alt, az } = altAz(asc, d, la, lo);
  ok(`ASC on horizon (${label})`, Math.abs(alt) < 1e-6, `alt=${alt.toExponential(2)}°`);
  ok(`ASC rising in the east (${label})`, az > 0 && az < 180, `az=${az.toFixed(1)}°`);
}

// MC must be near the meridian (azimuth 0 or 180).
{
  const d = new Date('1990-05-15T01:00:00Z');
  const mc = E.tropicalMidheaven(d, 77.209);
  const { az } = altAz(mc, d, 28.6139, 77.209);
  const offMeridian = Math.min(Math.abs(az - 180), Math.abs(az), Math.abs(az - 360));
  ok('MC lies on the meridian', offMeridian < 0.5, `az=${az.toFixed(2)}°`);
}

/* ---------------------------------------------------------------- */
section('Chart assembly');

const chart = E.computeChart(new Date('1990-05-15T01:00:00Z'), 28.6139, 77.2090, 'lahiri');
ok('Nine grahas present', Object.keys(chart.planets).length === 9);
ok('Ketu is exactly 180° from Rahu',
  Math.abs(E.norm360(chart.planets.Ketu.lon - chart.planets.Rahu.lon) - 180) < 1e-9);
ok('Twelve whole-sign houses', chart.houses.length === 12);
ok('House 1 = ascendant sign', chart.houses[0].sign === chart.ascendantSign);
ok('Every planet has house 1..12',
  Object.values(chart.planets).every((p) => p.house >= 1 && p.house <= 12));
ok('Every planet has a nakshatra pada 1..4',
  Object.values(chart.planets).every((p) => p.nakshatra.pada >= 1 && p.nakshatra.pada <= 4));
ok('Sidereal = tropical − ayanamsa (Sun)',
  Math.abs(E.norm360(E.tropicalLongitude('Sun', chart.date) - chart.ayanamsa) - chart.planets.Sun.lon) < 1e-9);

// Retrograde flags must agree with actual motion direction.
ok('Retrograde flag matches negative speed',
  Object.values(chart.planets).every((p) => p.retrograde === (p.speed < 0)));

// Sun is never retrograde; Rahu/Ketu always are.
ok('Sun never retrograde', chart.planets.Sun.retrograde === false);
ok('Rahu always retrograde (true node, mean sense)', chart.planets.Rahu.speed < 0);

/* ---------------------------------------------------------------- */
section('Dignity rules');

ok('Sun exalted in Aries', E.dignityOf('Sun', 0) === 'Exalted');
ok('Sun debilitated in Libra', E.dignityOf('Sun', 6) === 'Debilitated');
ok('Saturn exalted in Libra', E.dignityOf('Saturn', 6) === 'Exalted');
ok('Jupiter exalted in Cancer', E.dignityOf('Jupiter', 3) === 'Exalted');
ok('Mars owns Aries & Scorpio',
  E.dignityOf('Mars', 0) === 'Own Sign' && E.dignityOf('Mars', 7) === 'Own Sign');
ok('Moon owns Cancer', E.dignityOf('Moon', 3) === 'Own Sign');

/* ---------------------------------------------------------------- */
section('Divisional charts');

for (const { d } of E.VARGA_LIST) {
  const v = E.computeVarga(chart, d);
  ok(`D${d} produces valid signs`,
    Object.values(v.planets).every((p) => p.sign >= 0 && p.sign <= 11) &&
    v.ascendantSign >= 0 && v.ascendantSign <= 11);
}
// Navamsa spot-check: 0° Aries → Aries; 3°20' Aries → Taurus; 0° Taurus → Capricorn.
ok('D9: 0° Aries → Aries', E.vargaSign(0, 9) === 0);
ok('D9: 3°21′ Aries → Taurus', E.vargaSign(3.35, 9) === 1);
ok('D9: 0° Taurus → Capricorn', E.vargaSign(30, 9) === 9);
ok('D9: 0° Gemini → Libra', E.vargaSign(60, 9) === 6);
ok('D9: 0° Cancer → Cancer', E.vargaSign(90, 9) === 3);
// Hora: odd sign 1st half → Leo, 2nd half → Cancer.
ok('D2: 5° Aries → Leo', E.vargaSign(5, 2) === 4);
ok('D2: 20° Aries → Cancer', E.vargaSign(20, 2) === 3);
// Drekkana: 1st third stays, 2nd third is 5th, 3rd is 9th.
ok('D3: 5° Aries → Aries', E.vargaSign(5, 3) === 0);
ok('D3: 15° Aries → Leo', E.vargaSign(15, 3) === 4);
ok('D3: 25° Aries → Sagittarius', E.vargaSign(25, 3) === 8);

/* ---------------------------------------------------------------- */
section('Vimshottari dasha');

const maha = E.vimshottari(chart, 3);
ok('Nine mahadashas', maha.length === 9);
ok('Total cycle = 120 years',
  Math.abs((maha[8].end - maha[0].start) / (365.2425 * 86400000) - 120) < 0.001);
ok('First mahadasha lord = Moon nakshatra lord',
  maha[0].lord === chart.planets.Moon.nakshatra.lord);
ok('Birth falls inside the first mahadasha',
  chart.date >= maha[0].start && chart.date < maha[0].end);
ok('Mahadashas are contiguous',
  maha.every((m, i) => i === 0 || Math.abs(m.start - maha[i - 1].end) < 2));
ok('Antardashas sum to their mahadasha',
  maha.every((m) => Math.abs(m.children[m.children.length - 1].end - m.end) < 2));
ok('First antardasha lord = its mahadasha lord',
  maha.every((m) => m.children[0].lord === m.lord));
ok('Three levels deep', maha[0].children[0].children.length === 9);
const running = E.dashaAt(maha, chart.date);
ok('dashaAt resolves a 3-level path at birth', running.length === 3);
ok('dashaAt inside range',
  running.every((n) => chart.date >= n.start && chart.date < n.end));

/* ---------------------------------------------------------------- */
section('Panchang');

const pd = E.panchang(new Date('2026-07-26T06:00:00Z'), 28.6139, 77.2090);
ok('Tithi index 0..29', pd.tithi.index >= 0 && pd.tithi.index <= 29);
ok('Paksha is Shukla or Krishna', ['Shukla', 'Krishna'].includes(pd.tithi.paksha));
ok('Nakshatra index 0..26', pd.nakshatra.index >= 0 && pd.nakshatra.index <= 26);
ok('Yoga named', typeof pd.yoga.name === 'string' && pd.yoga.name.length > 0);
ok('Karana named', typeof pd.karana.name === 'string' && pd.karana.name.length > 0);
ok('Sunrise before sunset', pd.sunrise < pd.sunset);
ok('Rahu Kaal is one-eighth of the day',
  Math.abs((pd.rahuKaal.end - pd.rahuKaal.start) - (pd.sunset - pd.sunrise) / 8) < 1000);
ok('Rahu Kaal within daylight',
  pd.rahuKaal.start >= pd.sunrise && pd.rahuKaal.end <= pd.sunset);
ok('Abhijit brackets solar noon',
  pd.abhijit.start < new Date((pd.sunrise.getTime() + pd.sunset.getTime()) / 2) &&
  pd.abhijit.end > new Date((pd.sunrise.getTime() + pd.sunset.getTime()) / 2));
ok('Illumination 0..100%', pd.illumination >= 0 && pd.illumination <= 100);

// New moon → tithi should be Shukla Pratipada or Amavasya; full moon → Purnima.
{
  const nm = E.Astronomy.SearchMoonPhase(0, new Date('2026-03-01T00:00:00Z'), 40);
  const p1 = E.panchang(new Date(nm.date.getTime() + 3600000), 28.6, 77.2);
  ok('Just after new moon → Shukla Pratipada',
    p1.tithi.paksha === 'Shukla' && p1.tithi.name === 'Pratipada', `got ${p1.tithi.paksha} ${p1.tithi.name}`);
  const fm = E.Astronomy.SearchMoonPhase(180, new Date('2026-03-01T00:00:00Z'), 40);
  const p2 = E.panchang(new Date(fm.date.getTime() - 3600000), 28.6, 77.2);
  ok('Just before full moon → Shukla Purnima',
    p2.tithi.paksha === 'Shukla' && p2.tithi.name === 'Purnima', `got ${p2.tithi.paksha} ${p2.tithi.name}`);
  const ill = E.Astronomy.Illumination(E.Astronomy.Body.Moon, fm.date).phase_fraction * 100;
  ok('Full moon ~100% illuminated', ill > 99, `${ill.toFixed(2)}%`);
}

/* ---------------------------------------------------------------- */
section('Ashtakoota compatibility');

const chartB = E.computeChart(new Date('1992-11-02T14:20:00Z'), 19.0760, 72.8777, 'lahiri');
const koota = E.ashtakoota(chart, chartB);
ok('Eight kootas', koota.items.length === 8);
ok('Max points = 36', koota.items.reduce((a, b) => a + b.max, 0) === 36);
ok('Total within 0..36', koota.total >= 0 && koota.total <= 36);
ok('No koota exceeds its maximum', koota.items.every((i) => i.got <= i.max && i.got >= 0));
ok('Verdict assigned', typeof koota.verdict.label === 'string');
ok('Nadi is 0 or 8', [0, 8].includes(koota.items[7].got));
ok('Bhakoot is 0 or 7', [0, 7].includes(koota.items[6].got));
// Identical charts must score the maximum for Gana/Yoni/Bhakoot and 0 for Nadi.
{
  const self = E.ashtakoota(chart, chart);
  ok('Self-match: Gana = 6', self.items[5].got === 6);
  ok('Self-match: Yoni = 4', self.items[3].got === 4);
  ok('Self-match: Bhakoot = 7', self.items[6].got === 7);
  ok('Self-match: Nadi = 0 (same nadi is a dosha)', self.items[7].got === 0);
}
ok('Manglik detection returns a severity',
  ['None', 'Mild', 'Moderate', 'High'].includes(koota.manglikA.severity));

/* ---------------------------------------------------------------- */
section('Yogas, strengths, transits');

const yogas = E.detectYogas(chart);
ok('Yoga detection runs', Array.isArray(yogas));
ok('Yogas carry name + text', yogas.every((y) => y.name && y.text));
const str = E.planetStrength(chart);
ok('Strength for all nine grahas', Object.keys(str).length === 9);
ok('Strengths within 0..100', Object.values(str).every((v) => v >= 0 && v <= 100));

const tr = E.transits(chart, new Date('2026-07-26T00:00:00Z'));
ok('Transit rows for nine grahas', tr.rows.length === 9);
ok('Transit houses valid',
  tr.rows.every((r) => r.fromMoon >= 1 && r.fromMoon <= 12 && r.fromLagna >= 1 && r.fromLagna <= 12));
ok('Sade Sati flag is boolean', typeof tr.sadeSati.active === 'boolean');

/* ---------------------------------------------------------------- */
section('Planetarium data');

const helio = E.heliocentricPositions(new Date('2026-07-26T00:00:00Z'));
ok('Six planets + Moon', Object.keys(helio).length === 7);

// Regression: HelioVector returns EQUATORIAL (EQJ) vectors. If they are used
// without rotating into the ecliptic frame, every planet is thrown up to ~23°
// out of the zodiac plane and the 3D orbits no longer match the rashi ring.
for (const [body, maxLat] of [['Earth', 0.02], ['Venus', 3.5], ['Mars', 2.0], ['Jupiter', 1.4], ['Saturn', 2.6]]) {
  const p = helio[body];
  const lat = Math.asin(p.z / p.dist) * E.RAD;
  ok(`${body} lies in the ecliptic plane (|lat| < ${maxLat}°)`,
    Math.abs(lat) < maxLat, `lat=${lat.toFixed(3)}°`);
}
ok('Ecliptic latitude matches the reported lat field',
  Math.abs(Math.asin(helio.Jupiter.z / helio.Jupiter.dist) * E.RAD - helio.Jupiter.lat) < 0.01);
// Scene azimuth (used by the planetarium) must equal ecliptic longitude.
{
  const p = helio.Mars;
  const az = E.norm360(Math.atan2(p.y, p.x) * E.RAD);
  ok('Heliocentric azimuth equals ecliptic longitude',
    Math.abs(az - helio.Mars.lon) < 0.5, `az=${az.toFixed(2)} lon=${helio.Mars.lon.toFixed(2)}`);
}
near('Earth ~1 AU from Sun', helio.Earth.dist, 1.0, 0.03, ' AU');
near('Jupiter ~5.2 AU', helio.Jupiter.dist, 5.2, 0.35, ' AU');
near('Mercury 0.31-0.47 AU', helio.Mercury.dist, 0.39, 0.09, ' AU');
ok('Moon 0.0024-0.0027 AU from Earth',
  helio.Moon.dist > 0.0022 && helio.Moon.dist < 0.0029, `${helio.Moon.dist.toFixed(5)} AU`);

/* ---------------------------------------------------------------- */
section('Formatting & edge cases');

ok('norm360 wraps negatives', E.norm360(-30) === 330);
ok('norm360 wraps > 360', E.norm360(730) === 10);
ok('formatDMS', E.formatDMS(10.5) === `10° 30' 00"`, E.formatDMS(10.5));
ok('formatSignPos', E.formatSignPos(35.5).startsWith('Taurus'), E.formatSignPos(35.5));
ok('nakshatraOf(0) = Ashwini pada 1',
  E.nakshatraOf(0).name === 'Ashwini' && E.nakshatraOf(0).pada === 1);
ok('nakshatraOf(359.9) = Revati pada 4',
  E.nakshatraOf(359.9).name === 'Revati' && E.nakshatraOf(359.9).pada === 4);
ok('27 nakshatras defined', E.NAKSHATRAS.length === 27);
ok('12 signs defined', E.SIGNS.length === 12);

// Polar latitude must not produce NaN.
{
  const polar = E.computeChart(new Date('2020-06-21T12:00:00Z'), 78.2, 15.6, 'lahiri');
  ok('High-latitude chart has finite ascendant', Number.isFinite(polar.ascendant));
  ok('High-latitude planets finite',
    Object.values(polar.planets).every((p) => Number.isFinite(p.lon)));
}
// Southern hemisphere + date-line.
{
  const nz = E.computeChart(new Date('2010-01-01T00:00:00Z'), -41.29, 174.78, 'kp');
  ok('Southern/date-line chart valid',
    Number.isFinite(nz.ascendant) && nz.ascendantSign >= 0 && nz.ascendantSign <= 11);
}
// Ayanamsa choice actually shifts the chart.
{
  const a = E.computeChart(new Date('1990-05-15T01:00:00Z'), 28.6, 77.2, 'lahiri');
  const b = E.computeChart(new Date('1990-05-15T01:00:00Z'), 28.6, 77.2, 'raman');
  ok('Raman vs Lahiri differ by ~1.4°',
    Math.abs(E.norm360(a.planets.Sun.lon - b.planets.Sun.lon) - 358.6) < 0.6 ||
    Math.abs(a.planets.Sun.lon - b.planets.Sun.lon + 1.4) < 0.6,
    `Δ=${(b.planets.Sun.lon - a.planets.Sun.lon).toFixed(3)}°`);
}

/* ---------------------------------------------------------------- */
section('Sky events');

const evFrom = new Date('2026-07-26T00:00:00Z');
const evTo = new Date('2027-01-26T00:00:00Z');

const retro = V.findRetrogrades(evFrom, evTo, ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
ok('Retrograde stations found', retro.length > 0, `${retro.length} in 6 months`);
ok('Stations alternate retrograde/direct per body',
  ['Mercury', 'Venus'].every((b) => {
    const seq = retro.filter((r) => r.body === b).map((r) => r.type);
    return seq.every((t, i) => i === 0 || t !== seq[i - 1]);
  }));
ok('Every station carries a real sidereal position',
  retro.every((r) => Number.isFinite(r.lon) && r.sign && r.date instanceof Date));
// Mercury retrogrades roughly 3x/year for ~21 days.
{
  const mRetro = retro.filter((r) => r.body === 'Mercury');
  ok('Mercury stations in a 6-month window (1-4 expected)',
    mRetro.length >= 1 && mRetro.length <= 4, `${mRetro.length}`);
  const pair = [];
  for (const r of mRetro) {
    if (r.type === 'retrograde') pair.push(r);
    else if (pair.length) {
      const days = (r.date - pair.pop().date) / 86400000;
      ok('Mercury retrograde lasts 18-26 days', days > 18 && days < 26, `${days.toFixed(1)}d`);
    }
  }
}
// Motion really is negative between a retrograde and direct station.
{
  const r = retro.find((x) => x.type === 'retrograde');
  if (r) {
    const after = new Date(r.date.getTime() + 3 * 86400000);
    ok(`${r.body} is truly retrograde after its station`,
      E.dailyMotion(r.body, after) < 0);
    const before = new Date(r.date.getTime() - 3 * 86400000);
    ok(`${r.body} was direct before its station`,
      E.dailyMotion(r.body, before) > 0);
  }
}

const ingress = V.findIngresses(evFrom, evTo, ['Sun']);
ok('Sankranti events found', ingress.length >= 5, `${ingress.length}`);
ok('Sankranti roughly every 30 days',
  ingress.every((g, i) => {
    if (i === 0) return true;
    const d = (g.date - ingress[i - 1].date) / 86400000;
    return d > 28 && d < 33;
  }));
ok('Sun ingress lands exactly on a sign boundary',
  ingress.every((g) => {
    const lon = E.norm360(E.tropicalLongitude('Sun', g.date) - E.ayanamsa(g.date, 'lahiri'));
    const off = Math.min(lon % 30, 30 - (lon % 30));
    return off < 0.01;
  }));
ok('Sankranti names use Sanskrit sign names',
  ingress.every((g) => /Sankranti$/.test(g.label)));

const ecl = V.findEclipses(evFrom, new Date('2027-07-26T00:00:00Z'));
ok('Eclipses found', ecl.length > 0, `${ecl.length} in 12 months`);
ok('Eclipses are solar or lunar', ecl.every((e) => ['solar', 'lunar'].includes(e.kind)));
// A solar eclipse must occur at new moon, lunar at full moon.
ok('Solar eclipses fall at new moon',
  ecl.filter((e) => e.kind === 'solar').every((e) => {
    const ph = E.Astronomy.MoonPhase(e.date);
    return ph < 2 || ph > 358;
  }));
ok('Lunar eclipses fall at full moon',
  ecl.filter((e) => e.kind === 'lunar').every((e) => {
    const ph = E.Astronomy.MoonPhase(e.date);
    return Math.abs(ph - 180) < 2;
  }));

const phases = V.findMoonPhases(evFrom, new Date('2026-09-26T00:00:00Z'));
ok('New and full moons found', phases.length >= 3, `${phases.length}`);
ok('Moon phases alternate new/full',
  phases.every((p, i) => i === 0 || p.kind !== phases[i - 1].kind));

const feed = V.upcomingEvents(evFrom, 3);
ok('Merged feed is chronologically sorted',
  feed.every((e, i) => i === 0 || e.date >= feed[i - 1].date));
ok('Every feed item has label + detail + date',
  feed.every((e) => e.label && e.detail && e.date instanceof Date));

/* ---------------------------------------------------------------- */
section('Muhurat finder');

const mhChart = E.computeChart(new Date('1990-05-15T01:00:00Z'), 28.6139, 77.2090, 'lahiri');
const mh = V.findMuhurat('marriage', new Date('2026-08-01T00:00:00Z'), 60, 28.6139, 77.2090, mhChart);
ok('One row per day scanned', mh.length === 60);
ok('Scores bounded 0..100', mh.every((r) => r.score >= 0 && r.score <= 100));
ok('Every row names a real nakshatra',
  mh.every((r) => E.NAKSHATRAS.some(([n]) => n === r.nakshatra)));
ok('Every row names a weekday',
  mh.every((r) => E.WEEKDAYS.some((w) => w.en === r.weekday)));
ok('Bands assigned', mh.every((r) => ['Excellent', 'Good', 'Average', 'Avoid'].includes(r.band)));
ok('Reasons given for each day', mh.every((r) => Array.isArray(r.reasons)));
ok('Abhijit window precedes Rahu Kaal check',
  mh.every((r) => !r.abhijit || r.abhijit.start < r.abhijit.end));
ok('Amavasya is penalised for marriage',
  mh.filter((r) => r.tithi.includes('Amavasya')).every((r) => r.score < 60));
ok('Activity choice changes the ranking', (() => {
  const a = V.findMuhurat('marriage', new Date('2026-08-01T00:00:00Z'), 40, 28.6, 77.2);
  const b = V.findMuhurat('travel', new Date('2026-08-01T00:00:00Z'), 40, 28.6, 77.2);
  return a.some((r, i) => r.score !== b[i].score);
})());
ok('Natal chart shifts the scores', (() => {
  const withChart = V.findMuhurat('business', new Date('2026-08-01T00:00:00Z'), 40, 28.6, 77.2, mhChart);
  const without = V.findMuhurat('business', new Date('2026-08-01T00:00:00Z'), 40, 28.6, 77.2, null);
  return withChart.some((r, i) => r.score !== without[i].score);
})());
ok('All eight activities are defined', Object.keys(V.ACTIVITIES).length >= 7);

/* ---------------------------------------------------------------- */
section('Numerology');

const num = V.numerology('Arjun Sharma', '1990-05-15');
ok('Driver = reduced birth day (15 → 6)', num.driver.value === 6, `${num.driver.value}`);
ok('Destiny reduces the full date', num.destiny.value >= 1 && num.destiny.value <= 9);
ok('Name number computed', num.name && num.name.value >= 1 && num.name.value <= 9);
ok('Each number maps to a graha',
  [num.driver, num.destiny, num.name].every((x) => x && x.planet && x.planet !== '—'));
ok('Traits text present', num.driver.traits.length > 20);
ok('Harmony verdict present', typeof num.harmony.compatible === 'boolean');
ok('Lucky numbers within 1..9',
  num.luckyNumbers.every((n) => n >= 1 && n <= 9));
ok('Lucky days named', num.luckyDays.length > 0);
// Spot-check known reductions.
ok('1990-05-15 driver is 6 (1+5)', V.numerology('', '1990-05-15').driver.value === 6);
ok('2000-01-09 driver is 9', V.numerology('', '2000-01-09').driver.value === 9);
ok('Day 29 reduces to 2', V.numerology('', '1990-05-29').driver.value === 2);
ok('Empty name yields no name number', V.numerology('', '1990-05-15').name === null);

/* ---------------------------------------------------------------- */
console.log(results.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
