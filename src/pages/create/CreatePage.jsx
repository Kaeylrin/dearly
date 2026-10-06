import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Link from '../../components/ui/Link'
import Loader from '../../components/ui/Loader'
import { RateLimitError, decodePayload, fetchGiftForEdit, saveGift } from '../../lib/giftStore'
import { catalogByType } from '../../gifts/catalog'
import { useTitle } from '../../hooks/useTitle'
import { scrollToTarget } from '../../lib/smoothScroll'
import SharePanel from './SharePanel'
import './CreatePage.css'

const STEPS = [
  { id: 'write', label: 'Write' },
  { id: 'preview', label: 'Preview' },
  { id: 'send', label: 'Send' },
]

const draftKey = (type) => `dearly-draft-${type}`
const savedKey = (type) => `dearly-saved-${type}`

/* The gift row this draft was saved to ({ id, token }), so saving again updates it. */
function loadSaved(type) {
  try {
    const saved = JSON.parse(localStorage.getItem(savedKey(type)) || 'null')
    return saved?.id && saved?.token ? saved : null
  } catch {
    return null
  }
}

function storeSaved(type, saved) {
  try {
    if (saved) localStorage.setItem(savedKey(type), JSON.stringify(saved))
    else localStorage.removeItem(savedKey(type))
  } catch {
    /* ignore */
  }
}

function editParams(search) {
  const q = new URLSearchParams(search)
  const id = q.get('edit')
  const token = q.get('key')
  return id && token ? { id, token } : null
}

/* What actually gets previewed and shared: cleaned, then trimmed of empty rows. */
const ready = (gift, d) => (gift.finalize ? gift.finalize(gift.clean(d)) : gift.clean(d))

function loadDraft(gift) {
  try {
    const raw = localStorage.getItem(draftKey(gift.type))
    if (raw) {
      const draft = JSON.parse(raw)
      // Fields used to start with example text; a draft saved then would bring it back
      // as if it had been typed. Keep anything that differs, clear exact leftovers.
      for (const [key, old] of Object.entries(gift.retiredDefaults || {})) {
        if (draft[key] === old) draft[key] = ''
      }
      return gift.clean(draft)
    }
  } catch {
    /* no draft */
  }
  return gift.empty()
}

export default function CreatePage({ gift }) {
  const meta = catalogByType[gift.type]
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(() => loadDraft(gift))
  const [step, setStep] = useState('write')
  const [error, setError] = useState('')
  const [links, setLinks] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(() => loadSaved(gift.type))
  // An edit link has to be loaded before the form can show.
  const [opening, setOpening] = useState(() => location.hash.length >= 8 || Boolean(editParams(location.search)))
  const topRef = useRef(null)

  useTitle(`${meta.title} · Dearly`)

  // An edit link (/type/new?edit=id&key=token, or an older /type/new#payload) prefills
  // the form, then the URL is cleaned so a refresh keeps later edits instead of reloading.
  useEffect(() => {
    const edit = editParams(location.search)
    if (!edit && (!location.hash || location.hash.length < 8)) return
    let cancelled = false
    const load = edit ? fetchGiftForEdit(edit.id, edit.token) : decodePayload(location.hash)
    load
      .then((res) => {
        if (cancelled || res.type !== gift.type) return
        setData(gift.clean(res.data))
        if (edit) {
          setSaved(edit)
          storeSaved(gift.type, edit)
        }
        setStep('write')
      })
      .catch(() => {
        if (!cancelled) setError('That edit link didn’t open, so you’re starting fresh.')
      })
      .finally(() => {
        if (cancelled) return
        setOpening(false)
        navigate(location.pathname, { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [location.hash, location.search, location.pathname, gift, navigate])

  // Keep a draft as you type (debounced), so a refresh doesn't lose anything.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(gift.type), JSON.stringify(data))
      } catch {
        /* quota exceeded (large photos/audio): the draft just isn't kept */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [data, gift.type])

  const goTo = (next) => {
    setStep(next)
    setError('')
    requestAnimationFrame(() => topRef.current && scrollToTarget(topRef.current))
  }

  const onPreview = (e) => {
    e?.preventDefault()
    const problem = gift.check(ready(gift, data))
    if (problem) {
      setError(problem)
      return
    }
    goTo('preview')
  }

  const onCreate = async () => {
    setBusy(true)
    try {
      const res = await saveGift(gift.type, ready(gift, data), saved)
      setLinks(res)
      // Keep uploaded media URLs so saving again doesn't re-upload.
      setData(gift.clean(res.data))
      if (res.token) {
        const next = { id: res.id, token: res.token }
        setSaved(next)
        storeSaved(gift.type, next)
      }
      goTo('send')
    } catch (err) {
      setError(
        err instanceof RateLimitError
          ? 'You’ve saved a lot in a short time. Please wait a little while and try again.'
          : 'Something went wrong saving your gift. Check your connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const startOver = () => {
    setData(gift.empty())
    setLinks(null)
    setSaved(null)
    storeSaved(gift.type, null)
    setError('')
    try {
      localStorage.removeItem(draftKey(gift.type))
    } catch {
      /* ignore */
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const Form = gift.Form
  const View = gift.View
  const Extras = gift.ShareExtras

  return (
    <div className="create wrap" ref={topRef}>
      <header className="create-head">
        <Link to="/#gifts" className="create-back">
          <span className="arrow" aria-hidden="true">←</span> All gifts
        </Link>
        <p className="eyebrow">{meta.title}</p>
        <h1 className="create-title">{gift.headline}</h1>
        <p className="create-blurb">{meta.blurb}</p>
      </header>

      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => {
          const reachable = i < stepIndex
          return (
            <li key={s.id} className={`step${i === stepIndex ? ' is-current' : ''}${i < stepIndex ? ' is-done' : ''}`}>
              {reachable ? (
                <button type="button" onClick={() => goTo(s.id)}>
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span> {s.label}
                </button>
              ) : (
                <span aria-current={i === stepIndex ? 'step' : undefined}>
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span> {s.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {opening && <Loader label="Opening your gift…" />}

      {step === 'write' && !opening && (
        <form className="create-form" onSubmit={onPreview} noValidate>
          <Form value={data} onChange={setData} />
          <div className="create-actions">
            <button type="submit" className="btn btn-primary">
              Preview <span className="arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="btn btn-quiet" onClick={startOver}>
              Clear and start over
            </button>
            <p className="form-error" role="alert">
              {error}
            </p>
          </div>
        </form>
      )}

      {step === 'preview' && (
        <div className="create-preview">
          <p className="preview-label">What she’ll see</p>
          <div className="preview-frame">
            <View data={ready(gift, data)} preview />
          </div>
          <div className="create-actions">
            <button type="button" className="btn btn-primary" onClick={onCreate} disabled={busy}>
              {busy ? 'Saving…' : saved ? 'Save changes' : 'Looks right, get the link'}
            </button>
            <button type="button" className="btn btn-line" onClick={() => goTo('write')}>
              Back to editing
            </button>
            <p className="form-error" role="alert">
              {error}
            </p>
          </div>
        </div>
      )}

      {step === 'send' && links && (
        <SharePanel links={links} onEdit={() => goTo('write')}>
          {Extras && <Extras data={ready(gift, data)} />}
        </SharePanel>
      )}
    </div>
  )
}
