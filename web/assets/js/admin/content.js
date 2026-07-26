/**
 * content.js — the single source of truth for all editable site content.
 *
 * Resolution order (first hit wins per top-level key):
 *   1. localStorage draft   — unpublished admin edits, this browser only
 *   2. content.json         — published content, committed to the repo
 *   3. DEFAULTS below       — shipped fallback, guarantees the site always renders
 *
 * This means the public site never depends on the admin panel being used, and
 * a malformed content.json can never blank the page.
 */

const DRAFT_KEY = 'ajg-content-draft';
const CONTENT_URL = new URL('../../../content.json', import.meta.url).href;

/* ------------------------------------------------------------------ *
 * Shipped defaults
 * ------------------------------------------------------------------ */

export const DEFAULTS = {
  meta: {
    siteName: 'Adi Jyotish Gurus',
    tagline: 'Vedic Astronomy Engine v4.0',
    title: 'Adi Jyotish Gurus — Ancient Wisdom. Modern Intelligence.',
    description:
      'Authentic Vedic astrology powered by a real in-browser ephemeris. High-precision kundli, 16 divisional charts, Vimshottari dasha, live panchang, Ashtakoota matching and an interactive 3D planetarium.',
    repoUrl: 'https://github.com/aman02899999/Jyotish-guru',
  },

  hero: {
    eyebrow: 'Vedic Astronomy Engine v4.0',
    headline: 'Ancient Wisdom.',
    headlineEm: 'Modern Intelligence.',
    lede:
      'Authentic Vedic astrology computed live in your browser from a sub-arcminute ephemeris — no sample data, no server round trip. Enter your birth details and every number on this page recalculates for you.',
    ctaPrimary: { label: 'Start Free Reading', href: '#kundli' },
    ctaSecondary: { label: 'Explore the Planetarium', href: '#planetarium' },
    stats: [
      { value: 9, label: 'Grahas tracked live' },
      { value: 16, label: 'Divisional charts' },
      { value: 27, label: 'Nakshatras mapped' },
      { value: 120, label: 'Year dasha ladder' },
    ],
  },

  sections: [
    { id: 'planetarium', nav: 'Planetarium', visible: true, inNav: true },
    { id: 'kundli', nav: 'Kundli', visible: true, inNav: true },
    { id: 'dasha', nav: 'Dasha', visible: true, inNav: true },
    { id: 'panchang', nav: 'Panchang', visible: true, inNav: true },
    { id: 'events', nav: 'Sky', visible: true, inNav: true },
    { id: 'muhurat', nav: 'Muhurat', visible: true, inNav: true },
    { id: 'numerology', nav: 'Numerology', visible: true, inNav: false },
    { id: 'features', nav: 'Features', visible: true, inNav: false },
    { id: 'matching', nav: 'Matching', visible: true, inNav: true },
    { id: 'oracle', nav: 'Oracle', visible: true, inNav: true },
    { id: 'remedies', nav: 'Remedies', visible: true, inNav: false },
    { id: 'rewards', nav: 'Rewards', visible: true, inNav: false },
    { id: 'testimonials', nav: 'Reviews', visible: true, inNav: false },
    { id: 'pricing', nav: 'Pricing', visible: true, inNav: true },
    { id: 'faq', nav: 'FAQ', visible: true, inNav: false },
  ],

  theme: {
    gold: '#d4af37',
    plum: '#7b5ea7',
    void: '#07050f',
    panel: '#120d21',
    text: '#f0ebff',
  },

  features: [
    { id: 'f1', icon: '✦', title: 'High-Precision Birth Chart', text: 'Sub-arcminute sidereal positions from a VSOP87-class ephemeris, true lunar node and whole-sign houses.', href: '#kundli' },
    { id: 'f2', icon: '◈', title: '16 Divisional Charts', text: 'D1 through D60 generated with the classical Parashari rules — Navamsa, Dasamsa, Shashtiamsa and more.', href: '#kundli' },
    { id: 'f3', icon: '◷', title: 'Vimshottari Dasha', text: 'A full 120-year ladder to three levels, computed from your Moon nakshatra to the day.', href: '#dasha' },
    { id: 'f4', icon: '❋', title: 'Live Vedic Panchang', text: 'Tithi, nakshatra, yoga, karana, sunrise, Rahu Kaal and Abhijit for your exact coordinates.', href: '#panchang' },
    { id: 'f5', icon: '♁', title: '3D WebGL Planetarium', text: 'Real heliocentric positions rendered in an interactive scene you can orbit, zoom and scrub through time.', href: '#planetarium' },
    { id: 'f6', icon: '♥', title: 'Ashtakoota Matching', text: 'All eight kootas scored to 36 points with Manglik dosha analysis from real Mars placement.', href: '#matching' },
    { id: 'f7', icon: '◆', title: 'Graha Strength', text: 'A Shadbala-style score blending dignity, house, combustion, retrogression and directional power.', href: '#kundli' },
    { id: 'f8', icon: '✧', title: 'Gemstone & Remedies', text: 'Targeted at your genuinely weakest grahas, with gems limited to functional benefics for your lagna.', href: '#remedies' },
    { id: 'f9', icon: '☉', title: 'Chart Reasoning Engine', text: 'Ask questions in plain language and get answers derived from your placements, not generic text.', href: '#oracle' },
  ],

  campaigns: [
    {
      id: 'campaign_sade_sati', enabled: true, icon: '🪐', badge: 'PERSONALISED ALERT',
      title: 'Sade Sati Support Plan', subtitle: 'Saturn is transiting your Moon',
      body: 'Your chart shows an active Sade Sati cycle. Unlock the full 7.5-year breakdown, phase-by-phase timing and Saturn remedies.',
      cta: 'See my Saturn plan', action: 'OPEN_SECTION', target: '#dasha', tone: 'alert',
      condition: 'sadeSati',
    },
    {
      id: 'campaign_retrograde', enabled: true, icon: '☿', badge: 'SKY EVENT',
      title: 'Mercury Retrograde Ahead', subtitle: 'Time contracts and travel carefully',
      body: 'A Mercury station is coming up in the next 45 days. Check which house it hits in your chart before signing anything.',
      cta: 'Open the sky calendar', action: 'OPEN_SECTION', target: '#events', tone: 'info',
      condition: 'mercuryRetro',
    },
    {
      id: 'campaign_eclipse', enabled: true, icon: '🌑', badge: 'GRAHAN WATCH',
      title: 'Eclipse Season Approaching', subtitle: 'Sutak timing and precautions',
      body: 'An eclipse falls within the next 60 days. Classical texts advise pausing new ventures and increasing mantra during the sutak window.',
      cta: 'View eclipse details', action: 'OPEN_SECTION', target: '#events', tone: 'alert',
      condition: 'eclipseSoon',
    },
    {
      id: 'campaign_muhurat', enabled: true, icon: '🔱', badge: 'MOST USED TOOL',
      title: 'Find Your Auspicious Date', subtitle: 'Muhurat for marriage, business, travel',
      body: 'Scan the next 90 days and rank every date by nakshatra, tithi and weekday — personalised against your own Moon.',
      cta: 'Open muhurat finder', action: 'OPEN_SECTION', target: '#muhurat', tone: 'gold',
      condition: 'always',
    },
    {
      id: 'campaign_referral', enabled: true, icon: '🤝', badge: 'EARN REWARDS',
      title: 'Invite Fellow Seekers', subtitle: 'Both of you unlock Pro features',
      body: "Share your personal referral code. When a friend calculates their first chart, you both unlock the Pro report export.",
      cta: 'Get my referral code', action: 'REFER_FRIEND', target: '', tone: 'gold',
      condition: 'always',
    },
    {
      id: 'campaign_pro', enabled: true, icon: '👑', badge: 'BEST VALUE',
      title: 'Jyotish Pro — Annual', subtitle: 'Save 40% versus monthly',
      body: 'Unlimited AI synthesis, all 16 vargas exported to PDF, live muhurat alerts and five-level dasha depth.',
      cta: 'Compare plans', action: 'SUBSCRIBE', target: '#pricing', tone: 'plum',
      condition: 'always',
    },
  ],

  plans: [
    {
      id: 'free', name: 'Seeker', monthly: 0, annual: 0, highlight: false,
      tagline: 'Everything you need for an honest reading', cta: 'Start free',
      features: [
        'Full D1 birth chart with true positions',
        'All nine grahas, nakshatras and padas',
        'Vimshottari dasha — three levels',
        'Live panchang and muhurat windows',
        'Ashtakoota matching',
        '3D planetarium',
        'Offline chart reasoning engine',
      ],
    },
    {
      id: 'pro', name: 'Jyotish Pro', monthly: 9, annual: 65, highlight: true,
      tagline: 'For serious students and practitioners', cta: 'Upgrade to Pro',
      features: [
        'Everything in Seeker',
        'All 16 divisional charts exported',
        'Five-level dasha depth',
        'High-resolution PDF reports',
        'AI narrative synthesis',
        'Sky event alerts for your chart',
        'Priority muhurat scanning',
      ],
    },
    {
      id: 'guru', name: 'Guru Consult', monthly: 49, annual: 399, highlight: false,
      tagline: 'Human guidance on top of the maths', cta: 'Talk to a guru',
      features: [
        'Everything in Pro',
        'Monthly live consultation',
        'Written remedial plan',
        'Follow-up questions answered',
        'Family chart bundle (up to 5)',
        'Annual varshphal reading',
      ],
    },
  ],

  testimonials: [
    { id: 't1', name: 'Vikram Patel', role: 'Product Architect · London', initials: 'VP', text: 'The first astrology tool where I could verify the maths. I checked the ascendant and planetary degrees against Swiss Ephemeris and they matched to the arcminute.' },
    { id: 't2', name: 'Ananya Sharma', role: 'Creative Director · Bengaluru', initials: 'AS', text: 'The matching report gave nuanced psychological clarity instead of frightening us with doshas. The Manglik section explained the actual house placement.' },
    { id: 't3', name: 'David Miller', role: 'Founder · San Francisco', initials: 'DM', text: 'I use the muhurat finder before every launch. It ranks real dates by nakshatra and tithi rather than selling me a lucky number.' },
    { id: 't4', name: 'Priya Nair', role: 'Ayurvedic Doctor · Kochi', initials: 'PN', text: 'As a practitioner I need correct vargas. Having D9, D10 and D60 generated properly — and being able to export the JSON — saves me hours.' },
  ],

  faqs: [
    { id: 'q1', q: 'Is the astrology actually calculated, or is it pre-written text?', a: 'Every position is computed in your browser from a VSOP87-class ephemeris. Change the birth time by four minutes and you will see the ascendant move by roughly one degree, and the readings change with it.' },
    { id: 'q2', q: 'Which ayanamsa do you use?', a: "Lahiri (Chitrapaksha) by default, with Raman and Krishnamurti available. Lahiri is pinned to its official definition — 23°15'44\" at the epoch of 21 March 1956 — and precessed from there." },
    { id: 'q3', q: 'Does my birth data leave my device?', a: 'No. The entire engine runs client-side. The only optional network calls are city lookup for geocoding and — if you add your own Gemini key — the AI narrative layer.' },
    { id: 'q4', q: 'Why whole-sign houses instead of Placidus?', a: 'Whole-sign (Rasi) houses are the standard in Parashari Jyotisha, which this engine implements. The Midheaven is still computed if you need the tenth-cusp degree.' },
    { id: 'q5', q: 'How accurate are the planetary positions?', a: 'Sub-arcminute for the Sun, Moon and visible planets between 1700 and 2200 CE. The engine is validated against reference values in an automated test suite that ships with the source.' },
    { id: 'q6', q: 'Do I need to pay to get a real chart?', a: 'No. The complete birth chart, dasha ladder, panchang, matching and planetarium are free and always will be. Paid tiers add export formats, deeper vargas and human consultation.' },
  ],

  astrologers: [
    { id: 'a1', name: 'Pt. Vasudev Shastri', specialty: 'General Kundli Reading', style: 'Traditional Vedic', price: 49, icon: '🕉', languages: 'Hindi, English', bio: 'A third-generation Vedic scholar specializing in Lagna-Rashi charts, planetary strengths (Shadbala), and comprehensive life readings.', visible: true },
    { id: 'a2', name: 'Dr. Aruna Mukherji', specialty: 'Marriage Matching', style: 'Traditional Vedic', price: 149, icon: '💑', languages: 'Bengali, Hindi, English', bio: 'Over 25 years of experience in Guna Milan, analyzing Manglik Dosha, Nadi compatibility, and securing harmonious, lifelong marriages.', visible: true },
    { id: 'a3', name: 'Aacharya Rohit Joshi', specialty: 'Career & Business Timing', style: 'Traditional Vedic', price: 99, icon: '💼', languages: 'Hindi, Gujarati, English', bio: 'Vedic scholar expert in pinpointing professional promotions, business expansion, and career transits using Mahadasha cycles.', visible: true },
    { id: 'a4', name: 'Meera Krishnan', specialty: 'Finance & Wealth (Muhurat)', style: 'Plain Modern Language', price: 79, icon: '💰', languages: 'Tamil, English', bio: 'Modern financial astrologer specializing in auspicious timings for business launches, investments, and wealth-building yogas.', visible: true },
    { id: 'a5', name: 'Swami Anand Giri', specialty: 'Spiritual & Karmic Path', style: 'Traditional Vedic', price: 129, icon: '🧘', languages: 'Sanskrit, Hindi, English', bio: "Understand your soul's blueprint, past life debts, and active karmic blockages. Focused on inner peace and the Moksha path.", visible: true },
  ],

  streakRewards: [
    { days: 3, id: 'streak_3', label: 'Extended daily reading' },
    { days: 7, id: 'streak_7', label: 'Full varga chart set (D1–D60)' },
    { days: 14, id: 'streak_14', label: 'Five-level dasha depth' },
    { days: 30, id: 'streak_30', label: 'Lifetime Pro report export' },
  ],

  offers: [
    { id: 'offer_pro_annual', title: 'Jyotish Pro Annual', discount: '40% off', note: 'Full varga export, unlimited AI synthesis, muhurat alerts.' },
    { id: 'offer_report', title: 'Detailed Life Report', discount: '2 for 1', note: 'A 40-page PDF covering every house, yoga and dasha.' },
    { id: 'offer_matching', title: 'Marriage Matching Bundle', discount: '30% off', note: 'Ashtakoota, Manglik analysis and remedial guidance.' },
  ],
};

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

let published = null;   // parsed content.json
let draft = null;       // localStorage overlay
let resolved = null;    // merged view
const listeners = new Set();

const clone = (v) => (typeof structuredClone === 'function'
  ? structuredClone(v)
  : JSON.parse(JSON.stringify(v)));

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeDraft(d) {
  try {
    if (d === null) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch { /* quota */ }
}

/** Shallow merge per top-level key — a partial draft never loses other keys. */
function merge(base, over) {
  const out = clone(base);
  if (!over) return out;
  for (const k of Object.keys(over)) {
    if (over[k] !== undefined && over[k] !== null) out[k] = clone(over[k]);
  }
  return out;
}

/**
 * Load published content, then overlay any local draft.
 * Never throws — a missing or invalid content.json falls back to DEFAULTS.
 */
export async function loadContent({ withDraft = true } = {}) {
  if (published === null) {
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-cache' });
      published = res.ok ? await res.json() : {};
    } catch {
      published = {};
    }
  }
  draft = withDraft ? readDraft() : null;
  resolved = merge(merge(DEFAULTS, published), draft);
  return resolved;
}

/** Synchronous accessor — call loadContent() once at boot first. */
export function content() {
  if (!resolved) resolved = merge(DEFAULTS, readDraft());
  return resolved;
}

export function get(key) {
  return content()[key];
}

/** Write one top-level key into the draft and notify subscribers. */
export function setDraft(key, value) {
  const d = readDraft() || {};
  d[key] = clone(value);
  writeDraft(d);
  draft = d;
  resolved = merge(merge(DEFAULTS, published || {}), draft);
  emit();
  return resolved;
}

export function hasDraft() {
  const d = readDraft();
  return !!d && Object.keys(d).length > 0;
}

export function draftKeys() {
  const d = readDraft();
  return d ? Object.keys(d) : [];
}

export function discardDraft() {
  writeDraft(null);
  draft = null;
  resolved = merge(DEFAULTS, published || {});
  emit();
  return resolved;
}

/** The exact object that gets written to content.json on publish. */
export function publishPayload() {
  const merged = merge(merge(DEFAULTS, published || {}), readDraft());
  // Only persist the keys the admin panel manages.
  const keys = ['meta', 'hero', 'sections', 'theme', 'features', 'campaigns',
    'plans', 'testimonials', 'faqs', 'astrologers', 'streakRewards', 'offers'];
  const out = {};
  for (const k of keys) out[k] = merged[k];
  out._updated = new Date().toISOString();
  return out;
}

/** Mark the draft as published — clears the overlay, keeps the values. */
export function markPublished(payload) {
  published = clone(payload);
  writeDraft(null);
  draft = null;
  resolved = merge(DEFAULTS, published);
  emit();
  return resolved;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(resolved); } catch (e) { console.error(e); }
  }
}

/** Replace the whole draft (used by the import feature). */
export function importDraft(obj) {
  const errs = validate(obj);
  if (errs.length) throw new Error(errs.join('; '));
  writeDraft(obj);
  draft = obj;
  resolved = merge(merge(DEFAULTS, published || {}), draft);
  emit();
  return resolved;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Structural validation. Returns an array of human-readable problems.
 * Used before publishing so a bad payload can never reach the live site.
 */
export function validate(obj) {
  const e = [];
  if (!obj || typeof obj !== 'object') return ['Content must be an object'];

  if (obj.meta) {
    if (!isStr(obj.meta.siteName) || !obj.meta.siteName.trim()) e.push('meta.siteName is required');
    if (obj.meta.description && obj.meta.description.length > 320) e.push('meta.description should be under 320 characters');
  }

  if (obj.hero) {
    if (!isStr(obj.hero.headline) || !obj.hero.headline.trim()) e.push('hero.headline is required');
    if (obj.hero.stats && !Array.isArray(obj.hero.stats)) e.push('hero.stats must be a list');
    (obj.hero.stats || []).forEach((s, i) => {
      if (!isNum(s.value)) e.push(`hero.stats[${i}].value must be a number`);
      if (!isStr(s.label)) e.push(`hero.stats[${i}].label must be text`);
    });
  }

  const arrays = {
    features: ['id', 'title'],
    campaigns: ['id', 'title'],
    plans: ['id', 'name'],
    testimonials: ['id', 'name'],
    faqs: ['id', 'q'],
    astrologers: ['id', 'name'],
    sections: ['id'],
  };
  for (const [key, required] of Object.entries(arrays)) {
    if (obj[key] === undefined) continue;
    if (!Array.isArray(obj[key])) { e.push(`${key} must be a list`); continue; }
    const seen = new Set();
    obj[key].forEach((row, i) => {
      for (const f of required) {
        if (!row || !isStr(row[f]) || !String(row[f]).trim()) {
          e.push(`${key}[${i}].${f} is required`);
        }
      }
      if (row && row.id) {
        if (seen.has(row.id)) e.push(`${key}: duplicate id "${row.id}"`);
        seen.add(row.id);
      }
    });
  }

  (obj.plans || []).forEach((p, i) => {
    if (p.monthly !== undefined && !isNum(p.monthly)) e.push(`plans[${i}].monthly must be a number`);
    if (p.annual !== undefined && !isNum(p.annual)) e.push(`plans[${i}].annual must be a number`);
    if (p.features && !Array.isArray(p.features)) e.push(`plans[${i}].features must be a list`);
  });

  (obj.astrologers || []).forEach((a, i) => {
    if (a.price !== undefined && (!isNum(a.price) || a.price < 0)) e.push(`astrologers[${i}].price must be a non-negative number`);
  });

  if (obj.theme) {
    for (const [k, v] of Object.entries(obj.theme)) {
      if (!/^#[0-9a-f]{3,8}$/i.test(String(v))) e.push(`theme.${k} must be a hex colour`);
    }
  }

  return e;
}

/** Create a blank row for a given collection — used by the "Add" buttons. */
export function blankRow(kind) {
  const uid = `${kind.slice(0, 2)}_${Date.now().toString(36)}`;
  switch (kind) {
    case 'features': return { id: uid, icon: '✦', title: 'New feature', text: '', href: '#kundli' };
    case 'campaigns': return { id: uid, enabled: true, icon: '✦', badge: 'NEW', title: 'New campaign', subtitle: '', body: '', cta: 'Learn more', action: 'OPEN_SECTION', target: '#kundli', tone: 'gold', condition: 'always' };
    case 'plans': return { id: uid, name: 'New plan', monthly: 0, annual: 0, highlight: false, tagline: '', cta: 'Choose', features: [] };
    case 'testimonials': return { id: uid, name: 'Name', role: 'Role · City', initials: 'NN', text: '' };
    case 'faqs': return { id: uid, q: 'New question?', a: '' };
    case 'astrologers': return { id: uid, name: 'New astrologer', specialty: '', style: 'Traditional Vedic', price: 0, icon: '🕉', languages: '', bio: '', visible: true };
    case 'offers': return { id: uid, title: 'New offer', discount: '', note: '' };
    default: return { id: uid };
  }
}
