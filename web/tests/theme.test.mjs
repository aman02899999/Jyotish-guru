/**
 * Theme test suite — off-white paper + maroon.
 *
 * Parses the real stylesheet and checks the palette itself rather than
 * screenshots: that both variants define every token, that the identity is
 * actually off-white/maroon in each, and — the part that matters — that every
 * foreground/background pairing the site actually uses clears WCAG AA.
 *
 * A colour change that quietly makes body text unreadable is the classic way
 * a re-theme ships broken, so it fails the build here instead.
 *
 * Run with:  node web/tests/theme.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');

let pass = 0, fail = 0;
const log = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; log.push(`  ✓ ${name}`); }
  else { fail++; log.push(`  ✗ ${name}  ${detail}`); }
};
const section = (t) => log.push(`\n${t}`);

const css = readFileSync(resolve(webRoot, 'assets/css/styles.css'), 'utf8');
const adminCss = readFileSync(resolve(webRoot, 'assets/css/admin.css'), 'utf8');

/* ================================================================
   Colour maths (WCAG 2.1 relative luminance)
   ================================================================ */

function srgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = srgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Parse the declarations of a top-level rule into a token map. */
function tokens(source, selector) {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const m = source.match(re);
  if (!m) return null;
  const out = {};
  for (const [, k, v] of m[1].matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[k] = v.trim();
  return out;
}

const root = tokens(css, ':root');
const darkOnly = tokens(css, "[data-theme='dark']");

/* ================================================================
   Structure
   ================================================================ */

section('Token structure');
ok(':root defines the default palette', !!root);
ok('a dark variant is defined', !!darkOnly);

const REQUIRED = [
  '--bg', '--bg-2', '--surface', '--surface-2',
  '--accent', '--accent-soft', '--accent-dim', '--accent-2',
  '--text', '--muted', '--muted-2', '--on-accent', '--inset',
  '--line', '--line-soft', '--ok', '--warn', '--bad',
];
for (const t of REQUIRED) {
  ok(`:root defines ${t}`, root && root[t] !== undefined);
}

// Anything the dark variant overrides must exist in the base, or the cascade
// silently depends on declaration order.
const strays = Object.keys(darkOnly || {}).filter((k) => root && root[k] === undefined);
ok('the dark variant introduces no orphan tokens', strays.length === 0, strays.join(', '));

section('Retired token names are gone');
for (const old of ['--gold', '--plum', '--lav', '--void', '--panel:', '--deep']) {
  const used = new RegExp(`var\\(${old.replace(':', '')}\\)`).test(css);
  ok(`no CSS still reads ${old.replace(':', '')}`, !used);
}

/* ================================================================
   Identity — is it actually off-white and maroon?
   ================================================================ */

const light = root;
const dark = { ...root, ...darkOnly };

/** Rough hue in degrees, plus saturation/lightness, for identity checks. */
function hsl(hex) {
  const [r, g, b] = srgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

section('Identity — off-white ground');
{
  const bg = hsl(light['--bg']);
  ok('the default background is very light', bg.l > 0.9, `l=${bg.l.toFixed(3)}`);
  ok('the default background is off-white, not pure white',
    light['--bg'].toLowerCase() !== '#fff' && light['--bg'].toLowerCase() !== '#ffffff' && bg.l < 0.99,
    light['--bg']);
  ok('the ground is warm (yellow-red hue family)',
    bg.h >= 15 && bg.h <= 60, `h=${bg.h.toFixed(0)}`);
  ok('the ground is desaturated', bg.s < 0.45, `s=${bg.s.toFixed(2)}`);
  ok('surfaces sit lighter than the page ground',
    luminance(light['--surface']) > luminance(light['--bg']));
}

section('Identity — maroon accent');
{
  const a = hsl(light['--accent']);
  const wraps = a.h >= 330 || a.h <= 20;   // red family, allowing hue wrap
  ok('the accent is in the red family', wraps, `h=${a.h.toFixed(0)}`);
  ok('the accent is dark enough to be maroon, not crimson',
    a.l < 0.36, `l=${a.l.toFixed(3)}`);
  ok('the accent is saturated enough to read as maroon',
    a.s > 0.4, `s=${a.s.toFixed(2)}`);
  ok('the secondary accent differs from the primary',
    light['--accent-2'] !== light['--accent']);
}

section('Identity survives the dark variant');
{
  const bg = hsl(dark['--bg']);
  const a = hsl(dark['--accent']);
  ok('the dark ground is genuinely dark', bg.l < 0.16, `l=${bg.l.toFixed(3)}`);
  ok('the dark ground stays warm rather than neutral grey',
    bg.s > 0.04 && bg.h >= 0 && bg.h <= 60, `h=${bg.h.toFixed(0)} s=${bg.s.toFixed(2)}`);
  ok('the dark accent stays in the red family',
    a.h >= 330 || a.h <= 20, `h=${a.h.toFixed(0)}`);
  ok('the dark accent lifts for legibility',
    luminance(dark['--accent']) > luminance(light['--accent']));
}

/* ================================================================
   Contrast — the part that actually breaks for users
   ================================================================ */

const AA_BODY = 4.5;   // normal text
const AA_UI = 3.0;     // large text, icons, borders

function checkVariant(name, t) {
  section(`Contrast — ${name}`);

  const body = [
    ['text on bg', t['--text'], t['--bg']],
    ['text on surface', t['--text'], t['--surface']],
    ['text on surface-2', t['--text'], t['--surface-2']],
    ['muted on bg', t['--muted'], t['--bg']],
    ['muted on surface', t['--muted'], t['--surface']],
    ['muted-2 on surface', t['--muted-2'], t['--surface']],
    ['accent on bg', t['--accent'], t['--bg']],
    ['accent on surface', t['--accent'], t['--surface']],
    ['accent-soft on surface', t['--accent-soft'], t['--surface']],
    ['on-accent on accent', t['--on-accent'], t['--accent']],
    ['ok on surface', t['--ok'], t['--surface']],
    ['warn on surface', t['--warn'], t['--surface']],
    ['bad on surface', t['--bad'], t['--surface']],
  ];

  for (const [label, fg, bg] of body) {
    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) continue;
    const r = contrast(fg, bg);
    ok(`${label} meets AA (${r.toFixed(2)}:1)`, r >= AA_BODY, `${fg} on ${bg}`);
  }

  // The secondary accent is ornament, so the looser UI threshold applies.
  const sec = contrast(t['--accent-2'], t['--surface']);
  ok(`accent-2 on surface meets AA-large (${sec.toFixed(2)}:1)`, sec >= AA_UI);
}

checkVariant('light (default)', light);
checkVariant('dark', dark);

/* ================================================================
   The permanently-dark planetarium stage
   ================================================================ */

section('Planetarium stage stays legible in both themes');
{
  const stage = tokens(css, '.planetarium-shell');
  ok('the stage re-declares its own text tokens', !!stage && !!stage['--text']);
  if (stage) {
    for (const t of ['--text', '--muted', '--muted-2', '--accent', '--inset']) {
      ok(`the stage overrides ${t}`, stage[t] !== undefined);
    }
    // Its backdrop is a fixed dark gradient, so contrast must hold against it
    // no matter which page theme is active.
    const stageBg = '#120b0b';
    for (const t of ['--text', '--muted', '--accent']) {
      const r = contrast(stage[t], stageBg);
      ok(`stage ${t} is readable on the dark stage (${r.toFixed(2)}:1)`, r >= AA_UI);
    }
  }
}

/* ================================================================
   Admin panel shares the identity
   ================================================================ */

section('Admin panel palette');
{
  const a = tokens(adminCss, ':root');
  ok('the admin panel defines a palette', !!a);
  if (a) {
    ok('the admin accent is in the red family',
      (() => { const h = hsl(a['--accent']).h; return h >= 330 || h <= 20; })(),
      a['--accent']);
    const r = contrast(a['--text'], a['--surface']);
    ok(`admin body text meets AA (${r.toFixed(2)}:1)`, r >= AA_BODY);
    const onAccent = contrast(a['--on-accent'], a['--accent']);
    ok(`admin on-accent text meets AA (${onAccent.toFixed(2)}:1)`, onAccent >= AA_BODY);
    ok('no retired gold token remains', !/var\(--gold\)/.test(adminCss));
  }
}

/* ================================================================
   No stale hard-coded colours from the old cosmic palette
   ================================================================ */

section('Retired palette is fully removed');
{
  const RETIRED = ['#d4af37', '#7b5ea7', '#f0ebff', '#07050f', '#0a0713', '#120d21', '#e8c96a'];
  for (const hex of RETIRED) {
    const inCss = css.toLowerCase().includes(hex) || adminCss.toLowerCase().includes(hex);
    ok(`no stylesheet still hard-codes ${hex}`, !inCss);
  }
}

section('color-mix percentages are valid');
{
  const bad = [...css.matchAll(/color-mix\(in srgb, var\((--[a-z0-9-]+)\) ([0-9.]+)%/g)]
    .filter((m) => Number(m[2]) > 100);
  ok('no color-mix exceeds 100%', bad.length === 0,
    bad.slice(0, 3).map((m) => `${m[1]} ${m[2]}%`).join(', '));
}

/* ================================================================ */
console.log(log.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
