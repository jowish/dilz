function FieldShell({ label, required, error, helper, children }) {
  return (
    <label className="dilz-field">
      {label && (
        <span className="dilz-field__label">
          {label}{required && <span className="dilz-field__required" aria-hidden="true"> *</span>}
        </span>
      )}
      {children}
      {error && <span className="dilz-field__error">{error}</span>}
      {!error && helper && <span className="dilz-field__helper">{helper}</span>}
    </label>
  );
}

export function Input({ label, required = false, error, helper, className = '', ...props }) {
  return (
    <FieldShell label={label} required={required} error={error} helper={helper}>
      <input required={required} aria-invalid={Boolean(error)} className={['dilz-input', error && 'has-error', className].filter(Boolean).join(' ')} {...props} />
    </FieldShell>
  );
}

export function Select({ label, required = false, error, helper, className = '', children, ...props }) {
  return (
    <FieldShell label={label} required={required} error={error} helper={helper}>
      <select required={required} aria-invalid={Boolean(error)} className={['dilz-input', 'dilz-select', error && 'has-error', className].filter(Boolean).join(' ')} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Textarea({ label, required = false, error, helper, className = '', ...props }) {
  return (
    <FieldShell label={label} required={required} error={error} helper={helper}>
      <textarea required={required} aria-invalid={Boolean(error)} className={['dilz-input', 'dilz-textarea', error && 'has-error', className].filter(Boolean).join(' ')} {...props} />
    </FieldShell>
  );
}
