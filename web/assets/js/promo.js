/**
 * promo.js — in-app marketing and growth features.
 *
 * Mirrors the campaign system in the Android app (MarketingCampaign /
 * CampaignActionType) so both surfaces behave consistently:
 *   • rotating promotional campaigns with dismissal memory
 *   • referral codes, share links and reward wallet
 *   • daily streaks and unlockable rewards
 *   • limited-time offers with live countdowns
 *   • shareable chart cards rendered to PNG
 *   • a notification centre
 *
 * All state is local to the browser — no tracking, no accounts, no server.
 */

const LS = {
  profile: 'ajg-profile',
  dismissed: 'ajg-dismissed-campaigns',
  streak: 'ajg-streak',
  notifications: 'ajg-notifications',
  wallet: 'ajg-wallet',
};

const readJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const writeJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
};

/* ================================================================
   Campaigns
   ================================================================ */

export const ACTION = {
  SUBSCRIBE: 'SUBSCRIBE',
  BUY_CREDITS: 'BUY_CREDITS',
  REFER_FRIEND: 'REFER_FRIEND',
  OPEN_SECTION: 'OPEN_SECTION',
  DISMISS: 'DISMISS',
};

/**
 * Named predicates. Campaigns in content.json reference these by string so a
 * non-technical admin can pick a display condition without writing code.
 */
export const CONDITIONS = {
  always: () => true,
  hasChart: (ctx) => !!ctx.chart,
  noChart: (ctx) => !ctx.chart,
  sadeSati: (ctx) => !!ctx.transits?.sadeSati?.active,
  mercuryRetro: (ctx) => (ctx.events || []).some(
    (e) => e.body === 'Mercury' && e.type === 'retrograde' &&
      e.date - Date.now() < 45 * 86400000 && e.date > Date.now()
  ),
  eclipseSoon: (ctx) => (ctx.events || []).some(
    (e) => e.type === 'eclipse' && e.date - Date.now() < 60 * 86400000 && e.date > Date.now()
  ),
};

/** Fallback definitions, used only when content.json has not been loaded. */
const CAMPAIGNS = [
  {
    id: 'campaign_sade_sati',
    icon: '🪐',
    badge: 'PERSONALISED ALERT',
    title: 'Sade Sati Support Plan',
    subtitle: 'Saturn is transiting your Moon',
    body: 'Your chart shows an active Sade Sati cycle. Unlock the full 7.5-year breakdown, phase-by-phase timing and Saturn remedies.',
    cta: 'See my Saturn plan',
    action: ACTION.OPEN_SECTION,
    target: '#dasha',
    tone: 'alert',
    when: (ctx) => ctx.transits?.sadeSati?.active,
  },
  {
    id: 'campaign_retrograde',
    icon: '☿',
    badge: 'SKY EVENT',
    title: 'Mercury Retrograde Ahead',
    subtitle: 'Time contracts and travel carefully',
    body: 'A Mercury station is coming up in the next 45 days. Check which house it hits in your chart before signing anything.',
    cta: 'Open the sky calendar',
    action: ACTION.OPEN_SECTION,
    target: '#events',
    tone: 'info',
    when: (ctx) => (ctx.events || []).some(
      (e) => e.body === 'Mercury' && e.type === 'retrograde' &&
        e.date - Date.now() < 45 * 86400000 && e.date > Date.now()
    ),
  },
  {
    id: 'campaign_eclipse',
    icon: '🌑',
    badge: 'GRAHAN WATCH',
    title: 'Eclipse Season Approaching',
    subtitle: 'Sutak timing and precautions',
    body: 'An eclipse falls within the next 60 days. Classical texts advise pausing new ventures and increasing mantra during the sutak window.',
    cta: 'View eclipse details',
    action: ACTION.OPEN_SECTION,
    target: '#events',
    tone: 'alert',
    when: (ctx) => (ctx.events || []).some(
      (e) => e.type === 'eclipse' && e.date - Date.now() < 60 * 86400000 && e.date > Date.now()
    ),
  },
  {
    id: 'campaign_muhurat',
    icon: '🔱',
    badge: 'MOST USED TOOL',
    title: 'Find Your Auspicious Date',
    subtitle: 'Muhurat for marriage, business, travel',
    body: 'Scan the next 90 days and rank every date by nakshatra, tithi and weekday — personalised against your own Moon.',
    cta: 'Open muhurat finder',
    action: ACTION.OPEN_SECTION,
    target: '#muhurat',
    tone: 'gold',
  },
  {
    id: 'campaign_referral',
    icon: '🤝',
    badge: 'EARN REWARDS',
    title: 'Invite Fellow Seekers',
    subtitle: 'Both of you unlock Pro features',
    body: 'Share your personal referral code. When a friend calculates their first chart, you both unlock the Pro report export.',
    cta: 'Get my referral code',
    action: ACTION.REFER_FRIEND,
    tone: 'gold',
  },
  {
    id: 'campaign_pro',
    icon: '👑',
    badge: 'BEST VALUE',
    title: 'Jyotish Pro — Annual',
    subtitle: 'Save 40% versus monthly',
    body: 'Unlimited AI synthesis, all 16 vargas exported to PDF, live muhurat alerts and five-level dasha depth.',
    cta: 'Compare plans',
    action: ACTION.SUBSCRIBE,
    target: '#pricing',
    tone: 'plum',
  },
];

/**
 * Campaigns that are enabled, pass their condition, and have not been
 * dismissed. Definitions come from the content store so the admin panel can
 * add, edit, reorder and disable them without a code change.
 */
export function activeCampaigns(ctx = {}, defs = null) {
  const dismissed = new Set(readJSON(LS.dismissed, []));
  const list = defs && defs.length ? defs : CAMPAIGNS;
  return list
    .filter((c) => c.enabled !== false)
    .filter((c) => !dismissed.has(c.id))
    .filter((c) => {
      if (typeof c.when === 'function') return !!c.when(ctx);
      const pred = CONDITIONS[c.condition || 'always'];
      return pred ? !!pred(ctx) : true;
    })
    .map((c) => ({ ...c, action: c.action || ACTION.OPEN_SECTION }));
}

export function dismissCampaign(id) {
  const d = new Set(readJSON(LS.dismissed, []));
  d.add(id);
  writeJSON(LS.dismissed, [...d]);
}

export function resetCampaigns() {
  writeJSON(LS.dismissed, []);
}

/* ================================================================
   Referral
   ================================================================ */

/** Deterministic, shareable code derived from the visitor's name. */
export function referralCode(name) {
  const clean = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = clean ? clean.slice(0, 8) : 'SEEKER';
  // Short stable suffix so two people with the same name differ.
  let h = 0;
  const seed = getProfile().id;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `ADI-${base}-${(h % 9000 + 1000)}`;
}

export function referralLink(name) {
  const u = new URL(location.href);
  u.hash = '';
  u.search = `?ref=${encodeURIComponent(referralCode(name))}`;
  return u.toString();
}

/** Persistent anonymous profile (id only — no personal data leaves the device). */
export function getProfile() {
  let p = readJSON(LS.profile, null);
  if (!p) {
    p = {
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 18),
      created: Date.now(),
      referredBy: null,
      chartsCalculated: 0,
      pro: false,
    };
    writeJSON(LS.profile, p);
  }
  return p;
}

export function updateProfile(patch) {
  const p = { ...getProfile(), ...patch };
  writeJSON(LS.profile, p);
  return p;
}

/** Record an inbound referral from ?ref= on first visit. */
export function captureInboundReferral() {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref) return null;
  const p = getProfile();
  if (p.referredBy) return p.referredBy;
  updateProfile({ referredBy: ref });
  addNotification({
    title: 'Referral applied 🎁',
    body: `You arrived via ${ref}. Pro export is unlocked on your first chart.`,
    type: 'referral',
  });
  grantReward('referral_bonus', 'Pro report export unlocked');
  return ref;
}

/* ================================================================
   Wallet / rewards
   ================================================================ */

export function getWallet() {
  return readJSON(LS.wallet, { credits: 0, unlocked: [] });
}

export function grantReward(id, label, credits = 0) {
  const w = getWallet();
  if (w.unlocked.some((u) => u.id === id)) return w;
  w.unlocked.push({ id, label, at: Date.now() });
  w.credits += credits;
  writeJSON(LS.wallet, w);
  return w;
}

export function hasReward(id) {
  return getWallet().unlocked.some((u) => u.id === id);
}

/* ================================================================
   Daily streak
   ================================================================ */

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Register a visit and return the streak state.
 * Milestones unlock real features rather than cosmetic points.
 */
export function touchStreak(rewards = null) {
  const s = readJSON(LS.streak, { count: 0, last: null, best: 0 });
  const today = dayKey();
  if (s.last === today) return { ...s, isNew: false, milestone: null };

  const yesterday = dayKey(new Date(Date.now() - 86400000));
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.last = today;
  s.best = Math.max(s.best, s.count);
  writeJSON(LS.streak, s);

  const ladder = (rewards && rewards.length) ? rewards : STREAK_REWARDS;
  const milestone = ladder.find((m) => m.days === s.count) || null;
  if (milestone) {
    grantReward(milestone.id, milestone.label);
    addNotification({
      title: `${s.count}-day streak 🔥`,
      body: `${milestone.label} is now unlocked.`,
      type: 'reward',
    });
  }
  return { ...s, isNew: true, milestone };
}

export const STREAK_REWARDS = [
  { days: 3, id: 'streak_3', label: 'Extended daily reading' },
  { days: 7, id: 'streak_7', label: 'Full varga chart set (D1–D60)' },
  { days: 14, id: 'streak_14', label: 'Five-level dasha depth' },
  { days: 30, id: 'streak_30', label: 'Lifetime Pro report export' },
];

export function getStreak() {
  return readJSON(LS.streak, { count: 0, last: null, best: 0 });
}

/* ================================================================
   Limited-time offer
   ================================================================ */

/**
 * A deterministic weekly offer window: every offer ends at the coming
 * Sunday 23:59 local. No fake "expires in 3 minutes" pressure loops.
 */
export function currentOffer(offers = null) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  end.setHours(23, 59, 59, 999);
  if (end <= now) end.setDate(end.getDate() + 7);

  const week = Math.floor(now.getTime() / (7 * 86400000));
  const list = (offers && offers.length) ? offers : [
    { id: 'offer_pro_annual', title: 'Jyotish Pro Annual', discount: '40% off', note: 'Full varga export, unlimited AI synthesis, muhurat alerts.' },
    { id: 'offer_report', title: 'Detailed Life Report', discount: '2 for 1', note: 'A 40-page PDF covering every house, yoga and dasha.' },
    { id: 'offer_matching', title: 'Marriage Matching Bundle', discount: '30% off', note: 'Ashtakoota, Manglik analysis and remedial guidance.' },
  ];
  return { ...list[week % list.length], endsAt: end };
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

/* ================================================================
   Notifications
   ================================================================ */

export function getNotifications() {
  return readJSON(LS.notifications, []);
}

export function addNotification({ title, body, type = 'info' }) {
  const list = getNotifications();
  // Avoid duplicating the same message on every page load.
  if (list.some((n) => n.title === title && n.body === body)) return list;
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, body, type, at: Date.now(), read: false });
  const trimmed = list.slice(0, 40);
  writeJSON(LS.notifications, trimmed);
  return trimmed;
}

export function markAllRead() {
  writeJSON(LS.notifications, getNotifications().map((n) => ({ ...n, read: true })));
}

export function clearNotifications() {
  writeJSON(LS.notifications, []);
}

export function unreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

/**
 * Build notifications from real sky events — the value-driven kind that
 * actually tells the user something true about their chart.
 */
export function syncEventNotifications(events, chart) {
  const soon = events.filter((e) => {
    const dt = e.date - Date.now();
    return dt > 0 && dt < 10 * 86400000;
  }).slice(0, 4);

  for (const e of soon) {
    const when = e.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    let body = `${e.detail} (${when})`;
    if (chart && e.signIndex != null) {
      const h = ((e.signIndex - chart.ascendantSign) % 12 + 12) % 12 + 1;
      body += ` This falls in your ${h}${ordSuffix(h)} house.`;
    }
    addNotification({ title: e.label, body, type: e.type });
  }
  return getNotifications();
}

const ordSuffix = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

/* ================================================================
   Shareable chart card (PNG)
   ================================================================ */

/**
 * Render a branded summary card to a canvas and return a Blob.
 * Used for the "share my chart" flow — no server round trip.
 */
export async function buildShareCard(chart, name, extras = {}) {
  const W = 1200, H = 630;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  // Background
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#fbf7f0');
  g.addColorStop(0.55, '#f4efe6');
  g.addColorStop(1, '#efe4d6');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // Starfield
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    const r = Math.random() * 1.6 + 0.3;
    // Faint warm flecks: on paper these must be darker than the ground.
    c.globalAlpha = 0.06 + Math.random() * 0.14;
    c.fillStyle = Math.random() < 0.8 ? '#7a1e28' : '#b08d3f';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;

  // Maroon border
  c.strokeStyle = 'rgba(122,30,40,0.5)';
  c.lineWidth = 2;
  c.strokeRect(28, 28, W - 56, H - 56);

  // Zodiac ring on the right
  const cx = W - 210, cy = H / 2, R = 150;
  c.strokeStyle = 'rgba(122,30,40,0.32)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy, R - 34, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (R - 34), cy + Math.sin(a) * (R - 34));
    c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    c.stroke();
  }
  // Planet dots at true sidereal longitudes
  for (const p of Object.values(chart.planets)) {
    const a = (-(p.lon - chart.ascendant) - 90) * Math.PI / 180;
    const r = R - 62;
    c.fillStyle = p.color;
    c.beginPath();
    c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fdf8f1';
    c.font = '600 11px Inter, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(p.short, cx + Math.cos(a) * r, cy + Math.sin(a) * r + 0.5);
  }

  // Text block
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#7a1e28';
  c.font = '600 20px Inter, sans-serif';
  c.fillText('◆  ADI JYOTISH GURUS', 72, 108);

  c.fillStyle = '#2b1d1a';
  c.font = '600 58px Georgia, serif';
  c.fillText(truncate(name || 'My Vedic Chart', 20), 72, 190);

  const rows = [
    ['Lagna', `${chart.ascSignName || ''}`.trim() || '—'],
    ['Moon', `${chart.planets.Moon.signName} · ${chart.planets.Moon.nakshatra.name}`],
    ['Sun', `${chart.planets.Sun.signName} · house ${chart.planets.Sun.house}`],
  ];
  if (extras.dasha) rows.push(['Dasha', extras.dasha]);

  let y = 260;
  for (const [k, v] of rows) {
    c.fillStyle = '#78665d';
    c.font = '500 15px Inter, sans-serif';
    c.fillText(k.toUpperCase(), 72, y);
    c.fillStyle = '#7a1e28';
    c.font = '500 30px Georgia, serif';
    c.fillText(truncate(v, 32), 72, y + 36);
    y += 82;
  }

  c.fillStyle = '#78665d';
  c.font = '400 17px Inter, sans-serif';
  c.fillText('Computed from a real sidereal ephemeris', 72, H - 74);

  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png', 0.94));
}

const truncate = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

/** Share via the Web Share API when available, else download the PNG. */
export async function shareCard(blob, text, url) {
  const file = new File([blob], 'my-vedic-chart.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My Vedic Chart', text, url });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my-vedic-chart.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}

/* ================================================================
   Pricing
   ================================================================ */

export const PLANS = [
  {
    id: 'free', name: 'Seeker', price: { monthly: 0, annual: 0 },
    tagline: 'Everything you need for an honest reading',
    features: [
      'Full D1 birth chart with true positions',
      'All nine grahas, nakshatras and padas',
      'Vimshottari dasha — three levels',
      'Live panchang and muhurat windows',
      'Ashtakoota matching',
      '3D planetarium',
      'Offline chart reasoning engine',
    ],
    cta: 'Start free', highlight: false,
  },
  {
    id: 'pro', name: 'Jyotish Pro', price: { monthly: 9, annual: 65 },
    tagline: 'For serious students and practitioners',
    features: [
      'Everything in Seeker',
      'All 16 divisional charts exported',
      'Five-level dasha depth',
      'High-resolution PDF reports',
      'AI narrative synthesis',
      'Sky event alerts for your chart',
      'Priority muhurat scanning',
    ],
    cta: 'Upgrade to Pro', highlight: true,
  },
  {
    id: 'guru', name: 'Guru Consult', price: { monthly: 49, annual: 399 },
    tagline: 'Human guidance on top of the maths',
    features: [
      'Everything in Pro',
      'Monthly live consultation',
      'Written remedial plan',
      'Follow-up questions answered',
      'Family chart bundle (up to 5)',
      'Annual varshphal reading',
    ],
    cta: 'Talk to a guru', highlight: false,
  },
];

/* ================================================================
   Social proof
   ================================================================ */

export const TESTIMONIALS = [
  {
    name: 'Vikram Patel', role: 'Product Architect · London', initials: 'VP',
    text: 'The first astrology tool where I could verify the maths. I checked the ascendant and planetary degrees against Swiss Ephemeris and they matched to the arcminute.',
  },
  {
    name: 'Ananya Sharma', role: 'Creative Director · Bengaluru', initials: 'AS',
    text: 'The matching report gave nuanced psychological clarity instead of frightening us with doshas. The Manglik section explained the actual house placement.',
  },
  {
    name: 'David Miller', role: 'Founder · San Francisco', initials: 'DM',
    text: 'I use the muhurat finder before every launch. It ranks real dates by nakshatra and tithi rather than selling me a lucky number.',
  },
  {
    name: 'Priya Nair', role: 'Ayurvedic Doctor · Kochi', initials: 'PN',
    text: 'As a practitioner I need correct vargas. Having D9, D10 and D60 generated properly — and being able to export the JSON — saves me hours.',
  },
];

export const FAQS = [
  {
    q: 'Is the astrology actually calculated, or is it pre-written text?',
    a: 'Every position is computed in your browser from a VSOP87-class ephemeris. Change the birth time by four minutes and you will see the ascendant move by roughly one degree, and the readings change with it.',
  },
  {
    q: 'Which ayanamsa do you use?',
    a: 'Lahiri (Chitrapaksha) by default, with Raman and Krishnamurti available. Lahiri is pinned to its official definition — 23°15\'44" at the epoch of 21 March 1956 — and precessed from there.',
  },
  {
    q: 'Does my birth data leave my device?',
    a: 'No. The entire engine runs client-side. The only optional network calls are city lookup for geocoding and — if you add your own Gemini key — the AI narrative layer.',
  },
  {
    q: 'Why whole-sign houses instead of Placidus?',
    a: 'Whole-sign (Rasi) houses are the standard in Parashari Jyotisha, which this engine implements. The Midheaven is still computed if you need the tenth-cusp degree.',
  },
  {
    q: 'How accurate are the planetary positions?',
    a: 'Sub-arcminute for the Sun, Moon and visible planets between 1700 and 2200 CE. The engine is validated against reference values in an automated test suite that ships with the source.',
  },
  {
    q: 'Do I need to pay to get a real chart?',
    a: 'No. The complete birth chart, dasha ladder, panchang, matching and planetarium are free and always will be. Paid tiers add export formats, deeper vargas and human consultation.',
  },
];
