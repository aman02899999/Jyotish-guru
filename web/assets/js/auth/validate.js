/**
 * validate.js — input rules for the account system.
 *
 * Pure functions, no Firebase and no DOM, so the rules can be unit tested and
 * reused by both the sign-in form and any future server-side check.
 *
 * These mirror what Firebase Auth itself enforces (it rejects passwords under
 * six characters and malformed emails), but running them locally means the
 * user gets an instant, specific message instead of a round trip and an
 * opaque error code.
 */

/**
 * Deliberately pragmatic, not RFC 5322. It rejects the mistakes people
 * actually make (missing @, trailing dot, spaces) without rejecting valid
 * addresses that a stricter pattern would refuse.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

export function normaliseEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normaliseName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function isValidEmail(value) {
  const email = normaliseEmail(value);
  return email.length <= 254 && EMAIL_RE.test(email);
}

/**
 * Score a password 0-4 for the strength meter.
 * Length dominates, because it genuinely matters more than symbol soup.
 */
export function passwordStrength(password) {
  const p = String(password ?? '');
  if (!p) return { score: 0, label: 'Empty' };

  let score = 0;
  if (p.length >= MIN_PASSWORD) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;

  // A long passphrase of plain words is strong even with no symbols.
  if (p.length >= 20) score = Math.max(score, 3);

  // Obvious choices are weak no matter how they are decorated.
  if (/^(password|123456|qwerty|jyotish|astrology)/i.test(p)) score = Math.min(score, 1);

  const label = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score];
  return { score, label };
}

/**
 * Validate a whole form payload.
 * Returns a field -> message map; empty means valid.
 *
 * @param {object} values
 * @param {'signin'|'signup'|'reset'} mode
 */
export function validateForm(values, mode) {
  const errors = {};
  const email = normaliseEmail(values.email);

  if (!email) errors.email = 'Enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'That does not look like a valid email address.';

  if (mode === 'reset') return errors;

  const password = String(values.password ?? '');
  if (!password) {
    errors.password = 'Enter your password.';
  } else if (mode === 'signup') {
    if (password.length < MIN_PASSWORD) {
      errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    } else if (password.length > MAX_PASSWORD) {
      errors.password = `Keep it under ${MAX_PASSWORD} characters.`;
    } else if (passwordStrength(password).score < 2) {
      errors.password = 'That password is too easy to guess.';
    }
  }

  if (mode === 'signup') {
    const name = normaliseName(values.name);
    if (!name) errors.name = 'Enter your name.';
    else if (name.length < 2) errors.name = 'That name is too short.';

    if (values.confirm !== undefined && values.confirm !== password) {
      errors.confirm = 'The two passwords do not match.';
    }
  }

  return errors;
}

export function firstError(errors) {
  const key = Object.keys(errors)[0];
  return key ? errors[key] : null;
}
