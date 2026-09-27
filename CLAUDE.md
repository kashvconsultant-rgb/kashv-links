# kashv-links

KashV Consultancies' homepage — no framework, no build step, no npm dependencies
for the site itself. This IS the live site at **https://kashvconsultancy.com**.

**Hosting is split across two providers, which is easy to get wrong — check before
assuming either one:**
- **Render** serves the actual production site. It's a Render "Static Site"
  connected to the `kashvconsultant-rgb/kashv-links` GitHub repo, auto-deploying
  on every push to `main`. `kashvconsultancy.com` (apex + `www`) is bound there —
  confirmed by DNS (Cloudflare in front of an `onrender.com` origin) and response
  headers (`rndr-id`), not by any file in this repo. Render dashboard:
  `dashboard.render.com` → project → `kashv-links` static site.
- **Vercel** does *not* serve the marketing site despite `.vercel/project.json`
  linking this folder to project `rathish-s-consultpro/kashv-links` and
  `kashv-links.vercel.app` mirroring the same static content. Vercel's only job
  now is hosting the `/api/leads` serverless function (see below) — Render's
  static-site product can't run server code, so the lead-capture API had to live
  somewhere else, and this already-linked Vercel project was the natural fit.
  Don't rely on `vercel deploy --prod --yes` to publish content or markup changes
  to the live site — that only updates `kashv-links.vercel.app` and the API; the
  actual site ships via `git push` to `main` instead (see Deploying below).

## Structure

- `index.html` — page shell + inline `<style>` + a small vanilla-JS renderer at the
  bottom. Contains the SEO-critical `<head>` (title, meta description, canonical,
  Open Graph/Twitter tags, favicon as an inline SVG data URI, and a `ProfessionalService`
  JSON-LD block) and a static nav/hero/footer skeleton with empty mount points
  (`#nav-links`, `#hero-content`, `#section-mount`, `#footer-*`, `#mobile-cta`).
  No external assets except Google's `og-image.png` reference and (deliberately)
  no webfonts — system font stacks so nothing can silently fail to load.
- `content.json` — **every piece of visible wording on the page**: hero copy, trust
  stats, the three consulting services, the four sister-product cards, testimonials,
  FAQ, final CTA, and contact/footer info. `index.html`'s bottom `<script>` fetches
  this at load and builds each section's DOM from it — editing the site's wording is
  editing this file, never the HTML/CSS.
  - Each optional section (`trustBar`, `services`, `proof`, `testimonials`, `faq`,
    `finalCta`) has a `"visible": true/false` flag. `false` means the renderer's
    builder function for that section returns `null` and nothing is appended to the
    DOM — no empty section, no leftover gap, and the corresponding nav link is
    filtered out too (see `buildNav`/`navMap` in `index.html`'s script). The next
    visible section simply follows immediately in normal document flow.
  - `testimonials.visible` currently starts `false` (no real client quotes yet —
    the JSON still holds sample quotes clearly marked `"sample": true`, ready to be
    replaced with real ones before flipping it to `true`).
  - The `<head>`'s meta description / OG tags / JSON-LD stay hand-written in
    `index.html` rather than sourced from `content.json` — those are read by
    crawlers and link-preview bots that don't reliably execute JavaScript, so they
    need to exist in the raw HTML regardless of how the visible body is rendered.
    Keep them roughly in sync with `content.json`'s `hero` copy by hand when either
    changes meaningfully.
  - `robots.txt` and `sitemap.xml` sit alongside `index.html` and are served as
    plain static files by Render. `robots.txt` also disallows `/admin.html`
    (the leads viewer — see below) so it doesn't get indexed.
  - `content.json`'s `leadForm` block holds the lead-capture form's copy (heading,
    field labels, the service dropdown's options, status messages) — same "edit
    the JSON, not the markup" rule applies.
- **`api/leads.js`** — a single Vercel serverless function (plain Node,
  `module.exports = async (req, res) => {...}`, no npm dependencies — uses the
  global `fetch`). `POST` accepts a lead (`name`, `company`, `phone`, `service`,
  plus a `website` honeypot field that silently no-ops if filled) and pushes it
  as JSON onto a Vercel KV (Upstash Redis) list, called over KV's plain REST API.
  `GET` returns the stored leads but requires an `Authorization: Bearer
  <ADMIN_PASSWORD>` header matching the `ADMIN_PASSWORD` env var set on the
  Vercel project — a shared password, not a real auth system, by design. CORS is
  restricted to an allowlist of this project's own origins.
- **`admin.html`** — unlisted (linked from nowhere, `noindex`, blocked in
  `robots.txt`) static page at `/admin.html`. Prompts for the admin password,
  calls `GET /api/leads` with it, renders the leads in a table. This is the "view
  submissions by typing a password" UI — there's no login/session, just that one
  request per page load.
- No `.git` repo here — wait, there is now (`git init` was run); the live site
  deploys via Render's GitHub auto-deploy on push to `main` (see Deploying below).

## Per-offering pages (SEO landing pages)

Each offering has its own crawlable URL so Google can match specific searches
("gold scheme software for jewellers", "club management software Lions"...):
`/consulting/`, `/contentpilot-ai/`, `/kooli/`, `/club-management/`,
`/tuition-management/`, `/gold-scheme/` (each is `<slug>/index.html`, linked with a
trailing slash and canonicalised with one so it works on any static host).

- Shared files: `offering.css` (styles) and `offering.js` (renderer + lead form).
- Every page is a tiny HTML file: a **hand-written static `<head>`** (title,
  description, canonical, Open Graph, JSON-LD `SoftwareApplication`/`Service` +
  `BreadcrumbList`), `<body data-offering="<slug>">`, and a no-JS fallback h1/lede.
  `offering.js` fetches `/content.json` and builds everything visible from
  `content.offerings[<slug>]` (eyebrow, headline, lede, audience, features, steps,
  FAQ, related, CTA labels). Wording edits = edit `content.json` only.
- The static `<head>` copy is NOT read from `content.json` (crawlers/link previews
  need it in raw HTML). If you change a page's headline/description meaningfully,
  update its `<head>` by hand too.
- **Adding a new offering:** (1) add a key under `offerings` in `content.json`;
  (2) copy an existing `<slug>/index.html`, change slug, title, description,
  canonical/og:url, JSON-LD and `data-offering`; (3) add it to `proof.items`,
  `sisterProjects` and `leadForm.serviceOptions` in `content.json`, and the
  homepage `hasOfferCatalog` JSON-LD in `index.html`; (4) add its URL to
  `sitemap.xml`; (5) add its `service` value to `VALID_SERVICES` in
  `api/leads.js` and `SERVICE_LABELS` in `admin.html`, then deploy the API to
  Vercel (`vercel deploy --prod --yes`) **before** pushing the site, or lead
  submissions for it will be rejected; (6) add a `--<tone>` colour in
  `index.html` and `offering.css`.
- `service` values must match `VALID_SERVICES` in `api/leads.js` (currently
  consulting, club, tuition, contentpilot, kooli, gold).

## Editing content (no code changes needed)

1. Open `content.json`, change the text values (never the keys on the left of each
   `:`, and keep the quotes/commas intact).
2. To hide/show an optional section, set its `"visible"` field to `false`/`true`.
3. `git push` to `main` — Render auto-deploys the static site from there. There is
   no database or backend for the marketing content itself — `content.json` is
   just a static file the browser fetches, so a wording change still requires a
   push to go live (same as any other change to `index.html`/`content.json`).

## Deploying

**The site** (anything in `index.html`, `content.json`, `robots.txt`,
`sitemap.xml`, `admin.html`): commit and push to `main` on GitHub
(`kashvconsultant-rgb/kashv-links`). Render auto-deploys from there — no manual
step, no `vercel` command involved.

**The leads API** (`api/leads.js`), or anything else meant to run on Vercel:

```bash
vercel deploy --prod --yes
```

Run from this folder. Already linked to the Vercel project
`rathish-s-consultpro/kashv-links`; the CLI is pre-authenticated on this machine.
This does *not* affect what's live at kashvconsultancy.com — it only updates
`kashv-links.vercel.app` and the `/api/leads` function that origin serves.

Requires, set once in the Vercel project's dashboard (Settings → Environment
Variables) — the CLI has no `vercel storage` command in this version, so KV is
provisioned via the dashboard's Storage tab, not scriptable from here:
- A Vercel KV (Upstash Redis) store created and linked to this project — this
  auto-populates `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which `api/leads.js`
  reads from `process.env`.
- `ADMIN_PASSWORD` — the shared password `admin.html` checks against.

## Brand system

Colors and type are derived from KashV's existing Instagram poster assets
(`Desktop/Kashv consultancy/Kashv Consultancy/*.png`), not invented for this page:

- `--bg` navy `#12283d` / `--ink` cream `#f7f2e7` / `--accent` coral `#ff6b47` — the
  core KashV brand triad, same as the "K" logo.
- Dark is the **default** theme (bare `:root`), since every existing KashV asset is
  navy-on-cream. Light is the explicit override (`prefers-color-scheme: light` or
  `data-theme="light"`), using the cream as the light ground.
- Each offering card gets its own accent background layered on top of the shared
  navy/cream/coral base: Consulting stays in a royal-navy variant (`--consulting`,
  it's the flagship), ContentPilot AI keeps the teal from its own poster
  (`--contentpilot`), Kooli got a new warm ochre (`--kooli`) since it didn't have
  an established color yet.
- Display font is a rounded system stack (`ui-rounded`/"SF Pro Rounded"/"Segoe UI
  Variable Rounded") to echo the pill-shaped strokes in the K mark; body copy uses
  a plain system-ui stack for legibility.

## Content model

Page has four sections: hero, five offering cards, a short "why one company"
strip, footer. Current state of each offering's CTA (as of this writing — check
`index.html`/`content.json` for the actual current hrefs and `data-open-form`
wiring, this is not guaranteed to stay in sync):

- **Consulting** (Kashv Consultancy) — the nav "book" button, hero CTA, mobile
  sticky CTA, and final-CTA button all open the lead-capture form (via
  `data-open-form` on the element — see `api/leads.js`/`admin.html` above) rather
  than linking to Instagram. Each still carries its old
  `ig.me/m/kashvconsultant` href as a plain anchor attribute purely as a
  no-JS/right-click fallback; the click handler intercepts normal clicks and
  opens the modal instead. `kashvconsultancy.vercel.app` (a separate
  mobile-first ConsultPro codebase) is **not** linked from this page currently.
- **ContentPilot AI** — the one offering that still links straight out, to
  `contentpilotmyc.vercel.app`, the live deployment of the `ContentPilot`
  monorepo (sibling project, `C:\Users\HP\Documents\ContentPilot`). Not routed
  through the lead form since it's a real, self-serve product.
- **Kooli**, **Club Management**, **Tuition Management**, **Gold Savings Scheme** —
  the homepage cards and footer links now go to each tool's own page
  (`proof.items[].pageHref` / `sisterProjects[].pageHref`, see "Per-offering pages"
  above); the lead form opens from CTAs on those pages, pre-selected to that
  service (`offerings.<slug>.service`, matching `leadForm.serviceOptions`).
  (Earlier the cards opened the form directly, and before that linked to Instagram.) Kooli's actual codebase lives at
  `Desktop/Kashv consultancy/coolie` (repo name "kooli", deployed separately at
  `kashkooli.vercel.app`) but that URL still isn't linked from this page. Club
  and Tuition Management are marketing framings of the same underlying
  `coolie`/"kooli" codebase (a multi-tenant platform — see `src/lib/clubType.ts`
  and `reference/club-class-attendance-spec.md` in that repo), not separate
  codebases — every real customer gets provisioned as its own independent
  deployment via `scripts/provision-new-deployment.sh` there, hence no single
  generic marketing URL for either and why leads get collected instead.

## Related KashV projects (for context, not part of this repo)

- **ContentPilot AI** — `C:\Users\HP\Documents\ContentPilot`, a Next.js/Supabase
  monorepo, this page's sibling and the only offering actually linked to its real
  product URL from here.
- **Kooli** — `C:\Users\HP\Desktop\Kashv consultancy\coolie` (package name
  `kooli`), a Next.js/Supabase PWA for civil-contractor attendance/payroll. Live
  at `kashkooli.vercel.app`.
- **ConsultPro** — `kashvconsultancy.vercel.app`. Codebase location on this
  machine is unclear (`Documents/GitHub/cosultpro1` is an empty local git init,
  not the actual source) — not currently linked from this page regardless.
