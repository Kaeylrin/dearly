import { useState } from 'react'
import { fetchReplies } from '../../lib/giftStore'

export default function ReplyInbox({ saved }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const refresh = async () => {
    setStatus('Checking…')
    try {
      const replies = await fetchReplies(saved.id, saved.token)
      setRows(replies)
      setStatus(replies.length ? '' : 'No replies yet.')
    } catch { setStatus('Could not load replies. Try again.') }
  }
  return <section className="gift-options" aria-label="Replies">
    <h2 className="form-section-title">Replies to this gift</h2>
    <button type="button" className="btn btn-line btn-sm" onClick={refresh}>Check replies</button>
    <p role="status">{status}</p>
    {rows.map((row) => <blockquote key={row.id}><p>{row.message}</p><small>{new Date(row.created_at).toLocaleString()}</small></blockquote>)}
  </section>
}
