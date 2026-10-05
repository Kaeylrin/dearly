import { useCallback, useEffect, useRef, useState } from 'react'
import { TextField } from '../../components/ui/fields'
import { text } from '../../lib/validate'
import { useTheme } from '../../lib/theme'
import './scratch.css'

const LIMITS = { hint: 80, message: 240, from: 60 }
const REVEAL_AT = 0.5

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { hint: 'Something for you, underneath.' }

function empty() {
  return { hint: '', message: '', from: '' }
}

function clean(d = {}) {
  return { hint: text(d.hint, LIMITS.hint), message: text(d.message, LIMITS.message), from: text(d.from, LIMITS.from) }
}

function check(d) {
  if (!d.message.trim()) return 'Write the message she’ll uncover.'
  return null
}

function Form({ value, onChange }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <>
      <TextField label="Above the card" placeholder="Something for you, underneath." value={value.hint} onChange={set('hint')} max={LIMITS.hint} />
      <TextField
        label="The hidden message"
        multiline
        inputClassName="textarea-letter scratch-input"
        placeholder="Dinner’s on me Saturday. Wear the blue dress."
        value={value.message}
        onChange={set('message')}
        max={LIMITS.message}
        showCount
      />
      <p className="form-note">Shorter messages feel better to uncover. A sentence or two is plenty.</p>
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={set('from')} max={LIMITS.from} />
    </>
  )
}

function ScratchCard({ message, preview }) {
  const { dark } = useTheme()
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const moves = useRef(0)
  const [revealed, setRevealed] = useState(false)
  const [started, setStarted] = useState(false)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { width, height } = wrap.getBoundingClientRect()
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'

    const g = ctx.createLinearGradient(0, 0, width, height)
    if (dark) {
      g.addColorStop(0, '#4b3e42')
      g.addColorStop(0.5, '#64545a')
      g.addColorStop(1, '#4b3e42')
    } else {
      g.addColorStop(0, '#cdb9ad')
      g.addColorStop(0.5, '#e7d9cf')
      g.addColorStop(1, '#c8b3a6')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)

    // fine diagonal grain, like foil
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    for (let x = -height; x < width; x += 6) {
      ctx.beginPath()
      ctx.moveTo(x, height)
      ctx.lineTo(x + height, 0)
      ctx.stroke()
    }

    ctx.fillStyle = dark ? 'rgba(245,234,228,0.75)' : 'rgba(36,28,34,0.55)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `italic 500 ${Math.max(18, Math.min(26, width / 16))}px Fraunces, Georgia, serif`
    ctx.fillText('Scratch here', width / 2, height / 2)
  }, [dark])

  useEffect(() => {
    if (revealed || started) return
    paint()
    document.fonts?.ready.then(() => !started && paint())
    const ro = new ResizeObserver(() => !started && paint())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [paint, revealed, started])

  const clearedRatio = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    const data = ctx.getImageData(0, 0, width, height).data
    let clear = 0
    let total = 0
    const step = 4 * 24 // sample every 24th pixel
    for (let i = 3; i < data.length; i += step) {
      total++
      if (data[i] < 40) clear++
    }
    return total ? clear / total : 0
  }

  const scratchTo = (x, y) => {
    const ctx = canvasRef.current.getContext('2d')
    const width = wrapRef.current.getBoundingClientRect().width
    ctx.globalCompositeOperation = 'destination-out'
    // Erase strength comes from the stroke's alpha, so it must be fully opaque.
    ctx.strokeStyle = '#000'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(36, width / 9)
    ctx.beginPath()
    const from = last.current || { x, y }
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(x + 0.01, y)
    ctx.stroke()
    last.current = { x, y }
    if (++moves.current % 12 === 0 && clearedRatio() > REVEAL_AT) setRevealed(true)
  }

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e) => {
    if (revealed) return
    drawing.current = true
    setStarted(true)
    canvasRef.current.setPointerCapture?.(e.pointerId)
    last.current = null
    const p = point(e)
    scratchTo(p.x, p.y)
  }
  const onMove = (e) => {
    if (!drawing.current) return
    const p = point(e)
    scratchTo(p.x, p.y)
  }
  const onUp = () => {
    drawing.current = false
    last.current = null
    if (!revealed && canvasRef.current && clearedRatio() > REVEAL_AT) setRevealed(true)
  }

  const reset = () => {
    setRevealed(false)
    setStarted(false)
    moves.current = 0
  }

  return (
    <div className="sc">
      <div className={`sc-card${revealed ? ' is-revealed' : ''}`} ref={wrapRef}>
        <p className="sc-message" aria-hidden={!revealed}>
          {message}
        </p>
        <canvas
          ref={canvasRef}
          className="sc-foil"
          aria-hidden="true"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>
      <div className="sc-actions" aria-live="polite">
        {!revealed ? (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRevealed(true)}>
            Reveal it all at once
          </button>
        ) : (
          <>
            <span className="visually-hidden">Revealed: {message}</span>
            {preview && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={reset}>
                Cover it again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function View({ data, preview }) {
  return (
    <div className="gv gv-scratch">
      <p className="gv-kicker">{data.hint || 'Something for you, underneath.'}</p>
      <ScratchCard message={data.message} preview={preview} />
      {data.from && <p className="gv-sign">— {data.from}</p>}
    </div>
  )
}

export default {
  type: 'scratch',
  headline: 'Hide something she has to find.',
  viewTitle: 'Scratch to reveal',
  empty,
  retiredDefaults,
  clean,
  check,
  Form,
  View,
}
