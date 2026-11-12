import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@depose/ui/components/dialog';
import { Skeleton } from '@depose/ui/components/skeleton';
import { Check, CircleWarning, Sparkle, Trash } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { api } from '~/lib/api/client';
import { useSession } from '~/lib/auth/session';
import { queryKeys } from '~/lib/query/keys';
import { formatRelativeDate } from '~/lib/format/date';

type Severity = 'critical' | 'serious' | 'minor' | 'informational';
type Status = 'candidate' | 'open' | 'confirmed' | 'dismissed' | 'stale';

interface Contradiction {
  id: string;
  kind: string;
  severity: Severity;
  confidence: number | null;
  status: Status;
  summary: string;
  factCount: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface EvidenceSource {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  quote: string;
  verification: string;
}

interface EvidenceFact {
  id: string;
  role: 'source' | 'conflicting' | string;
  text: string;
  factType: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  status: string;
  sources: EvidenceSource[];
}

interface ContradictionDetail {
  contradiction: Contradiction;
  facts: EvidenceFact[];
}

const SEVERITY_ORDER: Severity[] = ['critical', 'serious', 'minor', 'informational'];

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  serious: 'Serious',
  minor: 'Minor',
  informational: 'Informational',
};

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  serious: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  minor: 'border-border bg-muted text-muted-foreground',
  informational: 'border-border bg-muted/60 text-muted-foreground',
};

const STATUS_LABEL: Record<Status, string> = {
  candidate: 'Needs review',
  open: 'Open',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
  stale: 'Stale',
};

const KIND_LABEL: Record<string, string> = {
  date: 'Dates',
  amount: 'Amounts',
  party: 'Parties',
  event: 'Events',
  statement: 'Statements',
};

const FILTERS: { label: string; value: Status | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Needs review', value: 'candidate' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Dismissed', value: 'dismissed' },
];

export function ContradictionsPage() {
  const { matterId = '' } = useParams();
  const { can, me } = useSession();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [compareId, setCompareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'inconsistencies', status],
    queryFn: () =>
      api.get<{ items: Contradiction[] }>(
        `/api/v1/matters/${matterId}/inconsistencies${status === 'all' ? '' : `?status=${status}`}`,
      ),
    enabled: Boolean(matterId),
  });

  const summary = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'inconsistency-summary'],
    queryFn: () =>
      api.get<{ total: number; candidateCount: number }>(
        `/api/v1/matters/${matterId}/inconsistencies/summary`,
      ),
    enabled: Boolean(matterId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.matter(matterId), 'inconsistencies'] });
    void queryClient.invalidateQueries({
      queryKey: [...queryKeys.matter(matterId), 'inconsistency-summary'],
    });
  };

  const detect = useMutation({
    mutationFn: () =>
      api.post<{ detected: number; evaluated: number; warnings: string[] }>(
        `/api/v1/matters/${matterId}/inconsistencies/detect`,
      ),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Detection failed.'),
  });

  const severity = useMutation({
    mutationFn: ({ id, value }: { id: string; value: Severity }) =>
      api.patch(`/api/v1/matters/${matterId}/inconsistencies/${id}/severity`, {
        severity: value,
      }),
    onSuccess: invalidate,
  });

  const review = useMutation({
    mutationFn: ({ id, next }: { id: string; next: Status }) =>
      api.post(`/api/v1/matters/${matterId}/inconsistencies/${id}/review`, {
        status: next,
        reviewedBy: me?.user.name ?? me?.user.email ?? 'reviewer',
      }),
    onSuccess: () => {
      setCompareId(null);
      invalidate();
    },
  });

  const items = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Contradictions"
        description="Pairs of statements the record cannot reconcile. Detection proposes; a lawyer decides whether the conflict is material."
        actions={
          can('intelligence.detect') ? (
            <Button onClick={() => detect.mutate()} disabled={detect.isPending}>
              <Sparkle size={15} />
              {detect.isPending ? 'Comparing facts…' : 'Detect conflicts'}
            </Button>
          ) : undefined
        }
      />

      {error || detect.data ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <CircleWarning size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            {error
              ? error
              : detect.data && detect.data.detected > 0
                ? `${detect.data.detected} new conflict${detect.data.detected === 1 ? '' : 's'} found from ${detect.data.evaluated} comparisons.`
                : detect.data
                  ? 'No new conflicts found. Review the existing pairs or run again after more facts are confirmed.'
                  : ''}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Conflict status">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {summary.data ? `${summary.data.candidateCount} awaiting review · ${summary.data.total} total` : ''}
        </p>
      </div>

      {list.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : list.isError ? (
        <ErrorState
          title="Contradictions could not be loaded"
          message={list.error instanceof Error ? list.error.message : undefined}
          onRetry={() => void list.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">No conflicts recorded</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            Detection compares facts that share an entity or type. It needs confirmed or proposed
            facts, and a decision route configured for this instance.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_CLASS[item.severity]}`}
                >
                  {SEVERITY_LABEL[item.severity]} conflict
                </span>
                <Badge variant="outline" className="text-[11px]">
                  {KIND_LABEL[item.kind] ?? item.kind}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {STATUS_LABEL[item.status] ?? item.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.factCount} {item.factCount === 1 ? 'fact' : 'facts'} ·{' '}
                  {item.confidence !== null
                    ? `${Math.round(item.confidence * 100)}% model confidence`
                    : 'unscored'}{' '}
                  · {formatRelativeDate(item.createdAt)}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCompareId(item.id)}>
                    Compare evidence
                  </Button>
                </div>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-sm leading-relaxed text-pretty">{item.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground" htmlFor={`severity-${item.id}`}>
                    Severity
                  </label>
                  <select
                    id={`severity-${item.id}`}
                    value={item.severity}
                    disabled={!can('fact.update') || severity.isPending}
                    onChange={(event) =>
                      severity.mutate({ id: item.id, value: event.target.value as Severity })
                    }
                    className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                  >
                    {SEVERITY_ORDER.map((value) => (
                      <option key={value} value={value}>
                        {SEVERITY_LABEL[value]}
                      </option>
                    ))}
                  </select>
                  {item.status === 'dismissed' || item.status === 'confirmed' ? null : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!can('intelligence.review') || review.isPending}
                        onClick={() => review.mutate({ id: item.id, next: 'confirmed' })}
                      >
                        <Check size={13} /> Confirm conflict
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!can('intelligence.review') || review.isPending}
                        onClick={() => review.mutate({ id: item.id, next: 'dismissed' })}
                      >
                        <Trash size={13} /> Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CompareEvidenceDialog
        matterId={matterId}
        contradictionId={compareId}
        onClose={() => setCompareId(null)}
      />
    </div>
  );
}

function CompareEvidenceDialog({
  matterId,
  contradictionId,
  onClose,
}: {
  matterId: string;
  contradictionId: string | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'inconsistency', contradictionId],
    queryFn: () =>
      api.get<ContradictionDetail>(
        `/api/v1/matters/${matterId}/inconsistencies/${contradictionId}`,
      ),
    enabled: Boolean(matterId && contradictionId),
  });

  const source = detail.data?.facts.filter((fact) => fact.role === 'source') ?? [];
  const conflicting = detail.data?.facts.filter((fact) => fact.role !== 'source') ?? [];

  return (
    <Dialog open={Boolean(contradictionId)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compare evidence</DialogTitle>
        </DialogHeader>
        {detail.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : detail.isError ? (
          <p className="text-sm text-destructive">
            {detail.error instanceof Error ? detail.error.message : 'Evidence could not be loaded.'}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-pretty">
              {detail.data.contradiction.summary}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <EvidenceColumn title="Source account" facts={source} matterId={matterId} />
              <EvidenceColumn title="Conflicting account" facts={conflicting} matterId={matterId} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EvidenceColumn({
  title,
  facts,
  matterId,
}: {
  title: string;
  facts: EvidenceFact[];
  matterId: string;
}) {
  return (
    <section className="rounded-lg border border-border">
      <h3 className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {facts.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">No evidence recorded.</p>
      ) : (
        <ul className="divide-y divide-border">
          {facts.map((fact) => (
            <li key={`${fact.role}-${fact.id}`} className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{fact.dateStart ?? 'Undated'}</span>
                {fact.factType ? <span>· {fact.factType}</span> : null}
              </div>
              <Link
                to={`/matters/${matterId}/facts?focus=${fact.id}`}
                className="mt-1 block text-sm text-pretty underline-offset-4 hover:underline"
              >
                {fact.text}
              </Link>
              {fact.sources.map((citation, index) => (
                <div
                  key={`${citation.documentId}-${citation.pageNumber ?? 'none'}-${index}`}
                  className="mt-2 rounded-md border-l-2 border-primary/40 bg-muted/25 px-2.5 py-2"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {citation.documentName}
                    {citation.pageNumber ? ` · p. ${citation.pageNumber}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    “{citation.quote}”
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
