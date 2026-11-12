export function BootScreen() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-9 animate-spin rounded-full border-4 border-border border-t-primary"
        aria-hidden="true"
      />
    </div>
  );
}
