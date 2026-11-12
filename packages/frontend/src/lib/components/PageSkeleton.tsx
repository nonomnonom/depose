import { Skeleton } from '@depose/ui/components/skeleton';

/**
 * Skeleton load variant for content-shaped placeholders (PostHog `LemonSkeleton`).
 * Use when the final layout is known and worth reserving; use `PageLoading`
 * (centered spinner) for scene and route loads.
 */
export function PageSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {title ? <Skeleton className="h-8 w-48" /> : null}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="ml-auto h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
