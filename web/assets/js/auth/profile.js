/**
 * profile.js — per-account data, scoped by Firebase UID.
 *
 * The site's existing features (saved charts, preferences) store everything
 * under one global localStorage key, which means two people sharing a browser
 * see each other's charts. Signing in namespaces that data by UID.
 *
 * Storage stays local by design: this project ships no database, and birth
 * details are the most sensitive thing a user gives an astrology site. Keeping
 * them on the device means a breach of the hosting account cannot leak them.
 * The account exists to separate and identify users, not to harvest them.
 *
 * `exportForSync()` returns exactly what a future Firestore sync would upload,
 * so adding one later is a transport change, not a rewrite.
 */

const PREFIX = 'ajg-profile';
const ANON = 'anon';

const keyFor = (uid, bucket) => `${PREFIX}:${uid || ANON}:${bucket}`;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Preferences
 * ------------------------------------------------------------------ */

const DEFAULT_PREFS = {
  ayanamsa: 'lahiri',
  chartStyle: 'north',
  theme: null,
  defaultPlace: null,
};

export function preferences(uid) {
  return { ...DEFAULT_PREFS, ...read(keyFor(uid, 'prefs'), {}) };
}

export function setPreference(uid, key, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_PREFS, key)) return false;
  const next = { ...preferences(uid), [key]: value };
  return write(keyFor(uid, 'prefs'), next);
}

/* ------------------------------------------------------------------ *
 * Saved charts
 * ------------------------------------------------------------------ */

const MAX_CHARTS = 200;

export function charts(uid) {
  const list = read(keyFor(uid, 'charts'), []);
  return Array.isArray(list) ? list.filter((c) => c && typeof c === 'object') : [];
}

export function saveChart(uid, record) {
  const list = charts(uid);
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  list.unshift({ id, savedAt: Date.now(), ...record });
  const stored = write(keyFor(uid, 'charts'), list.slice(0, MAX_CHARTS));
  return stored ? id : null;
}

export function deleteChart(uid, id) {
  return write(keyFor(uid, 'charts'), charts(uid).filter((c) => c.id !== id));
}

export function renameChart(uid, id, label) {
  return write(keyFor(uid, 'charts'),
    charts(uid).map((c) => (c.id === id ? { ...c, label: String(label).slice(0, 60) } : c)));
}

export function clearCharts(uid) {
  return write(keyFor(uid, 'charts'), []);
}

/* ------------------------------------------------------------------ *
 * Claiming anonymous work on first sign-in
 * ------------------------------------------------------------------ */

/**
 * Move charts saved before signing in into the new account.
 *
 * Without this, a visitor who calculates three charts and then creates an
 * account watches their work disappear — the single worst moment in any
 * sign-up flow. Merges rather than overwrites, and de-duplicates by id.
 *
 * @returns {number} how many charts were adopted
 */
export function claimAnonymousData(uid) {
  if (!uid) return 0;
  const anon = charts(null);
  if (!anon.length) return 0;

  const mine = charts(uid);
  const seen = new Set(mine.map((c) => c.id));
  const adopted = anon.filter((c) => !seen.has(c.id));
  if (!adopted.length) return 0;

  const merged = [...adopted, ...mine]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_CHARTS);

  if (!write(keyFor(uid, 'charts'), merged)) return 0;
  write(keyFor(null, 'charts'), []);
  return adopted.length;
}

/** Everything this account holds — powers the export button and future sync. */
export function exportForSync(uid) {
  return {
    uid: uid || null,
    exportedAt: new Date().toISOString(),
    preferences: preferences(uid),
    charts: charts(uid),
  };
}

/** Delete every trace of an account from this device. */
export function purge(uid) {
  for (const bucket of ['prefs', 'charts']) {
    try { localStorage.removeItem(keyFor(uid, bucket)); } catch { /* ignore */ }
  }
}
