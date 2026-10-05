import Link from '../../components/ui/Link'
import { catalog } from '../../gifts/catalog'
import { preloadGift } from '../../gifts/registry'
import { useTitle } from '../../hooks/useTitle'
import { useReveal } from '../../hooks/useReveal'
import { previews } from './previews'
import './Home.css'

export default function Home() {
  useTitle('Dearly')
  const listRef = useReveal()
  const headRef = useReveal()

  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy rise">
          <h1 id="hero-title" className="hero-title">
            When you don’t know <em className="mark">what to give her.</em>
          </h1>
          <p className="hero-sub">Make something in a few minutes, then send the link. She opens it, <span className="mark-soft">no account, no app.</span></p>
          <Link to="/#gifts" className="btn btn-primary hero-cta">
            Start creating
          </Link>
        </div>
        <div className="hero-art rise" aria-hidden="true">
          <div className="mock">
            <p className="mock-to">To you,</p>
            <span className="mock-ln" />
            <span className="mock-ln" />
            <span className="mock-ln" />
            <span className="mock-ln" />
            <p className="mock-sign">— every month, dearly.</p>
          </div>
        </div>
      </section>

      <section id="gifts" className="gifts wrap" aria-labelledby="gifts-title">
        <div className="gifts-head" ref={headRef} data-reveal>
          <h2 id="gifts-title" className="eyebrow">
            What you can make
          </h2>
          <span className="gifts-count" aria-hidden="true">
            {String(catalog.length).padStart(2, '0')}
          </span>
        </div>
        <ol className="gift-list" ref={listRef} data-reveal="stagger">
          {catalog.map((g, i) => (
            <li key={g.type}>
              <Link
                to={`/${g.type}/new`}
                className="gift-row"
                onPointerEnter={() => preloadGift(g.type)}
                onFocus={() => preloadGift(g.type)}
              >
                <span className="gift-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="gift-title">
                  {g.title}
                  <span className="gift-arrow" aria-hidden="true">
                    →
                  </span>
                </h3>
                <p className="gift-desc">{g.blurb}</p>
                <span className="gift-aside">{previews[g.type]}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
