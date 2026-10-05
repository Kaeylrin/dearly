import { useState } from 'react'
import { AddButton, RemoveButton, TextField } from '../../components/ui/fields'
import { dataUrl, isoDate, list, text } from '../../lib/validate'
import { shrinkPhoto } from '../../lib/media'
import './timeline.css'

const MAX_ENTRIES = 12
const MAX_PHOTOS = 6
const PHOTO_CHARS = 120000
const LIMITS = { title: 80, entryTitle: 80, note: 400, from: 60 }

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { title: 'Us, so far' }

const blankEntry = () => ({ date: '', title: '', note: '', photo: '' })

function empty() {
  return { title: '', entries: [blankEntry(), blankEntry()], from: '' }
}

function clean(d = {}) {
  const entries = list(d.entries, MAX_ENTRIES).map((e = {}) => ({
    date: isoDate(e.date),
    title: text(e.title, LIMITS.entryTitle),
    note: text(e.note, LIMITS.note),
    photo: dataUrl(e.photo, 'image/', PHOTO_CHARS),
  }))
  let photos = 0
  entries.forEach((e) => {
    if (e.photo && ++photos > MAX_PHOTOS) e.photo = ''
  })
  return {
    title: text(d.title, LIMITS.title),
    entries: entries.length ? entries : [blankEntry()],
    from: text(d.from, LIMITS.from),
  }
}

const hasContent = (e) => e.title.trim() || e.note.trim() || e.photo

function finalize(d) {
  const entries = d.entries
    .filter(hasContent)
    .map((e) => ({ ...e, title: e.title.trim(), note: e.note.trim() }))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
  return { ...d, entries }
}

function check(d) {
  if (!d.entries.length) return 'Add at least one memory.'
  const undated = d.entries.findIndex((e) => !e.date)
  if (undated !== -1) return `Give “${d.entries[undated].title || 'each memory'}” a date so it lands in the right place.`
  return null
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  // Built from parts so the date never shifts with the viewer's timezone.
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(y, m - 1, d))
}

function PhotoInput({ entry, onPhoto, photosUsed }) {
  const [status, setStatus] = useState('')
  const disabled = !entry.photo && photosUsed >= MAX_PHOTOS
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus('Preparing photo…')
    try {
      onPhoto(await shrinkPhoto(file))
      setStatus('')
    } catch (err) {
      setStatus(err.message || 'Couldn’t use that photo.')
    }
  }
  return (
    <div className="tl-photo-input">
      {entry.photo ? (
        <div className="tl-thumb">
          <img src={entry.photo} alt="" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onPhoto('')}>
            Remove photo
          </button>
        </div>
      ) : (
        <label className={`upload-link${disabled ? ' is-disabled' : ''}`}>
          <input type="file" accept="image/*" onChange={onFile} disabled={disabled} className="visually-hidden" />
          <span>{disabled ? `Photo limit reached (${MAX_PHOTOS})` : '+ Add a photo'}</span>
        </label>
      )}
      {status && (
        <p className="field-hint" role="status">
          {status}
        </p>
      )}
    </div>
  )
}

function Form({ value, onChange }) {
  const setEntry = (i, patch) => onChange({ ...value, entries: value.entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) })
  const remove = (i) => onChange({ ...value, entries: value.entries.length > 1 ? value.entries.filter((_, j) => j !== i) : [blankEntry()] })
  const photosUsed = value.entries.filter((e) => e.photo).length

  return (
    <>
      <TextField label="Title" placeholder="Us, so far" value={value.title} onChange={(v) => onChange({ ...value, title: v })} max={LIMITS.title} />
      <div className="form-section">
        <h2 className="form-section-title">Memories</h2>
        <ol className="repeat-list">
          {value.entries.map((e, i) => (
            <li className="repeat-item" key={i}>
              <span className="repeat-num">{i + 1}</span>
              <div className="repeat-body tl-entry-form">
                <div className="tl-entry-row">
                  <input
                    type="date"
                    className="input"
                    value={e.date}
                    aria-label={`Date of memory ${i + 1}`}
                    onChange={(ev) => setEntry(i, { date: ev.target.value })}
                  />
                  <input
                    className="input"
                    placeholder={i === 0 ? 'The first time we met' : 'What happened'}
                    value={e.title}
                    maxLength={LIMITS.entryTitle}
                    aria-label={`Title of memory ${i + 1}`}
                    onChange={(ev) => setEntry(i, { title: ev.target.value })}
                  />
                </div>
                <textarea
                  className="textarea tl-note-input"
                  rows={2}
                  placeholder="A line or two about it"
                  value={e.note}
                  maxLength={LIMITS.note}
                  aria-label={`Note for memory ${i + 1}`}
                  onChange={(ev) => setEntry(i, { note: ev.target.value })}
                />
                <PhotoInput entry={e} photosUsed={photosUsed} onPhoto={(photo) => setEntry(i, { photo })} />
              </div>
              <RemoveButton onClick={() => remove(i)} label={`Remove memory ${i + 1}`} />
            </li>
          ))}
        </ol>
        <AddButton onClick={() => onChange({ ...value, entries: [...value.entries, blankEntry()] })} disabled={value.entries.length >= MAX_ENTRIES}>
          Add a memory
        </AddButton>
        <p className="form-note">
          Memories are sorted by date when she opens it. Photos are made smaller so they fit inside the link (up to {MAX_PHOTOS}).
        </p>
      </div>
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={(v) => onChange({ ...value, from: v })} max={LIMITS.from} />
    </>
  )
}

function View({ data }) {
  return (
    <div className="gv gv-timeline">
      <p className="gv-kicker">A small history of the two of us</p>
      <h1 className="gv-title">{data.title || 'Us, so far'}</h1>
      <ol className="tl">
        {data.entries.map((e, i) => (
          <li className="tl-item" key={i} style={{ '--tilt': `${i % 2 ? 1.2 : -1.2}deg` }}>
            <time className="tl-date" dateTime={e.date}>
              {e.date ? formatDate(e.date) : ''}
            </time>
            {e.title && <h2 className="tl-title">{e.title}</h2>}
            {e.photo && (
              <figure className="tl-photo">
                <img src={e.photo} alt={e.title ? `Photo: ${e.title}` : 'A photo from this memory'} loading="lazy" />
              </figure>
            )}
            {e.note && <p className="tl-note">{e.note}</p>}
          </li>
        ))}
      </ol>
      {data.from && <p className="gv-sign">— {data.from}</p>}
    </div>
  )
}

export default {
  type: 'timeline',
  headline: 'The two of you, in order.',
  viewTitle: 'Our timeline',
  empty,
  retiredDefaults,
  clean,
  finalize,
  check,
  Form,
  View,
}
