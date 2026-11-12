import { Spinner } from '@depose/ui/components/spinner';

/**
 * PostHog-style load state: a centered spinner instead of a skeleton flash.
 * Used for scene and section loads; inline spins can narrow it via className.
 */
export function PageLoading({
  label,
  className = '',
}: {
  label?: string;
  className?: string;
}): React.ReactNode {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-64 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground ${className}`}
    >
      <Spinner className="size-4" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
