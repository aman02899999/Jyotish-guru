# Deploying the website

The site in `web/` is **plain static files with no build step**. Any static
host will serve it as-is. Two options below.

---

## Option A — GitHub Pages with CI (recommended)

The workflow in this folder runs the full test suite on every push and
publishes `web/` only if all 385 assertions pass.

It ships here rather than in `.github/workflows/` because the GitHub App used
to open this PR is not granted the `workflows` permission, so it cannot create
workflow files on your behalf. Moving it into place is a two-step manual action:

**1. Add the workflow**

```bash
mkdir -p .github/workflows
git mv deploy/github-pages.yml .github/workflows/deploy-web.yml
git commit -m "ci: publish website to GitHub Pages"
git push
```

**2. Enable Pages**

Repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The site will then be live at:

```
https://aman02899999.github.io/Jyotish-guru/
```

Every later push that touches `web/` redeploys automatically.

---

## Option B — Pages without CI

If you would rather not use Actions at all, publish the folder directly:

**Settings → Pages → Source → Deploy from a branch**, then choose your branch
and the `/docs` folder — after renaming `web/` to `docs/`:

```bash
git mv web docs
git commit -m "chore: serve site from /docs"
git push
```

Note that this skips the test gate, so a broken commit would go live.

---

## Other hosts

Because there is no build step, point any of these at the `web/` directory:

| Host | Setting |
| --- | --- |
| Netlify | Publish directory `web`, build command empty |
| Vercel | Already configured by `vercel.json` at the repo root — no build, serves `web/` |
| Cloudflare Pages | Build output directory `web`, build command empty |
| S3 / nginx / Apache | Copy the contents of `web/` to the document root |

---

## Local preview

```bash
npm run dev     # http://localhost:8080
```

Or without npm:

```bash
python3 -m http.server 8080 --directory web
```

The page must be served over HTTP rather than opened as a `file://` URL,
because it uses ES modules.

---

## Verifying a deployment

After the site is live, confirm the engine is actually running:

1. Open the page — the hero card should show **your** current ascendant and
   tithi, recomputed for your timezone.
2. Scroll to the planetarium — planets should orbit in the plane of the gold
   zodiac ring, not on a tilted circle.
3. Enter a birth date and time, then change the time by 4 minutes and
   recalculate. The ascendant should move by roughly 1°.

If all three hold, the ephemeris is live and correct.
