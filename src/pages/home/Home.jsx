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
        {/* Floating cards in the hero's corners, each a glimpse of something Dearly makes. */}
        <div className="floaters" aria-hidden="true">
          <div className="floater floater-tl">
            <span className="floater-label">Until our day</span>
            <span className="floater-time">12:04:37</span>
          </div>
          <div className="floater floater-tr">
            <span className="floater-bouquet">{previews.bouquet}</span>
          </div>
          <div className="floater floater-bl floater-pill">
            <svg className="floater-heart" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 14s-5.5-3.4-5.5-7.4A3 3 0 0 1 8 4.7a3 3 0 0 1 5.5 1.9C13.5 10.6 8 14 8 14z" />
            </svg> 31 reasons why
          </div>
          <div className="floater floater-br floater-pill">
            <span className="floater-mail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <rect x="3" y="5.5" width="18" height="13" rx="2" />
                <path d="M3.6 6.6l8.4 6.6 8.4-6.6" />
                <path
                  d="M12 16.6s-2.6-1.6-2.6-3.5A1.35 1.35 0 0 1 12 12.4a1.35 1.35 0 0 1 2.6.7c0 1.9-2.6 3.5-2.6 3.5z"
                  fill="currentColor"
                  stroke="var(--paper)"
                  strokeWidth="1"
                />
              </svg>
            </span> Sent to her inbox
          </div>
        </div>
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
