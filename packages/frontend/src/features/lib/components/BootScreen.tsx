import type { ReactNode } from 'react';

export function BootScreen({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4">
      <span className="inline-block size-9 animate-spin rounded-full border-4 border-border border-t-primary" aria-hidden="true" />
      {label ? <p className="text-sm text-muted-foreground" aria-live="polite">{label}</p> : null}
    </div>
  );
}

/** @deprecated Use BootScreenSpinner from the same module if you need the label prop. */
export function BootScreenSpinner(props: { label?: string }): ReactNode {
  return <BootScreen label={props.label} />;
}
