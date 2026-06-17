function FieldShell({ label, error, helper, children }) {
  return (
    <label className="dilz-field">
      {label && <span className="dilz-field__label">{label}</span>}
      {children}
      {error && <span className="dilz-field__error">{error}</span>}
      {!error && helper && <span className="dilz-field__helper">{helper}</span>}
    </label>
  );
}

export function Input({ label, error, helper, className = '', ...props }) {
  return (
    <FieldShell label={label} error={error} helper={helper}>
      <input className={['dilz-input', error && 'has-error', className].filter(Boolean).join(' ')} {...props} />
    </FieldShell>
  );
}

export function Select({ label, error, helper, className = '', children, ...props }) {
  return (
    <FieldShell label={label} error={error} helper={helper}>
      <select className={['dilz-input', 'dilz-select', error && 'has-error', className].filter(Boolean).join(' ')} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Textarea({ label, error, helper, className = '', ...props }) {
  return (
    <FieldShell label={label} error={error} helper={helper}>
      <textarea className={['dilz-input', 'dilz-textarea', error && 'has-error', className].filter(Boolean).join(' ')} {...props} />
    </FieldShell>
  );
}
