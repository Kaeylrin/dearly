import { Outlet, useLocation } from 'react-router-dom'
import Nav from '../components/nav/Nav'
import Footer from '../components/footer/Footer'
import './SiteLayout.css'

/* Landing page, creator pages, legal pages: nav, content, footer. */
export default function SiteLayout() {
  const { pathname } = useLocation()
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div id="scroll-sentinel" aria-hidden="true" />
      <Nav />
      <main id="main" className="site-main">
        <div className="page" key={pathname}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  )
}
