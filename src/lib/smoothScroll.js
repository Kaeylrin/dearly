import Lenis from 'lenis'

/*
 * Smooth, eased wheel scrolling (and smooth jumps to anchors) via Lenis.
 * Off for people who ask for reduced motion and on touch-first devices,
 * whose native scrolling is already smooth. Elsewhere code calls
 * `scrollToTarget` and gets the right behaviour either way.
 */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const touchFirst = window.matchMedia('(hover: none), (pointer: coarse)').matches

const lenis =
  !reduced && !touchFirst
    ? new Lenis({
        duration: 1.1,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        wheelMultiplier: 1,
        // Let scrollable boxes (long textareas, anything marked) scroll on their own.
        prevent: (node) => node.tagName === 'TEXTAREA' || node.hasAttribute?.('data-lenis-prevent'),
      })
    : null

if (lenis) {
  document.documentElement.classList.add('lenis-on')
  const raf = (time) => {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)
}

/* target: an element or a y position. smooth=false jumps instantly. */
export function scrollToTarget(target, { smooth = true } = {}) {
  if (lenis) {
    // Lenis already honours scroll-padding-top (base.css), which clears the floating nav.
    lenis.scrollTo(target, { immediate: !smooth, force: true })
    return
  }
  const behavior = smooth ? 'smooth' : 'instant'
  if (typeof target === 'number') window.scrollTo({ top: target, behavior })
  else target.scrollIntoView({ behavior })
}
