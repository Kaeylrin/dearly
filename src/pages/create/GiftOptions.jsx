import { TextField } from '../../components/ui/fields'
import { instantToManila, manilaToInstant } from '../../lib/giftSettings'
import { hasBackend } from '../../lib/supabase'

export default function GiftOptions({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  if (!hasBackend) return <p className="form-note">Scheduling, replies and opened notices need a connected database.</p>
  return <fieldset className="gift-options">
    <legend className="form-section-title">When it opens, and what comes back</legend>
    <TextField label="Unlock date and time" hint="Optional · Manila time (UTC+8)" type="datetime-local" value={instantToManila(value.unlockAt)} onChange={(v) => set({ unlockAt: manilaToInstant(v) })} />
    <p className="form-note">Leave blank to open immediately. The server keeps the gift locked until this time.</p>
    <label className="check"><input type="checkbox" checked={value.allowReplies} onChange={(e) => set({ allowReplies: e.target.checked })} /><span>Let them reply<small>Read short messages or emoji through your private edit link.</small></span></label>
    <label className="check"><input type="checkbox" checked={value.notifyOpened} onChange={(e) => set({ notifyOpened: e.target.checked, senderEmail: e.target.checked ? value.senderEmail : '' })} /><span>Tell me when it's opened<small>The recipient will see that opening sends you a notice.</small></span></label>
    {value.notifyOpened && <TextField label="Your email for the opened notice" type="email" value={value.senderEmail} max={254} onChange={(senderEmail) => set({ senderEmail })} />}
  </fieldset>
}
