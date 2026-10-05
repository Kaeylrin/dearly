import { useEffect, useRef, useState } from 'react'
import { TextField } from '../../components/ui/fields'
import { dataUrl, int, text } from '../../lib/validate'
import { blobToDataUrl } from '../../lib/media'
import './voice.css'

const MAX_SECONDS = 45
const MAX_UPLOAD = 400 * 1024
const AUDIO_CHARS = 600000
const LIMITS = { title: 80, note: 600, from: 60 }

function empty() {
  return { title: '', note: '', audio: '', duration: 0, from: '' }
}

function clean(d = {}) {
  return {
    title: text(d.title, LIMITS.title),
    note: text(d.note, LIMITS.note),
    audio: dataUrl(d.audio, 'audio/', AUDIO_CHARS),
    duration: int(d.duration, 0, 600, 0),
    from: text(d.from, LIMITS.from),
  }
}

function check(d) {
  if (!d.audio) return 'Record something, or add an audio file.'
  return null
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return options.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ''
}

const fmt = (s) => {
  const n = Math.max(0, Math.round(s || 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

function Recorder({ value, onChange }) {
  const [state, setState] = useState('idle') // idle | asking | recording | saving
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const rec = useRef(null)
  const timer = useRef(null)
  const started = useRef(0)
  const stream = useRef(null)
  // Latest form value, so a recording that finishes doesn't overwrite edits made meanwhile.
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  const supported = typeof navigator.mediaDevices?.getUserMedia === 'function' && pickMime() !== null

  const cleanup = () => {
    clearInterval(timer.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => cleanup, [])

  const stop = () => {
    if (rec.current?.state === 'recording') rec.current.stop()
  }

  const start = async () => {
    setError('')
    setState('asking')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setState('idle')
      setError('Dearly couldn’t use the microphone. Check that it’s allowed for this site, or upload a recording instead.')
      return
    }
    const mimeType = pickMime()
    const chunks = []
    const recorder = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 })
    rec.current = recorder
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = async () => {
      const seconds = (Date.now() - started.current) / 1000
      cleanup()
      setState('saving')
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const audio = await blobToDataUrl(blob)
        if (audio.length > AUDIO_CHARS) throw new Error('too long')
        onChange({ ...valueRef.current, audio, duration: Math.round(seconds) })
      } catch {
        setError('That recording came out too large. Try a shorter one.')
      }
      setState('idle')
      setElapsed(0)
    }
    started.current = Date.now()
    recorder.start(250)
    setState('recording')
    timer.current = setInterval(() => {
      const s = (Date.now() - started.current) / 1000
      setElapsed(s)
      if (s >= MAX_SECONDS) stop()
    }, 200)
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!file.type.startsWith('audio/')) return setError('That file isn’t an audio file.')
    if (file.size > MAX_UPLOAD) return setError('That file is too large. Keep uploads under 400 KB (about 30–60 seconds).')
    const audio = await blobToDataUrl(file)
    const duration = await new Promise((resolve) => {
      const a = new Audio()
      a.preload = 'metadata'
      a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : 0)
      a.onerror = () => resolve(0)
      a.src = audio
    })
    onChange({ ...value, audio, duration })
  }

  const recording = state === 'recording'

  return (
    <div className="vc-recorder">
      <p className="field-label">Your recording</p>
      {value.audio && !recording ? (
        <div className="vc-recorded">
          <Player src={value.audio} duration={value.duration} />
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onChange({ ...value, audio: '', duration: 0 })}>
            Remove and record again
          </button>
        </div>
      ) : (
        <div className="vc-record-box">
          {supported ? (
            <>
              <button
                type="button"
                className={`vc-rec-btn${recording ? ' is-recording' : ''}`}
                onClick={recording ? stop : start}
                disabled={state === 'asking' || state === 'saving'}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
              >
                <span className="vc-rec-dot" aria-hidden="true" />
              </button>
              <div className="vc-rec-text" aria-live="polite">
                {recording ? (
                  <>
                    <strong>Recording</strong> {fmt(elapsed)} / {fmt(MAX_SECONDS)}
                  </>
                ) : state === 'asking' ? (
                  'Allow the microphone to start…'
                ) : state === 'saving' ? (
                  'Saving…'
                ) : (
                  <>Tap to record, up to {MAX_SECONDS} seconds.</>
                )}
              </div>
              {recording && (
                <div className="vc-rec-meter" aria-hidden="true">
                  <span style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }} />
                </div>
              )}
            </>
          ) : (
            <p className="vc-rec-text">This browser can’t record audio. You can still upload a recording.</p>
          )}
        </div>
      )}
      {!recording && !value.audio && (
        <label className="upload-link vc-upload">
          <input type="file" accept="audio/*" onChange={onFile} className="visually-hidden" />
          <span>or upload an audio file</span>
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function Form({ value, onChange }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <>
      <TextField label="Title" placeholder="Something I wanted you to hear" value={value.title} onChange={set('title')} max={LIMITS.title} />
      <div className="form-section">
        <Recorder value={value} onChange={onChange} />
      </div>
      <TextField
        label="A written note to go with it"
        hint="Optional"
        multiline
        rows={4}
        placeholder="Play this when you can’t sleep."
        value={value.note}
        onChange={set('note')}
        max={LIMITS.note}
      />
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={set('from')} max={LIMITS.from} />
    </>
  )
}

function Player({ src, duration: knownDuration, large = false }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(knownDuration || 0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onMeta = () => Number.isFinite(a.duration) && a.duration > 0 && setDuration(a.duration)
    const onTime = () => setTime(a.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setTime(0)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('durationchange', onMeta)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    return () => {
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('durationchange', onMeta)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
    }
  }, [src])

  const toggle = () => {
    const a = audioRef.current
    if (a.paused) a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  const total = duration || knownDuration || 0
  return (
    <div className={`vc-player${large ? ' vc-player-large' : ''}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className="vc-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6.5" y="5" width="4" height="14" rx="1" />
            <rect x="13.5" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
          </svg>
        )}
      </button>
      <div className="vc-track">
        <input
          type="range"
          className="vc-seek"
          min="0"
          max={total || 1}
          step="0.1"
          value={Math.min(time, total || 1)}
          aria-label="Position"
          aria-valuetext={`${fmt(time)} of ${fmt(total)}`}
          style={{ '--p': `${total ? (time / total) * 100 : 0}%` }}
          onChange={(e) => {
            const t = Number(e.target.value)
            audioRef.current.currentTime = t
            setTime(t)
          }}
        />
        <span className="vc-time">
          {fmt(time)} / {fmt(total)}
        </span>
      </div>
    </div>
  )
}

function View({ data }) {
  return (
    <div className="gv gv-voice">
      <p className="gv-kicker">Press play</p>
      <h1 className="gv-title">{data.title || 'Something I wanted you to hear'}</h1>
      <div className="vc-view-player">
        <Player src={data.audio} duration={data.duration} large />
      </div>
      {data.note && <p className="vc-note">{data.note}</p>}
      {data.from && <p className="gv-sign">— {data.from}</p>}
    </div>
  )
}

export default {
  type: 'voice',
  headline: 'Say it out loud instead.',
  viewTitle: 'A voice note for you',
  empty,
  clean,
  check,
  Form,
  View,
}
