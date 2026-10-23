import { isCalendarDate } from './dates.js'

export const EMPTY_SETTINGS = { unlockAt: '', notifyOpened: false, allowReplies: false, senderEmail: '' }

export function cleanSettings(value = {}) {
  if (!value || typeof value !== 'object') value = {}
  return {
    unlockAt: typeof value.unlockAt === 'string' && Number.isFinite(Date.parse(value.unlockAt)) ? new Date(value.unlockAt).toISOString() : '',
    notifyOpened: value.notifyOpened === true,
    allowReplies: value.allowReplies === true,
    senderEmail: typeof value.senderEmail === 'string' && value.notifyOpened === true ? value.senderEmail.trim().slice(0, 254) : '',
  }
}

export function settingsProblem(value) {
  if (value.notifyOpened && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.senderEmail)) return 'Add your email for the opened notice.'
  return null
}

// Manila has a fixed UTC+08:00 offset and no daylight saving time.
export function manilaToInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return ''
  if (!isCalendarDate(value.slice(0, 10)) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14)) > 59) return ''
  const instant = new Date(`${value}:00+08:00`)
  if (!Number.isFinite(instant.getTime())) return ''
  return instant.toISOString()
}

export function instantToManila(value) {
  const date = new Date(Date.parse(value) + 8 * 3600e3)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : ''
}
