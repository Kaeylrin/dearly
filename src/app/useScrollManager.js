import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { scrollToTarget } from '../lib/smoothScroll'

const isAnchor = (id) => id && id.length < 40 && /^[a-z][\w-]*$/i.test(id)

/*
 * One place that decides how the page scrolls after a navigation:
 * - same page (logo on the home page, "Gifts", "Start creating"): smooth scroll
 *   to the anchor, or to the top
 * - new page: jump instantly (the page transition covers it) to the anchor or top
 * - back/forward: return to where you were on that page
 */
export function useScrollManager() {
  const { pathname, hash, key } = useLocation()
  const navType = useNavigationType()
  const prevPath = useRef(pathname)
  const positions = useRef(new Map())
  const currentKey = useRef(key)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => positions.current.set(currentKey.current, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Layout effect: runs before paint, so new pages never flash at the old scroll position.
  useLayoutEffect(() => {
    currentKey.current = key
    const samePage = prevPath.current === pathname
    prevPath.current = pathname
    const id = hash.slice(1)
    const target = isAnchor(id) ? document.getElementById(id) : null

    if (navType === 'POP' && !samePage) {
      scrollToTarget(positions.current.get(key) ?? 0, { smooth: false })
      return
    }
    if (samePage) {
      if (target) scrollToTarget(target)
      else if (!id) scrollToTarget(0)
      return
    }
    if (target) scrollToTarget(target, { smooth: false })
    else scrollToTarget(0, { smooth: false })
  }, [pathname, hash, key, navType])
}
