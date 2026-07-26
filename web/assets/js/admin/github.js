/**
 * github.js — publishes content.json straight to the repository.
 *
 * This is what makes admin edits real: the GitHub Contents API validates the
 * token server-side, so only someone holding a token with `repo` scope can
 * change what visitors see. Everything else in the admin panel is local.
 *
 * Uses the Contents API (not the Git Data API) because it is a single request
 * per file and handles base64 + SHA bookkeeping for us.
 */

import { getToken, getRepo } from './auth.js';

const API = 'https://api.github.com';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/** UTF-8 safe base64 encode (btoa alone breaks on non-Latin1). */
export function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function fromBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function request(path, opts = {}) {
  const token = getToken();
  if (!token) throw new Error('No GitHub token configured.');
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...headers(token), ...(opts.headers || {}) },
  });

  if (res.status === 401) throw new Error('Token rejected (401). It may be expired or revoked.');
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') throw new Error('GitHub rate limit reached. Try again shortly.');
    throw new Error('Forbidden (403). The token likely lacks `repo` / Contents write scope.');
  }
  if (res.status === 404) throw new Error('Not found (404). Check the repository name and token scope.');
  if (res.status === 409) throw new Error('Conflict (409). The file changed on the remote — reload and retry.');
  if (res.status === 422) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Rejected (422): ${j.message || 'invalid request'}`);
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`GitHub error ${res.status}: ${j.message || res.statusText}`);
  }
  return res.json();
}

/** Verify the token and report the identity + permissions it carries. */
export async function verifyToken() {
  const user = await request('/user');
  const repo = getRepo();
  let perms = null;
  try {
    const r = await request(`/repos/${repo}`);
    perms = r.permissions || null;
  } catch (e) {
    return { ok: false, user: user.login, error: e.message };
  }
  const canWrite = !!(perms && (perms.push || perms.admin || perms.maintain));
  return {
    ok: canWrite,
    user: user.login,
    avatar: user.avatar_url,
    repo,
    permissions: perms,
    error: canWrite ? null : 'Token authenticated but has no write access to this repository.',
  };
}

/** Fetch a file's content and blob SHA. Returns null when absent. */
export async function getFile(path, branch) {
  const repo = getRepo();
  const q = branch ? `?ref=${encodeURIComponent(branch)}` : '';
  try {
    const j = await request(`/repos/${repo}/contents/${encodeURIComponent(path)}${q}`);
    return { sha: j.sha, text: fromBase64(j.content || ''), htmlUrl: j.html_url };
  } catch (e) {
    if (/404/.test(e.message)) return null;
    throw e;
  }
}

/** The repository's default branch. */
export async function defaultBranch() {
  const j = await request(`/repos/${getRepo()}`);
  return j.default_branch || 'main';
}

/** List branches so the admin can choose where to publish. */
export async function listBranches() {
  const j = await request(`/repos/${getRepo()}/branches?per_page=100`);
  return j.map((b) => b.name);
}

/**
 * Create or update a file. Passing the current SHA makes GitHub reject the
 * write if someone else changed the file first, so edits cannot be silently
 * clobbered.
 */
export async function putFile({ path, content, message, branch, sha }) {
  const repo = getRepo();
  const body = {
    message,
    content: toBase64(content),
    ...(branch ? { branch } : {}),
    ...(sha ? { sha } : {}),
  };
  const j = await request(`/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return {
    sha: j.content?.sha,
    commit: j.commit?.sha,
    url: j.commit?.html_url,
  };
}

/**
 * Publish the content payload.
 * Reads the current SHA first so concurrent edits produce a clear 409 rather
 * than a lost update.
 */
export async function publishContent(payload, { branch, message } = {}) {
  const path = 'content.json';
  const target = branch || await defaultBranch();
  const existing = await getFile(path, target);
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (existing && existing.text.trim() === json.trim()) {
    return { unchanged: true, branch: target };
  }

  const res = await putFile({
    path,
    content: json,
    message: message || `content: update site content via admin panel`,
    branch: target,
    sha: existing ? existing.sha : undefined,
  });
  return { ...res, branch: target, unchanged: false };
}

/** Publish a regenerated admin credential. */
export async function publishCredential(cred, { branch, message } = {}) {
  const path = 'admin-config.json';
  const target = branch || await defaultBranch();
  const existing = await getFile(path, target);
  const json = `${JSON.stringify(cred, null, 2)}\n`;
  const res = await putFile({
    path,
    content: json,
    message: message || 'chore: rotate admin passphrase',
    branch: target,
    sha: existing ? existing.sha : undefined,
  });
  return { ...res, branch: target };
}

/** Recent commits touching a path — powers the publish history view. */
export async function fileHistory(path = 'content.json', limit = 10) {
  const repo = getRepo();
  const j = await request(`/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=${limit}`);
  return j.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author?.name || c.author?.login || 'unknown',
    date: new Date(c.commit.author?.date || Date.now()),
    url: c.html_url,
  }));
}

/** Restore content.json from an earlier commit. */
export async function contentAtCommit(sha) {
  const repo = getRepo();
  const j = await request(`/repos/${repo}/contents/content.json?ref=${encodeURIComponent(sha)}`);
  return JSON.parse(fromBase64(j.content || ''));
}
