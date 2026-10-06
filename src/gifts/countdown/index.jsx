import { useEffect, useMemo, useState } from 'react'
import { TextField } from '../../components/ui/fields'
import { text } from '../../lib/validate'
import './countdown.css'

const LIMITS = { title: 80, message: 400, from: 60 }
const DAY = 86400000

function localTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { time: '00:00' }

function empty() {
  return { title: '', date: '', time: '', target: '', tz: localTz(), monthly: false, message: '', from: '' }
}

/* The target is stored as a UTC instant, computed in the sender's timezone. */
function toTarget(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const t = /^\d{2}:\d{2}$/.test(time) ? time : '00:00'
  const d = new Date(`${date}T${t}`)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function clean(d = {}) {
  const target = typeof d.target === 'string' && !Number.isNaN(Date.parse(d.target)) ? new Date(d.target).toISOString() : ''
  return {
    title: text(d.title, LIMITS.title),
    date: typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : '',
    time: typeof d.time === 'string' && /^\d{2}:\d{2}$/.test(d.time) ? d.time : '',
    target,
    tz: text(d.tz, 64),
    monthly: d.monthly === true,
    message: text(d.message, LIMITS.message),
    from: text(d.from, LIMITS.from),
  }
}

function check(d) {
  if (!d.target) return 'Pick the date you’re counting down to.'
  return null
}

/* Same day-of-month, n months later; clamps the 31st to the end of shorter months. */
function addMonths(date, n) {
  const d = new Date(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d
}

/*
 * Returns the moment to count towards and whether we're inside the 24 hours
 * after an occurrence (when the "it's here" message shows).
 */
function resolve(data, now) {
  const base = new Date(data.target)
  if (!data.monthly) return { target: base, arrived: now >= base }
  let occ = base
  let n = 0
  while (addMonths(base, n + 1) <= now) n++
  occ = addMonths(base, n)
  if (now >= occ && now - occ < DAY) return { target: occ, arrived: true }
  return { target: now < base ? base : addMonths(base, n + 1), arrived: false }
}

function split(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 }
}

function Form({ value, onChange }) {
  const update = (patch) => {
    const next = { ...value, ...patch }
    next.target = toTarget(next.date, next.time)
    next.tz = localTz()
    onChange(next)
  }
  // Re-checked on every render on purpose: the note should appear once the moment passes.
  // oxlint-disable-next-line react/purity
  const past = value.target && !value.monthly && new Date(value.target) < new Date()
  return (
    <>
      <TextField
        label="What you’re counting down to"
        placeholder="Until our monthsary"
        value={value.title}
        onChange={(v) => update({ title: v })}
        max={LIMITS.title}
      />
      <div className="field-row">
        <TextField label="Date" type="date" value={value.date} onChange={(v) => update({ date: v })} required />
        <TextField label="Time" type="time" value={value.time} onChange={(v) => update({ time: v })} hint={value.time ? value.tz || undefined : 'Midnight if left blank'} />
      </div>
      <label className="check">
        <input type="checkbox" checked={value.monthly} onChange={(e) => update({ monthly: e.target.checked })} />
        <span>
          Repeat every month
          <small>After the day passes, it starts counting to the same date next month.</small>
        </span>
      </label>
      {past && <p className="form-note">That moment has already passed. She’ll see your message instead of a countdown.</p>}
      <TextField
        label="Message for when it arrives"
        hint="Optional"
        multiline
        placeholder="Happy monthsary. Look outside."
        value={value.message}
        onChange={(v) => update({ message: v })}
        max={LIMITS.message}
      />
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={(v) => update({ from: v })} max={LIMITS.from} />
    </>
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval
    // Align ticks to the second boundary so digits change together.
    const align = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 1000)
    }, 1000 - (Date.now() % 1000))
    return () => {
      clearTimeout(align)
      clearInterval(interval)
    }
  }, [])
  return now
}

function View({ data }) {
  const now = useNow()
  const { target, arrived } = resolve(data, now)
  const parts = split(target - now)
  const viewerTz = localTz()

  const when = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(target),
    [target],
  )

  const units = [
    ['days', parts.days],
    ['hours', parts.hours],
    ['minutes', parts.minutes],
    ['seconds', parts.seconds],
  ]
  const spoken = `${parts.days} days, ${parts.hours} hours and ${parts.minutes} minutes to go`

  return (
    <div className="gv gv-countdown">
      {data.title && <h1 className="gv-title">{data.title}</h1>}

      {arrived ? (
        <div className="cd-arrived">
          <p className="cd-arrived-kicker">It’s here.</p>
          {data.message && <p className="cd-message">{data.message}</p>}
        </div>
      ) : (
        <>
          <div className="cd-clock" role="timer" aria-label={spoken}>
            {units.map(([label, n]) => (
              <div className="cd-unit" key={label} aria-hidden="true">
                <span className="cd-num">{String(n).padStart(label === 'days' ? 1 : 2, '0')}</span>
                <span className="cd-label">{n === 1 ? label.slice(0, -1) : label}</span>
              </div>
            ))}
          </div>
          <p className="cd-when">
            {when}
            {data.tz && viewerTz && data.tz !== viewerTz && <span className="cd-tz"> · your time (set in {data.tz.replace(/_/g, ' ')})</span>}
          </p>
          {data.monthly && <p className="cd-repeat">Every month, on this day.</p>}
        </>
      )}
      {data.from && <p className="gv-sign">— {data.from}</p>}
    </div>
  )
}

export default {
  type: 'countdown',
  headline: 'Count down to something together.',
  viewTitle: 'Counting down',
  empty,
  retiredDefaults,
  clean,
  check,
  Form,
  View,
}
