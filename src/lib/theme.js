import { useSyncExternalStore } from 'react'

/*
 * Theme store. The saved preference is applied before first paint by a script
 * in index.html; this keeps React, the favicon, and every subscriber in sync.
 */

const KEY = 'dearly-theme'
const listeners = new Set()
const media = window.matchMedia('(prefers-color-scheme: dark)')

function isDark() {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark') return true
  if (attr === 'light') return false
  return media.matches
}

/* Dark appearance gets the dark logo tile as favicon, light gets the light one. */
function syncFavicon() {
  const tone = isDark() ? 'dark' : 'light'
  const icon = document.getElementById('favicon')
  const apple = document.getElementById('apple-icon')
  if (icon) icon.href = `/icons/favicon-${tone}-32.png`
  if (apple) apple.href = `/icons/favicon-${tone}-180.png`
}

function emit() {
  syncFavicon()
  listeners.forEach((fn) => fn())
}

media.addEventListener('change', emit)

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function toggleTheme() {
  const next = isDark() ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
  emit()
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDark)
  return { dark, toggle: toggleTheme }
}
