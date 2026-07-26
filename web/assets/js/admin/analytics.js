/**
 * analytics.js — privacy-preserving local usage stats.
 *
 * Records nothing personally identifying and sends nothing anywhere. Events
 * live in this browser's localStorage so the site owner can see how their own
 * deployment behaves without adding a tracking script.
 *
 * Birth details are NEVER recorded. Chart events store only coarse, non-
 * identifying facets (ayanamsa used, ascendant sign) so the dashboard can show
 * distributions without holding anyone's data.
 */

const KEY = 'ajg-analytics';
const SAVED_KEY = 'ajg-saved-charts';
const MAX_EVENTS = 1000;

const read = (k, f) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
};

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ------------------------------------------------------------------ *
 * Recording
 * ------------------------------------------------------------------ */

export function track(type, detail = {}) {
  const events = read(KEY, []);
  events.push({ t: type, d: detail, at: Date.now() });
  write(KEY, events.slice(-MAX_EVENTS));
}

export function events() {
  return read(KEY, []);
}

export function clearAnalytics() {
  write(KEY, []);
}

/** Called once per page load. */
export function trackVisit() {
  track('visit', { ref: document.referrer ? new URL(document.referrer).hostname : 'direct' });
}

/** Non-identifying facets only. */
export function trackChart({ ayanamsa, ascendantSign, moonSign }) {
  track('chart', { ay: ayanamsa, asc: ascendantSign, moon: moonSign });
}

export function trackSection(id) {
  track('section', { id });
}

export function trackAction(name) {
  track('action', { name });
}

/* ------------------------------------------------------------------ *
 * Saved charts (opt-in, stays local)
 * ------------------------------------------------------------------ */

export function savedCharts() {
  return read(SAVED_KEY, []);
}

export function saveChart(record) {
  const list = savedCharts();
  const id = `c_${Date.now().toString(36)}`;
  list.unshift({ id, savedAt: Date.now(), ...record });
  write(SAVED_KEY, list.slice(0, 200));
  return id;
}

export function deleteChart(id) {
  write(SAVED_KEY, savedCharts().filter((c) => c.id !== id));
}

export function updateChart(id, patch) {
  write(SAVED_KEY, savedCharts().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function clearCharts() {
  write(SAVED_KEY, []);
}

/* ------------------------------------------------------------------ *
 * Aggregation for the dashboard
 * ------------------------------------------------------------------ */

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function summary(days = 30) {
  const all = events();
  const cutoff = Date.now() - days * 86400000;
  const recent = all.filter((e) => e.at >= cutoff);

  const byType = {};
  for (const e of recent) byType[e.t] = (byType[e.t] || 0) + 1;

  // Daily series for the sparkline
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = dayKey(d);
    const n = recent.filter((e) => dayKey(new Date(e.at)) === k).length;
    series.push({ day: k, count: n, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }

  // Section popularity
  const sections = {};
  for (const e of recent.filter((x) => x.t === 'section')) {
    sections[e.d.id] = (sections[e.d.id] || 0) + 1;
  }
  const topSections = Object.entries(sections)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  // Ascendant distribution across charts calculated here
  const charts = recent.filter((x) => x.t === 'chart');
  const ascDist = Array.from({ length: 12 }, (_, i) => ({ sign: SIGNS[i], count: 0 }));
  for (const c of charts) {
    if (typeof c.d.asc === 'number' && ascDist[c.d.asc]) ascDist[c.d.asc].count += 1;
  }

  const ayanamsa = {};
  for (const c of charts) ayanamsa[c.d.ay || 'lahiri'] = (ayanamsa[c.d.ay || 'lahiri'] || 0) + 1;

  const actions = {};
  for (const e of recent.filter((x) => x.t === 'action')) {
    actions[e.d.name] = (actions[e.d.name] || 0) + 1;
  }

  const referrers = {};
  for (const e of recent.filter((x) => x.t === 'visit')) {
    referrers[e.d.ref || 'direct'] = (referrers[e.d.ref || 'direct'] || 0) + 1;
  }

  return {
    range: days,
    total: recent.length,
    visits: byType.visit || 0,
    charts: byType.chart || 0,
    sections: byType.section || 0,
    actions: byType.action || 0,
    series,
    topSections,
    ascDist,
    ayanamsa: Object.entries(ayanamsa).map(([k, v]) => ({ key: k, count: v })),
    topActions: Object.entries(actions).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    referrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, count]) => ({ name, count })),
    savedCharts: savedCharts().length,
    firstEvent: all.length ? new Date(all[0].at) : null,
  };
}

/** Everything the admin holds locally, for the export button. */
export function exportAll() {
  return {
    exported: new Date().toISOString(),
    events: events(),
    savedCharts: savedCharts(),
  };
}
