# User accounts

Visitor sign-in is handled by **Firebase Authentication**. Unlike the admin
panel's local passphrase gate, this is a real, server-verified login: Google
checks the credentials, issues a signed ID token, and refreshes it
automatically. Nothing here can be bypassed by editing `localStorage`.

```
web/assets/js/auth/
  config.js     where the Firebase project settings come from
  auth.js       the account backend (SDK loading, session, all credential flows)
  profile.js    per-account data, namespaced by Firebase UID
  validate.js   pure input rules (email, password strength) — unit tested
  errors.js     Firebase error codes -> sentences a person can act on
  ui.js         header button, auth dialog, profile view
```

---

## Setup

### 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project**
2. **Build → Authentication → Get started**
3. Enable the sign-in providers you want:
   - **Email/Password** — required for the email form
   - **Google** — required for the "Continue with Google" button

### 2. Register a web app

**Project settings → Your apps → Web (`</>`)**. Copy the `firebaseConfig`
object it shows you.

### 3. Write the config file

```bash
cp web/firebase-config.example.json web/firebase-config.json
# then fill in the real values
```

```json
{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "appId": "1:123456789:web:abc123"
}
```

**Commit this file.** It has to be served to the browser for sign-in to work,
and there is no build step to inject it.

### 4. Authorise your domain

**Authentication → Settings → Authorised domains** → add the domain you deploy
to. Google will refuse sign-in from anywhere not on that list. `localhost` is
allowed by default.

---

## Are these values secret?

**No, and that is by design.** The Firebase web `apiKey` is a public project
*identifier*, not a credential — it ships in the JavaScript of every Firebase
app ever built and appears in any visitor's network tab. Google
[documents this explicitly](https://firebase.google.com/docs/projects/api-keys).

What actually protects the project is enforced on Google's servers:

| Control | Where | What it stops |
| --- | --- | --- |
| **Authorised domains** | Authentication → Settings | Someone cloning the site and reusing your project |
| **Security rules** | Firestore / Storage | Reading or writing data you did not permit |
| **Password policy & rate limits** | Authentication | Brute forcing |

Compare this with the admin panel (`ADMIN.md`), whose passphrase gate is only a
deterrent because a static site has no server to check it. Firebase gives the
*user* login a real boundary that the *admin* login does not have.

---

## What the code guarantees

**The site works without any of this.** No config file, blocked CDN, no network
— every chart, dasha, panchang and matching feature still runs, because none of
them need an account. The account button reports that sign-in is unavailable
instead of opening a form that cannot work.

- **The SDK is loaded lazily** from the Google CDN, only when the account UI
  mounts. Visitors who never sign in download nothing extra.
- **Every method resolves to `{ ok, ... }`** rather than throwing, so a button
  can never be left spinning forever.
- **Email enumeration is preserved, not defeated.** "No such user" and "wrong
  password" both render as *"Incorrect email or password."*, and the password
  reset form reports the same success for a real address and an unknown one.
  A sign-in form should not tell an attacker which emails are registered.
- **Blocked popups fall back to a full-page redirect**, which is what makes
  Google sign-in work on iOS Safari and in embedded webviews.
- **Closing the Google popup is not an error** and shows no message.

---

## Where user data lives

Birth details are the most sensitive thing an astrology site is given, so they
**stay on the device**. `profile.js` namespaces everything by Firebase UID:

```
ajg-profile:<uid>:charts     saved charts
ajg-profile:<uid>:prefs      ayanamsa, chart style, default place
ajg-profile:anon:charts      work done before signing in
```

The account exists to *identify and separate* users, not to harvest them. Two
people sharing a browser no longer see each other's charts.

**Charts saved before signing in are adopted into the account on first login**
(`claimAnonymousData`), because watching your work vanish the moment you
register is the worst possible first impression.

`exportForSync(uid)` returns exactly what a future Firestore sync would upload,
so adding server-side storage later is a transport change rather than a
rewrite.

---

## Calling a real backend

If you add a server, `Auth.idToken()` returns a Firebase ID token to send as a
bearer credential:

```js
const token = await Auth.idToken();
await fetch('/api/whatever', { headers: { Authorization: `Bearer ${token}` } });
```

The receiving server **must verify the signature** against Google's public keys
before trusting a single claim in it — a token is only meaningful once
verified. There is already a dependency-free implementation of exactly this in
`server/src/lib/firebase-token.ts`.

---

## Testing

```bash
npm run test:auth
```

125 assertions run against a fake Firebase that reproduces the real API surface
and the error codes Firebase actually emits, so the failure paths — wrong
password, duplicate email, blocked popup, rate limiting, offline, missing
config — are exercised rather than assumed. No network access required.
