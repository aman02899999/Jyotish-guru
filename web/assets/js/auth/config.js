/**
 * config.js — where the Firebase project settings come from.
 *
 * This is a static site with no build step, so there is no bundler to inline
 * environment variables. Config is read from `firebase-config.json` at the
 * site root, which is fetched once and cached.
 *
 * IS IT SAFE TO COMMIT THESE VALUES? Yes. The Firebase web apiKey is a public
 * project identifier, not a secret — it appears in the network tab of every
 * Firebase app ever shipped. What actually protects your data is:
 *   1. Authorised domains (Firebase console -> Authentication -> Settings)
 *   2. Firestore/Storage security rules
 * Both are enforced on Google's servers. See
 * https://firebase.google.com/docs/projects/api-keys
 *
 * The site must work with no config at all: when the file is missing, the
 * account UI reports that sign-in is unavailable rather than throwing, and
 * every astrology feature keeps working, because none of them require an
 * account.
 */

const CONFIG_URL = new URL('../../../firebase-config.json', import.meta.url).href;

const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];

let cached;

/**
 * @returns {Promise<{configured: boolean, config: object|null, reason: string|null}>}
 */
export async function loadFirebaseConfig() {
  if (cached) return cached;

  let raw = null;
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
    if (res.ok) raw = await res.json();
  } catch {
    // Missing file or offline — handled below as "not configured".
  }

  if (!raw || typeof raw !== 'object') {
    cached = {
      configured: false,
      config: null,
      reason: 'No firebase-config.json found. Accounts are disabled.',
    };
    return cached;
  }

  const missing = REQUIRED.filter((k) => !raw[k] || typeof raw[k] !== 'string' || raw[k].startsWith('YOUR_'));
  if (missing.length) {
    cached = {
      configured: false,
      config: null,
      reason: `firebase-config.json is incomplete (missing: ${missing.join(', ')}).`,
    };
    return cached;
  }

  cached = {
    configured: true,
    reason: null,
    config: {
      apiKey: raw.apiKey,
      authDomain: raw.authDomain,
      projectId: raw.projectId,
      appId: raw.appId,
      ...(raw.storageBucket ? { storageBucket: raw.storageBucket } : {}),
      ...(raw.messagingSenderId ? { messagingSenderId: raw.messagingSenderId } : {}),
    },
  };
  return cached;
}

/** Test seam: forget the cached result. */
export function resetConfigCache() {
  cached = undefined;
}
