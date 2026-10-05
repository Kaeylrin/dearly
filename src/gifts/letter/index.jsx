import { TextField } from '../../components/ui/fields'
import { text } from '../../lib/validate'
import './letter.css'

const LIMITS = { to: 60, body: 6000, closing: 60, from: 60 }

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { closing: 'Always,' }

function empty() {
  return { to: '', body: '', closing: '', from: '' }
}

function clean(d = {}) {
  return {
    to: text(d.to, LIMITS.to),
    body: text(d.body, LIMITS.body),
    closing: text(d.closing, LIMITS.closing),
    from: text(d.from, LIMITS.from),
  }
}

function check(d) {
  if (!d.body.trim()) return 'Write a few words first. Even a short letter counts.'
  return null
}

function Form({ value, onChange }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v })
  return (
    <>
      <TextField label="Who it’s for" placeholder="My love" value={value.to} onChange={set('to')} max={LIMITS.to} hint="Shown as “To …,”" />
      <TextField
        label="Your letter"
        multiline
        inputClassName="textarea-letter"
        placeholder="Start anywhere. You can always come back and change it."
        value={value.body}
        onChange={set('body')}
        max={LIMITS.body}
      />
      <div className="field-row">
        <TextField label="Closing" placeholder="Always," value={value.closing} onChange={set('closing')} max={LIMITS.closing} />
        <TextField label="From" placeholder="Your name" value={value.from} onChange={set('from')} max={LIMITS.from} />
      </div>
    </>
  )
}

export function LetterSheet({ data }) {
  const paragraphs = data.body.split(/\n{2,}/).filter((p) => p.trim())
  return (
    <article className="letter-sheet">
      {data.to.trim() && <p className="letter-to">To {data.to.trim()},</p>}
      <div className="letter-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {(data.closing.trim() || data.from.trim()) && (
        <footer className="letter-sign">
          {data.closing.trim() && <span>{data.closing.trim()}</span>}
          {data.from.trim() && <span className="letter-from">{data.from.trim()}</span>}
        </footer>
      )}
    </article>
  )
}

function View({ data }) {
  return (
    <div className="gv gv-letter">
      <LetterSheet data={data} />
    </div>
  )
}

export default {
  type: 'letter',
  headline: 'Say it the way you’d say it in person.',
  viewTitle: 'A letter for you',
  empty,
  retiredDefaults,
  clean,
  check,
  Form,
  View,
}
