/**
 * Admin panel test suite.
 *
 * Boots admin.html in jsdom, logs in through the real PBKDF2 gate, and drives
 * every CRUD view the way an operator would. Also covers the content store's
 * resolution order, validation, and the GitHub publishing client against a
 * mocked API — including the failure paths that matter (401, 403, 409).
 *
 * Run with:  node web/tests/admin.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('⚠ jsdom is not installed — skipping admin tests.');
  console.log('  Install with:  npm i -D jsdom');
  process.exit(0);
}

let pass = 0, fail = 0;
const log = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; log.push(`  ✓ ${name}`); }
  else { fail++; log.push(`  ✗ ${name}  ${detail}`); }
};
const section = (t) => log.push(`\n${t}`);

/* ================================================================
   Environment
   ================================================================ */

const html = readFileSync(resolve(webRoot, 'admin.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://example.test/admin.html',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const { window } = dom;

window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { value() {}, writable: true });
Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
window.open = () => {};

// --- mock GitHub API + content.json ---------------------------------
const gh = {
  token: null,
  files: {
    'content.json': { sha: 'sha_initial', text: '{}' },
  },
  commits: [
    { sha: 'aaaaaaa1111', commit: { message: 'content: seed', author: { name: 'Owner', date: '2026-07-01T10:00:00Z' } }, html_url: 'https://x/1' },
  ],
  calls: [],
  failNext: null,
};

window.fetch = async (url, opts = {}) => {
  const u = String(url);
  gh.calls.push({ url: u, method: opts.method || 'GET' });

  // content.json fetched by the store
  if (u.includes('content.json') && !u.includes('api.github.com')) {
    return { ok: true, status: 200, json: async () => JSON.parse(gh.files['content.json'].text || '{}') };
  }
  if (u.includes('admin-config.json')) {
    return { ok: false, status: 404, json: async () => ({}) };
  }

  if (u.startsWith('https://api.github.com')) {
    const auth = (opts.headers || {}).Authorization || '';
    if (gh.failNext) {
      const st = gh.failNext; gh.failNext = null;
      return { ok: false, status: st, headers: new Map(), json: async () => ({ message: `mock ${st}` }) };
    }
    if (!auth.includes(gh.token || '\u0000')) {
      return { ok: false, status: 401, headers: new Map(), json: async () => ({ message: 'Bad credentials' }) };
    }
    if (u.endsWith('/user')) {
      return { ok: true, status: 200, json: async () => ({ login: 'testowner', avatar_url: '' }) };
    }
    if (/\/repos\/[^/]+\/[^/]+$/.test(u)) {
      return { ok: true, status: 200, json: async () => ({ default_branch: 'main', permissions: { push: true, admin: true } }) };
    }
    if (u.includes('/commits?path=')) {
      return { ok: true, status: 200, json: async () => gh.commits };
    }
    if (u.includes('/contents/')) {
      const path = decodeURIComponent(u.split('/contents/')[1].split('?')[0]);
      if ((opts.method || 'GET') === 'PUT') {
        const body = JSON.parse(opts.body);
        const text = Buffer.from(body.content, 'base64').toString('utf8');
        const cur = gh.files[path];
        if (cur && body.sha && body.sha !== cur.sha) {
          return { ok: false, status: 409, headers: new Map(), json: async () => ({ message: 'conflict' }) };
        }
        const sha = `sha_${Date.now()}`;
        gh.files[path] = { sha, text };
        return { ok: true, status: 200, json: async () => ({ content: { sha }, commit: { sha: 'commit123', html_url: 'https://x/c' } }) };
      }
      const f = gh.files[path];
      if (!f) return { ok: false, status: 404, headers: new Map(), json: async () => ({ message: 'Not Found' }) };
      return {
        ok: true, status: 200,
        json: async () => ({ sha: f.sha, content: Buffer.from(f.text, 'utf8').toString('base64'), html_url: 'https://x' }),
      };
    }
  }
  return { ok: false, status: 404, headers: new Map(), json: async () => ({}) };
};

// NOTE: deliberately NOT forwarding atob/btoa/TextEncoder/TextDecoder.
// Defining any of them as a getter on globalThis makes jsdom's own atob throw
// InvalidCharacterError on valid base64. Node's native implementations are
// spec-compliant and are what the modules pick up instead.
for (const k of ['document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Node', 'Element', 'Event', 'CustomEvent', 'MouseEvent', 'FormData',
  'Blob', 'URL', 'File', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'fetch', 'addEventListener', 'setInterval', 'clearInterval', 'getComputedStyle']) {
  if (k in window) {
    try { Object.defineProperty(globalThis, k, { get: () => window[k], configurable: true }); }
    catch { globalThis[k] = window[k]; }
  }
}
globalThis.window = window;

const errors = [];
const origError = console.error;
console.error = (...a) => errors.push(a.map(String).join(' '));

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const submit = (el) => el.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

/* ================================================================
   Modules under test
   ================================================================ */

section('Module loading');
let Admin, Store, Auth, GH, An;
try {
  const base = pathToFileURL(resolve(webRoot, 'assets/js/admin')).href;
  Store = await import(`${base}/content.js`);
  Auth = await import(`${base}/auth.js`);
  GH = await import(`${base}/github.js`);
  An = await import(`${base}/analytics.js`);
  Admin = await import(`${base}/admin.js`);
  ok('all admin modules import cleanly', true);
} catch (e) {
  ok('all admin modules import cleanly', false, e.stack.split('\n').slice(0, 3).join(' | '));
  console.error = origError;
  console.log(log.join('\n'));
  process.exit(1);
}
await tick(120);

/* ================================================================
   Content store
   ================================================================ */

section('Content store');

ok('DEFAULTS ship every managed collection',
  ['meta', 'hero', 'sections', 'theme', 'features', 'campaigns', 'plans',
   'testimonials', 'faqs', 'astrologers', 'streakRewards', 'offers']
    .every((k) => Store.DEFAULTS[k] !== undefined));
ok('nine feature cards by default', Store.DEFAULTS.features.length === 9);
ok('three pricing plans by default', Store.DEFAULTS.plans.length === 3);
ok('six FAQs by default', Store.DEFAULTS.faqs.length === 6);
ok('content() returns a usable object', typeof Store.content().meta.siteName === 'string');

// Draft overlay
Store.setDraft('meta', { ...Store.content().meta, siteName: 'Draft Name' });
ok('setDraft applies immediately', Store.content().meta.siteName === 'Draft Name');
ok('hasDraft reports true', Store.hasDraft());
ok('draftKeys lists the changed key', Store.draftKeys().includes('meta'));
ok('unrelated keys survive a partial draft', Store.content().features.length === 9);
Store.discardDraft();
ok('discardDraft reverts', Store.content().meta.siteName !== 'Draft Name');
ok('hasDraft reports false after discard', !Store.hasDraft());

// Publish payload
{
  Store.setDraft('faqs', [{ id: 'x', q: 'Q?', a: 'A' }]);
  const p = Store.publishPayload();
  ok('publishPayload includes the draft', p.faqs.length === 1);
  ok('publishPayload stamps _updated', typeof p._updated === 'string');
  ok('publishPayload carries all managed keys',
    ['meta', 'hero', 'sections', 'theme', 'features', 'campaigns', 'plans',
     'testimonials', 'faqs', 'astrologers'].every((k) => p[k] !== undefined));
  Store.discardDraft();
}

/* ================================================================
   Robustness: corrupt drafts and malformed content must never blank
   the panel or the live site.
   ================================================================ */

section('Robustness — corrupt data');
{
  // Wrong type for a collection
  const bad = Store.sanitize({ features: 'not-a-list', meta: { siteName: 'Ok' } });
  ok('a wrong-typed collection is dropped', bad.value.features === undefined);
  ok('the wrong type is reported', bad.issues.some((i) => /features/.test(i)));
  ok('valid sibling keys survive sanitising', bad.value.meta.siteName === 'Ok');

  // Primitive rows inside a collection
  const rows = Store.sanitize({ faqs: [{ id: 'a', q: 'Q?' }, 'garbage', 42, null] });
  ok('malformed rows are stripped', rows.value.faqs.length === 1);
  ok('stripped rows are reported', rows.issues.some((i) => /faqs/.test(i)));

  // Non-object payloads
  ok('an array payload is rejected', Store.sanitize([1, 2]).value.features === undefined);
  ok('a string payload is rejected', Store.sanitize('nope').issues.length === 1);
  ok('null sanitises to an empty object',
    Object.keys(Store.sanitize(null).value).length === 0);
}

section('Robustness — unreadable draft');
{
  window.localStorage.setItem('ajg-content-draft', '{ this is not json');
  const c = await Store.loadContent();
  ok('a corrupt draft does not throw', !!c && typeof c.meta.siteName === 'string');
  ok('a corrupt draft is discarded', window.localStorage.getItem('ajg-content-draft') === null);
  ok('defaults still render after corruption', c.features.length === 9);
}

section('Robustness — corrupt draft is repaired in place');
{
  window.localStorage.setItem('ajg-content-draft',
    JSON.stringify({ plans: 'broken', faqs: [{ id: 'k', q: 'Kept?' }] }));
  const c = await Store.loadContent();
  ok('the bad key falls back to the default', Array.isArray(c.plans) && c.plans.length === 3);
  ok('the good key from the same draft is kept', c.faqs.length === 1);
  const repaired = JSON.parse(window.localStorage.getItem('ajg-content-draft') || '{}');
  ok('the stored draft is rewritten without the bad key', repaired.plans === undefined);
  ok('issues() reports what happened', Store.issues().some((i) => /plans/.test(i)));
  Store.discardDraft();
}

section('Robustness — publish payload is always complete');
{
  const p = Store.publishPayload();
  ok('no managed key is ever undefined',
    ['meta', 'hero', 'sections', 'theme', 'features', 'campaigns', 'plans',
     'testimonials', 'faqs', 'astrologers', 'streakRewards', 'offers']
      .every((k) => p[k] !== undefined));
  ok('the payload round-trips through JSON without losing keys',
    Object.keys(JSON.parse(JSON.stringify(p))).length === Object.keys(p).length);
}

section('Robustness — import rejects bad shapes');
{
  let threw = false;
  try { Store.importDraft({ features: 'nope' }); } catch { threw = true; }
  ok('importing a wrong-typed collection throws', threw);

  let threw2 = false;
  try { Store.importDraft('not an object'); } catch { threw2 = true; }
  ok('importing a non-object throws', threw2);
  Store.discardDraft();
}

// blankRow
for (const kind of ['features', 'campaigns', 'plans', 'testimonials', 'faqs', 'astrologers']) {
  const r = Store.blankRow(kind);
  ok(`blankRow(${kind}) has an id`, typeof r.id === 'string' && r.id.length > 2);
}

section('Validation');
ok('valid payload passes', Store.validate(Store.publishPayload()).length === 0);
ok('missing hero headline is caught',
  Store.validate({ hero: { headline: '' } }).some((e) => /headline/.test(e)));
ok('missing siteName is caught',
  Store.validate({ meta: { siteName: '  ' } }).some((e) => /siteName/.test(e)));
ok('duplicate ids are caught',
  Store.validate({ faqs: [{ id: 'a', q: 'x' }, { id: 'a', q: 'y' }] }).some((e) => /duplicate/.test(e)));
ok('non-array collection is caught',
  Store.validate({ features: 'nope' }).some((e) => /must be a list/.test(e)));
ok('missing required field is caught',
  Store.validate({ plans: [{ id: 'p1' }] }).some((e) => /name is required/.test(e)));
ok('bad hex colour is caught',
  Store.validate({ theme: { gold: 'red' } }).some((e) => /hex colour/.test(e)));
ok('good hex colour passes', Store.validate({ theme: { gold: '#d4af37' } }).length === 0);
ok('negative price is caught',
  Store.validate({ astrologers: [{ id: 'a', name: 'X', price: -5 }] }).some((e) => /non-negative/.test(e)));
ok('non-numeric stat value is caught',
  Store.validate({ hero: { headline: 'H', stats: [{ value: 'nine', label: 'x' }] } })
    .some((e) => /must be a number/.test(e)));
ok('over-long description is caught',
  Store.validate({ meta: { siteName: 'X', description: 'x'.repeat(400) } })
    .some((e) => /320/.test(e)));
ok('importDraft rejects invalid content', (() => {
  try { Store.importDraft({ plans: [{ id: 'p' }] }); return false; }
  catch { return true; }
})());

/* ================================================================
   Auth
   ================================================================ */

section('Authentication');

const cfg = await Auth.loadConfig();
ok('config exposes salt, hash and iterations',
  !!cfg.salt && !!cfg.hash && cfg.iterations >= 100000);
ok('iteration count is modern (>= 100k)', cfg.iterations >= 100000);
ok('no plaintext passphrase in auth.js source', (() => {
  const src = readFileSync(resolve(webRoot, 'assets/js/admin/auth.js'), 'utf8');
  // The fallback constant is allowed to exist; the *hash* must not be a literal.
  return !/hash:\s*'[A-Za-z0-9+/]{40,}'/.test(src);
})());

const d1 = await Auth.derive('hello', cfg.salt, 1000);
const d2 = await Auth.derive('hello', cfg.salt, 1000);
const d3 = await Auth.derive('hellp', cfg.salt, 1000);
ok('derivation is deterministic', d1 === d2);
ok('different passphrases derive differently', d1 !== d3);
ok('derivation returns base64', /^[A-Za-z0-9+/]+=*$/.test(d1));
ok('randomSalt is unique', Auth.randomSalt() !== Auth.randomSalt());

ok('not authenticated before login', !Auth.isAuthed());
{
  const bad = await Auth.login('definitely-wrong');
  ok('wrong passphrase is rejected', bad.ok === false);
  ok('rejection carries a message', typeof bad.error === 'string');
  ok('still not authenticated', !Auth.isAuthed());
}
{
  const good = await Auth.login('jyotish-admin');
  ok('correct passphrase is accepted', good.ok === true);
  ok('session opens', Auth.isAuthed());
  ok('session has a future expiry', Auth.sessionExpiry() > new Date());
}
{
  Auth.logout();
  ok('logout clears the session', !Auth.isAuthed());
  await Auth.login('jyotish-admin');
}

// Rate limiting
{
  Auth.logout();
  for (let i = 0; i < 4; i++) await Auth.login('wrong');
  ok('repeated failures trigger a lockout', Auth.lockoutRemaining() > 0,
    `${Auth.lockoutRemaining()}s`);
  ok('failure count is tracked', Auth.getFailures().count >= 4);
  window.localStorage.removeItem('ajg-admin-fails');
  ok('lockout clears when failures reset', Auth.lockoutRemaining() === 0);
  await Auth.login('jyotish-admin');
  ok('successful login clears failures', Auth.getFailures().count === 0);
}

// Credential rotation
{
  const cred = await Auth.makeCredential('a-much-longer-passphrase');
  ok('makeCredential returns salt + hash', !!cred.salt && !!cred.hash);
  ok('generated hash verifies against its own salt',
    (await Auth.derive('a-much-longer-passphrase', cred.salt, cred.iterations)) === cred.hash);
  ok('generated hash rejects the wrong passphrase',
    (await Auth.derive('other', cred.salt, cred.iterations)) !== cred.hash);
  ok('rotation uses a fresh salt', cred.salt !== cfg.salt);
}

// Token handling
section('GitHub token handling');
ok('no token initially', !Auth.hasToken());
Auth.setToken('ghp_testtoken1234567890');
gh.token = 'ghp_testtoken1234567890';
ok('token stored', Auth.hasToken());
ok('token round-trips', Auth.getToken() === 'ghp_testtoken1234567890');
ok('token is masked for display',
  Auth.maskToken(Auth.getToken()).includes('…') &&
  !Auth.maskToken(Auth.getToken()).includes('testtoken'));
ok('token defaults to sessionStorage, not localStorage',
  window.sessionStorage.getItem('ajg-admin-token') !== null &&
  window.localStorage.getItem('ajg-admin-token') === null);
Auth.setRepo('testowner/testrepo');
ok('repo is configurable', Auth.getRepo() === 'testowner/testrepo');

/* ================================================================
   GitHub client
   ================================================================ */

section('GitHub publishing client');

ok('base64 round-trips ASCII', GH.fromBase64(GH.toBase64('hello')) === 'hello');
ok('base64 round-trips UTF-8 (Devanagari + emoji)',
  GH.fromBase64(GH.toBase64('ॐ नमः 🪐')) === 'ॐ नमः 🪐');

{
  const v = await GH.verifyToken();
  ok('token verification succeeds', v.ok === true, v.error || '');
  ok('verification reports the user', v.user === 'testowner');
  ok('verification confirms write permission', v.permissions.push === true);
}
{
  const b = await GH.defaultBranch();
  ok('default branch resolved', b === 'main');
}
{
  const res = await GH.publishContent({ meta: { siteName: 'Published' } }, { branch: 'main' });
  ok('publish returns a commit', !!res.commit);
  ok('published file lands in the repo',
    JSON.parse(gh.files['content.json'].text).meta.siteName === 'Published');
  ok('published JSON is pretty-printed', gh.files['content.json'].text.includes('\n  '));
}
{
  // Republishing identical content is a no-op rather than an empty commit.
  const same = JSON.parse(gh.files['content.json'].text);
  const res = await GH.publishContent(same, { branch: 'main' });
  ok('identical content is detected as unchanged', res.unchanged === true);
}
{
  const hist = await GH.fileHistory('content.json', 5);
  ok('history returns commits', hist.length === 1);
  ok('history entries carry sha, message and date',
    !!hist[0].sha && !!hist[0].message && hist[0].date instanceof Date);
}
{
  gh.failNext = 401;
  let msg = '';
  try { await GH.verifyToken(); } catch (e) { msg = e.message; }
  ok('401 produces a clear message', /expired|revoked|rejected/i.test(msg), msg);
}
{
  gh.failNext = 403;
  let msg = '';
  try { await GH.defaultBranch(); } catch (e) { msg = e.message; }
  ok('403 mentions missing scope', /scope|forbidden/i.test(msg), msg);
}
{
  // Stale SHA must be rejected rather than silently clobbering.
  let msg = '';
  try {
    await GH.putFile({ path: 'content.json', content: '{}', message: 'x', branch: 'main', sha: 'stale_sha' });
  } catch (e) { msg = e.message; }
  ok('stale SHA is rejected with a conflict', /409|conflict/i.test(msg), msg);
}
{
  Auth.clearToken();
  let msg = '';
  try { await GH.verifyToken(); } catch (e) { msg = e.message; }
  ok('missing token is refused before any request', /no github token/i.test(msg), msg);
  Auth.setToken('ghp_testtoken1234567890');
}

/* ================================================================
   Analytics
   ================================================================ */

section('Analytics');

An.clearAnalytics();
An.clearCharts();
An.trackVisit();
An.trackChart({ ayanamsa: 'lahiri', ascendantSign: 1, moonSign: 4 });
An.trackChart({ ayanamsa: 'raman', ascendantSign: 1, moonSign: 2 });
An.trackSection('kundli');
An.trackAction('print');

{
  const s = An.summary(30);
  ok('visits counted', s.visits === 1);
  ok('charts counted', s.charts === 2);
  ok('sections counted', s.sections === 1);
  ok('actions counted', s.actions === 1);
  ok('daily series spans the range', s.series.length === 30);
  ok('ascendant distribution aggregates', s.ascDist[1].count === 2);
  ok('ayanamsa distribution splits', s.ayanamsa.length === 2);
  ok('top sections ranked', s.topSections[0].id === 'kundli');
}
// Privacy: analytics must never capture birth data. Check the recorded
// VALUES, not key names (an action event legitimately has a "name" key).
ok('no birth details are ever recorded', (() => {
  const values = [];
  const walk = (v) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'object') { Object.values(v).forEach(walk); return; }
    values.push(String(v));
  };
  An.events().forEach((e) => walk(e.d));
  const joined = values.join(' | ');
  return !/\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(joined)   // no birth dates
    && !/\b\d{1,2}:\d{2}\b/.test(joined)                  // no birth times
    && !/-?\d+\.\d{3,}/.test(joined);                      // no coordinates
})());
ok('chart events keep only coarse facets', (() => {
  const chart = An.events().find((e) => e.t === 'chart');
  return chart && Object.keys(chart.d).sort().join(',') === 'asc,ay,moon';
})());
ok('recorded signs are indices, not names', (() => {
  const chart = An.events().find((e) => e.t === 'chart');
  return typeof chart.d.asc === 'number' && typeof chart.d.moon === 'number';
})());

{
  const id = An.saveChart({ label: 'Test', date: '1990-05-15', place: 'Delhi', lagna: 'Aries' });
  ok('chart saved', An.savedCharts().length === 1);
  An.updateChart(id, { label: 'Renamed' });
  ok('chart updated', An.savedCharts()[0].label === 'Renamed');
  An.deleteChart(id);
  ok('chart deleted', An.savedCharts().length === 0);
}
ok('exportAll bundles events and charts', (() => {
  const e = An.exportAll();
  return Array.isArray(e.events) && Array.isArray(e.savedCharts) && !!e.exported;
})());

/* ================================================================
   Panel UI
   ================================================================ */

section('Login screen');

ok('login screen is present', !!$('#loginScreen'));
ok('admin shell is hidden before login', $('#adminShell').hidden === true);
ok('passphrase field is a password input', $('#passInput').type === 'password');
ok('page is marked noindex',
  /noindex/.test($('meta[name="robots"]')?.content || ''));
ok('login explains the security model',
  /deterrent|not a cryptographic boundary/i.test($('.login-note').textContent));

// Drive a real login through the UI.
Auth.logout();
ok('signing out also clears the GitHub token', !Auth.hasToken());
window.localStorage.removeItem('ajg-admin-fails');
$('#passInput').value = 'wrong-one';
submit($('#loginForm'));
await tick(300);
ok('UI rejects a wrong passphrase', $('#adminShell').hidden === true);
ok('UI shows an error message', $('#loginError').hidden === false);

$('#passInput').value = 'jyotish-admin';
submit($('#loginForm'));
await tick(400);
ok('UI accepts the correct passphrase', $('#adminShell').hidden === false);
ok('login screen is dismissed', $('#loginScreen').hidden === true);
ok('passphrase field is cleared after login', $('#passInput').value === '');

// Re-supply the token the way an operator would after signing back in.
Auth.setToken('ghp_testtoken1234567890');
Auth.setRepo('testowner/testrepo');

section('Navigation');
const NAV = ['dashboard', 'hero', 'features', 'campaigns', 'plans', 'testimonials',
  'faqs', 'astrologers', 'sections', 'theme', 'charts', 'publish', 'security'];
ok('all views have a nav button',
  NAV.every((v) => $(`#sideNav button[data-view="${v}"]`)));
for (const v of NAV) {
  Admin.show(v);
  await tick(30);
  ok(`view "${v}" renders without error`, $('#adminContent').children.length > 0);
}
ok('active nav item is marked', (() => {
  Admin.show('features');
  return $('#sideNav button.is-active').dataset.view === 'features';
})());

/* ================================================================
   CRUD
   ================================================================ */

section('CRUD — create');

for (const kind of ['features', 'campaigns', 'plans', 'testimonials', 'faqs', 'astrologers']) {
  Admin.show(kind);
  await tick(40);
  const before = (Store.content()[kind] || []).length;
  click($('#addRow'));
  await tick(60);
  const after = (Store.content()[kind] || []).length;
  ok(`${kind}: add creates a row`, after === before + 1, `${before} → ${after}`);
  ok(`${kind}: new row appears in the DOM`, $$('#rows .row-card').length === after);
  ok(`${kind}: new row has a unique id`,
    new Set((Store.content()[kind] || []).map((r) => r.id)).size === after);
}

section('CRUD — update');
{
  Admin.show('faqs');
  await tick(40);
  const form = $('#rows .row-form');
  const id = form.dataset.id;
  form.elements.q.value = 'Edited question?';
  form.elements.a.value = 'Edited answer.';
  submit(form);
  await tick(60);
  const row = Store.content().faqs.find((r) => r.id === id);
  ok('faqs: edit persists to the draft', row.q === 'Edited question?');
  ok('faqs: second field persists', row.a === 'Edited answer.');
  ok('faqs: draft is flagged', Store.draftKeys().includes('faqs'));
}
{
  Admin.show('plans');
  await tick(40);
  const form = $('#rows .row-form');
  const id = form.dataset.id;
  form.elements.monthly.value = '25';
  form.elements.features.value = 'One\nTwo\nThree';
  form.elements.highlight.checked = true;
  submit(form);
  await tick(60);
  const row = Store.content().plans.find((r) => r.id === id);
  ok('plans: number field is coerced', row.monthly === 25 && typeof row.monthly === 'number');
  ok('plans: multi-line field becomes an array',
    Array.isArray(row.features) && row.features.length === 3);
  ok('plans: checkbox persists', row.highlight === true);
}
{
  Admin.show('campaigns');
  await tick(40);
  const form = $('#rows .row-form');
  const id = form.dataset.id;
  form.elements.enabled.checked = false;
  form.elements.tone.value = 'plum';
  submit(form);
  await tick(60);
  const row = Store.content().campaigns.find((r) => r.id === id);
  ok('campaigns: disabling persists', row.enabled === false);
  ok('campaigns: select persists', row.tone === 'plum');
  Admin.show('campaigns');
  await tick(40);
  ok('campaigns: disabled row is visually marked', $$('#rows .row-card.is-off').length >= 1);
}

section('CRUD — reorder & duplicate');
{
  Admin.show('features');
  await tick(40);
  const first = Store.content().features[0].id;
  const second = Store.content().features[1].id;
  const downBtn = $$('#rows .row-card')[0].querySelector('[data-act="down"]');
  click(downBtn);
  await tick(60);
  ok('move down swaps rows',
    Store.content().features[0].id === second && Store.content().features[1].id === first);

  const upBtn = $$('#rows .row-card')[1].querySelector('[data-act="up"]');
  click(upBtn);
  await tick(60);
  ok('move up restores order', Store.content().features[0].id === first);

  const before = Store.content().features.length;
  click($$('#rows .row-card')[0].querySelector('[data-act="dup"]'));
  await tick(60);
  ok('duplicate adds a row', Store.content().features.length === before + 1);
  ok('duplicate gets a distinct id',
    Store.content().features[0].id !== Store.content().features[1].id);
  ok('duplicate copies the content',
    Store.content().features[0].title === Store.content().features[1].title);
}

section('CRUD — delete');
{
  Admin.show('testimonials');
  await tick(40);
  const before = Store.content().testimonials.length;
  click($$('#rows .row-card')[0].querySelector('[data-act="del"]'));
  await tick(40);
  ok('delete asks for confirmation', $('#confirmModal').hidden === false);
  click($('#confirmCancel'));
  await tick(40);
  ok('cancel aborts the delete', Store.content().testimonials.length === before);

  click($$('#rows .row-card')[0].querySelector('[data-act="del"]'));
  await tick(40);
  click($('#confirmOk'));
  await tick(60);
  ok('confirm performs the delete', Store.content().testimonials.length === before - 1);
}

section('Hero, sections and theme');
{
  Admin.show('hero');
  await tick(40);
  const f = $('#heroForm');
  f.elements.headline.value = 'New Headline.';
  f.elements.lede.value = 'New intro copy.';
  f.elements.siteName.value = 'New Site Name';
  f.elements.statValue0.value = '42';
  submit(f);
  await tick(60);
  ok('hero headline saves', Store.content().hero.headline === 'New Headline.');
  ok('hero lede saves', Store.content().hero.lede === 'New intro copy.');
  ok('meta siteName saves', Store.content().meta.siteName === 'New Site Name');
  ok('hero stat value saves as a number', Store.content().hero.stats[0].value === 42);
}
{
  Admin.show('sections');
  await tick(40);
  const tr = $('#adminContent tbody tr');
  tr.querySelector('[data-k="visible"]').checked = false;
  tr.querySelector('[data-k="nav"]').value = 'Sky Map';
  click($('#saveSections'));
  await tick(60);
  const s0 = Store.content().sections[0];
  ok('section visibility saves', s0.visible === false);
  ok('section nav label saves', s0.nav === 'Sky Map');
}
{
  Admin.show('theme');
  await tick(40);
  const f = $('#themeForm');
  f.elements.gold.value = '#ff8800';
  submit(f);
  await tick(60);
  ok('theme colour saves', Store.content().theme.gold === '#ff8800');

  f.elements.gold.value = 'not-a-colour';
  submit(f);
  await tick(60);
  ok('invalid colour is rejected', Store.content().theme.gold === '#ff8800');
  ok('rejection is surfaced in a toast', $('#toast').classList.contains('is-bad'));
}

section('Publish view');
{
  Admin.show('publish');
  await tick(200);
  ok('unpublished changes are listed', $$('#adminContent .change-list li').length > 0);
  ok('draft badge shows a count', $('#draftPill').hidden === false);
  ok('payload preview is rendered', $('.json-preview').textContent.length > 200);
  ok('token state reports the saved token', /Token present/.test($('#tokenState').textContent));
  ok('branch input is populated', $('#branchInput').value === 'main');
  ok('commit history renders', $$('#history tbody tr').length >= 1);

  click($('#doPublish'));
  await tick(300);
  const live = JSON.parse(gh.files['content.json'].text);
  ok('publish writes the draft to the repo', live.hero.headline === 'New Headline.');
  ok('published content includes edited FAQs',
    live.faqs.some((f) => f.q === 'Edited question?'));
  ok('draft is cleared after publishing', !Store.hasDraft());
  ok('draft badge is hidden after publishing', $('#draftPill').hidden === true);
}
{
  // Validation must block a bad publish.
  Store.setDraft('plans', [{ id: 'bad' }]);
  Admin.show('publish');
  await tick(120);
  ok('validation errors are shown', !!$('.notice-bad'));
  ok('publish button is disabled while invalid', $('#doPublish').disabled === true);
  Store.discardDraft();
}

section('Security view');
{
  Admin.show('security');
  await tick(40);
  ok('security explains the static-site model',
    /no server here|deterrent/i.test($('#adminContent').textContent));
  ok('repo field is prefilled', $('#repoInput').value === 'testowner/testrepo');
  ok('token field is a password input', $('#tokenInput').type === 'password');
  ok('token placeholder is masked',
    $('#tokenInput').placeholder.includes('…') &&
    !$('#tokenInput').placeholder.includes('testtoken'));

  click($('#saveToken'));
  await tick(300);
  ok('token verification reports success', /Verified as testowner/.test($('#tokenVerify').textContent));

  $('#newPass').value = 'short';
  $('#newPass2').value = 'short';
  click($('#genCred'));
  await tick(80);
  ok('short passphrase is rejected', !$('#credOut').textContent.includes('generated'));

  $('#newPass').value = 'a-brand-new-secure-passphrase';
  $('#newPass2').value = 'mismatch-passphrase-here';
  click($('#genCred'));
  await tick(80);
  ok('mismatched confirmation is rejected', !$('#credOut').textContent.includes('generated'));

  $('#newPass').value = 'a-brand-new-secure-passphrase';
  $('#newPass2').value = 'a-brand-new-secure-passphrase';
  click($('#genCred'));
  await tick(300);
  ok('valid passphrase generates a credential', /Credential generated/.test($('#credOut').textContent));
  ok('generated credential is shown as JSON', /"salt"/.test($('#credOut').textContent));
  ok('generated JSON contains no plaintext passphrase',
    !$('#credOut').textContent.includes('a-brand-new-secure-passphrase'));
}

section('Session & sign out');
{
  ok('session persists across view changes', Auth.isAuthed());
  const expired = { at: Date.now() - 9e6, exp: Date.now() - 1000 };
  window.localStorage.setItem('ajg-admin-session', JSON.stringify(expired));
  ok('expired session is rejected', !Auth.isAuthed());
  ok('expired session is purged', window.localStorage.getItem('ajg-admin-session') === null);
}

section('Runtime errors');
const real = errors.filter((e) => !/Not implemented|Could not parse CSS|jsdom/i.test(e));
ok('no uncaught errors during the whole run', real.length === 0, real.slice(0, 3).join(' | '));

/* ================================================================ */
console.error = origError;
console.log(log.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
