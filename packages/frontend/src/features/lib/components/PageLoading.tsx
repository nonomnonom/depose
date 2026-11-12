/**
 * Centered spinner for scene and section loads; inline spins can narrow it via className.
 */
export function PageLoading({
  label,
  className = '',
  spinnerClassName = 'size-4',
}: {
  label?: string;
  className?: string;
  spinnerClassName?: string;
}): React.ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-64 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground ${className}`}
    >
      <span
        className={`inline-block animate-spin rounded-full border-4 border-border border-t-primary ${spinnerClassName}`}
        aria-hidden="true"
      />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

