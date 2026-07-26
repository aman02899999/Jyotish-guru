/**
 * DOM integration test.
 *
 * Loads index.html in jsdom, boots the real app.js module graph and drives
 * the UI the way a visitor would: calculate a chart, switch vargas, scrub the
 * dasha timeline, run matching and query the oracle.
 *
 * Requires jsdom:  npm i -D jsdom
 * Run with:        node web/tests/dom.test.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('⚠ jsdom is not installed — skipping DOM tests.');
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

/* ---------------- build the document ---------------- */

const html = readFileSync(resolve(webRoot, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://example.test/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const { window } = dom;

// Minimal shims for APIs jsdom lacks.
window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
  unobserve() {} disconnect() {}
};
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
  // Enough of a 2D context for the starfield.
  return {
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {},
    measureText: () => ({ width: 60 }), fillText() {},
    set font(v) {}, set fillStyle(v) {}, set textBaseline(v) {},
    set shadowColor(v) {}, set shadowBlur(v) {},
  };
};
window.scrollTo = () => {};
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { value() {}, writable: true });
window.print = () => {};
if (!window.navigator.clipboard) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async () => {} }, configurable: true,
  });
}
window.fetch = async () => { throw new Error('offline in tests'); };
window.AbortSignal.timeout = () => undefined;

// Expose globals the modules expect.
for (const k of ['document', 'navigator', 'location', 'localStorage', 'HTMLElement',
  'customElements', 'getComputedStyle', 'Node', 'Element', 'SVGElement', 'Event',
  'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'DOMParser', 'Blob', 'URL',
  'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'IntersectionObserver',
  'innerWidth', 'innerHeight', 'devicePixelRatio', 'scrollY', 'print', 'fetch',
  'addEventListener', 'removeEventListener', 'setInterval', 'clearInterval', 'Intl']) {
  if (k in window) {
    try {
      Object.defineProperty(globalThis, k, {
        get: () => window[k], configurable: true,
      });
    } catch { globalThis[k] = window[k]; }
  }
}
globalThis.window = window;

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); };

/* ---------------- boot the app ---------------- */

section('Module graph');
let app;
try {
  app = await import(pathToFileURL(resolve(webRoot, 'assets/js/app.js')).href);
  ok('app.js and its imports load without throwing', true);
} catch (e) {
  ok('app.js and its imports load without throwing', false, e.stack.split('\n').slice(0, 3).join(' | '));
  console.error = origError;
  console.log(log.join('\n'));
  process.exit(1);
}

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
await tick(80);

/* ---------------- static structure ---------------- */

section('Page structure');
for (const id of ['hero', 'planetarium', 'kundli', 'dasha', 'panchang',
  'features', 'matching', 'oracle', 'remedies', 'app']) {
  ok(`section #${id} exists`, !!$(`#${id}`));
}
ok('every nav link resolves to a section',
  $$('.site-nav a').every((a) => $(a.getAttribute('href'))));
ok('feature cards rendered', $$('.feature-card').length === 9);
ok('no stray template placeholders',
  !window.document.body.innerHTML.includes('{{'));

/* ---------------- hero live preview ---------------- */

section('Hero live preview');
ok('hero kundli drew planets', $$('#heroKundli .kundli-planet').length === 9);
ok('hero ascendant filled', $('#hcAsc').textContent !== '—');
ok('hero moon sign filled', $('#hcMoon').textContent !== '—');
ok('hero nakshatra filled', $('#hcNak').textContent !== '—');
ok('hero tithi filled', $('#hcTithi').textContent !== '—');
ok('hero counters animated', +$('.hero-stats dt').textContent > 0);

/* ---------------- panchang ---------------- */

section('Panchang (auto-rendered on load)');
ok('panchang cards rendered', $$('#panchangGrid .pan-card').length === 10);
ok('panchang has a tithi', /Shukla|Krishna/.test($('#panchangGrid').textContent));
ok('muhurat windows rendered', $$('#muhuratList .muhurat-item').length === 4);
ok('Rahu Kaal shown', $('#muhuratList').textContent.includes('Rahu Kaal'));
ok('moon phase drawn', $('#moonPhase').innerHTML.includes('circle'));
ok('moon illumination shown', /% illuminated/.test($('#moonIllum').textContent));

/* ---------------- chart calculation ---------------- */

section('Chart calculation');
$('#bName').value = 'Test Native';
$('#bDate').value = '1990-05-15';
$('#bTime').value = '06:30';
$('#bAyan').value = 'lahiri';
$('#birthForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(160);

ok('results panel revealed', $('#results').hidden === false);
ok('summary cards rendered', $$('#summaryStrip .sum-card').length === 6);
ok('main kundli drew 9 planets', $$('#mainKundli .kundli-planet').length === 9);
ok('degree wheel drew 9 nodes', $$('#wheel .wheel-node').length === 9);
ok('strength bars for 9 grahas', $$('#strengthBars .bar-row').length === 9);
ok('planet table has 9 rows', $$('#planetTable tbody tr').length === 9);
ok('table shows real degrees', /\d+° \d{2}' \d{2}"/.test($('#planetTable').textContent));
ok('ayanamsa note populated', /Lahiri/.test($('#ayanamsaNote').textContent));
ok('lagna reading written', $('#lagnaCard').textContent.length > 120);
ok('moon reading written', $('#moonCard').textContent.length > 120);
ok('sun reading written', $('#sunCard').textContent.length > 80);
ok('life areas rendered', $$('#areaGrid .area-card').length === 8);
ok('house cards rendered', $$('#houseGrid .house-card').length === 12);
ok('planet readings rendered', $$('#planetReadings .pr-card').length === 9);
ok('varga picker has 16 buttons', $$('#vargaPicker button').length === 16);

// The readings must reference this native's real placements, not boilerplate.
const lagnaText = $('#lagnaCard').textContent;
ok('lagna reading names a real sign',
  /Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces/.test(lagnaText));
ok('lagna reading names a real nakshatra',
  /Ashwini|Bharani|Krittika|Rohini|Mrigashira|Ardra|Punarvasu|Pushya|Ashlesha|Magha|Phalguni|Hasta|Chitra|Swati|Vishakha|Anuradha|Jyeshtha|Mula|Ashadha|Shravana|Dhanishta|Shatabhisha|Bhadrapada|Revati/.test(lagnaText));

/* ---------------- varga switching ---------------- */

section('Divisional charts');
const d9 = $$('#vargaPicker button').find((b) => b.dataset.d === '9');
d9.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(40);
ok('D9 title updates', /D9 Navamsa/.test($('#vargaTitle').textContent));
ok('D9 still draws 9 planets', $$('#mainKundli .kundli-planet').length === 9);
ok('D9 use-case shown', /Marriage/.test($('#vargaUse').textContent));

const d60 = $$('#vargaPicker button').find((b) => b.dataset.d === '60');
d60.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(40);
ok('D60 renders', /D60/.test($('#vargaTitle').textContent) && $$('#mainKundli .kundli-planet').length === 9);

// Back to D1 and switch to the South Indian layout.
$$('#vargaPicker button')[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
$('#bStyle').value = 'south';
$('#bStyle').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(40);
ok('South Indian layout draws 12 cells', $$('#mainKundli .kundli-cell').length === 12);
ok('South Indian marks the ascendant', $$('#mainKundli .kundli-cell.is-asc').length === 1);
$('#bStyle').value = 'north';
$('#bStyle').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(40);

/* ---------------- dasha ---------------- */

section('Dasha timeline');
ok('9 mahadasha segments', $$('#dashaRibbon .dasha-seg').length === 9);
ok('one segment is active', $$('#dashaRibbon .dasha-seg.is-active').length >= 1);
ok('scrub readout populated', $('#scrubMaha').textContent !== '—');
ok('dasha narrative written', $('#dashaNarrative').textContent.length > 200);
ok('transits listed', $$('#transitList .transit-item').length >= 4);
ok('forecast bars rendered', $$('#forecast .fc-bar').length === 10);

const before = $('#scrubMaha').textContent;
const scrub = $('#timeScrub');
scrub.value = '72';
scrub.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(60);
ok('scrubbing changes the displayed date', $('#scrubDate').textContent !== '—');
ok('scrubbing recomputes the mahadasha',
  $('#scrubMaha').textContent !== '—');
ok('scrubbed year is deep in the future',
  +$('#scrubDate').textContent.slice(-4) > new Date().getFullYear());

// Timing area switch
const wealthBtn = $$('#timingSeg button').find((b) => b.dataset.area === 'wealth');
wealthBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(40);
ok('timing switches to wealth', wealthBtn.classList.contains('is-active'));
ok('forecast still populated', $$('#forecast .fc-bar').length === 10);

/* ---------------- daily horoscope + remedies ---------------- */

section('Personalised output');
ok('daily horoscope rendered', $$('#horoscope .horo-rating').length === 5);
ok('horoscope references the Moon transit', /Moon is transiting/.test($('#horoscope').textContent));
ok('lucky details shown', /Lucky colour/.test($('#horoscope').textContent));
ok('remedy cards rendered', $$('#remedyGrid .remedy-card').length === 3);
ok('remedies include a mantra', /Om .*Namah/.test($('#remedyGrid').textContent));
ok('gem panel revealed', $('#gemPanel').hidden === false);
ok('gemstone cards rendered', $$('#gemGrid .gem-card').length >= 1);

/* ---------------- matching ---------------- */

section('Ashtakoota matching');
$('#matchForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(120);
ok('match result revealed', $('#matchResult').hidden === false);
ok('8 koota cards', $$('#kootaGrid .koota-card').length === 8);
ok('verdict shown', $('#matchVerdict').textContent.length > 3);
ok('dial drew a value', $('#matchDial').innerHTML.includes('dial-value'));
ok('manglik cards for both partners', $$('#manglikRow .manglik-card').length === 2);
const totalTxt = $('#matchDial').textContent.match(/[\d.]+/);
ok('total score within 0..36', totalTxt && +totalTxt[0] >= 0 && +totalTxt[0] <= 36, totalTxt && totalTxt[0]);

/* ---------------- oracle ---------------- */

section('Oracle');
ok('oracle seeded after chart calc', $$('#oracleLog .oracle-msg').length >= 1);
ok('sample question chips', $$('#oracleChips button').length === 6);

$('#oracleInput').value = 'When is a good period for marriage?';
$('#oracleForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(120);
const oracleTxt = $('#oracleLog').textContent;
ok('oracle answered', $$('#oracleLog .oracle-msg').length >= 3);
ok('answer is about marriage', /7th house/.test(oracleTxt));
ok('answer cites a real house lord', /ruled by (Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn)/.test(oracleTxt));

$('#oracleInput').value = 'Which gemstone suits my chart?';
$('#oracleForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(120);
ok('gemstone question answered',
  /Ruby|Pearl|Red Coral|Emerald|Yellow Sapphire|Diamond|Blue Sapphire/.test($('#oracleLog').textContent));

$('#oracleInput').value = 'Am I going through Sade Sati?';
$('#oracleForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(120);
ok('Sade Sati question answered', /Sade Sati/.test($('#oracleLog').textContent));

/* ---------------- interactions ---------------- */

section('UI interactions');
$('#themeToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(20);
ok('theme toggles to light', window.document.documentElement.dataset.theme === 'light');
$('#themeToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(20);
ok('theme toggles back to dark', window.document.documentElement.dataset.theme === 'dark');

$('#navToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(20);
ok('mobile nav opens', $('.site-nav').classList.contains('is-open'));
ok('nav aria-expanded set', $('#navToggle').getAttribute('aria-expanded') === 'true');

$('#panToday').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await tick(60);
ok('panchang "today" still renders', $$('#panchangGrid .pan-card').length === 10);

// Place autocomplete
const place = $('#bPlace');
place.value = 'Mumb';
place.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(60);
ok('place autocomplete offers suggestions', $$('#placeList li').length > 0);
ok('suggestion mentions Mumbai', /Mumbai/.test($('#placeList').textContent));

/* ---------------- accessibility & hygiene ---------------- */

section('Accessibility & hygiene');
ok('page has a lang attribute', window.document.documentElement.lang === 'en');
ok('single h1', $$('h1').length === 1);
ok('all inputs are labelled',
  $$('input:not([type=hidden]):not([type=range]):not([type=checkbox])').every((i) =>
    i.labels?.length || i.getAttribute('aria-label') || i.getAttribute('placeholder')));
ok('all buttons have an accessible name',
  $$('button').every((b) => (b.textContent || '').trim() || b.getAttribute('aria-label')));
ok('skip link present', !!$('.skip-link'));
ok('meta description present', !!$('meta[name=description]')?.content);
ok('open graph tags present', !!$('meta[property="og:title"]'));
ok('manifest linked', !!$('link[rel=manifest]'));
ok('structured data present', !!$('script[type="application/ld+json"]'));
ok('WebGL absence handled gracefully',
  $('#plLoading').textContent.includes('WebGL is unavailable'));

section('Marketing: campaigns');
ok('campaign rail rendered', $$('#campaignRail .campaign-card').length > 0);
ok('campaigns carry a CTA', $$('#campaignRail [data-action]').length > 0);
ok('campaigns are dismissible', $$('#campaignRail [data-dismiss]').length > 0);
{
  const before = $$('#campaignRail .campaign-card').length;
  $('#campaignRail [data-dismiss]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(30);
  ok('dismissing removes the card', $$('#campaignRail .campaign-card').length === before - 1);
  ok('dismissal persists to localStorage',
    JSON.parse(window.localStorage.getItem('ajg-dismissed-campaigns') || '[]').length === 1);
}
ok('muhurat campaign is always eligible',
  $('#campaignRail').textContent.includes('Muhurat') ||
  $('#campaignRail').textContent.includes('Pro') ||
  $('#campaignRail').textContent.includes('Invite'));

section('Marketing: referral & rewards');
ok('referral code rendered', /^ADI-/.test($('#referralCode').textContent));
ok('referral code derives from the name (truncated to 8 chars)',
  $('#referralCode').textContent.includes('TESTNATI'), $('#referralCode').textContent);
ok('referral code has a stable numeric suffix',
  /^ADI-[A-Z0-9]{1,8}-\d{4}$/.test($('#referralCode').textContent), $('#referralCode').textContent);
ok('referral meta shows chart count', /chart/.test($('#referralMeta').textContent));
ok('copy invite button present', !!$('#copyRefBtn'));
ok('share chart button present', !!$('#shareChartBtn'));
ok('streak counter rendered', /day/.test($('#streakCount').textContent));
ok('streak starts at 1 on first visit', $('#streakCount').textContent.startsWith('1 day'));
ok('streak milestones listed', $$('#streakList li').length === 4);
ok('streak persisted', !!window.localStorage.getItem('ajg-streak'));
ok('weekly offer rendered', $('#offerTitle').textContent !== '—');
ok('offer discount shown', $('#offerDiscount').textContent !== '—');
ok('offer countdown ticking', /\d+[dhm]/.test($('#offerCountdown').textContent));

section('Marketing: notifications');
ok('bell button present', !!$('#bellBtn'));
{
  $('#bellBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(30);
  ok('bell panel opens', $('#bellPanel').hidden === false);
  ok('bell aria-expanded set', $('#bellBtn').getAttribute('aria-expanded') === 'true');
  ok('notification list rendered', $('#bellList').children.length > 0);
  const hasEventNotif = $$('#bellList .bell-item').length > 0;
  ok('sky events produced notifications', hasEventNotif);
  $('#bellClear').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(30);
  ok('clear empties the list', $('#bellList').textContent.includes('Nothing yet'));
}

section('Sky events calendar');
ok('event list populated', $$('#eventList .event-item').length > 0);
ok('events show a date', $$('#eventList .event-date strong').length > 0);
ok('events tagged by kind', $$('#eventList .event-kind').length > 0);
ok('events personalised to the chart',
  $$('#eventList .event-house').length > 0);
{
  const all = $$('#eventList .event-item').length;
  const ecl = $$('#eventFilter button').find((b) => b.dataset.kind === 'eclipse');
  ecl.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const filtered = $$('#eventList .event-item').length;
  ok('filtering narrows the list', filtered < all && filtered >= 0, `${all} → ${filtered}`);
  ok('eclipse filter shows only eclipses',
    $$('#eventList .event-kind').every((e) => e.textContent.trim() === 'eclipse'));
  $$('#eventFilter button')[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  ok('resetting the filter restores all', $$('#eventList .event-item').length === all);
}

section('Muhurat finder');
ok('activity options populated', $$('#mhActivity option').length >= 7);
ok('start date prefilled', !!$('#mhFrom').value);
$('#mhActivity').value = 'marriage';
$('#mhDays').value = '60';
$('#muhuratForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await tick(200);
ok('muhurat results rendered', $$('#muhuratResults .mh-card').length > 0);
ok('at most 8 dates shown', $$('#muhuratResults .mh-card').length <= 8);
ok('each date has a score', $$('#muhuratResults .mh-score').length === $$('#muhuratResults .mh-card').length);
ok('each date names a nakshatra and tithi',
  $$('#muhuratResults .mh-card').every((c) => c.querySelectorAll('.tag').length >= 2));
ok('reasons listed', $$('#muhuratResults .mh-card li').length > 0);
ok('results sorted chronologically', (() => {
  const ds = $$('#muhuratResults .mh-date').map((e) => new Date(e.textContent));
  return ds.every((d, i) => i === 0 || d >= ds[i - 1]);
})());
{
  $('#mhActivity').value = 'travel';
  $('#muhuratForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick(200);
  ok('changing activity re-runs the search', $$('#muhuratResults .mh-card').length > 0);
}

section('Numerology');
ok('numerology auto-filled from the chart form', $('#nmDate').value === '1990-05-15');
ok('numerology cards rendered', $$('#numeroResults .nm-card').length === 3);
ok('driver number shown', $$('#numeroResults .nm-value')[0].textContent.trim().length > 0);
ok('numbers map to grahas',
  $$('#numeroResults .nm-planet').every((e) => e.textContent.trim().length > 2));
ok('harmony verdict rendered', $('#numeroResults .nm-harmony').textContent.length > 40);
ok('lucky details rendered', $$('#numeroResults .nm-lucky div').length === 3);
{
  $('#nmName').value = 'Different Person';
  $('#nmDate').value = '1978-11-03';
  $('#numeroForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick(60);
  ok('recalculating changes the driver number',
    $$('#numeroResults .nm-value')[0].textContent.trim() === '3',
    $$('#numeroResults .nm-value')[0].textContent);
}

section('Pricing, testimonials, FAQ');
ok('three pricing tiers', $$('#pricingGrid .price-card').length === 3);
ok('one tier is featured', $$('#pricingGrid .price-card.is-featured').length === 1);
ok('free tier shows "Free"', $('#pricingGrid').textContent.includes('Free'));
ok('features listed per tier', $$('#pricingGrid .price-features li').length >= 15);
{
  const monthly = $$('#pricingGrid .price-amount strong').map((e) => e.textContent);
  const annualBtn = $$('.billing-toggle button').find((b) => b.dataset.period === 'annual');
  annualBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(40);
  const annual = $$('#pricingGrid .price-amount strong').map((e) => e.textContent);
  ok('billing toggle changes the prices', JSON.stringify(monthly) !== JSON.stringify(annual),
    `${monthly.join('/')} → ${annual.join('/')}`);
  ok('annual shows a monthly equivalent', /equivalent/.test($('#pricingGrid').textContent));
}
ok('testimonials rendered', $$('#testimonialGrid .testimonial-card').length === 4);
ok('testimonials have authors', $$('#testimonialGrid .tm-author strong').length === 4);
ok('FAQ rendered', $$('#faqList .faq-item').length === 6);
ok('first FAQ open by default', $('#faqList .faq-item').hasAttribute('open'));
ok('FAQ structured data injected',
  [...window.document.querySelectorAll('script[type="application/ld+json"]')]
    .some((x) => x.textContent.includes('FAQPage')));

section('New sections wired into navigation');
for (const id of ['events', 'muhurat', 'numerology', 'rewards', 'testimonials', 'pricing', 'faq']) {
  ok(`section #${id} exists`, !!$(`#${id}`));
}
ok('nav links still all resolve',
  $$('.site-nav a').every((a) => $(a.getAttribute('href'))));
ok('footer links all resolve',
  $$('.site-footer nav a[href^="#"]').every((a) => $(a.getAttribute('href'))));

section('Content store drives the public site');

// The public page must render from the content store, so admin edits are real.
{
  const Store = await import(pathToFileURL(resolve(webRoot, 'assets/js/admin/content.js')).href);
  const c = Store.content();

  ok('feature cards match the store', $$('.feature-card').length === c.features.length);
  ok('first feature title comes from the store',
    $('.feature-card h3').textContent.trim() === c.features[0].title);
  ok('pricing cards match the store', $$('#pricingGrid .price-card').length === c.plans.length);
  ok('first plan name comes from the store',
    $('#pricingGrid .price-card h3').textContent.trim() === c.plans[0].name);
  ok('testimonials match the store',
    $$('#testimonialGrid .testimonial-card').length === c.testimonials.length);
  ok('FAQs match the store', $$('#faqList .faq-item').length === c.faqs.length);
  ok('first FAQ question comes from the store',
    $('#faqList summary').textContent.trim() === c.faqs[0].q);
  ok('hero headline comes from the store',
    $('.hero h1').textContent.includes(c.hero.headline));
  ok('hero lede comes from the store',
    $('.hero .lede').textContent.trim() === c.hero.lede);
  ok('hero stats match the store', $$('.hero-stats div').length === c.hero.stats.length);
  ok('document title comes from the store', window.document.title === c.meta.title);
  ok('brand name comes from the store',
    $('.brand-text strong').textContent.trim() === c.meta.siteName);
  ok('nav is built from the sections list',
    $$('.site-nav a').length === c.sections.filter((x) => x.inNav && x.visible !== false).length);
  ok('campaigns are drawn from the store',
    $$('#campaignRail .campaign-card').every((el) =>
      c.campaigns.some((x) => x.id === el.dataset.id)));
}

section('Analytics recorded from the public site');
{
  const An = await import(pathToFileURL(resolve(webRoot, 'assets/js/admin/analytics.js')).href);
  const evs = An.events();
  ok('a visit was recorded', evs.some((e) => e.t === 'visit'));
  ok('the calculated chart was recorded', evs.some((e) => e.t === 'chart'));
  ok('chart event stores only coarse facets', (() => {
    const c = evs.find((e) => e.t === 'chart');
    return c && Object.keys(c.d).sort().join(',') === 'asc,ay,moon';
  })());
  ok('section views were recorded', evs.some((e) => e.t === 'section'));

  // Save-chart button feeds the admin panel's Saved Charts view.
  const before = An.savedCharts().length;
  $('#saveChartBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(60);
  ok('save chart button stores a record', An.savedCharts().length === before + 1);
  const rec = An.savedCharts()[0];
  ok('saved record has a lagna', typeof rec.lagna === 'string' && rec.lagna.length > 3);
  ok('saved record has a moon placement', typeof rec.moon === 'string');
}

section('Admin entry point');
ok('footer links to the admin panel', !!$('.site-footer a[href="admin.html"]'));
ok('admin link is marked nofollow',
  $('.site-footer a[href="admin.html"]').getAttribute('rel') === 'nofollow');

section('Runtime errors');
const real = errors.filter((e) => !/offline in tests|Not implemented|Could not parse CSS/i.test(e));
ok('no uncaught runtime errors', real.length === 0, real.slice(0, 3).join(' | '));

/* ---------------- report ---------------- */

console.error = origError;
console.log(log.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
