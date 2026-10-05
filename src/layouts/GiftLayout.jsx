import { Outlet } from 'react-router-dom'
import Link from '../components/ui/Link'
import Logo from '../components/brand/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import './GiftLayout.css'

/* What the recipient sees: the gift, and almost nothing else. */
export default function GiftLayout() {
  return (
    <>
      <div className="gift-corner">
        <ThemeToggle />
      </div>
      <main id="main" className="gift-main">
        <Outlet />
      </main>
      <footer className="gift-footer">
        <Link to="/" className="gift-footer-link">
          Made with <Logo className="gift-footer-logo" />
        </Link>
      </footer>
    </>
  )
}
