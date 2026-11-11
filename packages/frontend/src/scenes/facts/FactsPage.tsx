import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@depose/ui/components/dialog';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { Skeleton } from '@depose/ui/components/skeleton';
import type { FactDto, FactDtoStatus } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { formatRelativeDate } from '~/lib/format/date';
import {
  useConfirmFact,
  useCreateFact,
  useFacts,
  useRejectFact,
  type FactFilters,
} from './facts.queries';

const STATUS_LABEL: Record<FactDtoStatus, string> = {
  proposed: 'Proposed',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  unsupported: 'Unsupported',
  merged: 'Merged',
};

const STATUS_VARIANT: Record<FactDtoStatus, 'secondary' | 'outline' | 'destructive'> = {
  proposed: 'outline',
  confirmed: 'secondary',
  rejected: 'destructive',
  unsupported: 'outline',
  merged: 'outline',
};

export function FactsPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FactDtoStatus | undefined>('proposed');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [text, setText] = useState('');
  const [factType, setFactType] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filters: FactFilters = { q: search || undefined, status };
  const facts = useFacts(matterId, filters);
  const create = useCreateFact(matterId);
  const items = facts.data?.pages.flatMap((page) => page.items) ?? [];

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
          setDialogOpen(false);
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Could not add fact.'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Facts"
        description="The atomic record for this matter. Confirmed facts feed summaries, timelines, and outputs."
        actions={
          can('fact.create') ? (
            <Button onClick={() => setDialogOpen(true)}>Add fact</Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search facts..."
          aria-label="Search facts"
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter facts">
          {([
            ['Proposed', 'proposed'],
            ['Confirmed', 'confirmed'],
            ['Rejected', 'rejected'],
            ['All', undefined],
          ] as const).map(([label, value]) => (
            <Button
              key={label}
              size="sm"
              variant={status === value ? 'secondary' : 'ghost'}
              onClick={() => setStatus(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {facts.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : facts.isError ? (
        <ErrorState
          title="Facts could not be loaded"
          message={facts.error instanceof Error ? facts.error.message : undefined}
          onRetry={() => void facts.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center">
          <p className="text-sm font-medium">
            {status === 'proposed' ? 'No facts waiting for review' : 'No facts yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Facts usually arrive from document extraction. You can also add one manually.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {items.map((fact) => (
              <FactRow key={fact.id} matterId={matterId} fact={fact} />
            ))}
          </div>
          {facts.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={facts.isFetchingNextPage}
              onClick={() => void facts.fetchNextPage()}
            >
              {facts.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          ) : null}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  placeholder="communication"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={text.trim().length < 3 || create.isPending}>
              {create.isPending ? 'Adding...' : 'Add fact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FactRow({ matterId, fact }: { matterId: string; fact: FactDto }) {
  const confirm = useConfirmFact(matterId);
  const reject = useRejectFact(matterId);
  const busy = confirm.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-pretty">{fact.text}</p>
        <Badge variant={STATUS_VARIANT[fact.status]} className="shrink-0 text-xs">
          {STATUS_LABEL[fact.status]}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {fact.dateStart ? <span>{fact.dateStart}</span> : null}
        {fact.factType ? <span className="capitalize">{fact.factType}</span> : null}
        <span>
          {fact.sourceCount} {fact.sourceCount === 1 ? 'source' : 'sources'}
        </span>
        <span>Added {formatRelativeDate(fact.createdAt)}</span>
      </div>
      {fact.status === 'proposed' ? (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => confirm.mutate(fact.id)}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => reject.mutate(fact.id)}
          >
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}
