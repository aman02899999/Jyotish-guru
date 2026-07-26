/**
 * admin.js — admin panel controller.
 *
 * Renders every management view and performs CRUD against the content store.
 * Edits land in a local draft; the Publish view commits them to the repository
 * through the GitHub API, which is the only step that changes the live site.
 */

import * as Auth from './auth.js';
import * as GH from './github.js';
import * as Store from './content.js';
import * as An from './analytics.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

let view = 'dashboard';

/* ================================================================
   Boot
   ================================================================ */

async function boot() {
  // A failure in either of these must not leave the operator staring at a
  // dead login form: fall back to defaults and carry on.
  try {
    await Auth.loadConfig();
  } catch (err) {
    console.error('Admin config failed to load', err);
  }
  try {
    await Store.loadContent();
  } catch (err) {
    console.error('Content failed to load', err);
  }

  $('#loginForm').addEventListener('submit', onLogin);
  $('#logoutBtn').addEventListener('click', () => {
    Auth.logout();
    location.reload();
  });
  $('#sideNav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (b) show(b.dataset.view);
  });
  $('#publishTopBtn').addEventListener('click', () => show('publish'));
  $('#previewBtn').addEventListener('click', () => window.open('index.html', '_blank'));

  if (Auth.isAuthed()) enterPanel();
  else tickLockout();
}

async function onLogin(e) {
  e.preventDefault();
  const wait = Auth.lockoutRemaining();
  if (wait > 0) {
    showLoginError(`Too many attempts. Wait ${wait}s.`);
    return;
  }
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = 'Verifying…';
  let res;
  try {
    res = await Auth.login($('#passInput').value);
  } catch (err) {
    // e.g. WebCrypto unavailable over plain HTTP. Never strand the button.
    console.error('Login failed', err);
    res = { ok: false, error: 'Could not verify the passphrase. A secure (HTTPS) connection is required.' };
  } finally {
    btn.disabled = false;
    btn.textContent = 'Unlock panel';
  }
  if (!res.ok) {
    showLoginError(res.error);
    $('#passInput').select();
    tickLockout();
    return;
  }
  $('#passInput').value = '';
  enterPanel();
}

function showLoginError(msg) {
  const el = $('#loginError');
  el.textContent = msg;
  el.hidden = false;
}

let lockTimer;
function tickLockout() {
  clearInterval(lockTimer);
  const update = () => {
    const s = Auth.lockoutRemaining();
    const btn = $('#loginBtn');
    if (s > 0) {
      btn.disabled = true;
      btn.textContent = `Locked — ${s}s`;
    } else {
      btn.disabled = false;
      btn.textContent = 'Unlock panel';
      clearInterval(lockTimer);
    }
  };
  update();
  lockTimer = setInterval(update, 1000);
}

function enterPanel() {
  $('#loginScreen').hidden = true;
  $('#adminShell').hidden = false;
  refreshDraftPill();
  show('dashboard');
}

/* ================================================================
   View routing
   ================================================================ */

const VIEWS = {
  dashboard: ['Dashboard', 'Overview of your deployment', renderDashboard],
  hero: ['Hero & Meta', 'Headline, intro copy and SEO metadata', renderHero],
  features: ['Features', 'The nine feature cards on the landing page', () => renderCollection('features')],
  campaigns: ['Campaigns', 'Promotional cards shown contextually in the hero', () => renderCollection('campaigns')],
  plans: ['Pricing', 'Membership tiers and their feature lists', () => renderCollection('plans')],
  testimonials: ['Testimonials', 'Social proof quotes', () => renderCollection('testimonials')],
  faqs: ['FAQs', 'Questions and answers, also emitted as structured data', () => renderCollection('faqs')],
  astrologers: ['Astrologers', 'Consultant directory shared with the Android app', () => renderCollection('astrologers')],
  sections: ['Sections & Nav', 'Show, hide and reorder landing page sections', renderSections],
  theme: ['Theme', 'Brand colours applied across the site', renderTheme],
  charts: ['Saved Charts', 'Chart records stored in this browser', renderCharts],
  publish: ['Publish', 'Commit your changes to the live site', renderPublish],
  security: ['Security', 'Passphrase, GitHub token and session', renderSecurity],
};

function show(name) {
  const known = Object.prototype.hasOwnProperty.call(VIEWS, name);
  view = known ? name : 'dashboard';
  const [title, sub, fn] = VIEWS[view];
  $('#viewTitle').textContent = title;
  $('#viewSub').textContent = sub;
  $$('#sideNav button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  const host = $('#adminContent');
  host.innerHTML = '';
  try {
    fn();
  } catch (err) {
    // One malformed collection must not take down the whole panel — show the
    // error inline and keep navigation usable.
    console.error(`Admin view "${view}" failed to render`, err);
    host.innerHTML = `
      <section class="card">
        <h3>This view could not be displayed</h3>
        <p class="muted">${esc(err && err.message ? err.message : String(err))}</p>
        <p class="muted small">Your other sections are unaffected. If this persists,
           export your local data from the Dashboard before making further changes.</p>
      </section>`;
  }
  host.scrollTop = 0;
}

function refreshDraftPill() {
  const keys = Store.draftKeys();
  const pill = $('#draftPill');
  pill.hidden = keys.length === 0;
  $('#draftCount').textContent = keys.length;
}

/* ================================================================
   Dashboard
   ================================================================ */

function renderDashboard() {
  const c = Store.content();
  const s = An.summary(30);
  const max = Math.max(...s.series.map((x) => x.count), 1);

  const problems = Store.issues();

  const el = $('#adminContent');
  el.innerHTML = `
    ${problems.length ? `
    <section class="card" id="contentIssues">
      <h3>⚠ Content warnings</h3>
      <ul class="muted small">
        ${problems.map((p) => `<li>${esc(p)}</li>`).join('')}
      </ul>
      <p class="muted small">Affected sections fell back to their shipped defaults,
         so the live site still renders correctly.</p>
    </section>` : ''}

    <div class="stat-row">
      ${statCard('Visits', s.visits, 'last 30 days')}
      ${statCard('Charts calculated', s.charts, 'non-identifying facets only')}
      ${statCard('Saved charts', s.savedCharts, 'stored in this browser')}
      ${statCard('Content items', countItems(c), 'across all collections')}
    </div>

    <div class="grid-2">
      <section class="card">
        <h3>Activity — last 30 days</h3>
        <div class="spark" role="img" aria-label="Daily activity">
          ${s.series.map((d) => `
            <span class="spark-bar" style="--h:${(d.count / max) * 100}%" title="${esc(d.label)}: ${d.count}"></span>
          `).join('')}
        </div>
        <p class="muted small">${s.total} events recorded${s.firstEvent ? ` since ${s.firstEvent.toLocaleDateString('en-GB')}` : ''}.</p>
      </section>

      <section class="card">
        <h3>Most visited sections</h3>
        ${s.topSections.length ? `<div class="barlist">
          ${s.topSections.map((r) => barRow(r.id, r.count, s.topSections[0].count)).join('')}
        </div>` : '<p class="muted">No section views recorded yet.</p>'}
      </section>

      <section class="card">
        <h3>Ascendant distribution</h3>
        ${s.charts ? `<div class="barlist">
          ${s.ascDist.filter((a) => a.count).sort((a, b) => b.count - a.count)
            .map((a) => barRow(a.sign, a.count, Math.max(...s.ascDist.map((x) => x.count)))).join('')}
        </div>` : '<p class="muted">No charts calculated on this device yet.</p>'}
      </section>

      <section class="card">
        <h3>Content summary</h3>
        <div class="barlist">
          ${['features', 'campaigns', 'plans', 'testimonials', 'faqs', 'astrologers']
            .map((k) => barRow(k, (c[k] || []).length, 10)).join('')}
        </div>
        <div class="card-actions">
          <button class="btn btn-outline btn-sm" data-goto="features">Edit content</button>
        </div>
      </section>
    </div>

    <section class="card">
      <h3>Data &amp; privacy</h3>
      <p class="muted small">
        Analytics are recorded in this browser only and never transmitted.
        No birth details are stored — chart events keep only the ayanamsa and
        ascendant sign so distributions can be shown without holding anyone's data.
      </p>
      <div class="card-actions">
        <button class="btn btn-outline btn-sm" id="exportAnalytics">Export local data</button>
        <button class="btn btn-danger btn-sm" id="clearAnalytics">Clear analytics</button>
      </div>
    </section>`;

  el.querySelector('[data-goto]')?.addEventListener('click', (e) => show(e.target.dataset.goto));
  $('#exportAnalytics').addEventListener('click', () => {
    download('jyotish-local-data.json', JSON.stringify(An.exportAll(), null, 2));
  });
  $('#clearAnalytics').addEventListener('click', () => {
    confirmDialog('Clear analytics?', 'This removes all locally recorded events. Saved charts are kept.', () => {
      An.clearAnalytics();
      toast('Analytics cleared.');
      show('dashboard');
    });
  });
}

const countItems = (c) => ['features', 'campaigns', 'plans', 'testimonials', 'faqs', 'astrologers']
  .reduce((n, k) => n + (c[k] || []).length, 0);

const statCard = (label, value, sub) => `
  <div class="stat">
    <span>${esc(label)}</span>
    <strong>${value}</strong>
    <em>${esc(sub)}</em>
  </div>`;

const barRow = (label, count, max) => `
  <div class="bar">
    <span class="bar-l">${esc(label)}</span>
    <span class="bar-t"><i style="width:${Math.round((count / Math.max(max, 1)) * 100)}%"></i></span>
    <span class="bar-v">${count}</span>
  </div>`;

/* ================================================================
   Hero & meta
   ================================================================ */

function renderHero() {
  const c = Store.content();
  const h = c.hero, m = c.meta;

  $('#adminContent').innerHTML = `
    <form class="card form" id="heroForm">
      <h3>Hero section</h3>
      ${field('Eyebrow', 'eyebrow', h.eyebrow)}
      ${field('Headline (line 1)', 'headline', h.headline)}
      ${field('Headline (line 2, emphasised)', 'headlineEm', h.headlineEm)}
      ${textarea('Intro paragraph', 'lede', h.lede, 4)}
      <div class="row-2">
        ${field('Primary button label', 'ctaPrimaryLabel', h.ctaPrimary?.label)}
        ${field('Primary button target', 'ctaPrimaryHref', h.ctaPrimary?.href)}
      </div>
      <div class="row-2">
        ${field('Secondary button label', 'ctaSecondaryLabel', h.ctaSecondary?.label)}
        ${field('Secondary button target', 'ctaSecondaryHref', h.ctaSecondary?.href)}
      </div>

      <h4>Hero statistics</h4>
      <div id="statRows">
        ${(h.stats || []).map((s, i) => `
          <div class="row-2 stat-row-edit" data-i="${i}">
            ${field('Value', `statValue${i}`, s.value, 'number')}
            ${field('Label', `statLabel${i}`, s.label)}
          </div>`).join('')}
      </div>

      <h3>Site metadata</h3>
      ${field('Site name', 'siteName', m.siteName)}
      ${field('Tagline', 'tagline', m.tagline)}
      ${field('Page title', 'pageTitle', m.title)}
      ${textarea('Meta description (SEO)', 'description', m.description, 3)}
      ${field('Repository URL', 'repoUrl', m.repoUrl)}

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Save to draft</button>
        <button class="btn btn-ghost" type="button" id="resetHero">Reset section</button>
      </div>
    </form>`;

  $('#heroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const stats = (h.stats || []).map((_, i) => ({
      value: Number(f.get(`statValue${i}`)) || 0,
      label: f.get(`statLabel${i}`) || '',
    }));
    Store.setDraft('hero', {
      eyebrow: f.get('eyebrow'),
      headline: f.get('headline'),
      headlineEm: f.get('headlineEm'),
      lede: f.get('lede'),
      ctaPrimary: { label: f.get('ctaPrimaryLabel'), href: f.get('ctaPrimaryHref') },
      ctaSecondary: { label: f.get('ctaSecondaryLabel'), href: f.get('ctaSecondaryHref') },
      stats,
    });
    Store.setDraft('meta', {
      siteName: f.get('siteName'),
      tagline: f.get('tagline'),
      title: f.get('pageTitle'),
      description: f.get('description'),
      repoUrl: f.get('repoUrl'),
    });
    afterEdit('Hero and metadata saved to draft.');
  });

  $('#resetHero').addEventListener('click', () => {
    confirmDialog('Reset hero?', 'Restores the shipped defaults for the hero and metadata.', () => {
      Store.setDraft('hero', Store.DEFAULTS.hero);
      Store.setDraft('meta', Store.DEFAULTS.meta);
      afterEdit('Hero reset.');
      show('hero');
    });
  });
}

/* ================================================================
   Generic collection CRUD
   ================================================================ */

const SCHEMA = {
  features: {
    label: 'feature card',
    title: (r) => r.title,
    fields: [
      ['icon', 'Icon', 'text', 'A glyph such as ✦ or ◈'],
      ['title', 'Title', 'text'],
      ['text', 'Description', 'textarea'],
      ['href', 'Links to', 'text', 'Section anchor, e.g. #kundli'],
    ],
  },
  campaigns: {
    label: 'campaign',
    title: (r) => r.title,
    fields: [
      ['enabled', 'Enabled', 'checkbox'],
      ['icon', 'Icon', 'text'],
      ['badge', 'Badge text', 'text'],
      ['title', 'Title', 'text'],
      ['subtitle', 'Subtitle', 'text'],
      ['body', 'Body copy', 'textarea'],
      ['cta', 'Button label', 'text'],
      ['action', 'Action', 'select', ['OPEN_SECTION', 'SUBSCRIBE', 'BUY_CREDITS', 'REFER_FRIEND', 'DISMISS']],
      ['target', 'Target anchor', 'text'],
      ['tone', 'Tone', 'select', ['gold', 'alert', 'info', 'plum']],
      ['condition', 'Show when', 'select', ['always', 'sadeSati', 'mercuryRetro', 'eclipseSoon', 'hasChart', 'noChart']],
    ],
  },
  plans: {
    label: 'pricing plan',
    title: (r) => r.name,
    fields: [
      ['name', 'Plan name', 'text'],
      ['tagline', 'Tagline', 'text'],
      ['monthly', 'Monthly price', 'number'],
      ['annual', 'Annual price', 'number'],
      ['highlight', 'Highlight as most popular', 'checkbox'],
      ['cta', 'Button label', 'text'],
      ['features', 'Features (one per line)', 'lines'],
    ],
  },
  testimonials: {
    label: 'testimonial',
    title: (r) => r.name,
    fields: [
      ['name', 'Name', 'text'],
      ['role', 'Role and city', 'text'],
      ['initials', 'Initials', 'text'],
      ['text', 'Quote', 'textarea'],
    ],
  },
  faqs: {
    label: 'FAQ',
    title: (r) => r.q,
    fields: [
      ['q', 'Question', 'text'],
      ['a', 'Answer', 'textarea'],
    ],
  },
  astrologers: {
    label: 'astrologer',
    title: (r) => r.name,
    fields: [
      ['visible', 'Visible', 'checkbox'],
      ['name', 'Name', 'text'],
      ['specialty', 'Specialty', 'text'],
      ['style', 'Style', 'select', ['Traditional Vedic', 'Plain Modern Language']],
      ['price', 'Price (₹)', 'number'],
      ['icon', 'Icon', 'text'],
      ['languages', 'Languages', 'text'],
      ['bio', 'Biography', 'textarea'],
    ],
  },
};

function renderCollection(kind) {
  const schema = SCHEMA[kind];
  const rows = Store.content()[kind] || [];

  $('#adminContent').innerHTML = `
    <div class="collection-head">
      <p class="muted">${rows.length} ${schema.label}${rows.length === 1 ? '' : 's'}. Drag the handle to reorder.</p>
      <button class="btn btn-primary btn-sm" id="addRow">＋ Add ${schema.label}</button>
    </div>
    <div class="rows" id="rows">
      ${rows.map((r, i) => rowCard(kind, r, i, schema)).join('')}
    </div>
    ${rows.length === 0 ? `<p class="empty">No ${schema.label}s yet. Add the first one.</p>` : ''}`;

  $('#addRow').addEventListener('click', () => {
    const next = [...(Store.content()[kind] || []), Store.blankRow(kind)];
    Store.setDraft(kind, next);
    afterEdit(`New ${schema.label} added.`);
    show(kind);
    const last = $$('#rows .row-card').pop();
    last?.querySelector('details')?.setAttribute('open', '');
    last?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  wireRows(kind, schema);
}

function rowCard(kind, r, i, schema) {
  const disabled = r.enabled === false || r.visible === false;
  return `
    <article class="row-card ${disabled ? 'is-off' : ''}" data-id="${esc(r.id)}" draggable="true">
      <details>
        <summary>
          <span class="drag" title="Drag to reorder">⠿</span>
          <span class="row-idx">${i + 1}</span>
          <span class="row-title">${esc(schema.title(r) || '(untitled)')}</span>
          ${disabled ? '<span class="tag tag-off">hidden</span>' : ''}
          <span class="row-tools">
            <button type="button" data-act="up" title="Move up" aria-label="Move up">↑</button>
            <button type="button" data-act="down" title="Move down" aria-label="Move down">↓</button>
            <button type="button" data-act="dup" title="Duplicate" aria-label="Duplicate">⧉</button>
            <button type="button" data-act="del" title="Delete" aria-label="Delete">✕</button>
          </span>
        </summary>
        <form class="row-form" data-id="${esc(r.id)}">
          ${schema.fields.map(([key, label, type, extra]) =>
            renderField(key, label, type, r[key], extra)).join('')}
          <div class="row-actions">
            <button class="btn btn-primary btn-sm" type="submit">Save</button>
            <span class="row-id">id: <code>${esc(r.id)}</code></span>
          </div>
        </form>
      </details>
    </article>`;
}

function renderField(key, label, type, value, extra) {
  if (type === 'checkbox') {
    return `<label class="check"><input type="checkbox" name="${key}" ${value !== false ? 'checked' : ''} /><span>${esc(label)}</span></label>`;
  }
  if (type === 'textarea') return textarea(label, key, value, 3);
  if (type === 'lines') {
    return textarea(label, key, Array.isArray(value) ? value.join('\n') : (value || ''), 6);
  }
  if (type === 'select') {
    return `<label class="fld"><span>${esc(label)}</span>
      <select name="${key}">
        ${(extra || []).map((o) => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select></label>`;
  }
  return field(label, key, value, type, typeof extra === 'string' ? extra : '');
}

function wireRows(kind, schema) {
  const container = $('#rows');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.row-card');
    const id = card.dataset.id;
    const list = [...(Store.content()[kind] || [])];
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return;

    switch (btn.dataset.act) {
      case 'up':
        if (i === 0) return;
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
        break;
      case 'down':
        if (i === list.length - 1) return;
        [list[i + 1], list[i]] = [list[i], list[i + 1]];
        break;
      case 'dup': {
        const copy = { ...list[i], id: `${kind.slice(0, 2)}_${Date.now().toString(36)}` };
        list.splice(i + 1, 0, copy);
        break;
      }
      case 'del':
        confirmDialog(`Delete this ${schema.label}?`,
          `"${schema.title(list[i]) || list[i].id}" will be removed from the draft.`, () => {
            const l2 = [...(Store.content()[kind] || [])].filter((r) => r.id !== id);
            Store.setDraft(kind, l2);
            afterEdit(`${cap(schema.label)} deleted.`);
            show(kind);
          });
        return;
    }
    Store.setDraft(kind, list);
    afterEdit('Order updated.');
    show(kind);
  });

  container.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target.closest('.row-form');
    if (!form) return;
    const id = form.dataset.id;
    const fd = new FormData(form);
    const list = [...(Store.content()[kind] || [])];
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return;

    const updated = { ...list[i] };
    for (const [key, , type] of schema.fields) {
      if (type === 'checkbox') updated[key] = fd.get(key) !== null;
      else if (type === 'number') updated[key] = Number(fd.get(key)) || 0;
      else if (type === 'lines') {
        updated[key] = String(fd.get(key) || '').split('\n').map((x) => x.trim()).filter(Boolean);
      } else updated[key] = fd.get(key) ?? '';
    }
    list[i] = updated;
    Store.setDraft(kind, list);
    afterEdit(`${cap(schema.label)} saved.`);
    show(kind);
  });

  // Drag to reorder
  let dragId = null;
  container.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.row-card');
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  container.addEventListener('dragend', (e) => {
    e.target.closest('.row-card')?.classList.remove('is-dragging');
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const over = e.target.closest('.row-card');
    $$('.row-card', container).forEach((c) => c.classList.remove('is-over'));
    if (over && over.dataset.id !== dragId) over.classList.add('is-over');
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const over = e.target.closest('.row-card');
    if (!over || !dragId || over.dataset.id === dragId) return;
    const list = [...(Store.content()[kind] || [])];
    const from = list.findIndex((r) => r.id === dragId);
    const to = list.findIndex((r) => r.id === over.dataset.id);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    Store.setDraft(kind, list);
    afterEdit('Reordered.');
    show(kind);
  });
}

/* ================================================================
   Sections & nav
   ================================================================ */

function renderSections() {
  const rows = Store.content().sections || [];
  $('#adminContent').innerHTML = `
    <p class="muted">Hide a section to remove it from the page entirely. Uncheck
       “in nav” to keep the section live but drop it from the header menu.</p>
    <div class="card">
      <table class="admin-table">
        <thead><tr><th>Section</th><th>Nav label</th><th>Visible</th><th>In nav</th><th>Order</th></tr></thead>
        <tbody>
          ${rows.map((s, i) => `
            <tr data-id="${esc(s.id)}">
              <td><code>#${esc(s.id)}</code></td>
              <td><input type="text" value="${esc(s.nav)}" data-k="nav" /></td>
              <td class="ctr"><input type="checkbox" data-k="visible" ${s.visible !== false ? 'checked' : ''} /></td>
              <td class="ctr"><input type="checkbox" data-k="inNav" ${s.inNav ? 'checked' : ''} /></td>
              <td class="ctr">
                <button type="button" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" data-act="down" ${i === rows.length - 1 ? 'disabled' : ''}>↓</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="card-actions">
        <button class="btn btn-primary" id="saveSections">Save to draft</button>
        <button class="btn btn-ghost" id="resetSections">Reset</button>
      </div>
    </div>`;

  $('#adminContent').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const tr = b.closest('tr');
    const list = [...(Store.content().sections || [])];
    const i = list.findIndex((s) => s.id === tr.dataset.id);
    const j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    Store.setDraft('sections', list);
    afterEdit('Order updated.');
    show('sections');
  });

  $('#saveSections').addEventListener('click', () => {
    const list = $$('#adminContent tbody tr').map((tr) => ({
      id: tr.dataset.id,
      nav: $('[data-k="nav"]', tr).value,
      visible: $('[data-k="visible"]', tr).checked,
      inNav: $('[data-k="inNav"]', tr).checked,
    }));
    Store.setDraft('sections', list);
    afterEdit('Sections saved to draft.');
  });

  $('#resetSections').addEventListener('click', () => {
    confirmDialog('Reset sections?', 'Restores the default visibility and order.', () => {
      Store.setDraft('sections', Store.DEFAULTS.sections);
      afterEdit('Sections reset.');
      show('sections');
    });
  });
}

/* ================================================================
   Theme
   ================================================================ */

/* The keys are legacy (a published content.json may still use them); the
   labels describe what they actually control in the maroon palette. */
const THEME_FIELDS = [
  ['gold', 'Primary accent — maroon', 'Buttons, links, highlights and headings'],
  ['plum', 'Secondary accent — brass', 'Gradients and secondary ornament'],
  ['void', 'Background — off-white', 'Page background'],
  ['panel', 'Surface', 'Card and panel surfaces'],
  ['text', 'Text', 'Primary body text'],
];

function renderTheme() {
  const t = Store.content().theme || {};
  $('#adminContent').innerHTML = `
    <div class="grid-2">
      <form class="card form" id="themeForm">
        <h3>Brand colours</h3>
        ${THEME_FIELDS.map(([k, label, hint]) => `
          <label class="fld color-fld">
            <span>${esc(label)}<em>${esc(hint)}</em></span>
            <span class="color-input">
              <input type="color" name="${k}_picker" value="${esc(t[k] || '#000000')}" aria-label="${esc(label)} colour picker" />
              <input type="text" name="${k}" value="${esc(t[k] || '')}" spellcheck="false" />
            </span>
          </label>`).join('')}
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Save to draft</button>
          <button class="btn btn-ghost" type="button" id="resetTheme">Reset</button>
        </div>
      </form>

      <section class="card">
        <h3>Live preview</h3>
        <div class="theme-preview" id="themePreview">
          <div class="tp-hero">
            <span class="tp-eyebrow">◆ Vedic Astronomy Engine</span>
            <h4>Ancient Wisdom.</h4>
            <p>Modern Intelligence.</p>
            <span class="tp-btn">Start Free Reading</span>
          </div>
          <div class="tp-panel">
            <span class="tp-label">Ascendant</span>
            <strong class="tp-value">Taurus 12° 34'</strong>
          </div>
        </div>
        <p class="muted small">Colours apply to the public site after publishing.</p>
      </section>
    </div>`;

  const form = $('#themeForm');
  const sync = () => {
    const p = $('#themePreview');
    for (const [k] of THEME_FIELDS) {
      p.style.setProperty(`--tp-${k}`, form.elements[k].value || '#000');
    }
  };
  for (const [k] of THEME_FIELDS) {
    form.elements[`${k}_picker`].addEventListener('input', (e) => {
      form.elements[k].value = e.target.value;
      sync();
    });
    form.elements[k].addEventListener('input', (e) => {
      if (/^#[0-9a-f]{6}$/i.test(e.target.value)) form.elements[`${k}_picker`].value = e.target.value;
      sync();
    });
  }
  sync();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const theme = {};
    for (const [k] of THEME_FIELDS) theme[k] = form.elements[k].value.trim();
    const errs = Store.validate({ theme });
    if (errs.length) { toast(errs[0], true); return; }
    Store.setDraft('theme', theme);
    afterEdit('Theme saved to draft.');
  });

  $('#resetTheme').addEventListener('click', () => {
    Store.setDraft('theme', Store.DEFAULTS.theme);
    afterEdit('Theme reset.');
    show('theme');
  });
}

/* ================================================================
   Saved charts
   ================================================================ */

function renderCharts() {
  const rows = An.savedCharts();
  $('#adminContent').innerHTML = `
    <div class="collection-head">
      <p class="muted">${rows.length} chart${rows.length === 1 ? '' : 's'} saved in this browser. These never leave your device.</p>
      <div>
        <button class="btn btn-outline btn-sm" id="exportCharts">Export</button>
        <button class="btn btn-danger btn-sm" id="clearCharts" ${rows.length ? '' : 'disabled'}>Clear all</button>
      </div>
    </div>
    ${rows.length ? `
      <div class="card">
        <table class="admin-table">
          <thead><tr><th>Label</th><th>Born</th><th>Place</th><th>Lagna</th><th>Moon</th><th>Saved</th><th></th></tr></thead>
          <tbody>
            ${rows.map((c) => `
              <tr data-id="${esc(c.id)}">
                <td><input type="text" value="${esc(c.label || '')}" data-k="label" placeholder="Untitled" /></td>
                <td>${esc(c.date || '—')} ${esc(c.time || '')}</td>
                <td>${esc(c.place || '—')}</td>
                <td>${esc(c.lagna || '—')}</td>
                <td>${esc(c.moon || '—')}</td>
                <td class="muted small">${new Date(c.savedAt).toLocaleDateString('en-GB')}</td>
                <td class="ctr">
                  <button type="button" data-act="save" title="Save label">✓</button>
                  <button type="button" data-act="del" title="Delete">✕</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">No charts saved yet. Use “Save chart” on the site after calculating one.</p>'}`;

  $('#adminContent').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const tr = b.closest('tr');
    const id = tr.dataset.id;
    if (b.dataset.act === 'save') {
      An.updateChart(id, { label: $('[data-k="label"]', tr).value });
      toast('Label saved.');
    } else {
      confirmDialog('Delete chart?', 'This record will be removed from this browser.', () => {
        An.deleteChart(id);
        toast('Chart deleted.');
        show('charts');
      });
    }
  });

  $('#exportCharts')?.addEventListener('click', () => {
    download('saved-charts.json', JSON.stringify(An.savedCharts(), null, 2));
  });
  $('#clearCharts')?.addEventListener('click', () => {
    confirmDialog('Clear all saved charts?', 'This cannot be undone.', () => {
      An.clearCharts();
      toast('All charts cleared.');
      show('charts');
    });
  });
}

/* ================================================================
   Publish
   ================================================================ */

function renderPublish() {
  const keys = Store.draftKeys();
  const payload = Store.publishPayload();
  const errs = Store.validate(payload);

  $('#adminContent').innerHTML = `
    ${errs.length ? `
      <div class="notice notice-bad">
        <strong>${errs.length} problem${errs.length === 1 ? '' : 's'} must be fixed before publishing</strong>
        <ul>${errs.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>` : ''}

    <div class="grid-2">
      <section class="card">
        <h3>Unpublished changes</h3>
        ${keys.length ? `
          <ul class="change-list">
            ${keys.map((k) => `<li><code>${esc(k)}</code><span>${describeChange(k)}</span></li>`).join('')}
          </ul>` : '<p class="muted">No local changes. The live site matches your last publish.</p>'}
        <div class="card-actions">
          <button class="btn btn-outline btn-sm" id="downloadJson">Download content.json</button>
          <button class="btn btn-outline btn-sm" id="importJson">Import JSON</button>
          <button class="btn btn-danger btn-sm" id="discardDraft" ${keys.length ? '' : 'disabled'}>Discard draft</button>
        </div>
        <input type="file" id="importFile" accept="application/json" hidden />
      </section>

      <section class="card">
        <h3>Publish to GitHub</h3>
        <div id="tokenState"></div>
        <label class="fld"><span>Branch</span>
          <input type="text" id="branchInput" placeholder="loading…" spellcheck="false" />
        </label>
        <label class="fld"><span>Commit message</span>
          <input type="text" id="commitMsg" value="content: update site content via admin panel" />
        </label>
        <div class="card-actions">
          <button class="btn btn-primary" id="doPublish" ${errs.length ? 'disabled' : ''}>Publish now</button>
        </div>
        <p class="muted small">Publishing commits <code>content.json</code> to the
           repository. If CI is enabled, the site redeploys automatically.</p>
      </section>
    </div>

    <section class="card">
      <h3>Publish history</h3>
      <div id="history"><p class="muted">Connect a token to load commit history.</p></div>
    </section>

    <details class="card">
      <summary><h3>Preview payload</h3></summary>
      <pre class="json-preview">${esc(JSON.stringify(payload, null, 2))}</pre>
    </details>`;

  $('#downloadJson').addEventListener('click', () => {
    download('content.json', `${JSON.stringify(payload, null, 2)}\n`);
    toast('Downloaded. Commit it to the repo root to publish manually.');
  });

  $('#importJson').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      Store.importDraft(obj);
      afterEdit('Content imported into the draft.');
      show('publish');
    } catch (err) {
      toast(`Import failed: ${err.message}`, true);
    }
  });

  $('#discardDraft').addEventListener('click', () => {
    confirmDialog('Discard all local changes?',
      'Your draft will be removed and the panel will show the published content again.', () => {
        Store.discardDraft();
        afterEdit('Draft discarded.');
        show('publish');
      });
  });

  $('#doPublish').addEventListener('click', doPublish);
  paintTokenState();
  loadBranchAndHistory();
}

function describeChange(key) {
  const c = Store.content();
  const v = c[key];
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? '' : 's'}`;
  if (v && typeof v === 'object') return `${Object.keys(v).length} field${Object.keys(v).length === 1 ? '' : 's'}`;
  return 'modified';
}

function paintTokenState() {
  const box = $('#tokenState');
  if (!box) return;
  if (!Auth.hasToken()) {
    box.innerHTML = `
      <div class="notice notice-warn">
        <strong>No GitHub token</strong>
        <p>Publishing needs a token with <code>repo</code> scope. Add one in
           <button type="button" class="linkish" data-goto="security">Security</button>,
           or download the JSON and commit it yourself.</p>
      </div>`;
    box.querySelector('[data-goto]')?.addEventListener('click', () => show('security'));
  } else {
    box.innerHTML = `<div class="notice notice-ok"><strong>Token present</strong>
      <p><code>${esc(Auth.maskToken(Auth.getToken()))}</code> → <code>${esc(Auth.getRepo())}</code></p></div>`;
  }
}

async function loadBranchAndHistory() {
  const input = $('#branchInput');
  if (!input) return;
  if (!Auth.hasToken()) { input.value = 'main'; input.placeholder = 'main'; return; }
  try {
    input.value = await GH.defaultBranch();
  } catch { input.value = 'main'; }
  try {
    const hist = await GH.fileHistory('content.json', 8);
    const box = $('#history');
    if (!box) return;
    box.innerHTML = hist.length ? `
      <table class="admin-table">
        <thead><tr><th>Commit</th><th>Message</th><th>Author</th><th>When</th><th></th></tr></thead>
        <tbody>
          ${hist.map((h) => `
            <tr>
              <td><code>${esc(h.sha)}</code></td>
              <td>${esc(h.message)}</td>
              <td>${esc(h.author)}</td>
              <td class="muted small">${h.date.toLocaleString('en-GB')}</td>
              <td><button type="button" class="linkish" data-restore="${esc(h.sha)}">Restore</button></td>
            </tr>`).join('')}
        </tbody>
      </table>` : '<p class="muted">No commits touching content.json yet.</p>';

    box.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-restore]');
      if (!b) return;
      confirmDialog('Restore this version?',
        `Loads content.json from commit ${b.dataset.restore} into your draft. Nothing publishes until you press Publish.`,
        async () => {
          try {
            const obj = await GH.contentAtCommit(b.dataset.restore);
            Store.importDraft(obj);
            afterEdit('Version restored into the draft.');
            show('publish');
          } catch (err) { toast(err.message, true); }
        });
    });
  } catch (err) {
    const box = $('#history');
    if (box) box.innerHTML = `<p class="muted">Could not load history: ${esc(err.message)}</p>`;
  }
}

async function doPublish() {
  const btn = $('#doPublish');
  const payload = Store.publishPayload();
  const errs = Store.validate(payload);
  if (errs.length) { toast(errs[0], true); return; }
  if (!Auth.hasToken()) { toast('Add a GitHub token in Security first.', true); show('security'); return; }

  btn.disabled = true;
  btn.textContent = 'Publishing…';
  try {
    const res = await GH.publishContent(payload, {
      branch: $('#branchInput').value.trim() || undefined,
      message: $('#commitMsg').value.trim() || undefined,
    });
    if (res.unchanged) {
      toast('No change — the live content already matches.');
    } else {
      Store.markPublished(payload);
      toast(`Published to ${res.branch}. The site will update shortly.`);
    }
    refreshDraftPill();
    show('publish');
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.textContent = 'Publish now';
  }
}

/* ================================================================
   Security
   ================================================================ */

function renderSecurity() {
  const exp = Auth.sessionExpiry();
  $('#adminContent').innerHTML = `
    ${Auth.usingDefaultCredential() ? `
      <div class="notice notice-warn">
        <strong>You are using the default passphrase</strong>
        <p>Generate a new credential below and commit <code>admin-config.json</code>
           before sharing this deployment.</p>
      </div>` : ''}

    <div class="notice notice-info">
      <strong>How security works on a static site</strong>
      <p>There is no server here, so the passphrase check runs in your browser
         and can be bypassed by someone reading the source. It is a
         <em>deterrent</em>. The real boundary is the GitHub token below —
         GitHub validates it server-side, so without it nobody can change what
         other visitors see, no matter what they do in this panel.</p>
    </div>

    <div class="grid-2">
      <section class="card">
        <h3>GitHub token</h3>
        <p class="muted small">Needs <code>repo</code> scope (classic) or
           Contents: read &amp; write (fine-grained). Stored in this tab's
           session storage and sent only to api.github.com.</p>
        <label class="fld"><span>Repository</span>
          <input type="text" id="repoInput" value="${esc(Auth.getRepo())}" spellcheck="false" />
        </label>
        <label class="fld"><span>Token</span>
          <input type="password" id="tokenInput" placeholder="${Auth.hasToken() ? esc(Auth.maskToken(Auth.getToken())) : 'ghp_…'}" spellcheck="false" autocomplete="off" />
        </label>
        <label class="check"><input type="checkbox" id="rememberToken" /><span>Remember on this device (less safe)</span></label>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" id="saveToken">Save &amp; verify</button>
          <button class="btn btn-ghost btn-sm" id="clearTokenBtn" ${Auth.hasToken() ? '' : 'disabled'}>Remove token</button>
        </div>
        <div id="tokenVerify"></div>
      </section>

      <section class="card">
        <h3>Change passphrase</h3>
        <p class="muted small">Generates a fresh salt and PBKDF2 hash. Publish it
           (or commit <code>admin-config.json</code>) for it to take effect.</p>
        <label class="fld"><span>New passphrase</span>
          <input type="password" id="newPass" placeholder="At least 12 characters" autocomplete="new-password" />
        </label>
        <label class="fld"><span>Confirm</span>
          <input type="password" id="newPass2" autocomplete="new-password" />
        </label>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" id="genCred">Generate credential</button>
        </div>
        <div id="credOut"></div>
      </section>
    </div>

    <section class="card">
      <h3>Session</h3>
      <p class="muted small">
        ${exp ? `This session expires ${exp.toLocaleString('en-GB')}.` : 'No active session.'}
        Failed attempts: ${Auth.getFailures().count}.
      </p>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" id="signOutNow">Sign out now</button>
      </div>
    </section>`;

  $('#saveToken').addEventListener('click', async () => {
    const repo = $('#repoInput').value.trim();
    const tok = $('#tokenInput').value.trim();
    if (repo) Auth.setRepo(repo);
    if (tok) Auth.setToken(tok, $('#rememberToken').checked);
    const box = $('#tokenVerify');
    box.innerHTML = '<p class="muted small">Verifying with GitHub…</p>';
    try {
      const v = await GH.verifyToken();
      box.innerHTML = v.ok
        ? `<div class="notice notice-ok"><strong>Verified as ${esc(v.user)}</strong>
             <p>Write access to <code>${esc(v.repo)}</code> confirmed.</p></div>`
        : `<div class="notice notice-bad"><strong>Not authorised</strong><p>${esc(v.error)}</p></div>`;
      $('#tokenInput').value = '';
      $('#clearTokenBtn').disabled = false;
    } catch (err) {
      box.innerHTML = `<div class="notice notice-bad"><strong>Verification failed</strong><p>${esc(err.message)}</p></div>`;
    }
  });

  $('#clearTokenBtn').addEventListener('click', () => {
    Auth.clearToken();
    toast('Token removed.');
    show('security');
  });

  $('#genCred').addEventListener('click', async () => {
    const a = $('#newPass').value, b = $('#newPass2').value;
    if (a.length < 12) { toast('Use at least 12 characters.', true); return; }
    if (a !== b) { toast('The two passphrases do not match.', true); return; }
    const cred = await Auth.makeCredential(a);
    const json = `${JSON.stringify(cred, null, 2)}\n`;
    $('#credOut').innerHTML = `
      <div class="notice notice-ok">
        <strong>Credential generated</strong>
        <p>Commit this as <code>admin-config.json</code> in the repository root.</p>
      </div>
      <pre class="json-preview">${esc(json)}</pre>
      <div class="card-actions">
        <button class="btn btn-outline btn-sm" id="dlCred">Download</button>
        <button class="btn btn-primary btn-sm" id="pushCred" ${Auth.hasToken() ? '' : 'disabled'}>Commit to repo</button>
      </div>`;
    $('#dlCred').addEventListener('click', () => download('admin-config.json', json));
    $('#pushCred')?.addEventListener('click', async () => {
      try {
        const r = await GH.publishCredential(cred);
        toast(`Passphrase committed to ${r.branch}.`);
      } catch (err) { toast(err.message, true); }
    });
    $('#newPass').value = '';
    $('#newPass2').value = '';
  });

  $('#signOutNow').addEventListener('click', () => {
    Auth.logout();
    location.reload();
  });
}

/* ================================================================
   Shared UI helpers
   ================================================================ */

function field(label, name, value, type = 'text', hint = '') {
  return `<label class="fld"><span>${esc(label)}${hint ? `<em>${esc(hint)}</em>` : ''}</span>
    <input type="${type}" name="${name}" value="${esc(value ?? '')}" /></label>`;
}

function textarea(label, name, value, rows = 3) {
  return `<label class="fld"><span>${esc(label)}</span>
    <textarea name="${name}" rows="${rows}">${esc(value ?? '')}</textarea></label>`;
}

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

function afterEdit(msg) {
  refreshDraftPill();
  toast(msg);
}

let toastTimer;
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('is-bad', bad);
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 3600);
}

function confirmDialog(title, body, onOk) {
  const modal = $('#confirmModal');
  $('#confirmTitle').textContent = title;
  $('#confirmBody').textContent = body;
  modal.hidden = false;

  const ok = $('#confirmOk'), cancel = $('#confirmCancel');

  const close = () => {
    modal.hidden = true;
    ok.removeEventListener('click', run);
    cancel.removeEventListener('click', close);
    modal.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
  };
  const run = () => {
    close();
    // A throwing callback used to leave the modal listeners detached but the
    // error unreported; close first, then surface any failure as a toast.
    try { onOk(); } catch (err) {
      console.error('Confirm action failed', err);
      toast(err && err.message ? err.message : 'Action failed.', true);
    }
  };
  const onBackdrop = (e) => { if (e.target === modal) close(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  ok.addEventListener('click', run);
  cancel.addEventListener('click', close);
  modal.addEventListener('click', onBackdrop);
  document.addEventListener('keydown', onKey);
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();

// Exposed for the test suite.
export { boot, show, VIEWS };
