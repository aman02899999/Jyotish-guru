# Adi Jyotish Gurus - Web

A full-stack web version of the Adi Jyotish Gurus Android app: an AI-powered
Vedic astrology consultation platform. Built with Next.js (App Router),
TypeScript, Tailwind CSS, Prisma + SQLite, NextAuth (Auth.js) credentials
login, and Google's Gemini API.

The core calculation logic (Panchang almanac, subscription pricing, referral
codes, astrologer search) is ported line-for-line from the Android app's
Kotlin `lib/` code, with the same unit test coverage, so both platforms stay
behaviorally consistent.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a custom dark "celestial" theme matching the Android app
- **Prisma** + **SQLite** for persistence (no external DB needed for local dev)
- **NextAuth v5 (Auth.js)** - email/password (Credentials) login, no OAuth app registration required
- **Firebase Auth** (optional) - adds "Continue with Google"; see below
- **Gemini API** - called server-side only (API routes), the key never reaches the browser
- **Vitest** for unit tests

## Getting started

```bash
cd web
npm install
cp .env.example .env
# Edit .env: set GEMINI_API_KEY (optional, see below) and a real AUTH_SECRET
#   openssl rand -base64 32
npm run db:push   # creates dev.db and applies the schema
npm run dev
```

Open http://localhost:3000, sign up with any email/password, and you're in.

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

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run test` | Run Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync `prisma/schema.prisma` to the SQLite database |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## What's real vs. demo

- **Auth**: real. Passwords are hashed with bcrypt; sessions are signed JWTs via NextAuth.
- **AI reports/horoscopes/FAQ**: real, calling the Gemini API server-side (requires your own key).
- **Panchang calendar**: real math (mean-motion sun/moon ephemeris approximation), not random.
- **Payments (wallet top-up, subscriptions, per-report checkout)**: demo/sandbox only, exactly like the
  Android app's simulated Google Play Billing. No payment gateway is wired up - there are no
  Stripe/Razorpay credentials to integrate against in this environment. Every "pay" action just
  updates the database directly and is clearly labeled as a demo/sandbox flow in the UI.

## Project structure

```
src/
  app/
    (public)        page.tsx, login/, signup/
    dashboard/       Panchang + daily horoscope + astrologer search
    astrologer/[id]/ intake form
    session/[id]/    paywall or full report + follow-up Q&A
    reports/         consultation history
    profile/         subscription tiers, wallet, referral, language
    api/             all backend routes (auth, sessions, panchang, profile, ...)
  components/        UI primitives (button, card, input, ...) + feature components
  lib/                business logic: panchang-calculator, pricing-calculator,
                       referral-code, astrologer-search-filter, gemini client,
                       auth config, prisma client
  lib/*.test.ts       Vitest unit tests for the ported pure logic
prisma/schema.prisma  User + ReportSession models
```
