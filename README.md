# Adi Jyotish Gurus

**Ancient Wisdom. Modern Intelligence.**

A Vedic astrology platform in two parts: a **website** that computes real
sidereal charts entirely in the browser, and a **native Android app** built
with Jetpack Compose that shares the same design language and feature model.

Nothing on the site is sample data. Every degree, dasha date, tithi and
compatibility score is computed from the visitor's birth moment using a
VSOP87/Meeus-class ephemeris running client-side.

---

## Repository layout

```
web/                      Static website (zero build step)
  index.html              Landing page + application
  manifest.webmanifest    PWA manifest
  assets/
    css/styles.css        Off-white + maroon theme, light-first with a dark variant
    js/
      app.js              Application controller
      charts.js           SVG kundli renderers (North / South / wheel)
      planetarium.js      Three.js WebGL solar system
      promo.js            Campaigns, referral, streaks, pricing, FAQ
      engine/
        ephemeris.js      Sidereal astronomy core
        events.js         Retrogrades, sankranti, eclipses, muhurat, numerology
        interpret.js      Chart → readable Jyotisha guidance
        places.js         Gazetteer, geocoding, historical timezones
    vendor/               astronomy-engine, three.js, OrbitControls
    img/                  Icons and social card
  AUTH.md                 User account / Firebase setup guide
  firebase-config.example.json   Template for firebase-config.json
  assets/js/auth/
    auth.js               Firebase-backed account backend (session, all flows)
    config.js             Firebase project settings loader
    profile.js            Per-account charts and preferences, scoped by UID
    validate.js           Email and password rules (pure, unit tested)
    errors.js             Firebase error codes → actionable messages
    ui.js                 Header button, auth dialog, profile view
  admin.html              Admin control panel
  ADMIN.md                Admin panel guide
  assets/js/admin/
    admin.js              Panel controller and CRUD views
    content.js            Content store: defaults, draft, validation
    auth.js               PBKDF2 gate and GitHub token handling
    github.js             Publishing client (GitHub Contents API)
    analytics.js          Local, privacy-preserving usage stats
  tests/
    engine.test.mjs       175 astronomy assertions
    dom.test.mjs          189 DOM integration assertions
    admin.test.mjs        208 admin panel assertions
    auth.test.mjs         125 account assertions (fake Firebase, no network)
    theme.test.mjs        90 palette + WCAG contrast assertions
    publish.test.mjs      24 publish + XSS regression assertions
    android.test.mjs      44 Kotlin source-consistency checks

server/                   Optional full-stack backend — the legacy Next.js + Prisma +
                          NextAuth app (see [server/README.md](server/README.md)).
                          Kept for reference and for its API / Razorpay / wallet work;
                          it is NOT what production serves — vercel.json and the GitHub
                          Pages workflow publish the zero-build static site in web/
                          above. Run it on its own with
                          `npm --prefix server install && npm --prefix server run dev`.

app/                      Android application (Kotlin + Jetpack Compose)
deploy/                   GitHub Pages workflow + hosting notes
```

---

## The astronomy engine

The core is intentionally auditable — you can verify any number it produces.

| Concern | Implementation |
| --- | --- |
| Planetary positions | Astronomy Engine (VSOP87 / Meeus), apparent geocentric, corrected for light-travel time and aberration |
| Ayanamsa | Lahiri (Chitrapaksha), Raman, Krishnamurti — defined the Swiss-Ephemeris way: a sidereal zero point pinned at a reference epoch and precessed into the true ecliptic of date |
| Ascendant | Standard spherical formula from local apparent sidereal time and true obliquity; validated to altitude 0° with an eastern azimuth |
| Lunar nodes | **True** node from the instantaneous orbital angular-momentum vector `h = r × v` of the geocentric Moon |
| Houses | Whole-sign (Rasi), as used in Parashari Jyotisha; Midheaven computed separately |
| Divisional charts | All 16 vargas (D1–D60) with the classical per-division rules, not a uniform fallback |
| Dasha | Vimshottari from the Moon's nakshatra, three levels deep, 120-year cycle |
| Panchang | Tithi, nakshatra, yoga, karana, vara, sunrise/sunset, Rahu Kaal, Yamaganda, Gulika, Abhijit |
| Matching | Ashtakoota (36 points) across all eight kootas, plus Manglik dosha from real Mars placement |
| Events | Retrograde stations and sign ingresses located by scanning real motion and bisecting to the minute; eclipses from the ephemeris |

### Accuracy

Verified against independently published reference values:

```
Lahiri @ 1900-01-01      22°27'38"   (canonical value)
Lahiri @ definitional epoch  exact to 1e-6°
Mean precession 1800→2200    50.336"/yr   (textbook 50.29)
Sun    @ J2000    280.3687°  (ref 280.386)
Moon   @ J2000    223.3239°  (ref 223.319)
True node @ J2000 123.9521°  (ref 123.95)
```

Ascendant geometry is checked at Delhi, Sydney, London, the equator, a polar
latitude and across the date line.

---

## Website features

**Chart & analysis**
- Full birth chart with all nine grahas, nakshatras, padas, dignity and speed
- North Indian and South Indian layouts, plus a true-degree zodiac wheel
- 16 divisional charts, switchable live
- Shadbala-style strength scoring (dignity, house, combustion, retrogression)
- Classical yoga detection — Gaja Kesari, Budha-Aditya, Pancha Mahapurusha, Dhana, Raja, Kemadruma
- House-by-house and graha-by-graha written analysis
- Life-area scoring derived from house lords, occupants and karakas

**Timing**
- Interactive 120-year Vimshottari ladder with a scrubbable timeline
- Live transits, Sade Sati detection with phase
- Timing windows ranked for career, wealth, marriage and property
- **Sky calendar** — every retrograde, Sankranti, eclipse and moon phase ahead, mapped to the house it hits in your chart
- **Muhurat finder** — scores each day for marriage, business, travel, property, education, vehicles or medical treatment

**Daily**
- Live panchang for your coordinates, updating in real time
- Personalised daily reading from actual Moon transit
- Remedies targeted at your genuinely weakest grahas
- Gemstones restricted to functional benefics for your lagna

**Interactive**
- **3D WebGL planetarium** — real heliocentric positions, true orbital paths, sidereal zodiac dome, time scrubbing, camera presets
- Ashtakoota compatibility with per-koota breakdown
- Chart reasoning engine answering plain-language questions offline
- Vedic numerology (Mulank, Bhagyank, Chaldean name number)

**Growth & marketing**
- Contextual campaign rail that surfaces alerts only when they're true for your chart (active Sade Sati, upcoming eclipse, Mercury station)
- Referral codes, invite links and shareable PNG chart cards via the Web Share API
- Daily streak ladder unlocking real features
- Notification centre fed by genuine sky events
- Transparent pricing, testimonials and FAQ with structured data

**User accounts** (see [AUTH.md](web/AUTH.md))
- Real, server-verified login via Firebase Authentication — email/password and Google
- Password strength meter, email verification and password reset
- Saved charts and preferences namespaced per account, so a shared browser no longer mixes people up
- Charts saved before signing in are adopted into the account on first login
- Blocked popups fall back to a redirect, so Google sign-in works on iOS Safari
- Entirely optional: with no Firebase config every astrology feature still works and the button says so

**Admin panel** (`/admin.html` — see [ADMIN.md](web/ADMIN.md))
- Passphrase login (PBKDF2-SHA256, 210k iterations) with lockout on repeated failures
- Full CRUD on features, campaigns, pricing, testimonials, FAQs and astrologers — create, edit, duplicate, reorder, delete
- Hero copy, SEO metadata, section visibility, nav labels and brand colours
- Dashboard with local usage stats and saved chart records
- Publishes `content.json` straight to the repository via the GitHub API, with validation, conflict detection, commit history and one-click rollback

**Platform**
- Works offline once loaded; installable as a PWA
- Off-white + maroon theme, light-first, with a matching dark variant
- Shareable chart links and JSON export
- Print-optimised report layout
- Keyboard accessible, labelled inputs, respects `prefers-reduced-motion`

---

## Theme

The palette is **off-white paper with a deep maroon accent** and brass as the
secondary. It is light-first: with no saved choice, only an OS-level dark
preference opts into the dark variant.

Colour tokens are **semantic, not named after a hue**, so re-theming never
leaves a variable called `--gold` holding a maroon:

| Token | Light (default) | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#f4efe6` | `#17100f` | Page ground — warm off-white, never pure `#fff` |
| `--surface` | `#fbf7f0` | `#241917` | Cards and panels |
| `--accent` | `#7a1e28` | `#e08a92` | Maroon: buttons, links, headings |
| `--accent-2` | `#8a6d2c` | `#d8b46a` | Brass: gradients and ornament |
| `--text` | `#2b1d1a` | `#f6ece7` | Body ink, warmed so it never reads blue-grey |
| `--on-accent` | `#fdf8f1` | `#2a1113` | Text sitting on a maroon fill |
| `--inset` | `#4a2a24` | `#fff4ef` | Sunken wells — darkens paper, lightens dark |

Two deliberate details:

- **The dark variant keeps the maroon identity.** Its grounds are a deep
  aubergine-brown mixed from the accent rather than a neutral charcoal, and the
  accent lifts to a brighter rose so it still clears contrast against them.
- **The planetarium stays dark in both themes** — a WebGL starfield on
  off-white would be unreadable — so `.planetarium-shell` re-declares the text
  tokens locally and every HUD control inside inherits light ink automatically.

`npm run test:theme` enforces this: it parses the stylesheet and checks every
foreground/background pairing against **WCAG AA**, so a colour tweak that makes
text unreadable fails the build instead of shipping.

Brand colours remain editable from the admin panel's Theme tab.

---

## Admin

The site is content-driven: everything the landing page renders comes from
`content.json`, editable through the panel at `/admin.html`.

Default passphrase is `jyotish-admin` — **change it before deploying**.

Because this is a static host, the passphrase is a deterrent rather than a
cryptographic boundary; the real authorisation is a GitHub token that GitHub
validates server-side, so nobody can change the live site without one.
[ADMIN.md](web/ADMIN.md) explains the model in full.

## Accounts

Visitors can sign in with Firebase Authentication — a genuine server-verified
login, in contrast to the admin gate above. Copy
`web/firebase-config.example.json` to `web/firebase-config.json`, fill in your
project values and add your domain to Firebase's authorised list.

The Firebase web `apiKey` is a public project identifier rather than a secret,
so that file is meant to be committed; the real boundary is the authorised
domain list and security rules, both enforced by Google.
[AUTH.md](web/AUTH.md) explains it in full.

Without the config file the site behaves exactly as before — accounts simply
report themselves unavailable.

## Privacy

The engine runs entirely in your browser. Birth data is never transmitted.

Signing in does not change that: accounts identify and separate users, they do
not upload charts. Saved charts stay in the browser, namespaced by account.

The only optional network calls are city lookup (Open-Meteo geocoding, keyless)
and — if *you* supply a Gemini API key — the AI narrative layer, which posts
directly to Google. The key is stored in your browser's local storage only.
The chart mathematics always runs locally, with or without a key.

---

## Development

```bash
npm install          # only jsdom, for the DOM test suites
npm run dev          # serve web/ at http://localhost:8080
npm test             # 858 assertions across seven suites
```

Individual suites:

```bash
npm run test:engine    # astronomy correctness
npm run test:dom       # public site integration in jsdom
npm run test:admin     # admin auth, CRUD, robustness and GitHub client
npm run test:auth      # user accounts against a fake Firebase
npm run test:theme     # palette identity and contrast ratios
npm run test:publish   # end-to-end: published content reaches the page
npm run test:android   # Kotlin source consistency
```

The site has **no build step**. It is plain ES modules and CSS — open
`web/index.html` through any static server and it runs.

### Deployment

A ready-made GitHub Actions workflow lives in [`deploy/`](deploy/). It runs the
full suite and publishes `web/` to GitHub Pages only if every test passes.

```bash
mkdir -p .github/workflows
git mv deploy/github-pages.yml .github/workflows/deploy-web.yml
git commit -m "ci: publish website to GitHub Pages" && git push
```

Then enable **Settings → Pages → Source → GitHub Actions**.

See [`deploy/README.md`](deploy/README.md) for Netlify, Vercel, Cloudflare and
plain-branch alternatives.

---

## Android app

Kotlin + Jetpack Compose, Room for persistence, Retrofit/Moshi for the Gemini
API, and Google Play Billing simulation.

Screens: onboarding, astrologer selection, intake, report generation, paywall,
report view, history and profile — with panchang, daily horoscope, referrals,
marketing campaigns and a daily streak ladder that mirrors the website.

```bash
./gradlew assembleDebug
./gradlew testDebugUnitTest
```

`GEMINI_API_KEY` is injected from `.env` by the Secrets Gradle plugin — see
`.env.example`.

---

## Optional backend (`server/`)

This repository also ships a self-contained full-stack backend in
[`server/`](server/) — the legacy **Next.js 16 + React 19 + Prisma + NextAuth**
app with real Razorpay payments, wallet ledger, sessions/reviews and a Gemini
report API. It is **reference / optional**: production serves the zero-build
static site in [`web/`](web/), not this app. The two deliberately do not share
a build or a `package.json` — the static site has no build step and this app is
run on its own:

```bash
npm --prefix server install
cp server/.env.example server/.env   # fill in DATABASE_URL, AUTH_SECRET, keys…
npm --prefix server run dev          # http://localhost:3000
```

See [`server/README.md`](server/README.md) for the database, auth, Gemini and
Razorpay setup. Its unit tests live next to the code (`server/src/**/*.test.ts`)
and run with `npm --prefix server test`.

---

## Credits

- [astronomy-engine](https://github.com/cosinekitty/astronomy) — MIT
- [three.js](https://threejs.org) — MIT
- Geocoding by [Open-Meteo](https://open-meteo.com) — free, keyless

Vedic calculations follow *Brihat Parashara Hora Shastra* conventions.

## Disclaimer

For guidance and reflection. Not a substitute for professional medical,
legal or financial advice.
