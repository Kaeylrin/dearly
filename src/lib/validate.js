/*
 * Small helpers for cleaning gift data. Every gift link is user-controlled
 * input, so viewers run the same cleaning as the forms before rendering.
 * React escapes text on render; these keep shapes and sizes sane.
 */

import { MEDIA_PREFIX } from './supabase'

export function text(value, max) {
  if (typeof value !== 'string') return ''
  // Drop control characters except newline and tab.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').slice(0, max)
}

export function list(value, max) {
  return Array.isArray(value) ? value.slice(0, max) : []
}

export function oneOf(value, options, fallback) {
  return options.includes(value) ? value : fallback
}

export function int(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const MEDIA_EXT = {
  'image/': 'jpg|jpeg|png|webp',
  'audio/': 'webm|ogg|mp3|m4a|mp4|wav|aac',
}

/* An inline data: URL, or a file already uploaded to the gift-media bucket. */
export function dataUrl(value, mimePrefix, maxChars) {
  if (typeof value !== 'string') return ''
  if (MEDIA_PREFIX.startsWith('https://') && value.startsWith(MEDIA_PREFIX)) {
    const name = value.slice(MEDIA_PREFIX.length)
    const ok = new RegExp(`^[0-9a-f-]{36}\\.(${MEDIA_EXT[mimePrefix] || 'x^'})$`)
    return ok.test(name) ? value : ''
  }
  if (value.length > maxChars) return ''
  const ok = new RegExp(`^data:${mimePrefix}[a-z0-9.+-]*(;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+$`, 'i')
  return ok.test(value) ? value : ''
}

export function isoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}
