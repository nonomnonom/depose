import type { ReactNode } from 'react';
import type { FactDto } from '~/generated/schemas';

/**
 * Shared fact presentation, used by the fact bank, the document viewer panel,
 * and the summary key facts. Scenes stay dumb: they pass FactDto and slots.
 */

export const FACT_STATUS_LABEL: Record<FactDto['status'], string> = {
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  proposed: 'Proposed',
};

/** Status dot: filled = confirmed, outline = proposed, muted = rejected. */
export function FactStatusDot({ status }: { status: FactDto['status'] }): ReactNode {
  return (
    <span
      className={`mt-1.5 size-2 shrink-0 rounded-full ${
        status === 'confirmed'
          ? 'bg-primary'
          : status === 'rejected'
            ? 'bg-muted-foreground/40'
            : 'border border-primary bg-transparent'
      }`}
      aria-hidden
    />
  );
}

/** Extraction confidence meter, shown only when the API returned one. */
export function ConfidenceBadge({ value }: { value: number }): ReactNode {
  const percent = Math.round(value * 100);
  return (
    <span
      className="hidden shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground sm:flex"
      title={`Extraction confidence ${percent}%`}
    >
      <span className="h-1 w-8 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full ${percent >= 70 ? 'bg-primary' : 'bg-muted-foreground/60'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      {percent}%
    </span>
  );
}

/**
 * Dense, date-first fact row (the Wexler review pattern). Selectable via
 * `onSelect`; `after` renders scene-specific actions (links, chips) under the
 * excerpt; `clamp` trims long text for panels.
 */
export function FactRow({
  fact,
  active = false,
  clamp = false,
  onSelect,
  after,
}: {
  fact: FactDto;
  active?: boolean;
  clamp?: boolean;
  onSelect?: () => void;
  after?: ReactNode;
}): ReactNode {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <FactStatusDot status={fact.status} />
        <p className={`min-w-0 flex-1 text-sm text-pretty ${clamp ? 'line-clamp-4' : ''}`}>
          {fact.text}
        </p>
        {fact.confidence !== null ? <ConfidenceBadge value={fact.confidence} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-5 text-xs text-muted-foreground">
        <span>{fact.dateStart ?? 'Undated'}</span>
        <span>·</span>
        <span className="capitalize">{fact.factType ?? 'fact'}</span>
        <span>·</span>
        <span>
          {fact.sourceCount} {fact.sourceCount === 1 ? 'source' : 'sources'}
        </span>
        <span>·</span>
        <span>{FACT_STATUS_LABEL[fact.status] ?? fact.status}</span>
      </div>
      {after ? <div className="pl-5">{after}</div> : null}
    </>
  );

  if (!onSelect) {
    return <li className="flex flex-col gap-1.5 px-4 py-3.5 text-left">{body}</li>;
  }
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors ${
          active ? 'bg-primary/5' : 'hover:bg-muted/40'
        }`}
      >
        {body}
      </button>
    </li>
  );
}
