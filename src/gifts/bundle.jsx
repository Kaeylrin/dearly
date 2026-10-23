import { useRef, useState } from 'react'
import { TextField } from '../components/ui/fields'
import { text } from '../lib/validate'
import { catalogByType } from './catalog'
import './bundle.css'

// A bundle embeds existing gifts in order; it never nests bundles or exposes edit keys.
export default function makeBundle(modules) {
  const types = Object.keys(modules)
  const item = (type) => ({ type, data: modules[type].empty() })
  const empty = () => ({ title: '', items: [item('letter'), item('bouquet')] })
  const clean = (data = {}) => ({
    title: text(data.title, 80),
    items: (Array.isArray(data.items) ? data.items : []).slice(0, 8)
      .filter((entry) => entry && types.includes(entry.type))
      .map((entry) => ({ type: entry.type, data: modules[entry.type].clean(entry.data) })),
  })
  const finalize = (data) => ({ ...data, items: data.items.map((entry) => ({ ...entry, data: modules[entry.type].finalize?.(entry.data) || entry.data })) })
  const check = (data) => {
    if (data.items.length < 2) return 'Add at least two gifts to your bundle.'
    for (const [i, entry] of data.items.entries()) {
      const error = modules[entry.type].check(entry.data)
      if (error) return `Gift ${i + 1}: ${error}`
    }
    return null
  }
  function Form({ value, onChange }) {
    const [active, setActive] = useState(0)
    const current = Math.min(active, value.items.length - 1)
    const entry = value.items[current]
    const Editor = entry && modules[entry.type].Form
    const replaceItems = (items) => { onChange({ ...value, items }); setActive(Math.min(active, items.length - 1)) }
    const move = (i, by) => {
      const items = [...value.items]
      ;[items[i], items[i + by]] = [items[i + by], items[i]]
      replaceItems(items); setActive(i + by)
    }
    return <div className="bundle-builder">
      <TextField label="Bundle title" value={value.title} max={80} onChange={(title) => onChange({ ...value, title })} placeholder="A few little things, just for you" />
      <p className="form-note">Choose gifts below to edit each one. They open in this order.</p>
      <ol className="bundle-list">{value.items.map((part, i) => <li key={i}>
        <button type="button" className="btn btn-line btn-sm" aria-pressed={active === i} onClick={() => setActive(i)}>{i + 1}. {catalogByType[part.type].title}</button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={i === 0} aria-label={`Move gift ${i + 1} earlier`} onClick={() => move(i, -1)}>↑</button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={i === value.items.length - 1} aria-label={`Move gift ${i + 1} later`} onClick={() => move(i, 1)}>↓</button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={value.items.length <= 2} aria-label={`Remove gift ${i + 1}`} onClick={() => replaceItems(value.items.filter((_, j) => j !== i))}>Remove</button>
      </li>)}</ol>
      <label className="field"><span className="field-label">Add another gift</span><select className="select" value="" disabled={value.items.length >= 8} onChange={(e) => {
        if (!modules[e.target.value]) return
        replaceItems([...value.items, item(e.target.value)]); setActive(value.items.length)
      }}><option value="">Choose a gift (up to eight)</option>{types.map((type) => <option key={type} value={type}>{catalogByType[type].title}</option>)}</select></label>
      {entry && <section className="bundle-editor"><h2 className="form-section-title">Gift {current + 1}: {catalogByType[entry.type].title}</h2><Editor key={`${current}-${entry.type}`} value={entry.data} onChange={(data) => onChange({ ...value, items: value.items.map((part, i) => i === current ? { ...part, data } : part) })} /></section>}
    </div>
  }
  function View({ data, preview }) {
    const [active, setActive] = useState(0)
    const viewRef = useRef(null)
    const navigate = (next) => {
      viewRef.current?.querySelectorAll('audio').forEach((audio) => audio.pause())
      setActive(next)
    }
    return <div className="bundle-view" ref={viewRef}>
      {data.title && <h1 className="gv-title">{data.title}</h1>}
      <p className="eyebrow" aria-live="polite">Gift {active + 1} of {data.items.length}</p>
      {data.items.map((entry, i) => {
        const GiftView = modules[entry.type].View
        return <div key={i} hidden={active !== i}><GiftView data={entry.data} preview={preview} /></div>
      })}
      <nav className="bundle-navigation" aria-label="Gifts in this bundle"><button type="button" className="btn btn-line" disabled={active === 0} onClick={() => navigate(active - 1)}>Previous gift</button><button type="button" className="btn btn-primary" disabled={active >= data.items.length - 1} onClick={() => navigate(active + 1)}>Next gift</button></nav>
    </div>
  }
  return { type: 'bundle', headline: 'A few little things, one lovely link.', viewTitle: 'A bundle for you', empty, clean, finalize, check, Form, View }
}
