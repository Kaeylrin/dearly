import Link from '../../components/ui/Link'
import { useTitle } from '../../hooks/useTitle'
import './NotFound.css'

export default function NotFound() {
  useTitle('Not found · Dearly')
  return (
    <div className="not-found wrap wrap-narrow">
      <p className="eyebrow">404</p>
      <h1>There’s nothing here.</h1>
      <p className="not-found-text">The page may have moved, or the link was typed slightly wrong.</p>
      <Link to="/" className="btn btn-primary">
        Back to Dearly
      </Link>
    </div>
  )
}
