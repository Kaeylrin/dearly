export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Keep a monthly countdown at the sender's wall-clock time, including DST.
export function shiftCalendarMonths(instant, months, timeZone = 'UTC') {
  const base = new Date(instant)
  if (months === 0) return base
  let formatter
  try {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
  }
  const parts = (date) => Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  const timestamp = (p) => {
    const date = new Date(0)
    date.setUTCFullYear(p.year, p.month - 1, p.day)
    date.setUTCHours(p.hour, p.minute, p.second, 0)
    return date.getTime()
  }
  const target = parts(base)
  const index = target.month - 1 + months
  target.year += Math.floor(index / 12)
  target.month = index % 12 + 1
  const end = new Date(0)
  end.setUTCFullYear(target.year, target.month, 0)
  target.day = Math.min(target.day, end.getUTCDate())
  const wallTime = timestamp(target)
  let candidate = wallTime
  let previous
  for (let i = 0; i < 4; i++) {
    const delta = wallTime - timestamp(parts(new Date(candidate)))
    if (!delta) return new Date(candidate)
    const next = candidate + delta
    // A nonexistent DST time moves forward to the first matching later time.
    if (next === previous) return new Date(Math.max(next, candidate))
    previous = candidate
    candidate = next
  }
  return new Date(candidate)
}
