/**
 * app.js — application controller.
 *
 * Wires the astronomy engine to the DOM: chart calculation, dasha scrubbing,
 * live panchang, compatibility, the oracle and the 3D planetarium.
 */

import * as E from './engine/ephemeris.js';
import * as I from './engine/interpret.js';
import * as P from './engine/places.js';
import * as V from './engine/events.js';
import * as C from './charts.js';
import * as M from './promo.js';
import * as Store from './admin/content.js';
import * as An from './admin/analytics.js';
import { Planetarium, webglAvailable } from './planetarium.js';
import { mountAccountUI } from './auth/ui.js';
import * as Auth from './auth/auth.js';
import * as Profile from './auth/profile.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = {
  chart: null,
  maha: null,
  strengths: null,
  place: P.GAZETTEER[0],
  style: 'north',
  ayanamsa: 'lahiri',
  varga: 1,
  scrubDate: new Date(),
  panPlace: P.guessLocalPlace(),
  timingArea: 'career',
  events: [],
  eventFilter: 'all',
  billing: 'monthly',
};

/* ================================================================
   Boot
   ================================================================ */

async function boot() {
  // Published content (content.json) overrides the shipped defaults.
  try { await Store.loadContent({ withDraft: false }); } catch { /* defaults */ }
  applyContent();
  An.trackVisit();

  $('#year').textContent = new Date().getFullYear();
  initTheme();
  initNav();
  initStarfield();
  initReveal();
  initCounters();
  initFeatureCards();
  initHeroPreview();
  initBirthForm();
  initPlanetarium();
  initPanchang();
  initMatching();
  initOracle();
  initTiming();
  initEvents();
  initMuhurat();
  initNumerology();
  initRewards();
  initTestimonials();
  initPricing();
  initFaq();
  initNotifications();
  initAccounts();
  restoreFromURL();
}

/**
 * Accounts are strictly additive: the astrology engine never waits on them and
 * never fails because of them, so a blocked CDN or missing Firebase config
 * costs the visitor nothing.
 */
function initAccounts() {
  try {
    mountAccountUI({ toast });
  } catch (err) {
    console.error('Account UI failed to mount', err);
  }
}

/* ================================================================
   Content application — everything the admin panel can change
   ================================================================ */

/**
 * Apply editable content to the DOM before the rest of the app boots.
 * Runs against DEFAULTS when content.json is absent, so the site is never
 * dependent on the admin panel having been used.
 */
function applyContent() {
  const c = Store.content();

  // --- meta ---
  if (c.meta) {
    if (c.meta.title) document.title = c.meta.title;
    const d = $('meta[name="description"]');
    if (d && c.meta.description) d.content = c.meta.description;
    const ogT = $('meta[property="og:title"]');
    if (ogT && c.meta.title) ogT.content = c.meta.title;
    const ogD = $('meta[property="og:description"]');
    if (ogD && c.meta.description) ogD.content = c.meta.description;
    const bt = $('.brand-text strong');
    if (bt && c.meta.siteName) bt.textContent = c.meta.siteName;
    const bs = $('.brand-text small');
    if (bs && c.meta.tagline) bs.textContent = c.meta.tagline;
    if (c.meta.repoUrl) {
      $$('a[href*="github.com"]').forEach((a) => { a.href = c.meta.repoUrl; });
    }
  }

  // --- theme ---
  if (c.theme) {
    const root = document.documentElement;
    const map = { gold: '--gold', plum: '--plum', void: '--void', panel: '--panel', text: '--text' };
    for (const [k, v] of Object.entries(map)) {
      if (c.theme[k]) root.style.setProperty(v, c.theme[k]);
    }
  }

  // --- hero ---
  if (c.hero) {
    const h = c.hero;
    setText('.hero .eyebrow', h.eyebrow);
    const h1 = $('.hero h1');
    if (h1 && h.headline) {
      h1.innerHTML = `${escapeHTML(h.headline)}<br /><em>${escapeHTML(h.headlineEm || '')}</em>`;
    }
    setText('.hero .lede', h.lede);
    const cta = $$('.hero-cta .btn');
    if (cta[0] && h.ctaPrimary) { cta[0].textContent = h.ctaPrimary.label; cta[0].href = h.ctaPrimary.href; }
    if (cta[1] && h.ctaSecondary) { cta[1].textContent = h.ctaSecondary.label; cta[1].href = h.ctaSecondary.href; }
    const stats = $('.hero-stats');
    if (stats && Array.isArray(h.stats) && h.stats.length) {
      stats.innerHTML = h.stats.map((s) =>
        `<div><dt data-count="${Number(s.value) || 0}">0</dt><dd>${escapeHTML(s.label)}</dd></div>`).join('');
    }
  }

  // --- sections: visibility and nav ---
  if (Array.isArray(c.sections)) {
    for (const s of c.sections) {
      const el = document.getElementById(s.id);
      if (el) el.hidden = s.visible === false;
    }
    const nav = $('.site-nav');
    if (nav) {
      const items = c.sections.filter((s) => s.inNav && s.visible !== false);
      if (items.length) {
        nav.innerHTML = items.map((s) =>
          `<a href="#${escapeHTML(s.id)}">${escapeHTML(s.nav || s.id)}</a>`).join('');
      }
    }
  }
}

function setText(sel, value) {
  if (value === undefined || value === null) return;
  const el = $(sel);
  if (el) el.textContent = value;
}

/* ---------------- theme ---------------- */

function initTheme() {
  const saved = localStorage.getItem('ajg-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  else if (matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.dataset.theme = 'light';
  else document.documentElement.dataset.theme = 'dark';

  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ajg-theme', next);
  });
}

/* ---------------- nav ---------------- */

function initNav() {
  const nav = $('.site-nav'), toggle = $('#navToggle'), header = $('.site-header');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', scrollY > 24);
  }, { passive: true });

  // Scroll spy
  const links = $$('.site-nav a');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const seenSections = new Set();
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
      if (!seenSections.has(en.target.id)) {
        seenSections.add(en.target.id);
        An.trackSection(en.target.id);
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}

/* ---------------- starfield ---------------- */

function initStarfield() {
  const cv = $('#starfield');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let stars = [], raf, w, h;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    w = cv.width = innerWidth * devicePixelRatio;
    h = cv.height = innerHeight * devicePixelRatio;
    const n = Math.min(240, Math.floor(innerWidth * innerHeight / 9000));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.5 * devicePixelRatio + 0.35,
      a: Math.random(), s: Math.random() * 0.014 + 0.003,
      hue: Math.random() < 0.75 ? 210 : 42,
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.a += st.s;
      const alpha = 0.28 + Math.abs(Math.sin(st.a)) * 0.62;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${st.hue}, 60%, 82%, ${alpha})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  size();
  addEventListener('resize', () => { cancelAnimationFrame(raf); size(); if (!reduce) draw(); });
  if (reduce) { draw(); cancelAnimationFrame(raf); } else draw();
}

/* ---------------- reveal + counters ---------------- */

function initReveal() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  $$('.reveal, .section-head, .panel, .feature-card').forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });
}

function initCounters() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target, target = +el.dataset.count;
      const t0 = performance.now(), dur = 1300;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    }
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => io.observe(el));
}

/* ---------------- features ---------------- */

function initFeatureCards() {
  const grid = $('#featureGrid');
  const rows = Store.get('features') || [];
  grid.innerHTML = rows.map((f) => `
    <article class="feature-card">
      <div class="feature-ico" aria-hidden="true">${escapeHTML(f.icon)}</div>
      <h3>${escapeHTML(f.title)}</h3>
      <p>${escapeHTML(f.text)}</p>
      <a class="feature-live" href="${escapeHTML(f.href || '#kundli')}">Try it live →</a>
    </article>`).join('');

  grid.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.feature-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/* ================================================================
   Hero live preview — the visitor's own sky, right now
   ================================================================ */

function initHeroPreview() {
  const place = state.panPlace;
  const now = new Date();
  const chart = E.computeChart(now, place.lat, place.lon, 'lahiri');
  const pan = E.panchang(now, place.lat, place.lon, 'lahiri');

  C.renderNorthChart($('#heroKundli'), chart);
  $('#hcAscLine').textContent =
    `${place.name} · ${P.formatInZone(now, place.tz, { hour: '2-digit', minute: '2-digit' })} local`;
  $('#hcAsc').textContent = `${E.SIGNS[chart.ascendantSign].en} ${chart.ascendant % 30 | 0}°`;
  $('#hcMoon').textContent = `${chart.planets.Moon.signName} (${E.SIGNS[chart.moonSign].sa})`;
  $('#hcNak').textContent = `${pan.nakshatra.name} · pada ${pan.nakshatra.pada}`;
  $('#hcTithi').textContent = `${pan.tithi.paksha} ${pan.tithi.name}`;

  // A demo dasha so the card feels alive before the visitor enters data
  const demo = E.computeChart(new Date('1995-08-15T05:00:00Z'), place.lat, place.lon, 'lahiri');
  const maha = E.vimshottari(demo, 2);
  const path = E.dashaAt(maha, now);
  if (path.length) {
    $('#hcDasha').textContent = `${path[0].lord} – ${path[1] ? path[1].lord : '—'}`;
    const p = (now - path[0].start) / (path[0].end - path[0].start);
    setTimeout(() => { $('#hcProgress').style.width = `${(p * 100).toFixed(1)}%`; }, 400);
  }

  // Keep the hero clock ticking
  setInterval(() => {
    const t = new Date();
    const c = E.computeChart(t, place.lat, place.lon, 'lahiri');
    $('#hcAscLine').textContent =
      `${place.name} · ${P.formatInZone(t, place.tz, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} local`;
    $('#hcAsc').textContent = `${E.SIGNS[c.ascendantSign].en} ${c.ascendant % 30 | 0}°`;
  }, 30000);
}

/* ================================================================
   Birth form + place autocomplete
   ================================================================ */

function attachPlaceAutocomplete(input, list, onPick) {
  let items = [], active = -1, timer;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };
  const render = () => {
    list.innerHTML = items.map((p, i) => `
      <li role="option" data-i="${i}" class="${i === active ? 'is-active' : ''}" aria-selected="${i === active}">
        ${escapeHTML(p.name)}<small>${escapeHTML([p.admin, p.country].filter(Boolean).join(', '))} · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}</small>
      </li>`).join('');
    list.hidden = items.length === 0;
    input.setAttribute('aria-expanded', String(items.length > 0));
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    items = P.searchLocal(q, 8);
    render();
    timer = setTimeout(async () => {
      items = await P.searchPlaces(q, 8);
      render();
    }, 260);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') close();
  });

  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (li) { e.preventDefault(); pick(items[+li.dataset.i]); }
  });
  input.addEventListener('blur', () => setTimeout(close, 160));

  function pick(p) {
    if (!p) return;
    input.value = p.label;
    close();
    onPick(p);
  }
}

function initBirthForm() {
  const form = $('#birthForm');
  attachPlaceAutocomplete($('#bPlace'), $('#placeList'), (p) => {
    state.place = p;
    $('#placeMeta').textContent =
      `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lon).toFixed(4)}°${p.lon >= 0 ? 'E' : 'W'} · ${p.tz}`;
  });

  $('#useNow').addEventListener('click', () => {
    const now = new Date();
    const tz = state.place.tz;
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now);
    const [d, t] = fmt.split(' ');
    $('#bDate').value = d;
    $('#bTime').value = t.slice(0, 5);
    form.requestSubmit();
  });

  $('#bStyle').addEventListener('change', (e) => {
    state.style = e.target.value;
    if (state.chart) drawVarga();
  });
  $('#bAyan').addEventListener('change', (e) => {
    state.ayanamsa = e.target.value;
    if (state.chart) form.requestSubmit();
    if (window.__planetarium) window.__planetarium.setAyanamsa(e.target.value);
    $('#plAyanamsa').textContent = E.ayanamsaLabel(e.target.value);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
  });

  $('#printBtn').addEventListener('click', () => { An.trackAction('print'); print(); });
  $('#saveChartBtn').addEventListener('click', saveCurrentChart);
  $('#shareBtn').addEventListener('click', copyShareLink);
  $('#jsonBtn').addEventListener('click', downloadJSON);
}

function readForm() {
  return {
    name: $('#bName').value.trim(),
    date: $('#bDate').value,
    time: $('#bTime').value,
    place: state.place,
    ayanamsa: $('#bAyan').value,
  };
}

function calculate() {
  const f = readForm();
  if (!f.date || !f.time) { toast('Please enter a date and time of birth.'); return; }

  const btn = $('#calcBtn');
  btn.disabled = true;
  btn.textContent = 'Computing…';

  // Let the browser paint the disabled state before the (fast) maths runs.
  requestAnimationFrame(() => {
    try {
      const utc = P.localToUTC(f.date, f.time, f.place.tz);
      const chart = E.computeChart(utc, f.place.lat, f.place.lon, f.ayanamsa);
      state.chart = chart;
      state.strengths = E.planetStrength(chart);
      state.maha = E.vimshottari(chart, 3);
      state.scrubDate = new Date();
      state.ayanamsa = f.ayanamsa;
      state.birthLocal = { ...f, utc };

      renderResults();
      renderDashaSection();
      renderRemedies();
      renderDailyHoroscope();
      seedOracle();

      // Personalise the marketing + tooling layers against the real chart
      M.updateProfile({ chartsCalculated: M.getProfile().chartsCalculated + 1 });
      if (M.getProfile().referredBy) M.grantReward('referral_bonus', 'Pro report export unlocked');
      refreshCampaigns();
      renderEvents();
      M.syncEventNotifications(state.events, state.chart);
      renderNotifications();
      if (state.repaintReferral) state.repaintReferral();

      An.trackChart({
        ayanamsa: chart.ayanamsaKey,
        ascendantSign: chart.ascendantSign,
        moonSign: chart.moonSign,
      });
      if (!$('#nmName').value) $('#nmName').value = f.name;
      $('#nmDate').value = f.date;
      renderNumerology(f.name, f.date);

      $('#results').hidden = false;
      $('#gemPanel').hidden = false;
      $$('#results .panel').forEach((p) => p.classList.add('is-in'));
      $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Chart computed from your exact birth moment.');
    } catch (err) {
      console.error(err);
      toast('Could not compute that chart — please check the inputs.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Calculate my chart';
    }
  });
}

/* ================================================================
   Results rendering
   ================================================================ */

function renderResults() {
  const c = state.chart, s = state.strengths;

  // Summary strip
  const asc = E.SIGNS[c.ascendantSign], moon = c.planets.Moon, sun = c.planets.Sun;
  const pan = E.panchang(c.date, c.lat, c.lon, c.ayanamsaKey);
  $('#summaryStrip').innerHTML = [
    ['Lagna', `${asc.en}`, `${asc.sa} · ${E.formatDMS(c.ascendant % 30)}`],
    ['Moon sign', moon.signName, `${E.SIGNS[moon.sign].sa} · house ${moon.house}`],
    ['Nakshatra', moon.nakshatra.name, `Pada ${moon.nakshatra.pada} · lord ${moon.nakshatra.lord}`],
    ['Sun sign', sun.signName, `House ${sun.house} · ${sun.dignity}`],
    ['Tithi at birth', `${pan.tithi.paksha} ${pan.tithi.name}`, pan.weekday.en],
    ['Ayanamsa', `${c.ayanamsa.toFixed(4)}°`, E.ayanamsaLabel(c.ayanamsaKey)],
  ].map(([k, v, sub]) => `
    <div class="sum-card"><span>${k}</span><strong>${escapeHTML(v)}</strong><em>${escapeHTML(sub)}</em></div>`).join('');

  // Varga picker
  const picker = $('#vargaPicker');
  picker.innerHTML = E.VARGA_LIST.map((v) =>
    `<button type="button" data-d="${v.d}" class="${v.d === state.varga ? 'is-active' : ''}">D${v.d}</button>`).join('');
  picker.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.varga = +b.dataset.d;
    $$('button', picker).forEach((x) => x.classList.toggle('is-active', x === b));
    drawVarga();
  };
  drawVarga();

  C.renderWheel($('#wheel'), c);
  C.renderWheel($('#ctaWheel'), c);
  C.renderStrengthBars($('#strengthBars'), s, c.planets);

  // Planet table
  const tb = $('#planetTable tbody');
  tb.innerHTML = E.GRAHAS.map(({ key }) => {
    const p = c.planets[key];
    const dt = p.dignity === 'Exalted' ? 'tag-exalted' : p.dignity === 'Own Sign' ? 'tag-own'
      : p.dignity === 'Debilitated' ? 'tag-debilitated' : '';
    return `<tr>
      <td><span class="graha-cell"><i style="color:${p.color}">${p.glyph}</i>${key}</span></td>
      <td>${p.signName}<br><small class="muted">${E.SIGNS[p.sign].sa}</small></td>
      <td><code>${E.formatDMS(p.degInSign)}</code></td>
      <td>${p.nakshatra.name}<br><small class="muted">lord ${p.nakshatra.lord}</small></td>
      <td>${p.nakshatra.pada}</td>
      <td>${p.house}</td>
      <td><span class="tag ${dt}">${p.dignity}</span></td>
      <td>${p.retrograde ? '<span class="tag tag-retro">Retrograde</span>' : `${p.speed.toFixed(3)}°/d`}</td>
    </tr>`;
  }).join('');
  $('#ayanamsaNote').textContent =
    `${E.ayanamsaLabel(c.ayanamsaKey)} ayanamsa ${c.ayanamsa.toFixed(4)}° · whole-sign houses`;

  // Readings
  const lag = I.lagnaReading(c), mo = I.moonReading(c), su = I.sunReading(c);
  $('#lagnaCard').innerHTML = `<h3>${escapeHTML(lag.title)}</h3><p>${escapeHTML(lag.body)}</p>`;
  $('#moonCard').innerHTML = `<h3>${escapeHTML(mo.title)}</h3><p>${escapeHTML(mo.body)}</p>`;
  $('#sunCard').innerHTML = `<h3>${escapeHTML(su.title)}</h3><p>${escapeHTML(su.body)}</p>`;

  // Life areas
  const areas = I.lifeAreaScores(c, s);
  $('#areaGrid').innerHTML = areas.map((a) => `
    <div class="area-card">
      <div class="area-top"><span class="area-ico">${a.icon}</span><span class="area-score">${a.score}</span></div>
      <h4>${a.key}</h4>
      <div class="area-bar"><i data-w="${a.score}%"></i></div>
      <span class="area-band">${a.band}</span>
    </div>`).join('');
  requestAnimationFrame(() => $$('#areaGrid .area-bar i').forEach((el) => { el.style.width = el.dataset.w; }));

  // Yogas
  const yogas = E.detectYogas(c);
  $('#yogaList').innerHTML = yogas.length
    ? yogas.map((y) => `
      <div class="yoga-card">
        <span class="yoga-strength">${y.strength}</span>
        <h4>${escapeHTML(y.name)}</h4>
        <p>${escapeHTML(y.text)}</p>
      </div>`).join('')
    : '<p class="muted">No major classical yoga is formed. Results are governed by house lords and the running dasha.</p>';

  // Houses
  $('#houseGrid').innerHTML = I.houseReadings(c).map((h) => `
    <div class="house-card">
      <h4><span class="h-num">H${h.n}</span> ${h.name} <small class="muted">· ${h.signName}</small></h4>
      <p>${escapeHTML(h.text)}</p>
    </div>`).join('');

  // Planet readings
  $('#planetReadings').innerHTML = I.planetReadings(c, s).map((p) => `
    <article class="pr-card">
      <div class="pr-head"><span class="pr-glyph" style="color:${p.color}">${p.glyph}</span>
        <h4>${escapeHTML(p.title)}</h4></div>
      <div class="pr-meta">
        <span class="tag">${escapeHTML(p.position)}</span>
        <span class="tag">${escapeHTML(p.nakshatra)}</span>
        <span class="tag">${p.strength}/100</span>
        ${p.retrograde ? '<span class="tag tag-retro">Retro</span>' : ''}
      </div>
      <p>${escapeHTML(p.body)}</p>
    </article>`).join('');
}

function drawVarga() {
  const c = state.chart, d = state.varga;
  const meta = E.VARGA_LIST.find((v) => v.d === d);
  const svg = $('#mainKundli');
  if (d === 1) {
    C.renderChart(svg, c, state.style, { title: '' });
  } else {
    const v = E.computeVarga(c, d);
    C.renderChart(svg, c, state.style, { planets: v.planets, ascendantSign: v.ascendantSign });
  }
  $('#vargaTitle').textContent = `${meta.name}${d === 1 ? ' — Birth Chart' : ''}`;
  $('#vargaUse').textContent = meta.use;
}

/* ================================================================
   Dasha section
   ================================================================ */

function renderDashaSection() {
  const c = state.chart, maha = state.maha;
  $('#dashaBirth').textContent =
    `Birth ${c.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Moon in ${c.planets.Moon.nakshatra.name}`;

  C.renderDashaTimeline($('#dashaRibbon'), maha, state.scrubDate, (m) => {
    setScrub(new Date((m.start.getTime() + m.end.getTime()) / 2));
  });

  const start = maha[0].start.getTime(), end = maha[8].end.getTime();
  const scrub = $('#timeScrub');
  const now = Date.now();
  scrub.value = String(Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)));
  scrub.oninput = () => {
    const t = start + (end - start) * (+scrub.value / 100);
    setScrub(new Date(t), false);
  };

  $('#scrubLabels').innerHTML = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => `<span>${new Date(start + (end - start) * f).getFullYear()}</span>`).join('');

  setScrub(new Date());
}

function setScrub(date, moveSlider = true) {
  state.scrubDate = date;
  const c = state.chart, maha = state.maha;
  const path = E.dashaAt(maha, date);

  if (moveSlider) {
    const start = maha[0].start.getTime(), end = maha[8].end.getTime();
    $('#timeScrub').value = String(Math.max(0, Math.min(100, ((date - start) / (end - start)) * 100)));
  }

  $('#scrubDate').textContent = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  $('#scrubMaha').textContent = path[0] ? path[0].lord : '—';
  $('#scrubAntar').textContent = path[1] ? path[1].lord : '—';
  $('#scrubPraty').textContent = path[2] ? path[2].lord : '—';

  $$('#dashaRibbon .dasha-seg').forEach((seg, i) => {
    seg.classList.toggle('is-active', path[0] && maha[i].lord === path[0].lord &&
      maha[i].start.getTime() === path[0].start.getTime());
  });

  const nar = I.dashaReading(c, path);
  $('#dashaNarrative').innerHTML = nar
    ? `<div class="panel-head"><h3>${escapeHTML(nar.title)}</h3></div>` +
      nar.paragraphs.map((p) => `<p>${escapeHTML(p)}</p>`).join('')
    : '<p class="muted">Outside the 120-year cycle.</p>';

  const tr = E.transits(c, date);
  $('#transitDate').textContent = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const notes = I.transitReading(c, tr);
  $('#transitList').innerHTML = notes.map((n) => `
    <div class="transit-item${n.text.includes('Sade Sati is ACTIVE') ? ' is-alert' : ''}">
      <i style="color:${n.color}">${n.glyph}</i><p>${escapeHTML(n.text)}</p>
    </div>`).join('');

  renderTiming();
}

function initTiming() {
  $('#timingSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.timingArea = b.dataset.area;
    $$('#timingSeg button').forEach((x) => x.classList.toggle('is-active', x === b));
    renderTiming();
  });
}

function renderTiming() {
  if (!state.chart) return;
  const rows = I.timingWindows(state.chart, state.maha, state.timingArea, state.scrubDate, 10);
  const box = $('#forecast');
  C.renderForecast(box, rows, (r) => {
    $('#forecastNote').textContent =
      `${r.lord} · ${r.start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} → ` +
      `${r.end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · score ${r.score}/100. ${r.note}`;
  });
  requestAnimationFrame(() => box.classList.add('is-in'));
  const best = rows.reduce((a, b) => (b.score > a.score ? b : a), rows[0]);
  if (best) {
    $('#forecastNote').textContent =
      `Best upcoming window: ${best.lord} from ${best.start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} ` +
      `(${best.score}/100). ${best.note}`;
  }
}

/* ================================================================
   Panchang
   ================================================================ */

function initPanchang() {
  const inp = $('#panDate');
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone: state.panPlace.tz }).format(new Date());
  inp.value = local;
  inp.addEventListener('change', () => drawPanchang(inp.value));
  $('#panToday').addEventListener('click', () => {
    inp.value = new Intl.DateTimeFormat('sv-SE', { timeZone: state.panPlace.tz }).format(new Date());
    drawPanchang(inp.value);
  });
  drawPanchang(inp.value);
  setInterval(() => {
    if (inp.value === new Intl.DateTimeFormat('sv-SE', { timeZone: state.panPlace.tz }).format(new Date())) {
      drawPanchang(inp.value);
    }
  }, 60000);
}

function drawPanchang(dateStr) {
  const place = state.panPlace;
  const noonUTC = P.localToUTC(dateStr, '12:00', place.tz);
  const nowUTC = new Date();
  const sameDay = new Intl.DateTimeFormat('sv-SE', { timeZone: place.tz }).format(nowUTC) === dateStr;
  const at = sameDay ? nowUTC : noonUTC;

  const pan = E.panchang(at, place.lat, place.lon, state.ayanamsa);
  const tz = place.tz;
  const T = (d) => (d ? P.formatInZone(d, tz) : '—');

  $('#panchangPlace').textContent = `${place.name}, ${place.country}`;
  $('#panchangGrid').innerHTML = [
    ['Tithi', `${pan.tithi.paksha} ${pan.tithi.name}`, `${pan.tithi.percent.toFixed(0)}% elapsed`],
    ['Nakshatra', pan.nakshatra.name, `Pada ${pan.nakshatra.pada} · lord ${pan.nakshatra.lord}`],
    ['Yoga', pan.yoga.name, `#${pan.yoga.index + 1} of 27`],
    ['Karana', pan.karana.name, `Half-tithi ${pan.karana.index + 1}`],
    ['Vara', pan.weekday.en, `${pan.weekday.sa} · lord ${pan.weekday.lord}`],
    ['Sunrise', T(pan.sunrise), 'Local apparent'],
    ['Sunset', T(pan.sunset), 'Local apparent'],
    ['Moonrise', T(pan.moonrise), pan.moonset ? `Set ${T(pan.moonset)}` : ''],
    ['Sun', E.formatSignPos(pan.sunLon), 'Sidereal'],
    ['Moon', E.formatSignPos(pan.moonLon), 'Sidereal'],
  ].map(([k, v, sub]) => `
    <div class="pan-card"><span>${k}</span><strong>${escapeHTML(String(v))}</strong><em>${escapeHTML(String(sub))}</em></div>`).join('');

  $('#muhuratList').innerHTML = [
    ['Abhijit Muhurat', pan.abhijit, 'is-good'],
    ['Rahu Kaal', pan.rahuKaal, 'is-bad'],
    ['Yamaganda', pan.yamaganda, 'is-bad'],
    ['Gulika Kaal', pan.gulika, 'is-bad'],
  ].filter(([, w]) => w).map(([name, w, cls]) => `
    <div class="muhurat-item ${cls}"><span>${name}</span><b>${T(w.start)} – ${T(w.end)}</b></div>`).join('');

  drawMoonPhase(pan);
  if (state.chart) renderDailyHoroscope();
}

function drawMoonPhase(pan) {
  const svg = $('#moonPhase');
  const illum = pan.illumination / 100;
  const waxing = pan.moonPhase < 180;
  svg.innerHTML = `
    <defs><clipPath id="mclip"><circle cx="50" cy="50" r="44"/></clipPath></defs>
    <circle cx="50" cy="50" r="44" fill="#1a1428" stroke="rgba(212,175,55,.4)" stroke-width="1.5"/>
    <g clip-path="url(#mclip)">
      <ellipse cx="${waxing ? 50 + (1 - illum * 2) * 44 : 50 - (1 - illum * 2) * 44}" cy="50"
               rx="${Math.abs(1 - illum * 2) * 44}" ry="44"
               fill="${illum > 0.5 ? '#e8dcc0' : '#1a1428'}"/>
      <path d="M50,6 A44,44 0 0,${waxing ? 1 : 0} 50,94 Z" fill="#e8dcc0"/>
      <ellipse cx="${waxing ? 50 - (1 - illum * 2) * 44 : 50 + (1 - illum * 2) * 44}" cy="50"
               rx="${Math.abs(1 - illum * 2) * 44}" ry="44"
               fill="${illum > 0.5 ? '#e8dcc0' : '#1a1428'}"/>
    </g>`;
  $('#moonPhaseName').textContent = phaseName(pan.moonPhase);
  $('#moonIllum').textContent = `${pan.illumination.toFixed(1)}% illuminated · ${pan.tithi.paksha} paksha`;
}

function phaseName(deg) {
  if (deg < 12) return 'New Moon (Amavasya)';
  if (deg < 78) return 'Waxing Crescent';
  if (deg < 102) return 'First Quarter';
  if (deg < 168) return 'Waxing Gibbous';
  if (deg < 192) return 'Full Moon (Purnima)';
  if (deg < 258) return 'Waning Gibbous';
  if (deg < 282) return 'Last Quarter';
  if (deg < 348) return 'Waning Crescent';
  return 'New Moon (Amavasya)';
}

function renderDailyHoroscope() {
  if (!state.chart) return;
  const c = state.chart;
  const now = new Date();
  const tr = E.transits(c, now);
  const pan = E.panchang(now, state.panPlace.lat, state.panPlace.lon, c.ayanamsaKey);
  const h = I.dailyHoroscope(c, tr, pan);

  $('#horoscope').innerHTML = `
    <div class="horo-ratings">
      ${h.ratings.map((r) => `
        <div class="horo-rating"><span>${r.key}</span>
          <div class="horo-stars">${'★'.repeat(r.v)}${'☆'.repeat(5 - r.v)}</div></div>`).join('')}
    </div>
    <p>${escapeHTML(h.focus)}</p>
    <p>${escapeHTML(h.dayNote)}</p>
    <p>${escapeHTML(h.tithiNote)}</p>
    <div class="horo-lucky">
      <div><span>Lucky colour</span><strong>${escapeHTML(h.lucky.color)}</strong></div>
      <div><span>Lucky number</span><strong>${h.lucky.number}</strong></div>
      <div><span>Direction</span><strong>${escapeHTML(h.lucky.direction)}</strong></div>
      <div><span>Best window</span><strong>${escapeHTML(h.lucky.time)}</strong></div>
      <div><span>Avoid</span><strong>${escapeHTML(h.lucky.avoid)}</strong></div>
    </div>`;
}

/* ================================================================
   Remedies
   ================================================================ */

function renderRemedies() {
  const c = state.chart, s = state.strengths;
  $('#remedyGrid').innerHTML = I.remedies(c, s).map((r) => `
    <article class="remedy-card">
      <div class="remedy-head">
        <i style="color:${r.color}">${r.glyph}</i>
        <div><h3>${r.planet}</h3><small>${escapeHTML(r.reason)}</small></div>
      </div>
      <dl>
        <div><dt>Mantra (${r.count} repetitions)</dt><dd class="mantra">${escapeHTML(r.mantra)}</dd></div>
        <div><dt>Best day</dt><dd>${r.day}</dd></div>
        <div><dt>Charity</dt><dd>${escapeHTML(r.charity)}</dd></div>
        <div><dt>Practice</dt><dd>${escapeHTML(r.practice)}</dd></div>
      </dl>
    </article>`).join('');

  $('#gemGrid').innerHTML = I.gemstones(c, s).map((g) => `
    <div class="gem-card">
      <h4>${g.gem}</h4>
      <div class="gem-meta">
        <span class="tag">${g.planet}</span>
        <span class="tag">${g.metal}</span>
        <span class="tag">${g.finger}</span>
        <span class="tag">${g.day}</span>
      </div>
      <p>${escapeHTML(g.note)}</p>
    </div>`).join('');
}

/* ================================================================
   Matching
   ================================================================ */

function initMatching() {
  let placeA = P.GAZETTEER[0], placeB = P.GAZETTEER.find((c) => c.name === 'Mumbai');
  attachPlaceAutocomplete($('#aPlace'), $('#aPlaceList'), (p) => { placeA = p; });
  attachPlaceAutocomplete($('#pPlace'), $('#pPlaceList'), (p) => { placeB = p; });

  $('#matchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const A = E.computeChart(P.localToUTC($('#aDate').value, $('#aTime').value, placeA.tz), placeA.lat, placeA.lon, state.ayanamsa);
    const B = E.computeChart(P.localToUTC($('#pDate').value, $('#pTime').value, placeB.tz), placeB.lat, placeB.lon, state.ayanamsa);
    const k = E.ashtakoota(A, B);

    $('#matchResult').hidden = false;
    C.renderDial($('#matchDial'), Math.round(k.total * 10) / 10, 36, '/ 36 gunas');
    $('#matchVerdict').textContent = k.verdict.label;
    const an = $('#aName').value.trim() || 'Partner A', bn = $('#pName').value.trim() || 'Partner B';
    $('#matchNames').textContent =
      `${an} (${A.planets.Moon.nakshatra.name}) & ${bn} (${B.planets.Moon.nakshatra.name})`;

    $('#kootaGrid').innerHTML = k.items.map((i) => `
      <div class="koota-card">
        <div class="koota-top"><h4>${i.key}</h4><span class="koota-pts">${i.got}/${i.max}</span></div>
        <div class="koota-bar"><i data-w="${(i.got / i.max) * 100}%"></i></div>
        <p>${escapeHTML(i.note)}</p>
      </div>`).join('');
    requestAnimationFrame(() => $$('#kootaGrid .koota-bar i').forEach((el) => { el.style.width = el.dataset.w; }));

    $('#manglikRow').innerHTML = [[an, k.manglikA], [bn, k.manglikB]].map(([n, m]) => `
      <div class="manglik-card">
        <strong>${escapeHTML(n)} — Manglik: ${m.present ? m.severity : 'No'}</strong>
        Mars occupies house ${m.house} from the lagna.
        ${m.present ? 'Standard Kuja Dosha remedies or matching with a fellow Manglik are advised.' : 'No Kuja Dosha is formed.'}
      </div>`).join('');

    $('#matchResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ================================================================
   Oracle
   ================================================================ */

function initOracle() {
  const chips = $('#oracleChips');
  chips.innerHTML = I.SAMPLE_QUESTIONS.map((q) => `<button type="button">${q}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { $('#oracleInput').value = b.textContent; $('#oracleForm').requestSubmit(); }
  });

  $('#oracleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#oracleInput').value.trim();
    if (!q) return;
    $('#oracleInput').value = '';
    ask(q);
  });

  const key = localStorage.getItem('ajg-gemini-key');
  if (key) { $('#aiKey').value = key; setKeyStatus(true); }
  $('#saveKey').addEventListener('click', () => {
    const v = $('#aiKey').value.trim();
    if (!v) return;
    localStorage.setItem('ajg-gemini-key', v);
    setKeyStatus(true);
    toast('Gemini key saved in this browser only.');
  });
  $('#clearKey').addEventListener('click', () => {
    localStorage.removeItem('ajg-gemini-key');
    $('#aiKey').value = '';
    setKeyStatus(false);
    toast('Key removed.');
  });
}

function setKeyStatus(on) {
  $('#keyStatus').textContent = on
    ? 'Key stored locally — answers will be synthesised by Gemini on top of your computed chart.'
    : 'No key stored — using the offline reasoning engine.';
}

function seedOracle() {
  const log = $('#oracleLog');
  if (log.dataset.seeded) return;
  log.dataset.seeded = '1';
  const c = state.chart;
  addMsg('bot', 'Your chart is loaded', [
    `${E.SIGNS[c.ascendantSign].en} lagna, Moon in ${c.planets.Moon.signName} (${c.planets.Moon.nakshatra.name}).`,
    'Ask anything about career, marriage, wealth, health, gemstones, Saturn or your current dasha — answers are derived from these exact placements.',
  ]);
}

async function ask(question) {
  if (!state.chart) {
    addMsg('user', question);
    addMsg('bot', 'Chart needed', ['Please calculate your birth chart first — the answers are computed from your real placements.']);
    $('#kundli').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  addMsg('user', question);

  const ctx = {
    chart: state.chart,
    strengths: state.strengths,
    maha: state.maha,
    path: E.dashaAt(state.maha, new Date()),
    tr: E.transits(state.chart, new Date()),
    yogas: E.detectYogas(state.chart),
    d10: E.computeVarga(state.chart, 10),
  };
  const local = I.answerQuestion(question, ctx);

  const key = localStorage.getItem('ajg-gemini-key');
  if (!key) { addMsg('bot', local.heading, local.lines, local.source); return; }

  const typing = addTyping();
  try {
    const text = await askGemini(key, question, local, ctx);
    typing.remove();
    addMsg('bot', local.heading, text.split(/\n{2,}/).filter(Boolean), 'Gemini synthesis over your computed chart');
  } catch (err) {
    typing.remove();
    addMsg('bot', local.heading, local.lines, `${local.source} (AI unavailable: ${err.message})`);
  }
}

function askGemini(key, question, local, ctx) {
  const c = ctx.chart;
  const facts = [
    `Ascendant: ${E.SIGNS[c.ascendantSign].en} ${E.formatDMS(c.ascendant % 30)}`,
    ...E.GRAHAS.map(({ key: k }) => {
      const p = c.planets[k];
      return `${k}: ${p.signName} ${p.degInSign.toFixed(2)}°, house ${p.house}, ${p.nakshatra.name} pada ${p.nakshatra.pada}, ${p.dignity}${p.retrograde ? ', retrograde' : ''}`;
    }),
    `Current dasha: ${ctx.path.map((p) => p.lord).join(' – ')}`,
    `Detected yogas: ${ctx.yogas.map((y) => y.name).join(', ') || 'none'}`,
  ].join('\n');

  const body = {
    contents: [{
      parts: [{
        text: `You are a classical Vedic astrologer (Parashari system). Answer the user's question using ONLY the computed chart data below. Be specific, warm and practical. Use short paragraphs, no markdown headers, max 220 words.\n\nCHART DATA:\n${facts}\n\nENGINE ANALYSIS:\n${local.lines.join('\n')}\n\nQUESTION: ${question}`,
      }],
    }],
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 600 },
  };

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  ).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!t) throw new Error('empty response');
    return t;
  });
}

function addMsg(who, heading, lines = [], source) {
  const log = $('#oracleLog');
  const d = document.createElement('div');
  d.className = `oracle-msg is-${who}`;
  d.innerHTML = who === 'user'
    ? `<p>${escapeHTML(heading)}</p>`
    : `<h4>${escapeHTML(heading)}</h4>${lines.map((l) => `<p>${escapeHTML(l)}</p>`).join('')}` +
      (source ? `<span class="oracle-src">${escapeHTML(source)}</span>` : '');
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

function addTyping() {
  const log = $('#oracleLog');
  const d = document.createElement('div');
  d.className = 'oracle-msg is-bot';
  d.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
  return d;
}

/* ================================================================
   Planetarium
   ================================================================ */

function initPlanetarium() {
  const canvas = $('#skyCanvas');
  if (!canvas) return;
  if (!webglAvailable()) {
    $('#plLoading').innerHTML = 'WebGL is unavailable on this device — the rest of the site works normally.';
    return;
  }

  const pl = new Planetarium(canvas, {
    date: new Date(),
    onSelect: (info) => showPlanetInfo(info),
  });
  pl.setAyanamsa(state.ayanamsa);
  window.__planetarium = pl;

  pl.onFrame = (d) => {
    $('#plDate').textContent = d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };
  requestAnimationFrame(() => {
    pl.resize();
    $('#plLoading').classList.add('is-hidden');
  });

  const playBtn = $('#plPlay');
  playBtn.addEventListener('click', () => {
    const on = playBtn.getAttribute('aria-pressed') === 'true';
    playBtn.setAttribute('aria-pressed', String(!on));
    $('#plPlayLbl').textContent = on ? 'Play' : 'Pause';
    pl.setPlaying(!on);
  });

  const speed = $('#plSpeed');
  const applySpeed = () => {
    const v = +speed.value;
    // Exponential mapping so fine control near zero, fast at the extremes.
    const days = Math.sign(v) * Math.pow(Math.abs(v) / 6, 2.1);
    pl.setSpeed(days);
    $('#plSpeedVal').textContent = `${days >= 0 ? '' : '−'}${Math.abs(days).toFixed(1)} d/s`;
  };
  speed.addEventListener('input', applySpeed);
  applySpeed();

  $('#plOrbits').addEventListener('change', (e) => pl.setOrbits(e.target.checked));
  $('#plLabels').addEventListener('change', (e) => pl.setLabels(e.target.checked));
  $('#plZodiac').addEventListener('change', (e) => pl.setZodiac(e.target.checked));
  $('#plNow').addEventListener('click', () => { pl.setDate(new Date()); toast('Planetarium reset to the present moment.'); });

  $$('.pl-views button').forEach((b) => {
    b.addEventListener('click', () => {
      $$('.pl-views button').forEach((x) => x.classList.toggle('is-active', x === b));
      pl.view(b.dataset.view);
    });
  });

  $('#plInfoClose').addEventListener('click', () => { $('#plInfo').hidden = true; pl.select(null); });
  $('#plAyanamsa').textContent = E.ayanamsaLabel(state.ayanamsa);

  // Pause when off-screen to save battery
  new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting && playBtn.getAttribute('aria-pressed') === 'true') pl.setPlaying(false);
      else if (en.isIntersecting && playBtn.getAttribute('aria-pressed') === 'true') pl.setPlaying(true);
    }
  }, { threshold: 0.05 }).observe(canvas);
}

function showPlanetInfo(info) {
  const box = $('#plInfo');
  if (!info) { box.hidden = true; return; }
  box.hidden = false;
  $('#plInfoGlyph').textContent = info.glyph;
  $('#plInfoName').textContent = info.key;
  $('#plInfoSa').textContent = info.sanskrit;

  // Live sidereal position at the simulated instant
  const rows = [];
  if (info.karaka) rows.push(['Karakatva', info.karaka]);
  try {
    const lonSid = info.key === 'Sun' || info.key === 'Moon'
      ? E.norm360(E.tropicalLongitude(info.key, info.date) - E.ayanamsa(info.date, state.ayanamsa))
      : E.norm360(E.tropicalLongitude(info.key, info.date) - E.ayanamsa(info.date, state.ayanamsa));
    rows.push(['Sidereal position', E.formatSignPos(lonSid)]);
    rows.push(['Nakshatra', `${E.nakshatraOf(lonSid).name} pada ${E.nakshatraOf(lonSid).pada}`]);
  } catch { /* Earth has no geocentric longitude */ }
  if (info.distanceAU) rows.push(['Distance from Sun', `${info.distanceAU.toFixed(3)} AU`]);
  if (info.period) rows.push(['Orbital period', `${(info.period / 365.25).toFixed(2)} years`]);
  if (info.deity) rows.push(['Deity', info.deity]);
  if (info.gem) rows.push(['Gemstone', info.gem]);
  if (info.mantra) rows.push(['Mantra', info.mantra]);

  $('#plInfoBody').innerHTML = rows.map(([k, v]) =>
    `<div><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(String(v))}</dd></div>`).join('');
}

/* ================================================================
   Share / export
   ================================================================ */

function copyShareLink() {
  An.trackAction('share-link');
  const f = state.birthLocal;
  if (!f) return;
  const u = new URL(location.href);
  u.hash = '';
  u.search = new URLSearchParams({
    n: f.name || '', d: f.date, t: f.time,
    lat: f.place.lat.toFixed(4), lon: f.place.lon.toFixed(4),
    tz: f.place.tz, pl: f.place.label, ay: f.ayanamsa,
  }).toString();
  navigator.clipboard.writeText(u.toString() + '#kundli')
    .then(() => toast('Shareable link copied to your clipboard.'))
    .catch(() => toast('Could not access the clipboard.'));
}

function restoreFromURL() {
  const q = new URLSearchParams(location.search);
  if (!q.get('d') || !q.get('t')) return;
  $('#bName').value = q.get('n') || '';
  $('#bDate').value = q.get('d');
  $('#bTime').value = q.get('t');
  const lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    state.place = {
      name: q.get('pl') || 'Custom', country: '', lat, lon,
      tz: q.get('tz') || 'UTC', label: q.get('pl') || `${lat}, ${lon}`,
    };
    $('#bPlace').value = state.place.label;
    $('#placeMeta').textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)} · ${state.place.tz}`;
  }
  if (q.get('ay')) { $('#bAyan').value = q.get('ay'); state.ayanamsa = q.get('ay'); }
  setTimeout(() => $('#birthForm').requestSubmit(), 120);
}

function downloadJSON() {
  An.trackAction('download-json');
  const c = state.chart;
  if (!c) return;
  const out = {
    generated: new Date().toISOString(),
    engine: 'Adi Jyotish Gurus — Astronomy Engine (VSOP87/Meeus)',
    birth: {
      name: state.birthLocal.name,
      localDate: state.birthLocal.date,
      localTime: state.birthLocal.time,
      place: state.birthLocal.place.label,
      latitude: c.lat, longitude: c.lon,
      timezone: state.birthLocal.place.tz,
      utc: c.date.toISOString(),
    },
    ayanamsa: { system: E.ayanamsaLabel(c.ayanamsaKey), value: c.ayanamsa },
    ascendant: { longitude: c.ascendant, sign: E.SIGNS[c.ascendantSign].en, nakshatra: c.ascNakshatra },
    planets: Object.fromEntries(Object.entries(c.planets).map(([k, p]) => [k, {
      longitude: p.lon, sign: p.signName, degree: p.degInSign,
      nakshatra: p.nakshatra.name, pada: p.nakshatra.pada,
      house: p.house, dignity: p.dignity, retrograde: p.retrograde,
      speed: p.speed, strength: state.strengths[k],
    }])),
    houses: c.houses,
    vargas: Object.fromEntries(E.VARGA_LIST.map((v) => {
      const g = E.computeVarga(c, v.d);
      return [`D${v.d}`, {
        ascendant: E.SIGNS[g.ascendantSign].en,
        planets: Object.fromEntries(Object.entries(g.planets).map(([k, p]) => [k, p.signName])),
      }];
    })),
    dasha: state.maha.map((m) => ({
      lord: m.lord, start: m.start.toISOString(), end: m.end.toISOString(),
      antardashas: m.children.map((a) => ({ lord: a.lord, start: a.start.toISOString(), end: a.end.toISOString() })),
    })),
    yogas: E.detectYogas(c),
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kundli-${state.birthLocal.date}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Chart data downloaded as JSON.');
}

/* ================================================================
   Sky events calendar
   ================================================================ */

function initEvents() {
  $('#eventFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.eventFilter = b.dataset.kind;
    $$('#eventFilter button').forEach((x) => x.classList.toggle('is-active', x === b));
    renderEvents();
  });

  // Scanning the ephemeris takes ~100ms; defer so first paint stays fast.
  const io = new IntersectionObserver((entries, obs) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    setTimeout(() => {
      try {
        state.events = V.upcomingEvents(new Date(), 6);
        renderEvents();
        refreshCampaigns();
        M.syncEventNotifications(state.events, state.chart);
        renderNotifications();
      } catch (err) {
        console.error(err);
        $('#eventList').innerHTML = '<p class="muted">Could not scan the ephemeris for this range.</p>';
      }
    }, 60);
  }, { rootMargin: '300px' });
  io.observe($('#events'));
}

const EVENT_ICON = {
  retrograde: '℞', direct: '→', eclipse: '🌑', ingress: '♈', moon: '🌕',
};

function renderEvents() {
  const box = $('#eventList');
  const f = state.eventFilter;
  let rows = state.events;
  if (f !== 'all') {
    rows = rows.filter((e) => (f === 'retrograde'
      ? e.type === 'retrograde' || e.type === 'direct'
      : e.type === f));
  }
  if (!rows.length) {
    box.innerHTML = '<p class="muted">No events of this kind in the next six months.</p>';
    return;
  }
  box.innerHTML = rows.slice(0, 60).map((e) => {
    const per = state.chart ? V.personaliseEvent(e, state.chart) : null;
    const kindClass = `k-${e.type}`;
    return `
      <div class="event-item">
        <div class="event-date">
          <strong>${e.date.getDate()}</strong>
          <span>${e.date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}</span>
        </div>
        <div class="event-body">
          <h4>${EVENT_ICON[e.type] || '✦'} ${escapeHTML(e.label)}</h4>
          <p>${escapeHTML(e.detail)}</p>
        </div>
        <div>
          <span class="event-kind ${kindClass}">${e.type}</span>
          ${per ? `<div class="event-house">House ${per.fromLagna} from lagna</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ================================================================
   Muhurat finder
   ================================================================ */

function initMuhurat() {
  const sel = $('#mhActivity');
  sel.innerHTML = Object.entries(V.ACTIVITIES)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  $('#mhFrom').value = new Intl.DateTimeFormat('sv-SE', { timeZone: state.panPlace.tz }).format(new Date());

  $('#muhuratForm').addEventListener('submit', (e) => {
    e.preventDefault();
    runMuhurat();
  });
}

function runMuhurat() {
  const activity = $('#mhActivity').value;
  const days = +$('#mhDays').value;
  const fromStr = $('#mhFrom').value;
  const place = state.chart
    ? { lat: state.chart.lat, lon: state.chart.lon, tz: state.birthLocal.place.tz }
    : state.panPlace;
  const from = P.localToUTC(fromStr, '06:00', place.tz);

  const box = $('#muhuratResults');
  box.innerHTML = '<p class="muted">Scanning each day against the panchang…</p>';

  requestAnimationFrame(() => {
    const rows = V.findMuhurat(activity, from, days, place.lat, place.lon, state.chart, state.ayanamsa);
    const best = rows.filter((r) => r.band !== 'Avoid')
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .sort((a, b) => a.date - b.date);

    if (!best.length) {
      box.innerHTML = '<p class="muted">No clearly auspicious dates in this window — try a longer range.</p>';
      return;
    }

    box.innerHTML = best.map((r) => `
      <div class="mh-card band-${r.band.toLowerCase()}">
        <div class="mh-top">
          <span class="mh-date">${r.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span class="mh-score">${r.score}</span>
        </div>
        <span class="mh-band">${r.band} · ${r.weekday}</span>
        <div class="mh-meta">
          <span class="tag">${escapeHTML(r.nakshatra)}</span>
          <span class="tag">${escapeHTML(r.tithi)}</span>
        </div>
        <ul>${r.reasons.slice(0, 3).map((x) => `<li>${escapeHTML(x)}</li>`).join('')}</ul>
        ${r.abhijit ? `<div class="mh-window">Abhijit <b>${P.formatInZone(r.abhijit.start, place.tz)}–${P.formatInZone(r.abhijit.end, place.tz)}</b> · avoid Rahu Kaal <b>${P.formatInZone(r.rahuKaal.start, place.tz)}–${P.formatInZone(r.rahuKaal.end, place.tz)}</b></div>` : ''}
      </div>`).join('');

    if (!state.chart) {
      box.insertAdjacentHTML('beforeend',
        '<p class="muted" style="grid-column:1/-1">Calculate your birth chart to weight these dates against your own Moon.</p>');
    }
  });
}

/* ================================================================
   Numerology
   ================================================================ */

function initNumerology() {
  $('#numeroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    renderNumerology($('#nmName').value, $('#nmDate').value);
  });
}

function renderNumerology(name, dob) {
  if (!dob) { toast('Please enter a date of birth.'); return; }
  const n = V.numerology(name, dob);
  const card = (x) => x ? `
    <div class="nm-card">
      <div class="nm-value">${x.value}</div>
      <h4>${escapeHTML(x.label)}</h4>
      <span class="nm-planet">${escapeHTML(x.planet)}</span>
      <p>${escapeHTML(x.traits)}</p>
    </div>` : '';

  $('#numeroResults').innerHTML = `
    <div class="numero-cards">
      ${card(n.driver)}${card(n.destiny)}${card(n.name)}
    </div>
    <div class="nm-harmony">${escapeHTML(n.harmony.text)}</div>
    <div class="nm-lucky">
      <div><span>Lucky numbers</span><strong>${n.luckyNumbers.join(', ')}</strong></div>
      <div><span>Lucky days</span><strong>${n.luckyDays.join(', ')}</strong></div>
      <div><span>Lucky colours</span><strong>${n.luckyColors.join(', ')}</strong></div>
    </div>`;
}

/* ================================================================
   Campaigns
   ================================================================ */

function refreshCampaigns() {
  const rail = $('#campaignRail');
  const ctx = {
    chart: state.chart,
    transits: state.chart ? E.transits(state.chart, new Date()) : null,
    events: state.events,
  };
  const list = M.activeCampaigns(ctx, Store.get('campaigns')).slice(0, 4);
  rail.innerHTML = list.map((c) => `
    <article class="campaign-card tone-${escapeHTML(c.tone)}" data-id="${escapeHTML(c.id)}">
      <button class="cc-close" type="button" data-dismiss="${escapeHTML(c.id)}" aria-label="Dismiss">×</button>
      <span class="cc-badge">${escapeHTML(c.badge)}</span>
      <div class="cc-head">
        <span class="cc-icon" aria-hidden="true">${escapeHTML(c.icon)}</span>
        <div>
          <h3>${escapeHTML(c.title)}</h3>
          <p class="cc-sub">${escapeHTML(c.subtitle)}</p>
        </div>
      </div>
      <p>${escapeHTML(c.body)}</p>
      <button class="btn btn-outline btn-sm" type="button" data-action="${escapeHTML(c.action)}" data-target="${escapeHTML(c.target || '')}">${escapeHTML(c.cta)}</button>
    </article>`).join('');
}

function initCampaignRail() {
  $('#campaignRail').addEventListener('click', (e) => {
    const close = e.target.closest('[data-dismiss]');
    if (close) {
      M.dismissCampaign(close.dataset.dismiss);
      close.closest('.campaign-card').remove();
      return;
    }
    const act = e.target.closest('[data-action]');
    if (!act) return;
    const { action, target } = act.dataset;
    if (action === M.ACTION.REFER_FRIEND) {
      $('#rewards').scrollIntoView({ behavior: 'smooth' });
    } else if (target) {
      const el = $(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* ================================================================
   Rewards: referral, streak, offer
   ================================================================ */

function initRewards() {
  initCampaignRail();
  M.captureInboundReferral();

  const profile = M.getProfile();
  const refName = () => ($('#bName').value.trim() || 'Seeker');
  const paint = () => {
    $('#referralCode').textContent = M.referralCode(refName());
    const w = M.getWallet();
    $('#referralMeta').innerHTML = [
      profile.referredBy ? `Invited by <b>${escapeHTML(profile.referredBy)}</b>.` : '',
      `${w.unlocked.length} reward${w.unlocked.length === 1 ? '' : 's'} unlocked.`,
      `${profile.chartsCalculated} chart${profile.chartsCalculated === 1 ? '' : 's'} calculated.`,
    ].filter(Boolean).join(' ');
  };
  paint();
  state.repaintReferral = paint;
  $('#bName').addEventListener('input', paint);

  $('#copyRefBtn').addEventListener('click', () => {
    const link = M.referralLink(refName());
    navigator.clipboard.writeText(link)
      .then(() => toast('Invite link copied — share it with a fellow seeker.'))
      .catch(() => toast('Could not access the clipboard.'));
  });

  $('#shareChartBtn').addEventListener('click', async () => {
    if (!state.chart) {
      toast('Calculate your chart first, then share the card.');
      $('#kundli').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    try {
      const path = E.dashaAt(state.maha, new Date());
      const blob = await M.buildShareCard(
        { ...state.chart, ascSignName: E.SIGNS[state.chart.ascendantSign].en },
        $('#bName').value.trim() || 'My Vedic Chart',
        { dasha: path.length ? `${path[0].lord} – ${path[1] ? path[1].lord : ''}` : '' }
      );
      const how = await M.shareCard(blob, 'My Vedic birth chart', M.referralLink(refName()));
      if (how === 'downloaded') toast('Chart card saved as a PNG.');
      else if (how === 'shared') toast('Shared.');
    } catch (err) {
      console.error(err);
      toast('Could not build the share card.');
    }
  });

  // Streak
  const ladder = Store.get('streakRewards');
  const st = M.touchStreak(ladder);
  $('#streakCount').textContent = `${st.count} day${st.count === 1 ? '' : 's'}`;
  $('#streakBest').textContent = `Best: ${st.best}`;
  $('#streakList').innerHTML = (ladder || M.STREAK_REWARDS).map((r) => `
    <li class="${st.count >= r.days ? 'is-done' : ''}">
      <span>${escapeHTML(r.label)}</span> <b>${Number(r.days) || 0}d</b>
    </li>`).join('');
  if (st.milestone) toast(`${st.count}-day streak — ${st.milestone.label} unlocked.`);

  // Weekly offer + live countdown
  const offer = M.currentOffer(Store.get('offers'));
  $('#offerTitle').textContent = offer.title;
  $('#offerDiscount').textContent = offer.discount;
  $('#offerNote').textContent = offer.note;
  const tickOffer = () => {
    $('#offerCountdown').textContent = M.formatCountdown(offer.endsAt - Date.now());
  };
  tickOffer();
  setInterval(tickOffer, 1000);
}

/* ================================================================
   Notifications
   ================================================================ */

function initNotifications() {
  const btn = $('#bellBtn'), panel = $('#bellPanel');
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) { M.markAllRead(); renderNotifications(); }
  });
  $('#bellClear').addEventListener('click', () => {
    M.clearNotifications();
    renderNotifications();
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  renderNotifications();
}

const NOTIF_ICON = {
  retrograde: '℞', direct: '→', eclipse: '🌑', ingress: '♈',
  moon: '🌕', reward: '🎁', referral: '🤝', info: '✦',
};

function renderNotifications() {
  const list = M.getNotifications();
  const box = $('#bellList');
  $('#bellDot').hidden = M.unreadCount() === 0;
  if (!list.length) {
    box.innerHTML = '<div class="bell-empty">Nothing yet — sky alerts will appear here.</div>';
    return;
  }
  box.innerHTML = list.slice(0, 20).map((n) => `
    <div class="bell-item ${n.read ? '' : 'is-unread'}">
      <i aria-hidden="true">${NOTIF_ICON[n.type] || '✦'}</i>
      <div>
        <strong>${escapeHTML(n.title)}</strong>
        <p>${escapeHTML(n.body)}</p>
        <time>${new Date(n.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</time>
      </div>
    </div>`).join('');
}

/* ================================================================
   Testimonials, pricing, FAQ
   ================================================================ */

function initTestimonials() {
  $('#testimonialGrid').innerHTML = (Store.get('testimonials') || []).map((t) => `
    <article class="testimonial-card">
      <blockquote>${escapeHTML(t.text)}</blockquote>
      <div class="tm-author">
        <span class="tm-avatar">${escapeHTML(t.initials)}</span>
        <div><strong>${escapeHTML(t.name)}</strong><span>${escapeHTML(t.role)}</span></div>
      </div>
    </article>`).join('');
}

function initPricing() {
  renderPricing();
  $('.billing-toggle').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.billing = b.dataset.period;
    $$('.billing-toggle button').forEach((x) => x.classList.toggle('is-active', x === b));
    renderPricing();
  });
}

function renderPricing() {
  const per = state.billing;
  $('#pricingGrid').innerHTML = (Store.get('plans') || []).map((p) => {
    const amount = per === 'annual' ? p.annual : p.monthly;
    return `
      <article class="price-card ${p.highlight ? 'is-featured' : ''}">
        ${p.highlight ? '<span class="price-flag">Most popular</span>' : ''}
        <h3>${escapeHTML(p.name)}</h3>
        <p class="price-tagline">${escapeHTML(p.tagline)}</p>
        <div class="price-amount">
          <strong>${amount === 0 ? 'Free' : `$${Number(amount) || 0}`}</strong>
          ${amount === 0 ? '' : `<span>/ ${per === 'annual' ? 'year' : 'month'}</span>`}
        </div>
        <p class="price-period">${amount === 0
          ? 'No card required, ever'
          : per === 'annual' ? `Billed annually — $${(amount / 12).toFixed(2)}/mo equivalent` : 'Billed monthly, cancel anytime'}</p>
        <ul class="price-features">
          ${p.features.map((f) => `<li>${escapeHTML(f)}</li>`).join('')}
        </ul>
        <a class="btn ${p.highlight ? 'btn-primary' : 'btn-outline'}" href="#kundli">${escapeHTML(p.cta)}</a>
      </article>`;
  }).join('');
}

function initFaq() {
  const faqs = Store.get('faqs') || [];
  $('#faqList').innerHTML = faqs.map((f, i) => `
    <details class="faq-item" ${i === 0 ? 'open' : ''}>
      <summary>${escapeHTML(f.q)}</summary>
      <p>${escapeHTML(f.a)}</p>
    </details>`).join('');

  // FAQ structured data for search engines
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
  document.head.appendChild(ld);
}

/** Save a compact chart record locally so it appears in the admin panel. */
function saveCurrentChart() {
  if (!state.chart) return;
  const c = state.chart, f = state.birthLocal;
  const record = {
    label: f.name || '',
    date: f.date,
    time: f.time,
    place: f.place.label,
    lagna: `${E.SIGNS[c.ascendantSign].en} ${E.formatDMS(c.ascendant % 30)}`,
    moon: `${c.planets.Moon.signName} · ${c.planets.Moon.nakshatra.name}`,
    ayanamsa: c.ayanamsaKey,
  };

  // Keep the existing admin-panel view working, and additionally file the
  // chart under the signed-in account (or the anonymous bucket, which is
  // adopted on first sign-in).
  An.saveChart(record);
  const u = Auth.user();
  Profile.saveChart(u && u.uid, record);

  An.trackAction('save-chart');
  toast(u
    ? `Chart saved to your account, ${u.name.split(' ')[0]}.`
    : 'Chart saved to this browser. Sign in to keep it with your account.');
}

/* ================================================================
   Utilities
   ================================================================ */

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 3400);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
