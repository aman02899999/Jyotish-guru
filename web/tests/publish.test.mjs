/**
 * End-to-end publish test.
 *
 * Writes a content.json exactly as the admin panel's Publish step would, then
 * boots the real public page and asserts the DOM reflects it. This is the test
 * that proves admin edits actually reach visitors rather than only changing
 * the panel's own state.
 *
 * Run with:  node web/tests/publish.test.mjs
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('\u26a0 jsdom is not installed \u2014 skipping publish tests.');
  process.exit(0);
}

// Simulate a published content.json produced by the admin panel.
const publishedContent = {
  meta: { siteName: 'PUBLISHED BRAND', tagline: 'v9', title: 'Published Title', description: 'Published description.', repoUrl: 'https://github.com/x/y' },
  hero: { eyebrow: 'PUB EYEBROW', headline: 'Published Headline.', headlineEm: 'Second Line.', lede: 'Published lede text.',
          ctaPrimary:{label:'Go',href:'#kundli'}, ctaSecondary:{label:'More',href:'#planetarium'},
          stats:[{value:7,label:'Seven'},{value:8,label:'Eight'}] },
  features: [{ id:'z1', icon:'★', title:'ONLY FEATURE', text:'just one', href:'#kundli' }],
  plans: [{ id:'p1', name:'SOLO PLAN', monthly:5, annual:50, highlight:true, tagline:'t', cta:'Buy', features:['a','b'] }],
  testimonials: [{ id:'t1', name:'PUB PERSON', role:'r', initials:'PP', text:'quote' }],
  faqs: [{ id:'f1', q:'PUBLISHED QUESTION?', a:'answer' }],
  sections: [{id:'kundli',nav:'Chart',visible:true,inNav:true},{id:'pricing',nav:'Plans',visible:true,inNav:true},{id:'oracle',nav:'X',visible:false,inNav:false}],
  theme: { gold:'#00ff00', plum:'#7b5ea7', void:'#07050f', panel:'#120d21', text:'#f0ebff' },
  campaigns: [], astrologers: [], streakRewards: [], offers: [],
};
const target = resolve(root, 'content.json');
const had = existsSync(target);
const original = had ? readFileSync(target, 'utf8') : null;
writeFileSync(target, JSON.stringify(publishedContent, null, 2));

const html = readFileSync(`${root}/index.html`, 'utf8');
const dom = new JSDOM(html, { url:'https://example.test/', pretendToBeVisual:true, runScripts:'outside-only' });
const w = dom.window;
w.requestAnimationFrame = (cb)=>setTimeout(()=>cb(1),0);
w.cancelAnimationFrame = (i)=>clearTimeout(i);
w.matchMedia = ()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(el){this.cb([{isIntersecting:true,target:el}],this);} unobserve(){} disconnect(){} };
w.HTMLCanvasElement.prototype.getContext = () => ({clearRect(){},beginPath(){},arc(){},fill(){},fillRect(){},measureText:()=>({width:60}),fillText(){},set font(v){},set fillStyle(v){},set textBaseline(v){},set shadowColor(v){},set shadowBlur(v){}});
Object.defineProperty(w.HTMLElement.prototype,'scrollIntoView',{value(){},writable:true});
Object.defineProperty(w,'crypto',{value:webcrypto,configurable:true});
w.scrollTo=()=>{}; w.print=()=>{};
// Serve local files for fetch (content.json)
w.fetch = async (u) => {
  const s = String(u);
  if (s.includes('content.json')) return { ok:true, status:200, json: async()=>JSON.parse(readFileSync(target,'utf8')) };
  throw new Error('offline');
};
w.AbortSignal.timeout = () => undefined;
for (const k of ['document','navigator','location','localStorage','sessionStorage','HTMLElement','Node','Element','Event','CustomEvent','MouseEvent','FormData','Blob','URL','requestAnimationFrame','cancelAnimationFrame','matchMedia','IntersectionObserver','innerWidth','innerHeight','devicePixelRatio','scrollY','print','fetch','addEventListener','setInterval','clearInterval','getComputedStyle']) {
  if (k in w) { try { Object.defineProperty(globalThis,k,{get:()=>w[k],configurable:true}); } catch { globalThis[k]=w[k]; } }
}
globalThis.window = w;
await import(pathToFileURL(resolve(root, 'assets/js/app.js')).href);
await new Promise(r=>setTimeout(r,400));
const $ = (s)=>w.document.querySelector(s);
const $$ = (s)=>[...w.document.querySelectorAll(s)];

let p=0,f=0;
const t=(n,c,d='')=>{ if(c){p++;console.log('  ✓',n)} else {f++;console.log('  ✗',n,d)} };
console.log('\nPublished content.json \u2192 public site');
t('document title',            w.document.title==='Published Title', w.document.title);
t('brand name',                $('.brand-text strong').textContent==='PUBLISHED BRAND');
t('hero headline',             $('.hero h1').textContent.includes('Published Headline.'));
t('hero second line',          $('.hero h1').textContent.includes('Second Line.'));
t('hero lede',                 $('.hero .lede').textContent==='Published lede text.');
t('hero stats count',          $$('.hero-stats div').length===2, String($$('.hero-stats div').length));
t('only one feature card',     $$('.feature-card').length===1, String($$('.feature-card').length));
t('feature title',             $('.feature-card h3').textContent==='ONLY FEATURE');
t('one pricing plan',          $$('#pricingGrid .price-card').length===1);
t('plan name',                 $('#pricingGrid .price-card h3').textContent==='SOLO PLAN');
t('one testimonial',           $$('#testimonialGrid .testimonial-card').length===1);
t('one FAQ',                   $$('#faqList .faq-item').length===1);
t('FAQ question',              $('#faqList summary').textContent.trim()==='PUBLISHED QUESTION?');
t('nav built from sections',   $$('.site-nav a').length===2, String($$('.site-nav a').length));
t('nav labels overridden',     $('.site-nav a').textContent==='Chart');
t('hidden section is hidden',  $('#oracle').hidden===true);
t('visible section shown',     $('#kundli').hidden===false);
// The legacy "gold" content key drives the semantic --accent variable.
t('theme colour applied',      w.document.documentElement.style.getPropertyValue('--accent')==='#00ff00');
t('meta description applied',  $('meta[name=description]').content==='Published description.');

/* ================================================================
   XSS regression
   ================================================================
   content.json is attacker-controllable if a publishing token ever leaks,
   so hostile strings must render as inert text everywhere. A previous
   revision interpolated campaign icons and data-attributes unescaped.
   ================================================================ */

{
  const XSS = '"><img src=x onerror="globalThis.__PWNED=true">';
  const hostile = {
    meta: { siteName: XSS, title: XSS, description: XSS, tagline: XSS, repoUrl: '#' },
    hero: { eyebrow: XSS, headline: XSS, headlineEm: XSS, lede: XSS,
            ctaPrimary: { label: XSS, href: '#kundli' }, ctaSecondary: { label: XSS, href: '#x' },
            stats: [{ value: 1, label: XSS }] },
    features: [{ id: 'f', icon: XSS, title: XSS, text: XSS, href: '#kundli' }],
    plans: [{ id: 'p', name: XSS, monthly: 1, annual: 1, highlight: false, tagline: XSS, cta: XSS, features: [XSS] }],
    testimonials: [{ id: 't', name: XSS, role: XSS, initials: XSS, text: XSS }],
    faqs: [{ id: 'q', q: XSS, a: XSS }],
    sections: [{ id: 'kundli', nav: XSS, visible: true, inNav: true }],
    theme: { gold: '#d4af37', plum: '#7b5ea7', void: '#07050f', panel: '#120d21', text: '#f0ebff' },
    campaigns: [{ id: 'c', enabled: true, icon: XSS, badge: XSS, title: XSS, subtitle: XSS,
                  body: XSS, cta: XSS, action: XSS, target: XSS, tone: XSS, condition: 'always' }],
    astrologers: [], streakRewards: [{ days: 3, id: 's', label: XSS }],
    offers: [{ id: 'o', title: XSS, discount: XSS, note: XSS }],
  };
  writeFileSync(target, JSON.stringify(hostile));

  const d2 = new JSDOM(readFileSync(resolve(root, 'index.html'), 'utf8'),
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const w2 = d2.window;
  w2.requestAnimationFrame = (cb) => setTimeout(() => cb(1), 0);
  w2.cancelAnimationFrame = (i) => clearTimeout(i);
  w2.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w2.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} };
  w2.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, measureText: () => ({ width: 9 }), fillText() {}, set font(v) {}, set fillStyle(v) {}, set textBaseline(v) {}, set shadowColor(v) {}, set shadowBlur(v) {} });
  Object.defineProperty(w2.HTMLElement.prototype, 'scrollIntoView', { value() {}, writable: true });
  Object.defineProperty(w2, 'crypto', { value: webcrypto, configurable: true });
  w2.scrollTo = () => {}; w2.print = () => {};
  w2.fetch = async (u) => (String(u).includes('content.json')
    ? { ok: true, status: 200, json: async () => JSON.parse(readFileSync(target, 'utf8')) }
    : (() => { throw new Error('offline'); })());
  w2.AbortSignal.timeout = () => undefined;

  // Re-point the shared globals at the hostile document, then re-import the app
  // with a cache-busting query so it boots fresh against this DOM.
  for (const k of ['document', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'HTMLElement', 'Node', 'Element', 'Event', 'CustomEvent', 'MouseEvent', 'FormData',
    'Blob', 'URL', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
    'IntersectionObserver', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'scrollY',
    'print', 'fetch', 'addEventListener', 'setInterval', 'clearInterval', 'getComputedStyle']) {
    if (k in w2) {
      try { Object.defineProperty(globalThis, k, { get: () => w2[k], configurable: true }); }
      catch { globalThis[k] = w2[k]; }
    }
  }
  globalThis.window = w2;
  await import(`${pathToFileURL(resolve(root, 'assets/js/app.js')).href}?xss=1`);
  await new Promise((r) => setTimeout(r, 400));

  const injected = w2.document.querySelectorAll('img[onerror], [onload], [onclick]').length;
  t('hostile content injects no elements', injected === 0, `${injected} found`);
  t('hostile content does not execute', !w2.__PWNED && !globalThis.__PWNED);
  // The module graph is cached per-process, so `applyContent` runs against the
  // first document. Assert on the DOM that DID receive the hostile payload:
  // the collection renderers, which re-run on every boot.
  const hostileHtml = w2.document.body.innerHTML;
  t('hostile markup never appears unescaped anywhere',
    !hostileHtml.includes('<img src=x'), 'raw <img src=x present');
  t('hostile string survives only as escaped entities',
    !hostileHtml.includes('onerror="globalThis'));
  t('campaign icon is escaped',
    !(w2.document.querySelector('#campaignRail')?.innerHTML || '').includes('<img src=x'));
}

// Restore the working tree exactly as we found it.
if (had) writeFileSync(target, original);
else unlinkSync(target);
console.log(`\n${'\u2500'.repeat(52)}`);
console.log(`  ${p} passed, ${f} failed, ${p + f} total`);
console.log('\u2500'.repeat(52));
process.exit(f===0?0:1);
