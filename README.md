# Dearly

A no-login website for making a small, personal gift (a letter, a bouquet, a countdown…) and sending it as a link.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

## How it's organised

```
design/                 source logo files (local only, not in the repo)
public/
  brand/                wordmarks (also used by the first-load splash)
  icons/                favicons, light and dark
src/
  main.jsx              entry: global styles, then the router
  app/                  router (lazy gift routes), Root (splash, scroll, loading bar)
  layouts/              SiteLayout (nav + footer), GiftLayout (what she sees)
  components/
    brand/              Logo
    nav/                floating pill navigation + mobile menu
    footer/
    ui/                 Link (page transitions), Loader, NavProgress, ThemeToggle, form fields
  pages/
    home/               landing page + the small previews in the gift list
    create/             the Write → Preview → Send flow and share panel
    view/               opens a shared link
    legal/              privacy, terms, changelogs
    not-found/
  gifts/                catalog, registry (lazy loading), one folder per gift type;
                        every gift module has the same shape, documented in registry.js
  hooks/                useTitle, useReveal (scroll reveal)
  lib/                  giftStore (database), supabase, smoothScroll, validate, media, theme, splash
  styles/               tokens, base, buttons, forms, gift-view, motion
```

Routes follow the PRD: `/:type/new` creates, `/:type/:id` is the link she opens.

## Motion

- Page changes use the browser's View Transitions: the old page fades out, the new one rises in,
  and the nav stays put. Browsers without them get a simple fade-in.
- Wheel scrolling is eased with Lenis on desktop (`src/lib/smoothScroll.js`); phones keep
  their native scrolling. Links within the same page ("Gifts", "Start creating") glide to
  their section. Back/forward returns to where you were.
- A splash shows on first load until the fonts are ready. Gift pages load on demand, with a
  thin progress bar if that takes a moment.
- All of it switches off under "reduce motion" in the OS settings.

## Storage

Gifts live in Supabase. The share link carries only the gift's id (`/letter/k3J9xQ2a`); the
sender's edit link also carries a secret key (`/letter/new?edit=…&key=…`). Photos and voice
notes are uploaded to the `gift-media` storage bucket. The browser only talks to the database
through four functions (create, open, open for editing, save), with rate limits; see
`supabase/migrations`. Links made before v1.1.0, which carry the whole gift after the `#`,
still open.

## Deploying

Hosted on Vercel. `vercel.json` sends every route except `/api` to `index.html` (so
shared links work on refresh) and adds security headers. `api/send-gift.js` is the email
function at `/api/send-gift`; run `vercel dev` to try it locally. Database setup: run the SQL files in
`supabase/migrations` in order. Environment variables: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`,
`GMAIL_APP_PASSWORD`. Optional: `RESEND_API_KEY` + `MAIL_FROM` (sends through Resend
instead of Gmail once a domain is verified), `PUBLIC_SITE_URL`.

## Logos

`design/logo/dearly-logo-light.png` and `dearly-logo-dark.png` are the source files. Derived assets:

- `public/brand/wordmark-*.png`: transparent, cropped wordmarks for the nav, footer and splash
  (dark ink in light mode, cream ink in dark mode)
- `public/icons/favicon-*-{32,180,512}.png`: favicons with rounded corners (the 180px Apple
  icon stays square); the dark tile is used in dark mode
