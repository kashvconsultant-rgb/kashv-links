# kashv-links

KashV Consultancies' homepage — no framework, no build step, no npm dependencies.
This IS the live site at **https://kashvconsultancy.com** (the apex domain is bound
to this Vercel project; `kashv-links.vercel.app` also resolves here and is the link
in the KashV Instagram bio / shared over WhatsApp).

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
    plain static files by Vercel.
- No `.git` repo here — wait, there is now (`git init` was run); deploys still go
  straight from the local folder via Vercel CLI, not triggered by git push. There is
  no CI/auto-deploy on push — pushing to GitHub and deploying to Vercel are two
  separate, manual steps.

## Editing content (no code changes needed)

1. Open `content.json`, change the text values (never the keys on the left of each
   `:`, and keep the quotes/commas intact).
2. To hide/show an optional section, set its `"visible"` field to `false`/`true`.
3. From this folder: `vercel deploy --prod --yes`. There is no database or backend
   — `content.json` is just a static file the browser fetches, so a wording change
   still requires this one redeploy command to go live (same as any other change to
   this repo).

## Deploying

```bash
vercel deploy --prod --yes
```

Run from this folder. Already linked to the Vercel project
`rathish-s-consultpro/kashv-links`; the CLI is pre-authenticated on this machine,
so this is the entire release process — edit `index.html`, run the command, done.

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
strip, footer. Current state of each offering's outbound links (as of this
writing — check `index.html` for the actual current hrefs, this is not guaranteed
to stay in sync):

- **Consulting** (Kashv Consultancy) — card CTA and both "Book a consultation"
  buttons go to Instagram (`ig.me/m/kashvconsultant` for the DM-compose links,
  `instagram.com/kashvconsultant` for the "connect with us"/footer link).
  `kashvconsultancy.vercel.app` (a separate mobile-first ConsultPro codebase) is
  **not** linked from this page currently — it exists but isn't referenced here.
- **ContentPilot AI** — links to `contentpilotmyc.vercel.app`, the live deployment
  of the `ContentPilot` monorepo (sibling project, `C:\Users\HP\Documents\ContentPilot`).
- **Kooli** — links to Instagram (`instagram.com/kashvconsultant`), not a
  dedicated site. Kooli's actual codebase lives at
  `Desktop/Kashv consultancy/coolie` (repo name "kooli", deployed separately at
  `kashkooli.vercel.app`) but that URL is not linked from this page — Kooli has no
  public marketing site yet, only the app itself.
- **Club Management** and **Tuition Management** — both link to Instagram DM
  (`ig.me/m/kashvconsultant`), same pattern as Consulting. Both are marketing
  framings of the same underlying `coolie`/"kooli" codebase (it's a multi-tenant
  platform — see `src/lib/clubType.ts` and `reference/club-class-attendance-spec.md`
  in that repo), not separate codebases. Every real customer (a Lions Club, a
  tuition centre, etc.) gets provisioned as its own independent deployment via
  `scripts/provision-new-deployment.sh` in that repo, so there is no single
  generic marketing URL for either yet — hence the Instagram CTA rather than a
  direct link.

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
