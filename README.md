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
design/                 reference HTML and the source logo files
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
  lib/                  giftStore (links), validate, media, theme, splash
  styles/               tokens, base, buttons, forms, gift-view, motion
```

Routes follow the PRD: `/:type/new` creates, `/:type/:id` is the link she opens.

## Motion

- Page changes use the browser's View Transitions: the old page fades out, the new one rises in,
  and the nav stays put. Browsers without them get a simple fade-in.
- Links within the same page (the logo on the home page, "Gifts", "Start creating")
  smooth-scroll. Back/forward returns to where you were.
- A splash shows on first load until the fonts are ready. Gift pages load on demand, with a
  thin progress bar if that takes a moment.
- All of it switches off under "reduce motion" in the OS settings.

## Storage (V1)

There is no backend yet. A gift's content is compressed into its own link, after the `#`.
That part of a URL is never sent to a server, so nothing is stored anywhere except the link itself.

- Text-only gifts give short links (a few hundred characters).
- Photos (timeline) and recordings (voice note) make links long, roughly 5–200 KB.
  Most apps handle that, but some messengers may cut very long links.

Moving to a database (Supabase, per the implementation plan) only means changing
`createLinks` and `decodePayload` in `src/lib/giftStore.js`. The `Loader` component in
`components/ui` is ready for the moments a database call takes time.

## Deploying

Hosted on Netlify. `netlify.toml` sets the build, sends every route to `index.html` (so
shared links work on refresh), adds security headers, and deploys the email function in
`netlify/functions/send-gift.mjs` at `/api/send-gift`. Database setup: run the SQL files in
`supabase/migrations` in order. Environment variables: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`MAIL_FROM`, `PUBLIC_SITE_URL`.

## Logos

`design/logo/dearly-logo-light.png` and `dearly-logo-dark.png` are the source files. Derived assets:

- `public/brand/wordmark-*.png`: transparent, cropped wordmarks for the nav, footer and splash
  (dark ink in light mode, cream ink in dark mode)
- `public/icons/favicon-*-{32,180,512}.png`: favicons with rounded corners (the 180px Apple
  icon stays square); the dark tile is used in dark mode
