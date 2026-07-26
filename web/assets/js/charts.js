/**
 * charts.js — SVG kundli renderers and data visualisations.
 *
 * Draws authentic North Indian (diamond) and South Indian (fixed-grid)
 * charts plus supporting graphics. All geometry is generated from the
 * computed chart object — no static artwork.
 */

import { SIGNS, SHORT } from './engine/ephemeris.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (n, attrs = {}) => {
  const e = document.createElementNS(NS, n);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/* ------------------------------------------------------------------ *
 * North Indian chart — diamond, houses fixed, signs rotate
 * ------------------------------------------------------------------ */

/**
 * House polygon centres for the classic North Indian diamond in a
 * 0..100 viewBox. House 1 is the top-centre diamond.
 */
const NORTH_CENTRES = [
  [50, 26], [26, 12], [12, 26], [26, 50], [12, 74], [26, 88],
  [50, 74], [74, 88], [88, 74], [74, 50], [88, 26], [74, 12],
];

export function renderNorthChart(svg, chart, opts = {}) {
  const { planets = chart.planets, ascendantSign = chart.ascendantSign, title = '' } = opts;
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = '';

  const g = el('g');
  svg.appendChild(g);

  // Outer square + the two diagonals + inner diamond
  g.appendChild(el('rect', { x: 1, y: 1, width: 98, height: 98, class: 'kundli-frame' }));
  g.appendChild(el('line', { x1: 1, y1: 1, x2: 99, y2: 99, class: 'kundli-line' }));
  g.appendChild(el('line', { x1: 99, y1: 1, x2: 1, y2: 99, class: 'kundli-line' }));
  g.appendChild(el('polygon', { points: '50,1 99,50 50,99 1,50', class: 'kundli-line' }));

  // Group planets by house
  const byHouse = {};
  for (const p of Object.values(planets)) (byHouse[p.house] ||= []).push(p);

  for (let h = 1; h <= 12; h++) {
    const [cx, cy] = NORTH_CENTRES[h - 1];
    const signNum = ((ascendantSign + h - 1) % 12) + 1;

    // Sign number in the corner of each house
    const sn = el('text', { x: cx, y: cy - 7.5, class: 'kundli-signnum' });
    sn.textContent = signNum;
    g.appendChild(sn);

    const list = byHouse[h] || [];
    list.forEach((p, i) => {
      const perRow = list.length > 3 ? 2 : 1;
      const row = Math.floor(i / perRow), col = i % perRow;
      const rows = Math.ceil(list.length / perRow);
      const x = cx + (perRow > 1 ? (col - 0.5) * 11 : 0);
      const y = cy - 1 + (row - (rows - 1) / 2) * 7.2;

      const t = el('text', {
        x, y, class: `kundli-planet ${p.retrograde ? 'is-retro' : ''}`,
        fill: p.color, 'data-planet': p.key,
      });
      t.textContent = `${p.short}${p.retrograde ? '˚' : ''}`;
      const tip = el('title');
      tip.textContent = `${p.key} — ${p.signName} ${p.degInSign.toFixed(2)}° · ${p.nakshatra.name} pada ${p.nakshatra.pada}${p.retrograde ? ' · Retrograde' : ''} · ${p.dignity}`;
      t.appendChild(tip);
      g.appendChild(t);
    });
  }

  // Lagna marker
  const asc = el('text', { x: 50, y: 15, class: 'kundli-asc' });
  asc.textContent = 'ASC';
  g.appendChild(asc);

  if (title) {
    const t = el('text', { x: 50, y: 97, class: 'kundli-title' });
    t.textContent = title;
    g.appendChild(t);
  }
  return svg;
}

/* ------------------------------------------------------------------ *
 * South Indian chart — fixed signs, 4x4 grid, houses rotate
 * ------------------------------------------------------------------ */

// Grid position of each sign (Aries=0) in the South Indian layout.
const SOUTH_CELLS = [
  [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3],
  [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0],
];

export function renderSouthChart(svg, chart, opts = {}) {
  const { planets = chart.planets, ascendantSign = chart.ascendantSign, title = '' } = opts;
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = '';
  const g = el('g');
  svg.appendChild(g);

  const cell = 24.5, pad = 1;
  const bySign = {};
  for (const p of Object.values(planets)) (bySign[p.sign] ||= []).push(p);

  for (let s = 0; s < 12; s++) {
    const [cxi, cyi] = SOUTH_CELLS[s];
    const x = pad + cxi * cell, y = pad + cyi * cell;
    const isAsc = s === ascendantSign;

    g.appendChild(el('rect', {
      x, y, width: cell, height: cell,
      class: `kundli-cell${isAsc ? ' is-asc' : ''}`,
    }));

    const lbl = el('text', { x: x + 2, y: y + 5, class: 'kundli-signlbl' });
    lbl.textContent = SIGNS[s].en.slice(0, 3);
    g.appendChild(lbl);

    if (isAsc) {
      const a = el('text', { x: x + cell - 2, y: y + 5, class: 'kundli-asc-badge' });
      a.textContent = 'ASC';
      g.appendChild(a);
    }

    const list = bySign[s] || [];
    list.forEach((p, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const t = el('text', {
        x: x + 6 + col * 12, y: y + 12 + row * 6,
        class: `kundli-planet ${p.retrograde ? 'is-retro' : ''}`,
        fill: p.color, 'data-planet': p.key,
      });
      t.textContent = `${p.short}${p.retrograde ? '˚' : ''}`;
      const tip = el('title');
      tip.textContent = `${p.key} — ${p.signName} ${p.degInSign.toFixed(2)}° · ${p.nakshatra.name} pada ${p.nakshatra.pada}${p.retrograde ? ' · Retrograde' : ''} · ${p.dignity}`;
      t.appendChild(tip);
      g.appendChild(t);
    });
  }

  if (title) {
    const t = el('text', { x: 50, y: 53, class: 'kundli-title' });
    t.textContent = title;
    g.appendChild(t);
  }
  return svg;
}

export function renderChart(svg, chart, style, opts) {
  return style === 'south'
    ? renderSouthChart(svg, chart, opts)
    : renderNorthChart(svg, chart, opts);
}

/* ------------------------------------------------------------------ *
 * Circular zodiac wheel with true degree placement
 * ------------------------------------------------------------------ */

export function renderWheel(svg, chart) {
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.innerHTML = '';
  const g = el('g', { transform: 'translate(100,100)' });
  svg.appendChild(g);

  const R = 92, R2 = 70, R3 = 52;
  g.appendChild(el('circle', { r: R, class: 'wheel-ring' }));
  g.appendChild(el('circle', { r: R2, class: 'wheel-ring' }));
  g.appendChild(el('circle', { r: R3, class: 'wheel-ring faint' }));

  // Angle: sidereal longitude measured anticlockwise from the ascendant.
  const ang = (lon) => (-(lon - chart.ascendant) - 90) * Math.PI / 180;

  for (let i = 0; i < 12; i++) {
    const signStart = i * 30;
    const a = ang(signStart);
    g.appendChild(el('line', {
      x1: Math.cos(a) * R3, y1: Math.sin(a) * R3,
      x2: Math.cos(a) * R, y2: Math.sin(a) * R, class: 'wheel-spoke',
    }));
    const am = ang(signStart + 15);
    const t = el('text', {
      x: Math.cos(am) * (R2 + 11), y: Math.sin(am) * (R2 + 11),
      class: 'wheel-sign',
    });
    t.textContent = SIGNS[i].symbol;
    g.appendChild(t);
  }

  // Nakshatra ticks
  for (let i = 0; i < 27; i++) {
    const a = ang(i * (360 / 27));
    g.appendChild(el('line', {
      x1: Math.cos(a) * (R - 6), y1: Math.sin(a) * (R - 6),
      x2: Math.cos(a) * R, y2: Math.sin(a) * R, class: 'wheel-tick',
    }));
  }

  // Ascendant axis
  const a0 = ang(chart.ascendant);
  g.appendChild(el('line', {
    x1: 0, y1: 0, x2: Math.cos(a0) * R, y2: Math.sin(a0) * R, class: 'wheel-asc',
  }));

  // Planets, nudged apart when they cluster
  const placed = [];
  for (const p of Object.values(chart.planets)) {
    let r = R2 - 12;
    let a = ang(p.lon);
    while (placed.some((q) => Math.abs(angDiff(q.a, a)) < 0.16 && Math.abs(q.r - r) < 9)) r -= 10;
    placed.push({ a, r });
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    g.appendChild(el('line', {
      x1: Math.cos(a) * (R2 + 2), y1: Math.sin(a) * (R2 + 2),
      x2: x, y2: y, class: 'wheel-stem', stroke: p.color,
    }));
    const c = el('circle', { cx: x, cy: y, r: 8.5, class: 'wheel-node', fill: p.color });
    const tip = el('title');
    tip.textContent = `${p.key} — ${p.signName} ${p.degInSign.toFixed(2)}° · house ${p.house}`;
    c.appendChild(tip);
    g.appendChild(c);
    const t = el('text', { x, y: y + 0.5, class: 'wheel-glyph' });
    t.textContent = p.short;
    g.appendChild(t);
  }
  return svg;
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/* ------------------------------------------------------------------ *
 * Small data graphics
 * ------------------------------------------------------------------ */

/** Horizontal strength bars for the nine grahas. */
export function renderStrengthBars(container, strengths, planets) {
  container.innerHTML = '';
  const entries = Object.entries(strengths).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of entries) {
    const p = planets[k];
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-label"><span class="bar-glyph" style="color:${p.color}">${p.glyph}</span>${k}</span>
      <span class="bar-track"><span class="bar-fill" style="--w:${v}%;background:linear-gradient(90deg,${p.color}55,${p.color})"></span></span>
      <span class="bar-value">${v}</span>`;
    container.appendChild(row);
  }
  requestAnimationFrame(() => {
    container.querySelectorAll('.bar-fill').forEach((b) => b.classList.add('is-in'));
  });
}

/** Dasha timeline ribbon. */
export function renderDashaTimeline(container, maha, now, onPick) {
  container.innerHTML = '';
  const start = maha[0].start.getTime();
  const total = maha[8].end.getTime() - start;
  for (const m of maha) {
    const w = ((m.end - m.start) / total) * 100;
    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'dasha-seg';
    seg.style.width = `${w}%`;
    const active = now >= m.start && now < m.end;
    if (active) seg.classList.add('is-active');
    seg.innerHTML = `<span class="dasha-lord">${m.lord}</span><span class="dasha-years">${m.start.getFullYear()}</span>`;
    seg.title = `${m.lord} Mahadasha · ${m.start.getFullYear()}–${m.end.getFullYear()} (${m.years} yrs)`;
    seg.addEventListener('click', () => onPick && onPick(m));
    container.appendChild(seg);
  }
}

/** Sparkline-style yearly forecast bars. */
export function renderForecast(container, rows, onHover) {
  container.innerHTML = '';
  const max = Math.max(...rows.map((r) => r.score), 1);
  rows.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fc-bar';
    b.style.setProperty('--h', `${(r.score / max) * 100}%`);
    b.style.setProperty('--i', i);
    b.innerHTML = `<span class="fc-fill"></span><span class="fc-lbl">${r.lord.split('–')[1] || r.lord}</span>`;
    b.title = `${r.lord} · ${r.start.getFullYear()}–${r.end.getFullYear()} · ${r.score}/100`;
    b.addEventListener('mouseenter', () => onHover && onHover(r));
    b.addEventListener('focus', () => onHover && onHover(r));
    container.appendChild(b);
  });
}

/** Radial score dial used for compatibility and life areas. */
export function renderDial(svg, value, max, label) {
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.innerHTML = '';
  const g = el('g', { transform: 'translate(60,60)' });
  svg.appendChild(g);
  const r = 46, C = 2 * Math.PI * r;
  g.appendChild(el('circle', { r, class: 'dial-bg' }));
  const arc = el('circle', {
    r, class: 'dial-fg',
    'stroke-dasharray': C,
    'stroke-dashoffset': C,
    transform: 'rotate(-90)',
  });
  g.appendChild(arc);
  const v = el('text', { y: -2, class: 'dial-value' });
  v.textContent = `${value}`;
  g.appendChild(v);
  const s = el('text', { y: 16, class: 'dial-sub' });
  s.textContent = label || `/ ${max}`;
  g.appendChild(s);
  requestAnimationFrame(() => {
    arc.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)';
    arc.setAttribute('stroke-dashoffset', C * (1 - value / max));
  });
  return svg;
}
