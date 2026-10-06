import { useEffect, useRef, useState } from 'react'
import { AddButton, RemoveButton, TextField } from '../../components/ui/fields'
import { list, text } from '../../lib/validate'
import './reasons.css'

const MAX_REASONS = 100
const LIMITS = { title: 80, reason: 280, from: 60 }

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { title: 'Reasons I love you' }

function empty() {
  return { title: '', reasons: ['', '', ''], from: '' }
}

function clean(d = {}) {
  const reasons = list(d.reasons, MAX_REASONS).map((r) => text(r, LIMITS.reason))
  return {
    title: text(d.title, LIMITS.title),
    reasons: reasons.length ? reasons : [''],
    from: text(d.from, LIMITS.from),
  }
}

function finalize(d) {
  return { ...d, reasons: d.reasons.map((r) => r.trim()).filter(Boolean) }
}

function check(d) {
  if (!d.reasons.some((r) => r.trim())) return 'Add at least one reason.'
  return null
}

function Form({ value, onChange }) {
  const listRef = useRef(null)
  const focusLast = useRef(false)
  const setReason = (i, v) => onChange({ ...value, reasons: value.reasons.map((r, j) => (j === i ? v : r)) })
  const remove = (i) => onChange({ ...value, reasons: value.reasons.length > 1 ? value.reasons.filter((_, j) => j !== i) : [''] })
  const add = () => {
    focusLast.current = true
    onChange({ ...value, reasons: [...value.reasons, ''] })
  }

  useEffect(() => {
    if (!focusLast.current) return
    focusLast.current = false
    const inputs = listRef.current?.querySelectorAll('textarea')
    inputs?.[inputs.length - 1]?.focus()
  }, [value.reasons.length])

  const filled = value.reasons.filter((r) => r.trim()).length

  return (
    <>
      <TextField label="Title" placeholder="Reasons I love you" value={value.title} onChange={(v) => onChange({ ...value, title: v })} max={LIMITS.title} />
      <div className="form-section">
        <h2 className="form-section-title">
          The reasons <span className="field-hint">{filled} so far</span>
        </h2>
        <ol className="repeat-list" ref={listRef}>
          {value.reasons.map((r, i) => (
            <li className="repeat-item" key={i}>
              <span className="repeat-num">{i + 1}</span>
              <div className="repeat-body">
                <label className="visually-hidden" htmlFor={`reason-${i}`}>
                  Reason {i + 1}
                </label>
                <textarea
                  id={`reason-${i}`}
                  className="textarea reason-input"
                  rows={2}
                  maxLength={LIMITS.reason}
                  placeholder={i === 0 ? 'The way you laugh at your own jokes before you finish them.' : 'Another one…'}
                  value={r}
                  onChange={(e) => setReason(i, e.target.value)}
                  onKeyDown={(e) => {
                    // Enter on the last reason starts a new one; Shift+Enter still makes a line break.
                    if (e.key === 'Enter' && !e.shiftKey && i === value.reasons.length - 1 && r.trim()) {
                      e.preventDefault()
                      if (value.reasons.length < MAX_REASONS) add()
                    }
                  }}
                />
              </div>
              <RemoveButton onClick={() => remove(i)} label={`Remove reason ${i + 1}`} />
            </li>
          ))}
        </ol>
        <AddButton onClick={add} disabled={value.reasons.length >= MAX_REASONS}>
          Add a reason
        </AddButton>
        <p className="form-note">
          You can add more any time: keep the edit link, add to the list, and send her the new link. The ones she has already
          read stay in her history.
        </p>
      </div>
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={(v) => onChange({ ...value, from: v })} max={LIMITS.from} />
    </>
  )
}

function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function useRevealed(key, enabled) {
  const [revealed, setRevealed] = useState(() => {
    if (!enabled) return []
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      return Array.isArray(saved) ? saved.filter((s) => typeof s === 'string') : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    if (!enabled) return
    try {
      localStorage.setItem(key, JSON.stringify(revealed))
    } catch {
      /* history just won't persist */
    }
  }, [key, revealed, enabled])
  return [revealed, setRevealed]
}

function View({ data, preview }) {
  const reasons = [...new Set(data.reasons.map((r) => r.trim()).filter(Boolean))]
  const key = `dearly-reasons-${hash(`${data.title}|${data.from}`)}`
  const [revealedAll, setRevealed] = useRevealed(key, !preview)
  // Only count history entries that are still in the list.
  const revealed = revealedAll.filter((r) => reasons.includes(r))
  const remaining = reasons.filter((r) => !revealed.includes(r))
  const current = revealed[revealed.length - 1]
  const history = revealed.slice(0, -1).reverse()
  const currentRef = useRef(null)

  const next = () => {
    if (!remaining.length) return
    // Runs on tap, not during render; the linter can't tell.
    // oxlint-disable-next-line react/purity
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setRevealed([...revealed, pick])
    requestAnimationFrame(() => currentRef.current?.focus())
  }

  return (
    <div className="gv gv-reasons">
      <p className="gv-kicker">{reasons.length === 1 ? 'One reason' : `${reasons.length} reasons`}</p>
      <h1 className="gv-title">{data.title || 'Reasons I love you'}</h1>

      <div className="rs-stage" aria-live="polite">
        {current ? (
          <figure className="rs-current" key={current} tabIndex={-1} ref={currentRef}>
            <span className="rs-num">No. {revealed.length}</span>
            <blockquote>{current}</blockquote>
          </figure>
        ) : (
          <p className="rs-empty">One at a time. Take your time with each.</p>
        )}
      </div>

      <div className="rs-controls">
        {remaining.length ? (
          <button type="button" className="btn btn-primary" onClick={next}>
            {current ? 'Another one' : 'Tell me one'}
          </button>
        ) : (
          <p className="rs-done">That’s every one of them, for now.</p>
        )}
        {revealed.length > 0 && (
          <span className="rs-count">
            {revealed.length} of {reasons.length}
          </span>
        )}
      </div>

      {history.length > 0 && (
        <section className="rs-history" aria-label="Reasons you’ve read">
          <h2 className="rs-history-title">Looking back</h2>
          <ol reversed>
            {history.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </section>
      )}
      {data.from && <p className="gv-sign">— {data.from}</p>}
    </div>
  )
}

export default {
  type: 'reasons',
  headline: 'All the reasons, one at a time.',
  viewTitle: 'Reasons why',
  empty,
  retiredDefaults,
  clean,
  finalize,
  check,
  Form,
  View,
}
