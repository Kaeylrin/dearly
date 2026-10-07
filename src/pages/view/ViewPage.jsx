import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Link from '../../components/ui/Link'
import Loader from '../../components/ui/Loader'
import { useSplashHold } from '../../lib/splash'
import { decodePayload, fetchGift } from '../../lib/giftStore'
import { useTitle } from '../../hooks/useTitle'
import './ViewPage.css'

/* Opens a shared gift link: load (database, or an older self-contained link), clean, check, then hand off to the gift's own view. */
export default function ViewPage({ gift }) {
  const { id } = useParams()
  const { hash } = useLocation()
  const [state, setState] = useState({ status: 'loading' })

  useTitle(gift.viewTitle || 'Something for you')
  // Opened fresh from a shared link: keep the splash up until the gift has loaded.
  useSplashHold(state.status === 'loading')

  useEffect(() => {
    let cancelled = false
    const load = hash.length > 1 ? decodePayload(hash) : fetchGift(id)
    load
      .then((res) => {
        if (cancelled) return
        if (res.type !== gift.type) throw new Error('type')
        const data = gift.clean(res.data)
        if (gift.check(data)) throw new Error('incomplete')
        setState({ status: 'ready', data })
      })
      .catch((err) => !cancelled && setState({ status: 'error', reason: err?.reason }))
    return () => {
      cancelled = true
    }
  }, [hash, id, gift])

  if (state.status === 'loading') {
    return <Loader label="Opening…" />
  }

  if (state.status === 'error' && state.reason === 'network') {
    return (
      <div className="view-status view-missing">
        <h1>We couldn’t open this just now.</h1>
        <p>Check your connection and try again in a moment.</p>
        <button type="button" className="text-link" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  if (state.status === 'error' && !hash) {
    return (
      <div className="view-status view-missing">
        <h1>We couldn’t find this gift.</h1>
        <p>The link may have a typo in it. Ask for the link again, and make sure the whole thing gets pasted.</p>
        <Link to="/" className="text-link">
          Go to Dearly
        </Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="view-status view-missing">
        <h1>This link didn’t come through whole.</h1>
        <p>
          Part of it may have been cut off when it was copied or sent. Ask for the link again, and make sure the whole thing gets
          pasted, including everything after the <strong>#</strong>.
        </p>
        <Link to="/" className="text-link">
          Go to Dearly
        </Link>
      </div>
    )
  }

  const View = gift.View
  return <View data={state.data} id={id} />
}
