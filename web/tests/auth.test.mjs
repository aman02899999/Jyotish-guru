/**
 * Account system test suite.
 *
 * Covers the Firebase-backed login end to end without touching the network:
 * the Firebase SDK is replaced with a fake that reproduces the real API
 * surface and the error codes Firebase actually emits, so the failure paths
 * (wrong password, duplicate email, blocked popup, offline) are exercised
 * rather than assumed.
 *
 * Run with:  node web/tests/auth.test.mjs
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
  console.log('⚠ jsdom is not installed — skipping account tests.');
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

const html = readFileSync(resolve(webRoot, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  url: 'https://example.test/',
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
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};

/* --- firebase-config.json served to the config loader --------------- */
let serveConfig = true;
window.fetch = async (url) => {
  const u = String(url);
  if (u.includes('firebase-config.json')) {
    if (!serveConfig) return { ok: false, status: 404, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        appId: '1:2:web:3',
      }),
    };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

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
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const submit = (el) => el.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

/* ================================================================
   A fake Firebase Auth that behaves like the real one
   ================================================================ */

class FakeError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const fb = {
  users: new Map(),         // email -> { uid, password, displayName, emailVerified }
  current: null,
  listener: null,
  sent: { verification: 0, reset: [] },
  popupBehaviour: 'ok',     // ok | closed | blocked | error
  redirected: false,
  nextError: null,
};

function emitState() {
  if (fb.listener) fb.listener(fb.current);
}

function makeUser(email, password, displayName) {
  const uid = `uid_${fb.users.size + 1}`;
  const u = {
    uid, email, password,
    displayName: displayName || null,
    emailVerified: false,
    photoURL: null,
    providerData: [{ providerId: 'password' }],
    getIdToken: async () => `token-for-${uid}`,
  };
  fb.users.set(email, u);
  return u;
}

const authModule = {
  getAuth: () => ({ get currentUser() { return fb.current; } }),
  browserLocalPersistence: 'local',
  setPersistence: async () => {},
  getRedirectResult: async () => null,
  onAuthStateChanged: (auth, cb) => { fb.listener = cb; cb(fb.current); return () => {}; },

  createUserWithEmailAndPassword: async (auth, email, password) => {
    if (fb.nextError) { const e = fb.nextError; fb.nextError = null; throw new FakeError(e); }
    if (fb.users.has(email)) throw new FakeError('auth/email-already-in-use');
    if (password.length < 6) throw new FakeError('auth/weak-password');
    const u = makeUser(email, password);
    fb.current = u;
    emitState();
    return { user: u };
  },

  signInWithEmailAndPassword: async (auth, email, password) => {
    if (fb.nextError) { const e = fb.nextError; fb.nextError = null; throw new FakeError(e); }
    const u = fb.users.get(email);
    // Real Firebase with enumeration protection returns the same code for both.
    if (!u || u.password !== password) throw new FakeError('auth/invalid-credential');
    fb.current = u;
    emitState();
    return { user: u };
  },

  GoogleAuthProvider: class { setCustomParameters() {} },

  signInWithPopup: async () => {
    if (fb.popupBehaviour === 'closed') throw new FakeError('auth/popup-closed-by-user');
    if (fb.popupBehaviour === 'blocked') throw new FakeError('auth/popup-blocked');
    if (fb.popupBehaviour === 'error') throw new FakeError('auth/network-request-failed');
    const email = 'google-user@example.com';
    let u = fb.users.get(email);
    if (!u) {
      u = makeUser(email, null, 'Google User');
      u.emailVerified = true;
      u.providerData = [{ providerId: 'google.com' }];
    }
    fb.current = u;
    emitState();
    return { user: u };
  },

  signInWithRedirect: async () => { fb.redirected = true; },

  updateProfile: async (user, { displayName }) => { user.displayName = displayName; },
  sendEmailVerification: async () => { fb.sent.verification++; },
  sendPasswordResetEmail: async (auth, email) => {
    if (fb.nextError) { const e = fb.nextError; fb.nextError = null; throw new FakeError(e); }
    if (!fb.users.has(email)) throw new FakeError('auth/user-not-found');
    fb.sent.reset.push(email);
  },
  signOut: async () => { fb.current = null; emitState(); },
};

const appModule = {
  getApps: () => [],
  getApp: () => ({}),
  initializeApp: (cfg) => ({ options: cfg }),
};

/* ================================================================
   Modules under test
   ================================================================ */

section('Module loading');
let Auth, Profile, Validate, Errors, Config, UI;
const base = pathToFileURL(resolve(webRoot, 'assets/js/auth')).href;
try {
  Validate = await import(`${base}/validate.js`);
  Errors = await import(`${base}/errors.js`);
  Config = await import(`${base}/config.js`);
  Profile = await import(`${base}/profile.js`);
  Auth = await import(`${base}/auth.js`);
  UI = await import(`${base}/ui.js`);
  ok('all account modules import cleanly', true);
} catch (e) {
  ok('all account modules import cleanly', false, e.stack.split('\n').slice(0, 3).join(' | '));
  console.error = origError;
  console.log(log.join('\n'));
  process.exit(1);
}

Auth.__setModuleLoader(async (url) => (url.includes('firebase-auth') ? authModule : appModule));

/* ================================================================
   Validation rules
   ================================================================ */

section('Input validation');
ok('a normal address is valid', Validate.isValidEmail('someone@example.com'));
ok('an address with a subdomain is valid', Validate.isValidEmail('a.b@mail.example.co.in'));
ok('a missing @ is rejected', !Validate.isValidEmail('nope.example.com'));
ok('a missing TLD is rejected', !Validate.isValidEmail('a@localhost'));
ok('a trailing dot is rejected', !Validate.isValidEmail('a@example.com.'));
ok('spaces are rejected', !Validate.isValidEmail('a b@example.com'));
ok('email is lowercased and trimmed', Validate.normaliseEmail('  A@B.COM ') === 'a@b.com');
ok('whitespace in names is collapsed', Validate.normaliseName('  Ravi   Kumar ') === 'Ravi Kumar');

ok('an empty password scores 0', Validate.passwordStrength('').score === 0);
ok('a short password is weak', Validate.passwordStrength('abc').score <= 1);
ok('"password123" is forced weak', Validate.passwordStrength('password123').score <= 1);
ok('a long passphrase is strong', Validate.passwordStrength('correct horse battery staple').score >= 3);
ok('a mixed complex password is strong', Validate.passwordStrength('Xk9$mQ2!vLp4').score >= 3);

{
  const e = Validate.validateForm({ email: '', password: '' }, 'signin');
  ok('sign-in requires an email', !!e.email);
  ok('sign-in requires a password', !!e.password);
}
{
  const e = Validate.validateForm({ email: 'a@b.com', password: 'x' }, 'signin');
  ok('sign-in does not judge password strength', !e.password);
}
{
  const e = Validate.validateForm({ name: 'A', email: 'a@b.com', password: 'short' }, 'signup');
  ok('sign-up rejects a short password', /8 characters/.test(e.password || ''));
  ok('sign-up rejects a one-letter name', !!e.name);
}
{
  const e = Validate.validateForm(
    { name: 'Ravi', email: 'a@b.com', password: 'Xk9$mQ2!vLp4', confirm: 'different' }, 'signup');
  ok('sign-up catches a password mismatch', !!e.confirm);
}
{
  const e = Validate.validateForm({ name: 'Ravi', email: 'a@b.com', password: 'Xk9$mQ2!vLp4' }, 'signup');
  ok('a good sign-up payload passes', Object.keys(e).length === 0);
}
ok('reset only needs an email',
  Object.keys(Validate.validateForm({ email: 'a@b.com' }, 'reset')).length === 0);

/* ================================================================
   Error translation
   ================================================================ */

section('Error messages');
ok('wrong credentials produce a human message',
  Errors.describeAuthError({ code: 'auth/invalid-credential' }) === 'Incorrect email or password.');
ok('unknown-user and wrong-password are indistinguishable',
  Errors.describeAuthError({ code: 'auth/user-not-found' })
  === Errors.describeAuthError({ code: 'auth/wrong-password' }));
ok('duplicate email is explained',
  /already exists/.test(Errors.describeAuthError({ code: 'auth/email-already-in-use' })));
ok('rate limiting is explained',
  /Too many/.test(Errors.describeAuthError({ code: 'auth/too-many-requests' })));
ok('a closed popup produces no message',
  Errors.describeAuthError({ code: 'auth/popup-closed-by-user' }) === null);
ok('a closed popup is a cancellation',
  Errors.isUserCancellation({ code: 'auth/popup-closed-by-user' }));
ok('a blocked popup triggers the redirect fallback',
  Errors.shouldFallbackToRedirect({ code: 'auth/popup-blocked' }));
ok('an unknown code still yields a sentence',
  typeof Errors.describeAuthError({ code: 'auth/who-knows' }) === 'string');
ok('no raw error code leaks to the user',
  !/auth\//.test(Errors.describeAuthError({ code: 'auth/who-knows' })));

/* ================================================================
   Config loading
   ================================================================ */

section('Firebase config');
{
  const c = await Config.loadFirebaseConfig();
  ok('config loads from firebase-config.json', c.configured === true);
  ok('the project id is read', c.config.projectId === 'test-project');
}

/* ================================================================
   Sign-up / sign-in flows
   ================================================================ */

section('Sign up');
{
  const res = await Auth.signUp({ name: 'Ravi Kumar', email: 'Ravi@Example.com', password: 'Xk9$mQ2!vLp4' });
  ok('sign-up succeeds', res.ok === true);
  ok('the email is stored lowercased', fb.users.has('ravi@example.com'));
  ok('the display name is applied', res.user.name === 'Ravi Kumar');
  ok('a verification email is sent', fb.sent.verification === 1);
  ok('the session reports signed in', Auth.isSignedIn());
  ok('an ID token can be minted', (await Auth.idToken()) === 'token-for-uid_1');
}
{
  const res = await Auth.signUp({ name: 'Someone', email: 'ravi@example.com', password: 'Xk9$mQ2!vLp4' });
  ok('a duplicate email is refused', res.ok === false);
  ok('the duplicate message is actionable', /already exists/.test(res.error));
}

section('Sign out and back in');
{
  await Auth.signOut();
  ok('sign-out clears the session', !Auth.isSignedIn());
  ok('no token is issued when signed out', (await Auth.idToken()) === null);

  const bad = await Auth.signIn({ email: 'ravi@example.com', password: 'wrong-password' });
  ok('a wrong password is refused', bad.ok === false);
  ok('the failure message is generic', bad.error === 'Incorrect email or password.');
  ok('a failed sign-in leaves no session', !Auth.isSignedIn());

  const missing = await Auth.signIn({ email: 'nobody@example.com', password: 'whatever' });
  ok('an unknown account gives the same message', missing.error === bad.error);

  const good = await Auth.signIn({ email: '  RAVI@example.com ', password: 'Xk9$mQ2!vLp4' });
  ok('sign-in succeeds despite casing and spaces', good.ok === true);
  ok('the session is restored', Auth.isSignedIn());
}

section('Google sign-in');
{
  await Auth.signOut();
  fb.popupBehaviour = 'ok';
  const res = await Auth.signInWithGoogle();
  ok('the Google popup flow signs in', res.ok === true);
  ok('the Google provider is recorded', Auth.user().providers.includes('google.com'));
  ok('a Google account is already verified', Auth.user().emailVerified === true);

  await Auth.signOut();
  fb.popupBehaviour = 'closed';
  const cancelled = await Auth.signInWithGoogle();
  ok('closing the popup is not an error', cancelled.cancelled === true && cancelled.error === null);

  fb.popupBehaviour = 'blocked';
  const blocked = await Auth.signInWithGoogle();
  ok('a blocked popup falls back to redirect', blocked.redirecting === true);
  ok('the redirect was actually started', fb.redirected === true);

  fb.popupBehaviour = 'error';
  const failed = await Auth.signInWithGoogle();
  ok('a network failure is reported', /Network error/.test(failed.error));
  fb.popupBehaviour = 'ok';
}

section('Password reset does not leak accounts');
{
  const known = await Auth.resetPassword('ravi@example.com');
  ok('reset succeeds for a real account', known.ok === true);
  ok('the reset email was sent', fb.sent.reset.includes('ravi@example.com'));

  const unknown = await Auth.resetPassword('ghost@example.com');
  ok('reset also "succeeds" for an unknown address', unknown.ok === true);
  ok('both responses are identical', unknown.message === known.message);
  ok('the wording stays non-committal', /If that email has an account/.test(unknown.message));

  fb.nextError = 'auth/too-many-requests';
  const limited = await Auth.resetPassword('ravi@example.com');
  ok('genuine failures are still reported', limited.ok === false);
}

/* ================================================================
   Per-account storage
   ================================================================ */

section('Profile storage is scoped per account');
{
  Profile.clearCharts('uid_a');
  Profile.clearCharts('uid_b');
  Profile.saveChart('uid_a', { label: 'Chart A', date: '1990-01-01' });
  Profile.saveChart('uid_b', { label: 'Chart B', date: '1991-02-02' });

  ok('each account sees only its own charts',
    Profile.charts('uid_a').length === 1 && Profile.charts('uid_b').length === 1);
  ok('account A sees the right chart', Profile.charts('uid_a')[0].label === 'Chart A');
  ok('account B is unaffected by A', Profile.charts('uid_b')[0].label === 'Chart B');

  const id = Profile.charts('uid_a')[0].id;
  Profile.renameChart('uid_a', id, 'Renamed');
  ok('a chart can be renamed', Profile.charts('uid_a')[0].label === 'Renamed');
  Profile.deleteChart('uid_a', id);
  ok('a chart can be deleted', Profile.charts('uid_a').length === 0);
  ok('deleting from A leaves B intact', Profile.charts('uid_b').length === 1);
}

section('Preferences');
{
  ok('defaults are returned when unset', Profile.preferences('uid_a').ayanamsa === 'lahiri');
  Profile.setPreference('uid_a', 'ayanamsa', 'raman');
  ok('a preference persists', Profile.preferences('uid_a').ayanamsa === 'raman');
  ok('other accounts keep the default', Profile.preferences('uid_b').ayanamsa === 'lahiri');
  ok('unknown preference keys are refused', Profile.setPreference('uid_a', 'evil', 1) === false);
}

section('Anonymous work is adopted on first sign-in');
{
  Profile.clearCharts(null);
  Profile.clearCharts('uid_new');
  Profile.saveChart(null, { label: 'Made before signing in' });
  Profile.saveChart(null, { label: 'Also before' });
  ok('anonymous charts are recorded', Profile.charts(null).length === 2);

  const adopted = Profile.claimAnonymousData('uid_new');
  ok('both charts are adopted', adopted === 2);
  ok('they now belong to the account', Profile.charts('uid_new').length === 2);
  ok('the anonymous bucket is emptied', Profile.charts(null).length === 0);
  ok('claiming again adopts nothing', Profile.claimAnonymousData('uid_new') === 0);
}

section('Corrupt profile storage');
{
  window.localStorage.setItem('ajg-profile:uid_x:charts', 'not json at all');
  ok('a corrupt chart list does not throw', Array.isArray(Profile.charts('uid_x')));
  ok('a corrupt chart list reads as empty', Profile.charts('uid_x').length === 0);

  window.localStorage.setItem('ajg-profile:uid_y:charts', JSON.stringify([{ id: 'a' }, 'junk', 7]));
  ok('non-object rows are filtered out', Profile.charts('uid_y').length === 1);
}

section('Data export and purge');
{
  const dump = Profile.exportForSync('uid_new');
  ok('the export names the account', dump.uid === 'uid_new');
  ok('the export carries the charts', dump.charts.length === 2);
  ok('the export carries preferences', typeof dump.preferences.ayanamsa === 'string');

  Profile.purge('uid_new');
  ok('purge removes the charts', Profile.charts('uid_new').length === 0);
  ok('purge resets preferences', Profile.preferences('uid_new').ayanamsa === 'lahiri');
}

/* ================================================================
   UI integration
   ================================================================ */

section('Account UI');
{
  await Auth.signOut();
  const toasts = [];
  UI.mountAccountUI({ toast: (m, bad) => toasts.push({ m, bad }) });
  await tick(60);

  const btn = $('#accountBtn');
  ok('the header gains an account button', !!btn);
  ok('it reads "Sign in" when signed out', btn.textContent.trim() === 'Sign in');
  ok('it sits inside the header actions', btn.closest('.header-actions') !== null);

  click(btn);
  await tick(60);
  ok('clicking opens the dialog', !$('#authDialog').hidden);
  ok('the dialog is a modal', $('#authDialog .auth-modal').getAttribute('aria-modal') === 'true');
  ok('a Google button is offered', !!$('#googleBtn'));
  ok('an email field is present', !!$('#authForm input[name=email]'));
  ok('the password field is masked', $('#authForm input[name=password]').type === 'password');
  ok('birth-data privacy is stated', /stay on this device/.test($('#authBody').textContent));

  // Client-side validation blocks a bad submit before any network call.
  $('#authForm input[name=email]').value = 'not-an-email';
  $('#authForm input[name=password]').value = 'x';
  submit($('#authForm'));
  await tick(50);
  ok('an invalid email is caught before submitting', !$('#authError').hidden);
  ok('the message names the problem', /valid email/.test($('#authError').textContent));

  // Wrong password path.
  $('#authForm input[name=email]').value = 'ravi@example.com';
  $('#authForm input[name=password]').value = 'definitely-wrong';
  submit($('#authForm'));
  await tick(80);
  ok('a rejected sign-in shows the error', /Incorrect email or password/.test($('#authError').textContent));
  ok('the submit button is re-enabled after failure', $('#authSubmit').disabled === false);
  ok('the dialog stays open on failure', !$('#authDialog').hidden);

  // Correct credentials.
  $('#authForm input[name=password]').value = 'Xk9$mQ2!vLp4';
  submit($('#authForm'));
  await tick(90);
  ok('a successful sign-in closes the dialog', $('#authDialog').hidden);
  ok('the header shows the first name', $('#accountBtn').textContent.trim() === 'Ravi');
  ok('the button is marked as authed', $('#accountBtn').classList.contains('is-authed'));
  ok('a confirmation toast is shown', toasts.some((t) => /Signed in/.test(t.m)));

  // Profile view.
  click($('#accountBtn'));
  await tick(60);
  ok('the profile view opens for a signed-in user', /Your account/.test($('#authBody').textContent));
  ok('the profile shows the email', $('#authBody').textContent.includes('ravi@example.com'));
  ok('an unverified email is flagged', !!$('#resendBtn'));
  ok('a sign-out button is offered', !!$('#signOutBtn'));

  click($('#signOutBtn'));
  await tick(80);
  ok('signing out closes the dialog', $('#authDialog').hidden);
  ok('the header reverts to "Sign in"', $('#accountBtn').textContent.trim() === 'Sign in');
  ok('a sign-out toast is shown', toasts.some((t) => /Signed out/.test(t.m)));
}

section('Mode switching');
{
  UI.openDialog('signin');
  await tick(50);
  $('[data-mode=signup]').click();
  await tick(50);
  ok('switching to sign-up shows a name field', !!$('#authForm input[name=name]'));
  ok('the sign-up heading is shown', /Create your account/.test($('#authBody').textContent));

  const pw = $('#authForm input[name=password]');
  pw.value = 'Xk9$mQ2!vLp4';
  pw.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick(40);
  ok('the strength meter appears', !$('#pwMeter').hidden);
  ok('a strong password scores well', Number($('#pwFill').dataset.score) >= 3);

  $('[data-mode=signin]').click();
  await tick(50);
  $('[data-mode=reset]').click();
  await tick(50);
  ok('the reset view is reachable', /Reset your password/.test($('#authBody').textContent));
  ok('reset asks only for an email', !$('#authForm input[name=password]'));

  UI.closeDialog();
  ok('the dialog can be closed', $('#authDialog').hidden);
  ok('closing releases the body scroll lock',
    !window.document.body.classList.contains('auth-open'));
}

/* ================================================================
   Graceful degradation
   ================================================================ */

section('Unconfigured deployment');
{
  Auth.__reset();
  Config.resetConfigCache();
  serveConfig = false;

  const res = await Auth.init();
  ok('init reports failure without config', res.ok === false);
  ok('the reason is explained', /firebase-config\.json/.test(res.reason));
  ok('the module reports itself unavailable', !Auth.isAvailable());

  const attempt = await Auth.signIn({ email: 'a@b.com', password: 'whatever' });
  ok('signing in fails cleanly rather than throwing', attempt.ok === false);
  ok('the user is told sign-in is unavailable', typeof attempt.error === 'string');
  ok('signing out is still safe', (await Auth.signOut()).ok === true);

  serveConfig = true;
}

section('Runtime errors');
const real = errors.filter((e) => !/Not implemented|Could not parse CSS|jsdom|Unhandled auth error/i.test(e));
ok('no uncaught errors during the whole run', real.length === 0, real.slice(0, 3).join(' | '));

/* ================================================================ */
console.error = origError;
console.log(log.join('\n'));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log('─'.repeat(52));
process.exit(fail === 0 ? 0 : 1);
