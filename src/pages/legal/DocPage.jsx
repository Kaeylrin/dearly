import { useTitle } from '../../hooks/useTitle'
import './legal.css'

export default function DocPage({ title, meta, intro, children }) {
  useTitle(`${title} · Dearly`)
  return (
    <article className="doc wrap wrap-narrow">
      <header className="doc-head">
        <p className="eyebrow">Dearly</p>
        <h1>{title}</h1>
        {meta && <p className="doc-meta">{meta}</p>}
        {intro && <p className="doc-intro">{intro}</p>}
      </header>
      <div className="doc-body">{children}</div>
    </article>
  )
}
