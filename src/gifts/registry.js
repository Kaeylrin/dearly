/*
 * Gift modules load on demand, so the landing page doesn't download all eight.
 * import() caches, so preloading (on hover/focus of a link) makes the later
 * navigation instant.
 *
 * Every gift module default-exports the same shape:
 *   type, headline, viewTitle
 *   empty()        fresh form data
 *   retiredDefaults optional: values that used to be pre-filled, stripped from old drafts
 *   clean(data)    coerce any input (form draft or link) into a safe shape
 *   finalize(data) optional: drop empty rows before previewing/sharing
 *   check(data)    null when ready, otherwise a message for the sender
 *   Form, View     the creator form and the recipient view
 *   ShareExtras    optional: extra actions on the send step
 */
const loaders = {
  letter: () => import('./letter'),
  bouquet: () => import('./bouquet'),
  countdown: () => import('./countdown'),
  scratch: () => import('./scratch'),
  reasons: () => import('./reasons'),
  timeline: () => import('./timeline'),
  voice: () => import('./voice'),
  quiz: () => import('./quiz'),
}

export const giftTypes = Object.keys(loaders)

export function loadGift(type) {
  return loaders[type]().then((m) => m.default)
}

export function preloadGift(type) {
  loaders[type]?.().catch(() => {
    /* a failed preload just means the real navigation loads it */
  })
}
