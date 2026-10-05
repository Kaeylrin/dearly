import { hasBackend, supabase, MEDIA_BUCKET, MEDIA_PREFIX } from './supabase'

/*
 * Gift storage.
 *
 * Gifts live in Supabase (see supabase/migrations). The share link carries
 * only the gift id; the sender's edit link also carries a secret edit token.
 * Photos and recordings are uploaded to the gift-media bucket and the data
 * keeps their URLs.
 *
 *   share link  /letter/k3J9xQ2a                    recipient view
 *   edit link   /letter/new?edit=k3J9xQ2a&key=<tok> reopens the form, prefilled
 *
 * Older links that carry the whole gift in the fragment (#<payload>, JSON ->
 * deflate -> base64url) still open, and are still produced when no Supabase
 * env vars are set (local dev without a backend).
 */

const VERSION = 1

function toBase64Url(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function pipeThrough(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

const canCompress = typeof CompressionStream !== 'undefined'

export async function encodePayload(type, data) {
  const json = JSON.stringify({ v: VERSION, t: type, d: data })
  const bytes = new TextEncoder().encode(json)
  if (canCompress) {
    return 'z' + toBase64Url(await pipeThrough(bytes, new CompressionStream('deflate-raw')))
  }
  return 'j' + toBase64Url(bytes)
}

export async function decodePayload(raw) {
  const str = decodeURIComponent(raw.replace(/^#/, '').trim())
  if (!str) throw new GiftLinkError('empty')
  const kind = str[0]
  const body = str.slice(1)
  let bytes
  try {
    bytes = fromBase64Url(body)
    if (kind === 'z') bytes = await pipeThrough(bytes, new DecompressionStream('deflate-raw'))
    else if (kind !== 'j') throw new Error('unknown encoding')
  } catch {
    throw new GiftLinkError('corrupt')
  }
  let parsed
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new GiftLinkError('corrupt')
  }
  if (!parsed || typeof parsed !== 'object' || parsed.v !== VERSION) {
    throw new GiftLinkError('corrupt')
  }
  return { type: parsed.t, data: parsed.d }
}

export class GiftLinkError extends Error {
  constructor(reason) {
    super(reason)
    this.reason = reason
  }
}

function randomId(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join('')
}

export async function createLegacyLinks(type, data) {
  const payload = await encodePayload(type, data)
  const origin = window.location.origin
  const id = randomId()
  return {
    id,
    shareUrl: `${origin}/${type}/${id}#${payload}`,
    editUrl: `${origin}/${type}/new#${payload}`,
    length: payload.length,
  }
}

/* Links past this length start getting cut off by some messaging apps. */
export const LONG_LINK = 8000

/* ---------- database ---------- */

export { hasBackend }

const ID_RE = /^[A-Za-z0-9]{10}$/
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
}

async function uploadDataUrl(value) {
  const blob = await (await fetch(value)).blob()
  const mime = blob.type.split(';')[0]
  const ext = EXT[mime]
  if (!ext) throw new Error(`Unsupported file type: ${mime}`)
  const name = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(name, blob, { contentType: mime, upsert: false })
  if (error) throw error
  return MEDIA_PREFIX + name
}

/* Replace every inline data: URL in the gift with an uploaded file's URL. */
async function uploadMedia(value) {
  if (typeof value === 'string') return value.startsWith('data:') ? uploadDataUrl(value) : value
  if (Array.isArray(value)) return Promise.all(value.map(uploadMedia))
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await uploadMedia(v)]))
    return Object.fromEntries(entries)
  }
  return value
}

function linksFor(type, id, token) {
  const origin = window.location.origin
  return {
    id,
    token,
    shareUrl: `${origin}/${type}/${id}`,
    editUrl: `${origin}/${type}/new?edit=${id}&key=${token}`,
  }
}

/*
 * Save a gift. With `existing` ({ id, token }) the same row is updated, so the
 * link she already has shows the new version. Returns the links plus the data
 * as stored (media replaced by URLs), which the form should keep using.
 */
export async function saveGift(type, data, existing) {
  if (!hasBackend) return { ...(await createLegacyLinks(type, data)), data }
  const stored = await uploadMedia(data)
  if (existing?.id && existing?.token) {
    const { data: ok, error } = await supabase.rpc('update_gift', { p_id: existing.id, p_token: existing.token, p_data: stored })
    if (error) throw error
    if (ok) return { ...linksFor(type, existing.id, existing.token), data: stored }
  }
  const { data: rows, error } = await supabase.rpc('create_gift', { p_type: type, p_data: stored })
  if (error) throw error
  const row = rows?.[0]
  if (!row) throw new Error('No gift returned')
  return { ...linksFor(type, row.id, row.edit_token), data: stored }
}

/* Recipient view. `count` is off for the sender opening their own preview. */
export async function fetchGift(id, { count = true } = {}) {
  if (!hasBackend || !ID_RE.test(id || '')) throw new GiftLinkError('missing')
  const { data: rows, error } = await supabase.rpc('get_gift', { p_id: id, p_count: count })
  if (error) throw new GiftLinkError('network')
  if (!rows?.[0]) throw new GiftLinkError('missing')
  return rows[0]
}

export async function fetchGiftForEdit(id, token) {
  if (!hasBackend || !ID_RE.test(id || '') || !TOKEN_RE.test(token || '')) throw new GiftLinkError('missing')
  const { data: rows, error } = await supabase.rpc('get_gift_for_edit', { p_id: id, p_token: token })
  if (error) throw new GiftLinkError('network')
  if (!rows?.[0]) throw new GiftLinkError('missing')
  return rows[0]
}

/* Emails the share link to her, through the /api/send-gift serverless function. */
export async function emailGift({ id, token, to, fromName, note }) {
  let res
  try {
    res = await fetch('/api/send-gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, token, to, fromName, note }),
    })
  } catch {
    throw new Error('Couldn’t reach the server. Check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'The email couldn’t be sent. Please try again.')
  return body
}
