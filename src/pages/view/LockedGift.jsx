import { useEffect, useState } from 'react'
import { CountdownClock } from '../../gifts/countdown'

export default function LockedGift({ unlockAt, serverNow, onRetry }) {
  const [anchor] = useState(() => ({ server: Date.parse(serverNow), local: performance.now() }))
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(unlockAt) - anchor.server))
  useEffect(() => {
    const tick = setInterval(() => {
      const left = Date.parse(unlockAt) - (anchor.server + performance.now() - anchor.local)
      setRemaining(Math.max(0, left))
    }, 1000)
    const retry = setInterval(onRetry, 15000)
    return () => { clearInterval(tick); clearInterval(retry) }
  }, [anchor, unlockAt, onRetry])
  return <div className="gv gv-countdown view-status">
    <p className="eyebrow">A little patience, a little surprise</p>
    <h1 className="gv-title">Something is waiting for you.</h1>
    <CountdownClock milliseconds={remaining} />
    <p>Opens {new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(unlockAt))} · Manila time</p>
    <button type="button" className="btn btn-line" onClick={onRetry}>{remaining === 0 ? 'Check if it is time' : 'Check again'}</button>
    <p className="form-note">The gift opens when Dearly’s server reaches this time.</p>
  </div>
}
