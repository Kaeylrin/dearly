import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Link from '../ui/Link'
import Logo from '../brand/Logo'
import ThemeToggle from '../ui/ThemeToggle'
import { catalog } from '../../gifts/catalog'
import { preloadGift } from '../../gifts/registry'
import './Nav.css'

/*
 * Floating pill navigation. It narrows slightly once the page scrolls; the
 * state comes from an IntersectionObserver on a sentinel at the top of the
 * page, so there's no scroll handler running on every frame.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const headerRef = useRef(null)
  const menuBtnRef = useRef(null)

  useEffect(() => {
    const sentinel = document.getElementById('scroll-sentinel')
    if (!sentinel) return
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  // Close the mobile menu whenever the route changes (adjusting state during render).
  const [routeKey, setRouteKey] = useState(location.key)
  if (routeKey !== location.key) {
    setRouteKey(location.key)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    const onPointer = (e) => {
      if (!headerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  // Close if the viewport grows past the mobile breakpoint while open.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 761px)')
    const onChange = (e) => e.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isActive = (path) => location.pathname === path

  return (
    <header
      ref={headerRef}
      className={`site-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}
    >
      <nav className="nav-pill" aria-label="Main">
        <Link to="/" className="nav-logo" aria-label="Dearly, home">
          <Logo />
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/#gifts">Gifts</Link>
          </li>
          <li>
            <Link to="/changelog" aria-current={isActive('/changelog') ? 'page' : undefined}>
              Changelogs
            </Link>
          </li>
        </ul>

        <div className="nav-actions">
          <ThemeToggle />
          <Link to="/letter/new" className="btn btn-primary btn-sm nav-cta" onPointerEnter={() => preloadGift('letter')}>
            Write a letter
          </Link>
          <button
            ref={menuBtnRef}
            type="button"
            className="icon-btn nav-menu-btn"
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path className="bar bar-top" d="M5 9h14" />
              <path className="bar bar-bottom" d="M5 15h14" />
            </svg>
          </button>
        </div>
      </nav>

      <div id="nav-menu" className="nav-menu" hidden={!open}>
        <p className="eyebrow nav-menu-label">Make something</p>
        <ul className="nav-menu-gifts">
          {catalog.map((g) => (
            <li key={g.type}>
              <Link to={`/${g.type}/new`} onPointerEnter={() => preloadGift(g.type)} onFocus={() => preloadGift(g.type)}>
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="nav-menu-meta">
          <li>
            <Link to="/changelog">Changelogs</Link>
          </li>
          <li>
            <Link to="/privacy">Privacy</Link>
          </li>
          <li>
            <Link to="/terms">Terms</Link>
          </li>
        </ul>
      </div>
    </header>
  )
}
