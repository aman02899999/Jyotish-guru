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
    css/styles.css        Dark-first cosmic theme with a light variant
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
    admin.test.mjs        189 admin panel assertions
    publish.test.mjs      24 publish + XSS regression assertions
    android.test.mjs      44 Kotlin source-consistency checks

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

**Admin panel** (`/admin.html` — see [ADMIN.md](web/ADMIN.md))
- Passphrase login (PBKDF2-SHA256, 210k iterations) with lockout on repeated failures
- Full CRUD on features, campaigns, pricing, testimonials, FAQs and astrologers — create, edit, duplicate, reorder, delete
- Hero copy, SEO metadata, section visibility, nav labels and brand colours
- Dashboard with local usage stats and saved chart records
- Publishes `content.json` straight to the repository via the GitHub API, with validation, conflict detection, commit history and one-click rollback

**Platform**
- Works offline once loaded; installable as a PWA
- Light and dark themes
- Shareable chart links and JSON export
- Print-optimised report layout
- Keyboard accessible, labelled inputs, respects `prefers-reduced-motion`

---

## Admin

The site is content-driven: everything the landing page renders comes from
`content.json`, editable through the panel at `/admin.html`.

Default passphrase is `jyotish-admin` — **change it before deploying**.

Because this is a static host, the passphrase is a deterrent rather than a
cryptographic boundary; the real authorisation is a GitHub token that GitHub
validates server-side, so nobody can change the live site without one.
[ADMIN.md](web/ADMIN.md) explains the model in full.

## Privacy

The engine runs entirely in your browser. Birth data is never transmitted.

The only optional network calls are city lookup (Open-Meteo geocoding, keyless)
and — if *you* supply a Gemini API key — the AI narrative layer, which posts
directly to Google. The key is stored in your browser's local storage only.
The chart mathematics always runs locally, with or without a key.

---

## Development

```bash
npm install          # only jsdom, for the DOM test suites
npm run dev          # serve web/ at http://localhost:8080
npm test             # 621 assertions across five suites
```

Individual suites:

```bash
npm run test:engine    # astronomy correctness
npm run test:dom       # public site integration in jsdom
npm run test:admin     # admin auth, CRUD and GitHub client
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

## Credits

- [astronomy-engine](https://github.com/cosinekitty/astronomy) — MIT
- [three.js](https://threejs.org) — MIT
- Geocoding by [Open-Meteo](https://open-meteo.com) — free, keyless

Vedic calculations follow *Brihat Parashara Hora Shastra* conventions.

## Disclaimer

For guidance and reflection. Not a substitute for professional medical,
legal or financial advice.
