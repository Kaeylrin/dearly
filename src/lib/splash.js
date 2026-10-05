/*
 * The first-load splash lives in index.html so it shows before any JavaScript
 * runs. Once the app has rendered and the fonts are in, it fades away and
 * <html> gets `is-ready`, which lets entrance animations start.
 */

let resolveReady
export const appReady = new Promise((resolve) => {
  resolveReady = resolve
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let started = false

export function dismissSplash() {
  if (started) return
  started = true

  // Keep it up long enough to read as intentional rather than a flicker,
  // but never hold the page hostage to a slow font.
  const minVisible = Math.max(0, 550 - performance.now())
  const fonts = document.fonts?.ready ?? Promise.resolve()

  Promise.race([fonts, wait(1800)])
    .then(() => wait(minVisible))
    .then(() => {
      document.documentElement.classList.add('is-ready')
      resolveReady()
      const el = document.getElementById('splash')
      if (!el) return
      el.classList.add('is-leaving')
      const remove = () => el.remove()
      el.addEventListener('transitionend', remove, { once: true })
      setTimeout(remove, 1000)
    })
}
