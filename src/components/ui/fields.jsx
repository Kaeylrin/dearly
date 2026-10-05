import { useId } from 'react'

/* Text input or textarea with a label, optional hint, and a character count near the limit. */
export function TextField({
  label,
  hint,
  value,
  onChange,
  max,
  multiline = false,
  className = '',
  inputClassName = '',
  showCount,
  ...rest
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const count = value?.length || 0
  const countVisible = showCount ?? (max && count > max * 0.7)
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>
        <span>{label}</span>
        {countVisible ? (
          <span className="field-count" aria-live="polite">
            {count}/{max}
          </span>
        ) : hint ? (
          <span className="field-hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </label>
      <Tag
        id={id}
        className={`${multiline ? 'textarea' : 'input'} ${inputClassName}`}
        value={value}
        maxLength={max}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  )
}

/* Remove-from-list button used by the repeatable rows (reasons, questions, memories). */
export function RemoveButton({ onClick, label }) {
  return (
    <button type="button" className="icon-btn remove-btn" onClick={onClick} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M7 7l10 10M17 7L7 17" />
      </svg>
    </button>
  )
}

export function AddButton({ onClick, children, disabled }) {
  return (
    <button type="button" className="add-btn" onClick={onClick} disabled={disabled}>
      <span aria-hidden="true">+</span> {children}
    </button>
  )
}
