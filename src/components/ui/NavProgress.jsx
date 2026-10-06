import { useEffect, useState } from 'react'
import { useNavigation } from 'react-router-dom'
import './NavProgress.css'

/*
 * Thin bar along the top while a page is loading (gift pages load on demand).
 * Only shows if loading takes longer than a moment.
 */
export default function NavProgress() {
  const busy = useNavigation().state !== 'idle'
  const [phase, setPhase] = useState('idle') // idle | loading | done

  useEffect(() => {
    if (busy) {
      const t = setTimeout(() => setPhase('loading'), 120)
      return () => clearTimeout(t)
    }
    // Finish the bar before hiding it, but only if it was showing. This effect exists to drive that animation.
    // oxlint-disable-next-line react/set-state-in-effect
    setPhase((p) => (p === 'loading' ? 'done' : 'idle'))
    const t = setTimeout(() => setPhase('idle'), 400)
    return () => clearTimeout(t)
  }, [busy])

  return <div className={`nav-progress is-${phase}`} aria-hidden="true" />
}
