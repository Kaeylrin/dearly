import { useEffect, useRef } from 'react'
import { appReady } from '../lib/splash'

/*
 * Reveals an element (data-reveal) or each child of a list (data-reveal="stagger")
 * as it scrolls into view. Items that arrive together cascade slightly.
 * Styles live in styles/motion.css.
 */
export function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const stagger = el.dataset.reveal === 'stagger'
    const targets = stagger ? Array.from(el.children) : [el]

    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-revealed'))
      if (stagger) el.classList.add('is-revealed')
      return
    }

    let io
    let cancelled = false
    appReady.then(() => {
      if (cancelled) return
      io = new IntersectionObserver(
        (entries) => {
          let n = 0
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.style.transitionDelay = `${n++ * 70}ms`
            entry.target.classList.add('is-revealed')
            io.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
      )
      targets.forEach((t) => io.observe(t))
    })

    return () => {
      cancelled = true
      io?.disconnect()
    }
  }, [])

  return ref
}
