import { useEffect, useState } from 'react'
import './Loader.css'

/*
 * Quiet loading state: a short line drawing itself, with a label.
 * It waits `delay` ms before appearing, so fast loads never flash it.
 */
export default function Loader({ label = 'Loading…', delay = 160, className = '' }) {
  const [visible, setVisible] = useState(delay === 0)

  useEffect(() => {
    if (delay === 0) return
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className={`loader ${className}`} role="status" aria-live="polite">
      {visible && (
        <>
          <span className="loader-line" aria-hidden="true" />
          <span className="loader-label">{label}</span>
        </>
      )}
    </div>
  )
}
