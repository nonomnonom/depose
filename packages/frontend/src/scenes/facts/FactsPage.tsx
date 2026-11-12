import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { Progress } from '@depose/ui/components/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@depose/ui/components/dialog';
import { PageLoading } from '~/lib/components/PageLoading';
import { Check, CircleWarning, Sparkle } from '@coolicons/react';
import type { FactDto, FactDtoStatus } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { FactRow } from '~/lib/components/facts/FactRow';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { formatRelativeDate } from '~/lib/format/date';
import { SourceViewer } from './components/SourceViewer';
import {
  useConfirmFact,
  useCreateFact,
  useFactDetail,
  useFacts,
  useJob,
  useRejectFact,
  useRunExtraction,
  type FactFilters,
} from './facts.queries';

const STATUS_LABEL: Record<FactDtoStatus, string> = {
  proposed: 'Proposed',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  unsupported: 'Unsupported',
  merged: 'Merged',
};

const TABS: { label: string; value: FactDtoStatus | undefined }[] = [
  { label: 'To review', value: 'proposed' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: undefined },
];

export function FactsPage() {
  const { matterId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FactDtoStatus | undefined>('proposed');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const selectedId = params.get('focus');

  const filters: FactFilters = { q: search || undefined, status };
  const facts = useFacts(matterId, filters);
  const items = useMemo(() => facts.data?.pages.flatMap((page) => page.items) ?? [], [facts.data]);
  const extract = useRunExtraction(matterId);
  const job = useJob(jobId);

  useEffect(() => {
    if (selectedId && items.length > 0 && !items.some((fact) => fact.id === selectedId)) {
      const match = items[0];
      if (match) setParams({ focus: match.id }, { replace: true });
    }
  }, [items, selectedId, setParams]);

  useEffect(() => {
    if (job.data?.status === 'succeeded') {
      setJobId(null);
      void facts.refetch();
    }
  }, [job.data?.status, facts]);

  const select = (id: string) => setParams({ focus: id }, { replace: true });

  const runExtraction = () =>
    extract.mutate(undefined, {
      onSuccess: (data) => {
        if (data.jobIds[0]) setJobId(data.jobIds[0]);
      },
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fact bank"
        description="Atomic facts the record can rely on. Each confirmed fact keeps a verbatim citation to its source page."
        actions={
          <>
            {can('fact.create') ? (
              <Button
                variant="outline"
                onClick={runExtraction}
                disabled={extract.isPending || Boolean(jobId)}
              >
                <Sparkle size={15} />
                {extract.isPending ? 'Starting…' : 'Run extraction'}
              </Button>
            ) : null}
            {can('fact.create') ? (
              <Button onClick={() => setDialogOpen(true)}>Add fact</Button>
            ) : null}
          </>
        }
      />

      {jobId && job.data ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {job.data.status === 'failed' || job.data.status === 'dead'
                ? 'Extraction stopped'
                : 'Reading documents and verifying quotes…'}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {job.data.stage?.replaceAll('_', ' ') ?? 'queued'}
              {job.data.error?.message ? ` · ${job.data.error.message}` : ''}
            </p>
            <Progress className="mt-2 h-1.5" value={job.data.progress} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {job.data.progress}%
          </span>
        </div>
      ) : null}
      {extract.data && !extract.data.accepted ? (
        <p className="text-sm text-muted-foreground">{extract.data.message}</p>
      ) : null}

      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search facts…"
          aria-label="Search facts"
          className="w-full sm:w-72"
        />
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Fact status">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {facts.isPending ? (
        <PageLoading />
      ) : facts.isError ? (
        <ErrorState
          title="Facts could not be loaded"
          message={facts.error instanceof Error ? facts.error.message : undefined}
          onRetry={() => void facts.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <div>
            <p className="text-sm font-medium">
              {status === 'proposed' ? 'Nothing waiting for review' : 'No facts here yet'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
              {status === 'proposed'
                ? 'New proposals appear after extraction finishes. You can also add a fact manually.'
                : 'Run extraction on the documents, or add the fact yourself if it comes from outside the file set.'}
            </p>
          </div>
          {can('fact.create') ? (
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              Add fact
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {items.map((fact) => (
                <FactRow
                  key={fact.id}
                  fact={fact}
                  active={fact.id === selectedId}
                  onSelect={() => select(fact.id)}
                />
              ))}
            </ul>
            {facts.hasNextPage ? (
              <div className="border-t border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={facts.isFetchingNextPage}
                  onClick={() => void facts.fetchNextPage()}
                >
                  {facts.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-4">
            <FactDetail
              matterId={matterId}
              factId={selectedId ?? items[0]?.id ?? null}
              onClose={() => setParams({}, { replace: true })}
            />
          </div>
        </div>
      )}

      <AddFactDialog
        matterId={matterId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

function FactDetail({
  matterId,
  factId,
  onClose,
}: {
  matterId: string;
  factId: string | null;
  onClose: () => void;
}) {
  const fact = useFactDetail(matterId, factId);
  const confirm = useConfirmFact(matterId);
  const reject = useRejectFact(matterId);
  const [error, setError] = useState<string | null>(null);

  if (!factId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Select a fact to read its sources.
      </div>
    );
  }

  if (fact.isPending) return <PageLoading />;
  if (fact.isError) {
    return (
      <div className="rounded-xl border border-border p-5 text-sm">
        <p className="font-medium">Fact could not be loaded</p>
        <Button className="mt-2" size="sm" variant="outline" onClick={() => void fact.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = fact.data;
  const busy = confirm.isPending || reject.isPending;

  return (
    <aside className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant={data.status === 'confirmed' ? 'secondary' : 'outline'}>
            {STATUS_LABEL[data.status]}
          </Badge>
          {data.confidence !== null ? (
            <span className="text-xs text-muted-foreground">
              {Math.round(data.confidence * 100)}% confidence
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline lg:hidden"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm leading-relaxed text-pretty">{data.text}</p>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="mt-0.5">{data.dateStart ?? 'Not dated'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="mt-0.5 capitalize">{data.factType ?? 'Unclassified'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Origin</dt>
            <dd className="mt-0.5 capitalize">{data.origin}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Added</dt>
            <dd className="mt-0.5">{formatRelativeDate(data.createdAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Citations
          </p>
          {data.sources.length === 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CircleWarning size={13} className="mt-0.5 shrink-0" />
              Manual fact without a document source. Dep AI can use it, but it carries no page
              citation.
            </p>
          ) : (
            data.sources.map((source) => (
              <SourceViewer key={source.id} matterId={matterId} source={source} />
            ))
          )}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {data.status === 'proposed' ? (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              size="sm"
              className="flex-1"
              disabled={busy}
              onClick={() =>
                confirm.mutate(data.id, {
                  onSuccess: () => void fact.refetch(),
                  onError: (mutationError) =>
                    setError(
                      mutationError instanceof Error ? mutationError.message : 'Could not confirm.',
                    ),
                })
              }
            >
              <Check size={13} />
              {confirm.isPending ? 'Confirming…' : 'Confirm fact'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                reject.mutate(data.id, {
                  onSuccess: () => void fact.refetch(),
                  onError: (mutationError) =>
                    setError(
                      mutationError instanceof Error ? mutationError.message : 'Could not reject.',
                    ),
                })
              }
            >
              Reject
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function AddFactDialog({
  matterId,
  open,
  onOpenChange,
}: {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateFact(matterId);
  const [text, setText] = useState('');
  const [factType, setFactType] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    create.mutate(
      {
        text: text.trim(),
        factType: factType.trim() || undefined,
        dateStart: dateStart || undefined,
      },
      {
        onSuccess: () => {
          setText('');
          setFactType('');
          setDateStart('');
          onOpenChange(false);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not add fact.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a fact</DialogTitle>
          <DialogDescription>
            State one thing that happened. Keep it specific enough to cite.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fact-text">Fact</Label>
            <textarea
              id="fact-text"
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="On 12 March 2025, the parties signed the share purchase agreement."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fact-type">Type</Label>
              <Input
                id="fact-type"
                placeholder="event, admission, payment…"
                value={factType}
                onChange={(event) => setFactType(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fact-date">Date</Label>
              <Input
                id="fact-date"
                type="date"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={text.trim().length < 3 || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add fact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

