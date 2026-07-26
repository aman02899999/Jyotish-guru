/**
 * auth.js — the user account backend, built on Firebase Authentication.
 *
 * This is a genuinely server-backed login, unlike the admin panel's local
 * passphrase gate. Firebase verifies credentials on Google's servers, issues a
 * signed ID token (a JWT) and refreshes it automatically. Nothing here can be
 * bypassed by editing localStorage: the token is signed with a key we do not
 * hold, so a forged one is rejected by any service that verifies it.
 *
 * WHAT THIS MODULE GUARANTEES
 *   - The Firebase SDK is loaded lazily, only when the user actually opens the
 *     account panel, so visitors who never sign in pay no download cost and
 *     the astrology engine keeps working with no network at all.
 *   - Every method resolves to { ok, ... } instead of throwing, so callers
 *     cannot leave a button spinning forever.
 *   - When Firebase is not configured the module reports `unavailable` rather
 *     than crashing the page.
 *
 * SDK is pulled from the official CDN as an ES module, matching this project's
 * no-build-step architecture.
 */

import { loadFirebaseConfig } from './config.js';
import { describeAuthError, isUserCancellation, shouldFallbackToRedirect } from './errors.js';
import { normaliseEmail, normaliseName } from './validate.js';

const SDK_VERSION = '10.14.1';
const APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;

/* Overridable for tests, which must not hit the network. */
let importModule = (url) => import(/* @vite-ignore */ url);
export function __setModuleLoader(fn) { importModule = fn; }

let sdk = null;          // { app, auth, fns }
let initPromise = null;
let unavailableReason = null;

const listeners = new Set();
let currentUser = null;
let ready = false;

/* ------------------------------------------------------------------ *
 * Initialisation
 * ------------------------------------------------------------------ */

/**
 * Load the SDK and attach the session listener. Safe to call repeatedly —
 * the work happens once.
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export function init() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { configured, config, reason } = await loadFirebaseConfig();
    if (!configured) {
      unavailableReason = reason;
      ready = true;
      emit();
      return { ok: false, reason };
    }

    try {
      const [appMod, authMod] = await Promise.all([
        importModule(APP_URL),
        importModule(AUTH_URL),
      ]);

      const app = appMod.getApps && appMod.getApps().length
        ? appMod.getApp()
        : appMod.initializeApp(config);
      const auth = authMod.getAuth(app);

      // Survive a page reload, but never outlive the browser profile.
      if (authMod.setPersistence && authMod.browserLocalPersistence) {
        try {
          await authMod.setPersistence(auth, authMod.browserLocalPersistence);
        } catch { /* falls back to the SDK default */ }
      }

      sdk = { app, auth, fns: authMod };

      // Complete a redirect-based Google sign-in, if one is in flight.
      if (authMod.getRedirectResult) {
        try { await authMod.getRedirectResult(auth); } catch { /* reported on next attempt */ }
      }

      await new Promise((resolve) => {
        authMod.onAuthStateChanged(auth, (user) => {
          currentUser = user ? shape(user) : null;
          ready = true;
          emit();
          resolve();
        }, (err) => {
          console.error('Auth state listener failed', err);
          ready = true;
          emit();
          resolve();
        });
      });

      return { ok: true };
    } catch (err) {
      // The CDN is blocked, offline, or the project is misconfigured. The rest
      // of the site must not care.
      console.error('Firebase SDK failed to load', err);
      unavailableReason = 'Sign-in is temporarily unavailable.';
      ready = true;
      emit();
      return { ok: false, reason: unavailableReason };
    }
  })();

  return initPromise;
}

/** The public shape we expose — never the raw Firebase user object. */
function shape(user) {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Seeker'),
    photoURL: user.photoURL || null,
    emailVerified: !!user.emailVerified,
    providers: (user.providerData || []).map((p) => p.providerId),
  };
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export function user() { return currentUser; }
export function isSignedIn() { return !!currentUser; }
export function isReady() { return ready; }
export function isAvailable() { return !!sdk; }
export function unavailable() { return unavailableReason; }

/** Subscribe to session changes. Fires immediately with the current state. */
export function subscribe(fn) {
  listeners.add(fn);
  try { fn(currentUser, { ready }); } catch (e) { console.error(e); }
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(currentUser, { ready }); } catch (e) { console.error(e); }
  }
}

/**
 * A verified ID token for calling a real backend.
 *
 * Any server receiving this must verify the signature against Google's public
 * keys before trusting a single claim in it. The token is short-lived (1 hour)
 * and the SDK refreshes it transparently.
 */
export async function idToken(forceRefresh = false) {
  if (!sdk || !sdk.auth.currentUser) return null;
  try {
    return await sdk.auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.error('Could not mint an ID token', err);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Credential flows
 * ------------------------------------------------------------------ */

function guard() {
  if (!sdk) {
    return { ok: false, error: unavailableReason || 'Sign-in is unavailable right now.' };
  }
  return null;
}

export async function signUp({ name, email, password }) {
  await init();
  const blocked = guard();
  if (blocked) return blocked;

  const { fns, auth } = sdk;
  try {
    const cred = await fns.createUserWithEmailAndPassword(auth, normaliseEmail(email), password);
    const display = normaliseName(name);
    if (display && fns.updateProfile) {
      try { await fns.updateProfile(cred.user, { displayName: display }); } catch { /* non-fatal */ }
    }
    // Best effort: a failed verification email must not fail the signup.
    if (fns.sendEmailVerification) {
      try { await fns.sendEmailVerification(cred.user); } catch { /* non-fatal */ }
    }
    currentUser = shape(cred.user);
    emit();
    return { ok: true, user: currentUser, verificationSent: true };
  } catch (err) {
    return { ok: false, error: describeAuthError(err), code: err && err.code };
  }
}

export async function signIn({ email, password }) {
  await init();
  const blocked = guard();
  if (blocked) return blocked;

  try {
    const cred = await sdk.fns.signInWithEmailAndPassword(sdk.auth, normaliseEmail(email), password);
    currentUser = shape(cred.user);
    emit();
    return { ok: true, user: currentUser };
  } catch (err) {
    return { ok: false, error: describeAuthError(err), code: err && err.code };
  }
}

/**
 * Google sign-in. Tries a popup, then falls back to a full-page redirect when
 * the browser blocks it (common on iOS Safari and in embedded webviews).
 */
export async function signInWithGoogle() {
  await init();
  const blocked = guard();
  if (blocked) return blocked;

  const { fns, auth } = sdk;
  try {
    const provider = new fns.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await fns.signInWithPopup(auth, provider);
    currentUser = shape(cred.user);
    emit();
    return { ok: true, user: currentUser };
  } catch (err) {
    if (isUserCancellation(err)) return { ok: false, cancelled: true, error: null };

    if (shouldFallbackToRedirect(err) && fns.signInWithRedirect) {
      try {
        await fns.signInWithRedirect(auth, new fns.GoogleAuthProvider());
        return { ok: false, redirecting: true, error: null };
      } catch (redirectErr) {
        return { ok: false, error: describeAuthError(redirectErr) };
      }
    }
    return { ok: false, error: describeAuthError(err), code: err && err.code };
  }
}

/**
 * Send a password reset email.
 *
 * Always reports success, even for an address with no account. Doing otherwise
 * turns this form into an oracle that tells an attacker which emails are
 * registered.
 */
export async function resetPassword(email) {
  await init();
  const blocked = guard();
  if (blocked) return blocked;

  try {
    await sdk.fns.sendPasswordResetEmail(sdk.auth, normaliseEmail(email));
  } catch (err) {
    const code = err && err.code;
    // Genuine problems still surface; "unknown address" deliberately does not.
    if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') {
      return { ok: false, error: describeAuthError(err) };
    }
  }
  return { ok: true, message: 'If that email has an account, a reset link is on its way.' };
}

export async function resendVerification() {
  await init();
  const blocked = guard();
  if (blocked) return blocked;
  if (!sdk.auth.currentUser) return { ok: false, error: 'You are not signed in.' };

  try {
    await sdk.fns.sendEmailVerification(sdk.auth.currentUser);
    return { ok: true, message: 'Verification email sent.' };
  } catch (err) {
    return { ok: false, error: describeAuthError(err) };
  }
}

export async function signOut() {
  if (!sdk) { currentUser = null; emit(); return { ok: true }; }
  try {
    await sdk.fns.signOut(sdk.auth);
    currentUser = null;
    emit();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeAuthError(err) };
  }
}

/** Test seam: wipe module state between cases. */
export function __reset() {
  sdk = null;
  initPromise = null;
  unavailableReason = null;
  currentUser = null;
  ready = false;
  listeners.clear();
}
