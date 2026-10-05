import { useRef, useState } from 'react'
import { TextField } from '../../components/ui/fields'
import { list, oneOf, text } from '../../lib/validate'
import { downloadBlob } from '../../lib/media'
import BouquetArt, { FlowerIcon } from './BouquetArt'
import { FLOWERS, MAX_FLOWERS, PAPERS, RIBBONS, WRAP_STYLES, parseFlower, usesPaper } from './options'
import './bouquet.css'

const LIMITS = { note: 200, from: 60 }
const ids = (list) => list.map((x) => x[0])

/* The props BouquetArt needs, from gift data. */
const art = (d) => ({ flowers: d.flowers, wrap: d.wrap, paper: d.paper, ribbon: d.ribbon })

function empty() {
  return {
    flowers: ['rose:red', 'hydrangea:blue', 'lily:white', 'carnation:pink', 'gypsophila:white'],
    wrap: 'cone',
    paper: 'kraft',
    ribbon: 'rouge',
    note: '',
    from: '',
  }
}

function clean(d = {}) {
  // Links made before wrap styles existed stored the paper colour in `wrap`.
  const legacyPaper = ids(PAPERS).includes(d.wrap) ? d.wrap : null
  return {
    flowers: list(d.flowers, MAX_FLOWERS)
      .map(parseFlower)
      .filter(Boolean)
      .map((x) => `${x.kind}:${x.color}`),
    wrap: legacyPaper ? 'cone' : oneOf(d.wrap, WRAP_STYLES.map((w) => w.id), 'cone'),
    paper: oneOf(legacyPaper || d.paper, ids(PAPERS), 'kraft'),
    ribbon: oneOf(d.ribbon, ids(RIBBONS), 'rouge'),
    note: text(d.note, LIMITS.note),
    from: text(d.from, LIMITS.from),
  }
}

function check(d) {
  if (!d.flowers.length) return 'Add at least one flower.'
  return null
}

/* Pill radio group with a colour dot per option (paper, ribbon). */
function ColorChoices({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="choices bq-colors">
      <legend>{legend}</legend>
      {options.map(([id, label, hex]) => (
        <label className="choice" key={id}>
          <input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} />
          <span>
            <i className="swatch" style={{ background: hex }} /> {label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function Form({ value, onChange }) {
  // The colour each flower will be added in; starts at each flower's first colour.
  const [tones, setTones] = useState(() => Object.fromEntries(FLOWERS.map((f) => [f.kind, f.colors[0][0]])))
  const set = (patch) => onChange({ ...value, ...patch })
  const full = value.flowers.length >= MAX_FLOWERS
  const add = (kind) => !full && set({ flowers: [...value.flowers, `${kind}:${tones[kind]}`] })
  const removeAt = (i) => set({ flowers: value.flowers.filter((_, j) => j !== i) })
  const sample = value.flowers.length ? value.flowers.slice(0, 5) : empty().flowers

  return (
    <div className="bq-builder">
      <div className="bq-stage">
        <BouquetArt {...art(value)} />
        <p className="bq-count" aria-live="polite">
          {value.flowers.length} of {MAX_FLOWERS} stems
        </p>
      </div>

      <div className="bq-controls">
        <fieldset className="bq-palette">
          <legend className="field-label">
            <span>Add flowers</span>
            <span className="field-hint">Pick a colour, then tap to add</span>
          </legend>
          <div className="bq-palette-grid">
            {FLOWERS.map((f) => {
              const tone = f.colors.find((c) => c[0] === tones[f.kind]) || f.colors[0]
              return (
                <div className="bq-flower" key={f.kind}>
                  <button
                    type="button"
                    className="bq-flower-add"
                    onClick={() => add(f.kind)}
                    disabled={full}
                    aria-label={`Add ${f.colors.length > 1 ? tone[1].toLowerCase() + ' ' : ''}${f.label.toLowerCase()}`}
                  >
                    <FlowerIcon value={`${f.kind}:${tone[0]}`} />
                    <span>{f.label}</span>
                  </button>
                  {f.colors.length > 1 && (
                    <div className="bq-tones" role="radiogroup" aria-label={`${f.label} colour`}>
                      {f.colors.map(([id, label, hex]) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={tone[0] === id}
                          aria-label={label}
                          title={label}
                          className="bq-tone"
                          style={{ '--tone': hex }}
                          onClick={() => setTones((t) => ({ ...t, [f.kind]: id }))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {full && <p className="form-note">That’s a full bouquet. Remove one to add another.</p>}
        </fieldset>

        {value.flowers.length > 0 && (
          <div className="bq-current">
            <p className="field-label">In the bouquet</p>
            <ul className="bq-chips">
              {value.flowers.map((v, i) => {
                const p = parseFlower(v)
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className="bq-chip"
                      onClick={() => removeAt(i)}
                      aria-label={`Remove ${p.def.colors.length > 1 ? p.colorLabel.toLowerCase() + ' ' : ''}${p.def.label.toLowerCase()}`}
                    >
                      <FlowerIcon value={v} />
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => set({ flowers: [] })}>
              Clear flowers
            </button>
          </div>
        )}

        <fieldset className="bq-styles">
          <legend className="field-label">Wrapping</legend>
          <div className="bq-styles-grid">
            {WRAP_STYLES.map((w) => (
              <label className="bq-style" key={w.id}>
                <input type="radio" name="wrap" value={w.id} checked={value.wrap === w.id} onChange={() => set({ wrap: w.id })} />
                <span className="bq-style-card">
                  <BouquetArt flowers={sample} wrap={w.id} paper={value.paper} ribbon={value.ribbon} decorative />
                  <span className="bq-style-label">{w.label}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {usesPaper(value.wrap) && (
          <ColorChoices
            legend={value.wrap === 'hatbox' ? 'Box colour' : value.wrap === 'vase' ? 'Glass tint' : 'Paper colour'}
            name="paper"
            options={PAPERS}
            value={value.paper}
            onChange={(paper) => set({ paper })}
          />
        )}
        <ColorChoices legend="Ribbon" name="ribbon" options={RIBBONS} value={value.ribbon} onChange={(ribbon) => set({ ribbon })} />

        <TextField
          label="A note on the card"
          hint="Optional"
          multiline
          rows={3}
          placeholder="These never wilt. Neither does this."
          value={value.note}
          onChange={(v) => set({ note: v })}
          max={LIMITS.note}
        />
        <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={(v) => set({ from: v })} max={LIMITS.from} />
      </div>
    </div>
  )
}

function View({ data }) {
  return (
    <div className="gv gv-bouquet">
      <p className="gv-kicker">For you</p>
      <div className="bq-view-art">
        <BouquetArt {...art(data)} />
      </div>
      {data.note && <p className="bq-note">{data.note}</p>}
      {data.from && <p className="gv-sign">— {data.from}</p>}
      <BouquetDownload data={data} compact />
    </div>
  )
}

/* ---------- export ---------- */

function wrapLines(ctx, str, maxWidth) {
  const out = []
  str.split('\n').forEach((para) => {
    let line = ''
    para.split(/\s+/).forEach((word) => {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line)
        line = word
      } else line = test
    })
    out.push(line)
  })
  return out
}

async function exportImage(svgEl, data, format) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#faf4ee'
  ctx.fillRect(0, 0, W, H)

  // Explicit size so every browser rasterises the vector at full resolution.
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('width', '760')
  clone.setAttribute('height', '1000')
  const svg = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const artH = data.note || data.from ? 920 : 1120
    const artW = (artH * 320) / 420
    ctx.drawImage(img, (W - artW) / 2, data.note || data.from ? 70 : 115, artW, artH)
  } finally {
    URL.revokeObjectURL(url)
  }

  try {
    await Promise.all([document.fonts.load('italic 500 44px Fraunces'), document.fonts.load('500 44px Fraunces')])
  } catch {
    /* falls back to Georgia */
  }
  ctx.textAlign = 'center'
  let y = 1060
  if (data.note) {
    ctx.fillStyle = '#241c22'
    ctx.font = '500 44px Fraunces, Georgia, serif'
    const lines = wrapLines(ctx, data.note, 820).slice(0, 4)
    lines.forEach((l) => {
      ctx.fillText(l, W / 2, y)
      y += 58
    })
  }
  if (data.from) {
    ctx.fillStyle = '#b5473f'
    ctx.font = 'italic 500 40px Fraunces, Georgia, serif'
    ctx.fillText(`— ${data.from}`, W / 2, y + 16)
  }

  const type = format === 'jpg' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92))
  if (!blob) throw new Error('export failed')
  downloadBlob(blob, `dearly-bouquet.${format}`)
}

function BouquetDownload({ data, compact = false }) {
  const artRef = useRef(null)
  const [status, setStatus] = useState('')
  const save = async (format) => {
    setStatus('Saving…')
    try {
      await exportImage(artRef.current, data, format)
      setStatus('Saved.')
    } catch {
      setStatus('Couldn’t save the image. Try the other format.')
    }
  }
  return (
    <div className={compact ? 'bq-download bq-download-compact' : 'bq-download'}>
      {/* An off-screen copy at a fixed size is what gets drawn into the image. */}
      <div className="bq-export-source" aria-hidden="true">
        <BouquetArt ref={artRef} {...art(data)} />
      </div>
      {!compact && (
        <div>
          <h3 className="share-edit-title">Keep it as an image</h3>
          <p className="share-sub">Save the bouquet as a picture to send, print, or set as a wallpaper.</p>
        </div>
      )}
      <div className="bq-download-actions">
        <button type="button" className="btn btn-line btn-sm" onClick={() => save('png')}>
          Save as PNG
        </button>
        <button type="button" className="btn btn-line btn-sm" onClick={() => save('jpg')}>
          Save as JPG
        </button>
        <span className="field-hint" aria-live="polite">
          {status}
        </span>
      </div>
    </div>
  )
}

function ShareExtras({ data }) {
  return (
    <div className="share-extra">
      <BouquetDownload data={data} />
    </div>
  )
}

export default {
  type: 'bouquet',
  headline: 'Flowers that never wilt.',
  viewTitle: 'A bouquet for you',
  empty,
  clean,
  check,
  Form,
  View,
  ShareExtras,
}
