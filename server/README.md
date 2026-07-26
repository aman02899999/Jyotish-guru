# Adi Jyotish Gurus — Full-stack server (legacy / reference)

> **Note:** This is the legacy full-stack Next.js app, kept for reference and
> for its API / Razorpay / wallet work. It is **not** what production serves —
> the live site is the zero-build static site in [`../web/`](../web/). All
> paths below are relative to this `server/` directory.

A full-stack web version of the Adi Jyotish Gurus Android app: an AI-powered
Vedic astrology consultation platform. Built with Next.js (App Router),
TypeScript, Tailwind CSS, Prisma + Postgres (Supabase), NextAuth (Auth.js)
credentials login, and Google's Gemini API.

The core calculation logic (Panchang almanac, subscription pricing, referral
codes, astrologer search, birth charts, Dasha periods, transits, Guna Milan
compatibility, Muhurat timing, numerology) is all deterministic, classical-rule
math with unit test coverage - no invented or randomized "astrology," and no
fabricated reviews/testimonials (see "Reviews" below).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a custom off-white/orange theme, a React Three
  Fiber 3D hero, and CSS-driven marquee/tilt-card motion
- **Prisma** + **Postgres** (via Supabase's free tier) for persistence
- **NextAuth v5 (Auth.js)** - email/password (Credentials) login, no OAuth app registration required
- **Firebase Auth** (optional) - adds "Continue with Google"; see below
- **Gemini API** - called server-side only (API routes), the key never reaches the browser
- **Razorpay** (optional) - real payment processing for subscriptions, wallet top-ups, and per-report checkout; see below
- **jsPDF** - generates a real, downloadable, text-based consultation PDF client-side
- **Vitest** for unit tests

## Features

- **AI consultations** - 10 specialized AI astrologer personas, Gemini-generated reports, one included follow-up question per session, a real downloadable PDF of the full report.
- **Birth Chart (Kundli)** - North Indian diamond Rashi chart with all 9 grahas placed into houses, shareable as a branded PNG.
- **Vimshottari Dasha timeline** - the classical 120-year Mahadasha/Antardasha planetary period system, derived from the Moon's Nakshatra at birth.
- **Transit (Gochar) alerts** - flags Sade Sati/Kantaka Shani (Saturn) and Guru Gochar (Jupiter) against your natal Moon sign, on every report.
- **Kundli Milan compatibility** - Ashtakoot Guna Milan, with separate factor sets for marriage, friendship, and business-partner compatibility.
- **Muhurat Finder** + **Auspicious Day Calendar** - classical tithi-position auspicious-timing rules, as an on-demand search or a month-grid calendar.
- **Daily/weekly/monthly Vedic Rashifal** - live Panchang-based horoscope forecasts.
- **Numerology** - Life Path/Destiny numbers, shareable as a PNG.
- **Dashboard** - live Panchang, favorite astrologers, daily check-in streak, wallet balance with a full transaction ledger.
- **Reviews** - real, user-submitted written reviews from account holders who actually paid for and completed a session (gated the same way star ratings always were). A landing-page highlights section shows the best of them and simply doesn't render until real reviews exist - there is no seeded/placeholder testimonial content anywhere in this app.
- **Payments** - Razorpay (real) or a clearly-labeled sandbox fallback; see "Payments" below.

## Getting started

```bash
cd server
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL/DATABASE_URL_DIRECT (see "Database" below),
# GEMINI_API_KEY (optional, see below), and a real AUTH_SECRET
#   openssl rand -base64 32
npm run db:push   # applies the schema to your Postgres database
npm run dev
```

Open http://localhost:3000, sign up with any email/password, and you're in.

### Database (Supabase Postgres)

1. Create a free project at https://supabase.com/dashboard.
2. **Project Settings -> Database -> Connection string**: copy the
   **Transaction pooler** string (port `6543`) into `DATABASE_URL`, and the
   **direct connection** string (port `5432`) into `DATABASE_URL_DIRECT`.
   The app runs on the pooled connection (serverless functions open many
   short-lived connections); migrations/`db push` need the direct one, since
   the pooler's transaction mode doesn't support the prepared statements
   Prisma uses for schema changes.
3. `npm run db:push` to create the tables.

Any other managed Postgres (Neon, Railway, RDS, ...) works the same way -
just set `DATABASE_URL` to it and drop `DATABASE_URL_DIRECT` if there's no
separate pooler endpoint.

### Gemini API key

Report generation, daily horoscopes, and the FAQ assistant call the Gemini
API. Get a free key at https://aistudio.google.com/apikey and set
`GEMINI_API_KEY` in `.env`. Without it, the app still fully works (auth,
dashboard, Panchang calendar, astrologer browsing, billing demo) - AI text
fields will just show a "not configured" message instead of a generated
reading.

### Google Sign-In (Firebase, optional)

The "Continue with Google" button only appears if these are set in `.env`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Get these from the Firebase Console: your project -> Project settings ->
General -> Your apps -> Web app. They're the public client config (safe to
expose in the browser, hence `NEXT_PUBLIC_`) - **no service account key or
Admin SDK is used or needed**. The ID token Firebase returns after Google
sign-in is verified server-side against Google's public keys
(`src/lib/firebase-token.ts`) and then exchanged for a normal NextAuth
session, so the rest of the app is unaffected either way.

Two things to enable in the Firebase Console before it'll work:
1. **Authentication -> Sign-in method -> Google -> Enable**.
2. **Authentication -> Settings -> Authorized domains** - add whatever
   domain you deploy to (`localhost` is authorized by default, so local dev
   needs no extra setup).

Signing in with Google links to an existing email/password account with the
same email address rather than creating a duplicate.

### Payments (Razorpay, optional)

Real payment processing only turns on if these are set in `.env`:

```
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

Get both from the Razorpay Dashboard: **Settings -> API Keys**. Use a
`rzp_test_...` key pair while developing - it behaves identically to a live
key but no real money moves, and Razorpay's test-mode Checkout accepts
canned test cards/UPI IDs from their docs.

Without these set, subscriptions/credits/report checkout fall back to the
clearly-labeled sandbox flow that just grants instantly with no payment -
this is the default and requires no setup.

How it works when configured:
1. Client clicks "Subscribe" / "Recharge" / "Pay" -> `POST /api/payments/razorpay/order`.
   The server looks up the *actual* price for the tier/pack/session id server-side
   (the client never sends an amount) and creates a Razorpay order, recorded
   in the `PaymentOrder` table as `status: "created"`.
2. Razorpay's Checkout.js widget opens in the browser for the user to pay.
3. On success, the client posts the returned order id/payment id/signature to
   `POST /api/payments/razorpay/verify`, which recomputes the HMAC-SHA256
   signature server-side (`RAZORPAY_KEY_SECRET`) and only grants the
   subscription/credits/report unlock if it matches. Verification is
   idempotent, so a duplicate call (e.g. a retried network request) can't
   grant twice.

The old demo "pay" endpoints (`/api/profile/subscribe`, `/api/profile/credits`,
`/api/sessions/[id]/mock-pay`) return `403` once Razorpay is configured, so a
stale client can't bypass real payment with the free demo path.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run test` | Run Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync `prisma/schema.prisma` to the Postgres database |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## What's real vs. demo

- **Auth**: real. Passwords are hashed with bcrypt; sessions are signed JWTs via NextAuth.
- **AI reports/horoscopes/FAQ**: real, calling the Gemini API server-side (requires your own key).
- **Panchang calendar, birth chart, Dasha, transits, Guna Milan, Muhurat, numerology**: all real,
  deterministic classical-rule math (mean-motion sun/moon ephemeris approximation for the
  astronomical parts) - not random and not AI-generated. Each has unit tests in `src/lib/*.test.ts`.
- **Reviews/testimonials**: real. Only an account holder who actually paid for and completed a
  session can leave one (same gate as the star rating). The landing page's "What seekers are
  saying" section pulls live from the database and renders nothing at all until genuine reviews
  exist - this app ships with zero seeded or placeholder review content.
- **Wallet transaction history**: real ledger (`WalletTransaction`) - every balance change is
  reconstructable from history, not just an opaque running total.
- **Payments (wallet top-up, subscriptions, per-report checkout)**: real via Razorpay when
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set (see above) - signed order creation +
  HMAC-verified payment confirmation, no client-supplied amounts trusted. Without those env vars,
  falls back to a demo/sandbox flow (exactly like the Android app's simulated Google Play Billing)
  that just updates the database directly and is clearly labeled as a demo in the UI.

## Project structure

```
src/
  app/
    (public)        page.tsx (landing + testimonials), login/, signup/
    dashboard/       Panchang, horoscope, favorites, streak, astrologer search
    astrologer/[id]/ intake form
    session/[id]/    paywall or full report (chart, Dasha, transits, PDF export) + follow-up Q&A
    compatibility/   Kundli Milan (marriage/friendship/business)
    muhurat/         Muhurat Finder (on-demand search)
    calendar/        Auspicious Day Calendar (month grid)
    reports/         consultation history
    profile/         subscription tiers, wallet + transaction history, referral, language
    api/             all backend routes (auth, sessions, panchang, profile, favorites, ...)
  components/        UI primitives (button, card, input, ...) + feature components
  lib/                business logic: panchang/birth-chart/dasha/transit/kundli-milan/
                       muhurat/numerology calculators, pricing, referral-code,
                       astrologer-search-filter, wallet-ledger, reviews, gemini client,
                       auth config, prisma client
  lib/*.test.ts       Vitest unit tests for the pure calculation/business logic
prisma/schema.prisma  User, ReportSession, PaymentOrder, WalletTransaction, FavoriteAstrologer
```
