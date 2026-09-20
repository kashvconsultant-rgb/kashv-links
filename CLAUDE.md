# kashv-links

KashV Consultancies' homepage — a single static HTML page, no framework, no build
step, no dependencies. Deployed at **https://kashv-links.vercel.app**, which is also
the link used in the KashV Instagram bio and shared over WhatsApp.

## Structure

- `index.html` — the entire site. One file: inline `<style>`, inline SVG for the
  brand mark (a stylised "K" with a coral arrow), no external assets, no webfonts
  (uses system font stacks so nothing can silently fail to load).
- No `.git` repo here — deploys go straight from the local folder via Vercel CLI,
  not from a connected git remote. There is no CI/auto-deploy on push.

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
