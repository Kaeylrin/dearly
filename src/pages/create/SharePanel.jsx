import { useEffect, useRef, useState } from 'react'
import { LONG_LINK, emailGift } from '../../lib/giftStore'
import { TextField } from '../../components/ui/fields'
import './SharePanel.css'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / insecure contexts: fall back to a hidden textarea.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

function CopyButton({ text, label, doneLabel = 'Copied', className = 'btn btn-primary' }) {
  const [state, setState] = useState('idle')
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  const onClick = async () => {
    const ok = await copyText(text)
    setState(ok ? 'done' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2200)
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      <span aria-live="polite">{state === 'done' ? doneLabel : state === 'failed' ? 'Couldn’t copy, select it instead' : label}</span>
    </button>
  )
}

const MAILTO_LIMIT = 1900
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function EmailForm({ links }) {
  const [to, setTo] = useState('')
  const [fromName, setFromName] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState({ state: 'idle' })

  const onSubmit = async (e) => {
    e.preventDefault()
    const email = to.trim()
    if (!EMAIL_RE.test(email)) return setStatus({ state: 'error', message: 'That email address doesn’t look right.' })
    if (!fromName.trim()) return setStatus({ state: 'error', message: 'Add your name so she knows who it’s from.' })
    setStatus({ state: 'sending' })
    try {
      await emailGift({ id: links.id, token: links.token, to: email, fromName: fromName.trim(), note: note.trim() })
      setStatus({ state: 'sent', to: email })
    } catch (err) {
      setStatus({ state: 'error', message: err.message })
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="share-sent" role="status">
        <p className="share-sent-title">
          Sent to <span className="mark">{status.to}</span>.
        </p>
        <p className="share-sub">It can take a minute to arrive. If she can’t find it, ask her to check her spam folder.</p>
        <button type="button" className="btn btn-line btn-sm" onClick={() => setStatus({ state: 'idle' })}>
          Send to another address
        </button>
      </div>
    )
  }

  return (
    <form className="share-email" onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <TextField label="Her email" type="email" inputMode="email" autoComplete="off" placeholder="her@email.com" value={to} onChange={setTo} max={254} required />
        <TextField label="Your name" placeholder="Your name" value={fromName} onChange={setFromName} max={60} required />
      </div>
      <TextField label="A line for the email" hint="Optional" placeholder="Open this when you have a quiet minute." value={note} onChange={setNote} max={200} />
      <div className="share-actions">
        <button type="submit" className="btn btn-primary" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Send it to her'}
        </button>
        <p className="form-error" role="alert">
          {status.state === 'error' ? status.message : ''}
        </p>
      </div>
    </form>
  )
}

export default function SharePanel({ links, onEdit, children }) {
  const { shareUrl, editUrl } = links
  const canEmail = Boolean(links.token)
  const [mode, setMode] = useState('link')
  const canShare = typeof navigator.share === 'function'
  const mailto = `mailto:?subject=${encodeURIComponent('I made you something')}&body=${encodeURIComponent(`${shareUrl}\n`)}`
  const share = async () => {
    try {
      await navigator.share({ title: 'Dearly', text: 'I made you something.', url: shareUrl })
    } catch {
      /* dismissed */
    }
  }

  return (
    <section className="share" aria-labelledby="share-title">
      <h2 id="share-title" className="share-title">
        It’s ready. <span className="mark">Now send it to her.</span>
      </h2>
      <p className="share-sub">Send the link yourself, or we’ll email it to her for you. Anyone with the link can open it, so send it only to her.</p>

      {canEmail && (
        <div className="choices share-mode" role="radiogroup" aria-label="How to send it">
          {[
            ['link', 'Send the link myself'],
            ['email', 'Email it to her'],
          ].map(([value, label]) => (
            <label key={value} className="choice">
              <input type="radio" name="share-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}

      {mode === 'email' && canEmail ? (
        <EmailForm links={links} />
      ) : (
        <>
          <div className="share-link">
            <label className="visually-hidden" htmlFor="share-url">
              Share link
            </label>
            <input id="share-url" className="input share-url" value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
          </div>

          <div className="share-actions">
            <CopyButton text={shareUrl} label="Copy link" />
            {canShare && (
              <button type="button" className="btn btn-line" onClick={share}>
                Share…
              </button>
            )}
            {shareUrl.length < MAILTO_LIMIT && (
              <a className="btn btn-line" href={mailto}>
                Open in my email app
              </a>
            )}
            <a className="btn btn-quiet" href={shareUrl} target="_blank" rel="noopener noreferrer">
              Open it <span className="arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          {shareUrl.length >= MAILTO_LIMIT && (
            <p className="share-note">This link is too long for an email draft. Copy it and paste it into a message instead.</p>
          )}
          {shareUrl.length > LONG_LINK && (
            <p className="share-note">
              Photos and recordings make the link long. Most messaging apps handle it fine, but if hers cuts it off, try fewer or
              shorter attachments.
            </p>
          )}
        </>
      )}

      {children}

      <div className="share-edit">
        <div>
          <h3 className="share-edit-title">Want to change it later?</h3>
          <p className="share-sub">
            {canEmail
              ? 'Keep this edit link for yourself. It reopens the form with everything filled in, and your changes show up on the link she already has.'
              : 'Keep this edit link for yourself. It reopens the form with everything filled in, and gives you a fresh link to send.'}
          </p>
        </div>
        <div className="share-edit-actions">
          <CopyButton text={editUrl} label="Copy edit link" className="btn btn-line btn-sm" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={onEdit}>
            Keep editing
          </button>
        </div>
      </div>
    </section>
  )
}
