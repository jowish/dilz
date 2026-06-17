export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const classes = ['dilz-button', `dilz-button--${variant}`, `dilz-button--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="dilz-button__spinner" aria-hidden="true" />}
      <span>{children}</span>
    </Component>
  );
}

export function IconButton({
  selected = false,
  variant = 'default',
  className = '',
  children,
  ...props
}) {
  const classes = [
    'dilz-icon-button',
    selected && 'is-selected',
    variant !== 'default' && `dilz-icon-button--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
