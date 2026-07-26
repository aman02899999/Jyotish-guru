# Admin panel

The control panel lives at **`/admin.html`** and manages every piece of
editable content on the site.

```
https://aman02899999.github.io/Jyotish-guru/admin.html
```

---

## First login

Default passphrase: **`jyotish-admin`**

**Change this before you deploy publicly.** Security → Change passphrase →
generate → commit the resulting `admin-config.json`.

---

## Read this first: how security actually works

This is a **static site**. There is no server, so any check the browser
performs can be bypassed by someone who reads the JavaScript. Pretending
otherwise would be dishonest, so here is the real model:

| Layer | What it is | How strong |
| --- | --- | --- |
| **Passphrase** | PBKDF2-SHA256, 210,000 iterations, random salt. No plaintext in the repo. Exponential lockout after 3 failures. | **A deterrent.** Stops casual snooping. A determined visitor can edit their own `localStorage` and see the panel UI. |
| **GitHub token** | Required to publish. GitHub validates it **server-side**. | **Real.** This is the actual boundary. |

**The consequence that matters:** without a valid token, an intruder who
bypasses the passphrase can only change *what their own browser displays*.
They cannot alter the live site for anyone else, because publishing requires
a credential GitHub itself verifies.

The passphrase protects the door. The token protects the content.

If you need a genuine login wall around the *UI* as well, you need a backend —
Cloudflare Workers, Netlify Identity or similar. That is a deliberate
trade-off this project has not taken, in exchange for zero hosting cost and
zero service dependencies.

---

## Getting a GitHub token

1. GitHub → Settings → Developer settings → **Personal access tokens**
2. Either kind works:
   - **Fine-grained** (preferred): select only this repository, grant
     **Contents: Read and write**
   - **Classic**: tick the `repo` scope
3. Copy the token into **Security → GitHub token → Save & verify**

The token is stored in **sessionStorage** by default, so it disappears when you
close the tab. "Remember on this device" moves it to localStorage — more
convenient, less safe. It is only ever sent to `api.github.com` over HTTPS.

Signing out clears the token immediately.

---

## How publishing works

```
   Admin edits  ──▶  localStorage draft  ──▶  content.json in the repo
                     (only you see it)        (everyone sees it)
```

1. Edit anything. Changes save to a **local draft** — the badge in the header
   counts unpublished sections.
2. Open **Publish**. You get a diff summary, a full payload preview and
   validation results.
3. Press **Publish now**. The panel commits `content.json` to the repository
   through the GitHub API.
4. If CI is enabled, the site redeploys automatically.

Nothing reaches visitors until you press Publish.

### Without a token

**Publish → Download content.json**, then commit the file to the repository
root yourself. Same result, manual step.

### Safety features

- **Validation before publish.** Missing required fields, duplicate IDs, bad
  hex colours and malformed prices block the publish button.
- **Conflict detection.** The current file SHA is sent with the write, so if
  someone else changed `content.json` first you get a clear 409 instead of a
  silently lost update.
- **No empty commits.** Publishing identical content is detected and skipped.
- **History and rollback.** The Publish view lists recent commits to
  `content.json` and can restore any of them into your draft.

---

## What you can edit

| View | Controls |
| --- | --- |
| **Dashboard** | Usage stats, section popularity, ascendant distribution, content counts |
| **Hero & Meta** | Headline, intro copy, buttons, the four hero statistics, page title, SEO description, repo URL |
| **Features** | The feature cards — icon, title, description, link target |
| **Campaigns** | Promo cards, including *when* each appears (always, active Sade Sati, Mercury retrograde ahead, eclipse within 60 days, has/has-no chart) |
| **Pricing** | Plans, monthly and annual prices, feature lists, which tier is highlighted |
| **Testimonials** | Quotes, names, roles, initials |
| **FAQs** | Questions and answers — also emitted as FAQPage structured data |
| **Astrologers** | Consultant directory: name, specialty, price, languages, biography, visibility |
| **Sections & Nav** | Show/hide any section, rename nav labels, reorder, choose what appears in the header |
| **Theme** | Brand colours with a live preview |
| **Saved Charts** | Chart records saved from the public site — rename, delete, export |
| **Publish** | Diff, validate, publish, import/export JSON, history and rollback |
| **Security** | Token management, passphrase rotation, session control |

Every collection supports **create, read, update, delete, duplicate and
reorder** (arrow buttons or drag the ⠿ handle).

---

## Analytics and privacy

Usage stats are recorded in **your browser only** and never transmitted. There
is no tracking script and no third-party service.

**Birth data is never recorded.** Chart events keep only three coarse facets —
ayanamsa, ascendant sign index and Moon sign index — so the dashboard can show
distributions without holding anyone's personal information. This is enforced
by tests that walk every recorded value and fail on anything resembling a date,
time or coordinate.

Saved charts (from the "Save chart" button) are also local-only.

---

## Content resolution order

```
1. localStorage draft   unpublished admin edits, your browser only
2. content.json         published content, committed to the repo
3. DEFAULTS             shipped fallback in assets/js/admin/content.js
```

Merging is per top-level key, so a partial `content.json` never blanks the
sections it does not mention. If `content.json` is missing or malformed, the
site silently falls back to the shipped defaults — **the public site can never
be broken by the admin panel.**

---

## Recovery

| Situation | Fix |
| --- | --- |
| Forgot the passphrase | Delete `admin-config.json` from the repo. The default (`jyotish-admin`) applies again. |
| Bad content published | Publish → History → **Restore** on an earlier commit, then Publish. Or delete `content.json` to return to defaults. |
| Draft in a broken state | Publish → **Discard draft**. |
| Token compromised | Revoke it on GitHub, then Security → Remove token. |

---

## Hardening notes

`content.json` is attacker-controllable if a publishing token ever leaks, so
every value it carries is treated as untrusted and HTML-escaped before it
reaches the DOM — on both the public site and inside the admin panel itself.

This is enforced by a regression test that publishes a `content.json` where
*every* string is an XSS payload and then asserts nothing executes. An earlier
revision of the campaign renderer interpolated the icon and several
`data-` attributes unescaped; that hole was found by this test and closed.

## Testing

```bash
npm run test:admin      # 189 assertions: auth, CRUD, GitHub client
npm run test:publish    # 24 assertions: publish loop + XSS regression
npm test                # all 621
```

The admin suite drives the real UI in jsdom: it logs in through the actual
PBKDF2 gate, creates/edits/reorders/deletes rows in every collection, and
exercises the GitHub client against a mocked API including the 401, 403 and
409 failure paths.
