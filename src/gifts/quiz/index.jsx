import { useRef, useState } from 'react'
import { AddButton, RemoveButton, TextField } from '../../components/ui/fields'
import { int, list, text } from '../../lib/validate'
import './quiz.css'

const MAX_QUESTIONS = 10
const MAX_OPTIONS = 4
const LIMITS = { title: 80, q: 160, option: 80, outro: 300, from: 60 }

/* Text that used to come pre-filled; cleared from drafts saved back then. */
const retiredDefaults = { title: 'How well do you know me?' }

const blankQuestion = () => ({ q: '', options: ['', ''], answer: 0 })

function empty() {
  return { title: '', questions: [blankQuestion()], outro: '', from: '' }
}

function clean(d = {}) {
  const questions = list(d.questions, MAX_QUESTIONS).map((q = {}) => {
    const options = list(q.options, MAX_OPTIONS).map((o) => text(o, LIMITS.option))
    while (options.length < 2) options.push('')
    return { q: text(q.q, LIMITS.q), options, answer: int(q.answer, 0, options.length - 1, 0) }
  })
  return {
    title: text(d.title, LIMITS.title),
    questions: questions.length ? questions : [blankQuestion()],
    outro: text(d.outro, LIMITS.outro),
    from: text(d.from, LIMITS.from),
  }
}

/* Drops untouched questions and empty options, keeping the right answer pointed at the right option. */
function finalize(d) {
  const questions = d.questions
    .filter((q) => q.q.trim())
    .map((q) => {
      const kept = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o)
      const answer = kept.findIndex((x) => x.i === q.answer) // -1 if the ticked answer was left blank
      return { q: q.q.trim(), options: kept.map((x) => x.o), answer }
    })
  return { ...d, questions }
}

function check(d) {
  if (!d.questions.length) return 'Write at least one question.'
  for (let i = 0; i < d.questions.length; i++) {
    const q = d.questions[i]
    if (q.options.filter(Boolean).length < 2) return `Question ${i + 1} needs at least two answers.`
    if (q.answer < 0 || !q.options[q.answer]) return `Mark the right answer for question ${i + 1}.`
  }
  return null
}

function Form({ value, onChange }) {
  const setQ = (i, patch) => onChange({ ...value, questions: value.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
  const removeQ = (i) =>
    onChange({ ...value, questions: value.questions.length > 1 ? value.questions.filter((_, j) => j !== i) : [blankQuestion()] })
  const setOption = (qi, oi, v) => setQ(qi, { options: value.questions[qi].options.map((o, j) => (j === oi ? v : o)) })
  const removeOption = (qi, oi) => {
    const q = value.questions[qi]
    const options = q.options.filter((_, j) => j !== oi)
    const answer = q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer
    setQ(qi, { options, answer })
  }

  return (
    <>
      <TextField label="Title" placeholder="How well do you know me?" value={value.title} onChange={(v) => onChange({ ...value, title: v })} max={LIMITS.title} />
      <div className="form-section">
        <h2 className="form-section-title">Questions</h2>
        <ol className="repeat-list">
          {value.questions.map((q, qi) => (
            <li className="repeat-item" key={qi}>
              <span className="repeat-num">{qi + 1}</span>
              <div className="repeat-body">
                <label className="visually-hidden" htmlFor={`q-${qi}`}>
                  Question {qi + 1}
                </label>
                <input
                  id={`q-${qi}`}
                  className="input qz-q-input"
                  placeholder={qi === 0 ? 'Where did we have our first date?' : 'Another question'}
                  value={q.q}
                  maxLength={LIMITS.q}
                  onChange={(e) => setQ(qi, { q: e.target.value })}
                />
                <fieldset className="qz-options">
                  <legend className="field-hint">Answers, tick the right one</legend>
                  {q.options.map((o, oi) => (
                    <div className="qz-option" key={oi}>
                      <input
                        type="radio"
                        name={`answer-${qi}`}
                        checked={q.answer === oi}
                        onChange={() => setQ(qi, { answer: oi })}
                        aria-label={`Answer ${oi + 1} is correct`}
                      />
                      <input
                        className="input"
                        placeholder={`Answer ${oi + 1}`}
                        value={o}
                        maxLength={LIMITS.option}
                        aria-label={`Answer ${oi + 1} for question ${qi + 1}`}
                        onChange={(e) => setOption(qi, oi, e.target.value)}
                      />
                      {q.options.length > 2 && <RemoveButton onClick={() => removeOption(qi, oi)} label={`Remove answer ${oi + 1}`} />}
                    </div>
                  ))}
                  {q.options.length < MAX_OPTIONS && (
                    <AddButton onClick={() => setQ(qi, { options: [...q.options, ''] })}>Add an answer</AddButton>
                  )}
                </fieldset>
              </div>
              <RemoveButton onClick={() => removeQ(qi)} label={`Remove question ${qi + 1}`} />
            </li>
          ))}
        </ol>
        <AddButton
          onClick={() => onChange({ ...value, questions: [...value.questions, blankQuestion()] })}
          disabled={value.questions.length >= MAX_QUESTIONS}
        >
          Add a question
        </AddButton>
      </div>
      <TextField
        label="Message at the end"
        hint="Optional"
        multiline
        rows={3}
        placeholder="However you scored, you still win me."
        value={value.outro}
        onChange={(v) => onChange({ ...value, outro: v })}
        max={LIMITS.outro}
      />
      <TextField label="From" hint="Optional" placeholder="Your name" value={value.from} onChange={(v) => onChange({ ...value, from: v })} max={LIMITS.from} />
    </>
  )
}

function verdict(score, total) {
  const r = score / total
  if (r === 1) return 'Every single one.'
  if (r >= 0.7) return 'You know me well.'
  if (r >= 0.4) return 'Not bad at all.'
  return 'We have some catching up to do.'
}

function View({ data }) {
  const { questions } = data
  const [index, setIndex] = useState(-1) // -1 intro, questions.length = results
  const [answers, setAnswers] = useState([])
  const headingRef = useRef(null)

  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus())
  const go = (i) => {
    setIndex(i)
    focusHeading()
  }
  const restart = () => {
    setAnswers([])
    go(0)
  }

  if (index === -1) {
    return (
      <div className="gv gv-quiz">
        <p className="gv-kicker">{questions.length === 1 ? 'One question' : `${questions.length} questions`}</p>
        <h1 className="gv-title">{data.title || 'How well do you know me?'}</h1>
        <div className="qz-start">
          <button type="button" className="btn btn-primary" onClick={() => go(0)}>
            Start
          </button>
        </div>
      </div>
    )
  }

  if (index >= questions.length) {
    const score = answers.filter((a, i) => a === questions[i].answer).length
    return (
      <div className="gv gv-quiz">
        <p className="gv-kicker">{verdict(score, questions.length)}</p>
        <h1 className="gv-title qz-score" tabIndex={-1} ref={headingRef}>
          {score} of {questions.length}
        </h1>
        {data.outro && <p className="qz-outro">{data.outro}</p>}
        {data.from && <p className="gv-sign">— {data.from}</p>}
        <ol className="qz-review">
          {questions.map((q, i) => {
            const right = answers[i] === q.answer
            return (
              <li key={i} className={right ? 'is-right' : 'is-wrong'}>
                <p className="qz-review-q">{q.q}</p>
                <p className="qz-review-a">
                  {right ? 'You said' : 'Answer'}: {q.options[q.answer]}
                  {!right && answers[i] != null && <span> · you said {q.options[answers[i]]}</span>}
                </p>
              </li>
            )
          })}
        </ol>
        <div className="qz-start">
          <button type="button" className="btn btn-line" onClick={restart}>
            Play again
          </button>
        </div>
      </div>
    )
  }

  const q = questions[index]
  const chosen = answers[index]
  const answered = chosen != null
  const choose = (oi) => {
    if (answered) return
    const next = [...answers]
    next[index] = oi
    setAnswers(next)
  }

  return (
    <div className="gv gv-quiz">
      <p className="gv-kicker">
        {index + 1} of {questions.length}
      </p>
      <div className="qz-progress" aria-hidden="true">
        <span style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <h1 className="qz-question" tabIndex={-1} ref={headingRef} key={index}>
        {q.q}
      </h1>
      <ul className="qz-answers">
        {q.options.map((o, oi) => {
          let state = ''
          if (answered && oi === q.answer) state = ' is-right'
          else if (answered && oi === chosen) state = ' is-wrong'
          return (
            <li key={oi}>
              <button type="button" className={`qz-answer${state}`} onClick={() => choose(oi)} aria-disabled={answered} aria-pressed={chosen === oi}>
                <span className="qz-letter" aria-hidden="true">
                  {String.fromCharCode(65 + oi)}
                </span>
                <span>{o}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="qz-feedback" aria-live="polite">
        {answered && <p>{chosen === q.answer ? 'That’s right.' : `Not quite. It was “${q.options[q.answer]}”.`}</p>}
      </div>
      <div className="qz-start">
        <button type="button" className="btn btn-primary" onClick={() => go(index + 1)} disabled={!answered}>
          {index + 1 === questions.length ? 'See how you did' : 'Next question'}
        </button>
      </div>
    </div>
  )
}

export default {
  type: 'quiz',
  headline: 'How well does she know you?',
  viewTitle: 'A little quiz',
  empty,
  retiredDefaults,
  clean,
  finalize,
  check,
  Form,
  View,
}
