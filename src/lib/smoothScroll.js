/* Native wheel/touch scrolling; animate only explicit jumps to a target. */
export function scrollToTarget(target, { smooth = true } = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior = smooth && !reduced ? 'smooth' : 'instant'
  if (typeof target === 'number') window.scrollTo({ top: target, behavior })
  else target.scrollIntoView({ behavior })
}
