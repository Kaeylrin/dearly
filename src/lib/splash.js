import { useEffect } from 'react'

/*
 * The first-load splash lives in index.html, hidden. An inline script there
 * only reveals it if loading is actually slow, so a fast load never sees it.
 *
 * It lifts once the app has rendered, the fonts are in, and any page that
 * holds it (e.g. a gift link still fetching its data) has let go. Then
 * <html> gets `is-ready`, which lets entrance animations start.
 */

let resolveReady
export const appReady = new Promise((resolve) => {
  resolveReady = resolve
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const holds = new Set()
let started = false
let finished = false
let releaseAll = null

/* Keep the splash up while `active` is true, on the first load only. */
export function useSplashHold(active) {
  useEffect(() => {
    if (!active || finished) return
    const token = {}
    holds.add(token)
    return () => {
      holds.delete(token)
      if (holds.size === 0) releaseAll?.()
    }
  }, [active])
}

export function dismissSplash() {
  if (started) return
  started = true

  const fonts = document.fonts?.ready ?? Promise.resolve()
  // Pages register holds in their own effects, which run before this one; a tick covers the rest.
  const unheld = wait(0).then(() =>
    holds.size === 0 ? undefined : new Promise((r) => (releaseAll = r)),
  )

  // Never hold the page hostage to a slow font.
  Promise.all([Promise.race([fonts, wait(1800)]), unheld])
    .then(() => {
      const el = document.getElementById('splash')
      // If it did appear, keep it long enough to read as intentional rather than a flicker.
      const shownAt = Number(el?.dataset.shownAt)
      return shownAt ? wait(Math.max(0, shownAt + 500 - performance.now())) : undefined
    })
    .then(() => {
      finished = true
      clearTimeout(window.__splashTimer)
      document.documentElement.classList.add('is-ready')
      resolveReady()
      const el = document.getElementById('splash')
      if (!el) return
      if (!el.dataset.shownAt) return el.remove()
      el.classList.add('is-leaving')
      const remove = () => el.remove()
      el.addEventListener('transitionend', remove, { once: true })
      setTimeout(remove, 1000)
    })
}
