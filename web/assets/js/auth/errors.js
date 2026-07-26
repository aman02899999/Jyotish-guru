/**
 * errors.js — turn Firebase Auth error codes into sentences a person can act on.
 *
 * Firebase throws codes like `auth/invalid-credential`. Showing those verbatim
 * is hostile, and showing a generic "something went wrong" hides the one thing
 * the user needs to know (wrong password vs. no account vs. offline).
 *
 * SECURITY NOTE: modern Firebase projects have email enumeration protection
 * enabled, which deliberately collapses "no such user" and "wrong password"
 * into a single `auth/invalid-credential`. We keep that ambiguity rather than
 * defeating it — the message covers both cases without confirming whether an
 * account exists.
 */

const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'That does not look like a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'That password is too weak. Use at least 8 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': null,   // user cancelled - not an error worth showing
  'auth/cancelled-popup-request': null,
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups, or we will redirect you instead.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this project.',
  'auth/unauthorized-domain': 'This domain is not authorised in the Firebase console.',
  'auth/account-exists-with-different-credential':
    'You already have an account with this email using a different sign-in method.',
  'auth/requires-recent-login': 'For security, sign in again before making this change.',
  'auth/expired-action-code': 'That link has expired. Request a new one.',
  'auth/invalid-action-code': 'That link is invalid or has already been used.',
  'auth/id-token-expired': 'Your session expired. Please sign in again.',
};

/**
 * @returns {string|null} A displayable message, or null when the failure is
 *          something the user intentionally did (closing a popup).
 */
export function describeAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';

  const code = typeof error === 'string' ? error : error.code;
  if (code && Object.prototype.hasOwnProperty.call(MESSAGES, code)) {
    return MESSAGES[code];
  }

  if (!navigator.onLine) return 'You appear to be offline. Check your connection.';

  // Unknown code: log the detail for the developer, show something honest.
  if (code) console.error('Unhandled auth error', code, error);
  return 'Sign-in failed. Please try again.';
}

/** True when the failure was the user closing/cancelling a popup. */
export function isUserCancellation(error) {
  const code = typeof error === 'string' ? error : error && error.code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

/** True when we should retry the Google flow via redirect instead of popup. */
export function shouldFallbackToRedirect(error) {
  const code = typeof error === 'string' ? error : error && error.code;
  return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment';
}
