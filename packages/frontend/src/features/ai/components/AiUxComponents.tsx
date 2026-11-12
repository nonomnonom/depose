export function EvidenceBlock({
  source,
  state,
  onActivate,
}: {
  source: {
    factText: string;
    quote: string | null;
  };
  state: 'loading' | 'ready' | 'failed';
  onActivate: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm transition-colors ${
        state === 'loading'
          ? 'border-border/60 bg-muted/30'
          : state === 'ready'
            ? 'border-primary/30 bg-primary/[0.03] hover:border-primary/50'
            : 'border-destructive/30 bg-destructive/5'
      }`}
    >
      <p className="mb-2 overflow-hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {state === 'loading' ? 'Checking source…' : state === 'failed' ? 'Source unavailable' : 'Source verified'}
      </p>
      <p className="line-clamp-3 text-pretty">{source.factText}</p>
      {state === 'ready' && source.quote ? (
        <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground italic">
          “{source.quote}”
        </blockquote>
      ) : null}
      <button
        type="button"
        onClick={onActivate}
        className="mt-2 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
      >
        {state === 'loading' ? 'Opening…' : state === 'failed' ? 'Show anyway' : 'Open in source viewer'}
      </button>
    </div>
  );
}

export function CitationChip({
  source,
  isActive,
  onActivate,
}: {
  source: {
    sourceId: string;
    documentName: string | null;
    pageNumber: number | null;
    factStatus: string;
  };
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
        isActive
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <p className="mb-1 overflow-hidden text-xs font-medium text-muted-foreground">
        [{source.documentName ?? 'Manual fact'}]
      </p>
      <p className="line-clamp-2 text-xs text-pretty">{source.documentName}</p>
    </button>
  );
}
