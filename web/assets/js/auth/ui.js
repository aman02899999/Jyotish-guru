/**
 * ui.js — the account panel: header button, auth dialog and profile view.
 *
 * Builds its own DOM so index.html stays unchanged apart from one mount point,
 * and so the whole feature can be removed by deleting a single import.
 *
 * Everything degrades: with no Firebase config the button explains that
 * accounts are unavailable instead of opening a form that cannot work.
 */

import * as Auth from './auth.js';
import * as Profile from './profile.js';
import { validateForm, firstError, passwordStrength } from './validate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

let mode = 'signin';   // signin | signup | reset
let dialog = null;
let mounted = false;
let notify = () => {};

/* ------------------------------------------------------------------ *
 * Mount
 * ------------------------------------------------------------------ */

/**
 * @param {object} opts
 * @param {(msg: string, bad?: boolean) => void} opts.toast
 */
export function mountAccountUI({ toast } = {}) {
  if (mounted) return;
  mounted = true;
  if (typeof toast === 'function') notify = toast;

  const host = document.querySelector('.header-actions');
  if (!host) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'accountBtn';
  btn.className = 'btn btn-outline btn-sm account-btn';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.textContent = 'Sign in';

  // Sit to the left of the primary CTA rather than at the end of the row.
  const cta = host.querySelector('.btn-primary');
  host.insertBefore(btn, cta || null);

  btn.addEventListener('click', () => {
    if (Auth.isSignedIn()) openDialog('profile');
    else openDialog('signin');
  });

  // Reflect session state in the header without a reload.
  Auth.subscribe((user, { ready }) => {
    if (!ready) { btn.textContent = '…'; btn.disabled = true; return; }
    btn.disabled = false;
    if (user) {
      btn.textContent = user.name.split(' ')[0];
      btn.classList.add('is-authed');
      btn.setAttribute('aria-label', `Account: ${user.email}`);
    } else {
      btn.textContent = 'Sign in';
      btn.classList.remove('is-authed');
      btn.setAttribute('aria-label', 'Sign in or create an account');
    }
    if (dialog && !dialog.hidden) render();
  });

  // Kick off SDK loading in the background so the first click is instant.
  Auth.init();
}

/* ------------------------------------------------------------------ *
 * Dialog shell
 * ------------------------------------------------------------------ */

function ensureDialog() {
  if (dialog) return dialog;

  dialog = document.createElement('div');
  dialog.className = 'auth-backdrop';
  dialog.id = 'authDialog';
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button type="button" class="auth-close" id="authClose" aria-label="Close">×</button>
      <div id="authBody"></div>
    </div>`;
  document.body.appendChild(dialog);

  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
  dialog.querySelector('#authClose').addEventListener('click', closeDialog);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog && !dialog.hidden) closeDialog();
  });

  return dialog;
}

let lastFocus = null;

export function openDialog(next = 'signin') {
  mode = next;
  ensureDialog();
  lastFocus = document.activeElement;
  dialog.hidden = false;
  document.body.classList.add('auth-open');
  render();
}

export function closeDialog() {
  if (!dialog) return;
  dialog.hidden = true;
  document.body.classList.remove('auth-open');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function render() {
  const body = dialog.querySelector('#authBody');
  if (mode === 'profile' && Auth.isSignedIn()) body.innerHTML = profileView();
  else if (mode === 'reset') body.innerHTML = resetView();
  else body.innerHTML = credentialView();
  wire();
  const focusTarget = body.querySelector('input:not([type=hidden])');
  if (focusTarget) setTimeout(() => focusTarget.focus(), 30);
}

function unavailableNotice() {
  const reason = Auth.unavailable();
  if (!reason || Auth.isAvailable()) return '';
  return `<p class="auth-warn">${esc(reason)}
    <span class="muted small">Every chart, dasha and panchang feature works without an account.</span></p>`;
}

function credentialView() {
  const isSignup = mode === 'signup';
  return `
    <h2 id="authTitle">${isSignup ? 'Create your account' : 'Welcome back'}</h2>
    <p class="auth-sub">${isSignup
      ? 'Save your charts and keep your readings in one place.'
      : 'Sign in to reach your saved charts.'}</p>

    ${unavailableNotice()}

    <button type="button" class="btn btn-outline btn-block auth-google" id="googleBtn">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/></svg>
      Continue with Google
    </button>

    <div class="auth-or"><span>or</span></div>

    <form id="authForm" novalidate>
      ${isSignup ? `
        <label class="fld"><span>Name</span>
          <input type="text" name="name" autocomplete="name" required />
        </label>` : ''}

      <label class="fld"><span>Email</span>
        <input type="email" name="email" autocomplete="email" required />
      </label>

      <label class="fld"><span>Password</span>
        <input type="password" name="password"
               autocomplete="${isSignup ? 'new-password' : 'current-password'}" required />
      </label>

      ${isSignup ? `
        <div class="pw-meter" id="pwMeter" hidden>
          <div class="pw-bar"><i id="pwFill"></i></div>
          <span id="pwLabel" class="muted small"></span>
        </div>` : ''}

      <p class="auth-error" id="authError" hidden></p>

      <button type="submit" class="btn btn-primary btn-block" id="authSubmit">
        ${isSignup ? 'Create account' : 'Sign in'}
      </button>
    </form>

    <div class="auth-alt">
      ${isSignup
        ? `<button type="button" data-mode="signin" class="linkish">Already have an account? Sign in</button>`
        : `<button type="button" data-mode="signup" class="linkish">New here? Create an account</button>
           <button type="button" data-mode="reset" class="linkish">Forgot password?</button>`}
    </div>

    <p class="auth-fine muted small">
      Your birth details stay on this device. An account identifies you and
      separates your saved charts — it does not upload them.
    </p>`;
}

function resetView() {
  return `
    <h2 id="authTitle">Reset your password</h2>
    <p class="auth-sub">We will email you a link to choose a new one.</p>
    ${unavailableNotice()}
    <form id="authForm" novalidate>
      <label class="fld"><span>Email</span>
        <input type="email" name="email" autocomplete="email" required />
      </label>
      <p class="auth-error" id="authError" hidden></p>
      <button type="submit" class="btn btn-primary btn-block" id="authSubmit">Send reset link</button>
    </form>
    <div class="auth-alt">
      <button type="button" data-mode="signin" class="linkish">Back to sign in</button>
    </div>`;
}

function profileView() {
  const u = Auth.user();
  const saved = Profile.charts(u.uid);
  const viaGoogle = u.providers.includes('google.com');

  return `
    <h2 id="authTitle">Your account</h2>
    <div class="auth-id">
      <div class="auth-avatar" aria-hidden="true">${esc(u.name.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${esc(u.name)}</strong>
        <span class="muted small">${esc(u.email)}</span>
        <span class="muted small">${viaGoogle ? 'Signed in with Google' : 'Email account'}</span>
      </div>
    </div>

    ${!u.emailVerified && !viaGoogle ? `
      <p class="auth-warn">
        Your email is not verified.
        <button type="button" class="linkish" id="resendBtn">Resend the verification email</button>
      </p>` : ''}

    <div class="auth-stat">
      <strong>${saved.length}</strong>
      <span>saved chart${saved.length === 1 ? '' : 's'} on this device</span>
    </div>

    <div class="auth-actions">
      <button type="button" class="btn btn-outline btn-sm" id="exportBtn">Export my data</button>
      <button type="button" class="btn btn-ghost btn-sm" id="signOutBtn">Sign out</button>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Behaviour
 * ------------------------------------------------------------------ */

function wire() {
  const body = dialog.querySelector('#authBody');

  body.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => { mode = b.dataset.mode; render(); });
  });

  const form = body.querySelector('#authForm');
  if (form) form.addEventListener('submit', onSubmit);

  const google = body.querySelector('#googleBtn');
  if (google) google.addEventListener('click', onGoogle);

  const pw = body.querySelector('input[name=password]');
  const meter = body.querySelector('#pwMeter');
  if (pw && meter) {
    pw.addEventListener('input', () => {
      const { score, label } = passwordStrength(pw.value);
      meter.hidden = !pw.value;
      body.querySelector('#pwFill').style.width = `${(score / 4) * 100}%`;
      body.querySelector('#pwFill').dataset.score = String(score);
      body.querySelector('#pwLabel').textContent = label;
    });
  }

  const out = body.querySelector('#signOutBtn');
  if (out) out.addEventListener('click', async () => {
    await Auth.signOut();
    closeDialog();
    notify('Signed out.');
  });

  const exp = body.querySelector('#exportBtn');
  if (exp) exp.addEventListener('click', () => {
    const u = Auth.user();
    const data = JSON.stringify(Profile.exportForSync(u && u.uid), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jyotish-account-data.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  const resend = body.querySelector('#resendBtn');
  if (resend) resend.addEventListener('click', async () => {
    const res = await Auth.resendVerification();
    notify(res.ok ? res.message : res.error, !res.ok);
  });
}

function showError(msg) {
  const el = dialog.querySelector('#authError');
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
}

function busy(on, label) {
  const btn = dialog.querySelector('#authSubmit');
  if (!btn) return;
  btn.disabled = on;
  if (on) {
    btn.dataset.idle = btn.textContent;
    btn.textContent = label;
  } else if (btn.dataset.idle) {
    btn.textContent = btn.dataset.idle;
  }
}

async function onSubmit(e) {
  e.preventDefault();
  showError('');

  const data = Object.fromEntries(new FormData(e.target).entries());
  const errors = validateForm(data, mode);
  const bad = firstError(errors);
  if (bad) { showError(bad); return; }

  busy(true, 'Working…');
  try {
    let res;
    if (mode === 'signup') res = await Auth.signUp(data);
    else if (mode === 'reset') res = await Auth.resetPassword(data.email);
    else res = await Auth.signIn(data);

    if (!res.ok) {
      if (res.error) showError(res.error);
      return;
    }

    if (mode === 'reset') {
      showError('');
      notify(res.message);
      mode = 'signin';
      render();
      return;
    }

    afterSignIn(mode === 'signup');
  } finally {
    busy(false);
  }
}

async function onGoogle() {
  showError('');
  const btn = dialog.querySelector('#googleBtn');
  if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
  try {
    const res = await Auth.signInWithGoogle();
    if (!res.ok) {
      if (res.error) showError(res.error);
      return;
    }
    afterSignIn(false);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
  }
}

function afterSignIn(isNew) {
  const u = Auth.user();
  const adopted = u ? Profile.claimAnonymousData(u.uid) : 0;

  closeDialog();
  if (adopted) {
    notify(`Welcome${isNew ? '' : ' back'} — ${adopted} chart${adopted === 1 ? '' : 's'} added to your account.`);
  } else if (isNew) {
    notify('Account created. Check your inbox to verify your email.');
  } else {
    notify(`Signed in as ${u ? u.email : 'you'}.`);
  }
}
