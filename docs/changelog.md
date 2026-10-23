# Dearly — Changelog

## v1.2.0 — October 23, 2026 (testing branch)

- Removed mouse-wheel scroll smoothing for more responsive native scrolling. Smooth section jumps, page transitions and gift animations remain; section jumps respect reduced motion.
- Server-checked scheduled unlock in Manila time, with a countdown and gift content withheld until the deadline.
- Optional recipient replies (message or emoji), read through the sender's private edit link.
- Optional first-open email, off by default, with recipient disclosure and queued delivery retries. Sender email is stored only with consent and removed when disabled.
- Bouquet flower placement by tap, occupied-slot swaps, shuffle, and saved positions in previews and downloads.
- Removed occasion starters so users write their own messages without pre-generated suggestions.
- Compacted bouquet selection into flower buttons with a selected state and a single Remove flower action; removed the repeated Place stem labels.
- Ordered bundles of two to eight existing gifts in one link; no additional standalone gift type.
- Static social preview image and Open Graph/Twitter metadata without private gift content.
- Atomic server email reservations: three attempts per gift or IP per three hours, three per recipient per day; browser resets do not reset the limits. Copy link remains available.
- Protected daily database health check and notification retry job; quiet-week acceptance check documented for testing.
- Privacy policy, version display and automated database/API/mobile browser checks updated.
- Existing friendly gift-not-found and network retry screens retained and covered by browser tests.
- Review fixes: invalid edit links cannot reuse another gift's ownership; failed updates no longer silently create a new link; clearing a form resets its internal controls.
- Bundles preserve quiz/scratch progress between gifts and pause audio when navigating away. Recipient state resets when switching share links.
- Calendar validation rejects impossible dates; monthly countdowns preserve the sender's local day/time across short months and daylight saving changes.
- Local-backend media links reopen correctly; audio errors are handled, and microphone streams are released on failures and navigation.
- Consolidated shared email delivery and bundle styles, removed an empty helper folder and two unused 512px favicon exports, added service timeouts and request limits, and updated Vite to 8.3.5 to resolve dependency advisories.
- Version bumped from 1.1.0 to 1.2.0 as an additive minor release. Main remains unmerged for acceptance testing.

## v1.1.0 — October 6, 2026

- Database-backed short links, media uploads and edit links that update the same shared gift.
- Gift delivery by email, server abuse limits, upload checks and browser security headers.
- Home-page floating cards, smooth scrolling, form alignment and centered short gifts.
- Updated privacy policy, terms and in-app changelog.

## v1.0.0
- Landing page built: asymmetric hero with a letter mockup, flowing list of all eight gift types, sticky nav with light/dark mode toggle
- Logo integrated
- Footer added: Changelog, Privacy Policy, Terms and Conditions, version number, and creator credit
- PRD, implementation plan, privacy policy, and terms and conditions written
