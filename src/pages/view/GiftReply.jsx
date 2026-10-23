import { useState } from 'react'
import { giftEvent } from '../../lib/giftStore'
import { TextField } from '../../components/ui/fields'

export default function GiftReply({ id }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  return <form className="gift-reply" onSubmit={async (e) => {
    e.preventDefault()
    if (!message.trim() || state === 'sending') return
    setState('sending'); setError('')
    try { await giftEvent(id, 'reply', message); setState('sent'); setMessage('') } catch (err) { setError(err.message); setState('idle') }
  }}>
    <h2 className="form-section-title">Send a little something back</h2>
    <p className="form-note">No account needed. Your reply is saved for the sender to read through their private edit link.</p>
    <TextField label="Your reply or emoji" multiline rows={3} max={500} value={message} onChange={(v) => { setMessage(v); setState('idle') }} />
    <button className="btn btn-line" disabled={state === 'sending' || !message.trim()}>{state === 'sending' ? 'Sending…' : 'Send reply'}</button>
    <p role="status">{state === 'sent' ? 'Your reply is waiting for them. Thank you.' : error}</p>
  </form>
}
