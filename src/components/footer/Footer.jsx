import Link from '../ui/Link'
import Logo from '../brand/Logo'
import './Footer.css'

const VERSION = 'v1.1.0'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-close">
          <p className="footer-line">
            When you don’t know what to give her, Dearly helps you create <em className="mark">something meaningful.</em>
          </p>
          <Link to="/letter/new" className="text-link footer-start">
            Start with a letter <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="footer-base">
          <Link to="/" className="footer-logo" aria-label="Dearly, home">
            <Logo />
          </Link>
          <nav aria-label="Footer">
            <ul className="footer-links">
              <li>
                <Link to="/changelog">Changelogs</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
              <li>
                <Link to="/terms">Terms</Link>
              </li>
              <li>
                <Link to="/changelog" className="footer-version" aria-label={`Version ${VERSION}, see changelogs`}>
                  {VERSION}
                </Link>
              </li>
            </ul>
          </nav>
          <p className="footer-credit">
            <span className="footer-credit-by">
              Created by Wrenier
              <svg className="footer-heart" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="with love">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            <span className="footer-dot" aria-hidden="true">·</span>
            <span>Copyright © 2026. All rights reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
