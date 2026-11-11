import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Skeleton } from '@depose/ui/components/skeleton';
import { MattersControllerListStatus, type MatterDto, type MatterDtoStatus } from '~/generated/schemas';

import { useClientConfig } from '~/lib/config/client-config';
import { useSession } from '~/lib/auth/session';
import { ApiError } from '~/lib/api/errors';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { queryKeys } from '~/lib/query/keys';
import { mattersControllerCreate, mattersControllerList } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { formatRelativeDate } from '~/lib/date';

const STATUS_OPTIONS: { label: string; value?: MattersControllerListStatus }[] = [
  { label: 'All statuses', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
];

const STATUS_TEXT: Record<MatterDtoStatus, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

const STATUS_DOT: Record<MatterDtoStatus, string> = {
  active: 'bg-emerald-500',
  closed: 'bg-amber-500',
  archived: 'bg-zinc-400',
};

function statusBadge(status: MatterDtoStatus) {
  return (
    <Badge variant="outline" className="text-xs">
      <span className={`mr-1 inline-block size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_TEXT[status]}
    </Badge>
  );
}

export function MattersPage() {
  const queryClient = useQueryClient();
  const config = useClientConfig();
  const { me } = useSession();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MattersControllerListStatus | undefined>(undefined);
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  const filters = { q: search || undefined, status };
  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.matters(filters),
    queryFn: async ({ pageParam }) =>
      unwrapData(
        await mattersControllerList({
          limit: 20,
          cursor: pageParam ?? undefined,
          q: search || undefined,
          status,
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

  const allItems = listQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const create = useMutation({
    mutationFn: async () =>
      unwrapData(
        await mattersControllerCreate({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
        }),
      ),
    onSuccess: () => {
      setCreateForm({ name: '', description: '' });
      setCreateError(null);
      setCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.matters(filters) });
    },
    onError: (err) =>
      setCreateError(err instanceof ApiError ? err.message : 'Gagal membuat matter.'),
  });

  return (
    <>
      <PageHeader
        title="Matter"
        description={me?.firm ? `Matters for ${me.firm.name}` : `Matters for ${config.firmName}`}
        actions={<Button onClick={() => setCreateDialog(true)}>Create matter</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari matter..."
          className="w-full sm:w-60"
        />
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.label}
              size="sm"
              variant={option.value === status ? 'secondary' : 'ghost'}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {listQuery.isPending ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))
      ) : listQuery.isError ? (
        <ErrorState
          title="Failed to load matters"
          message={listQuery.error instanceof Error ? listQuery.error.message : undefined}
          onRetry={() => void listQuery.refetch()}
        />
      ) : allItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? 'No results.' : 'No matters yet. Create one now?'}
          </p>
          <Button onClick={() => setCreateDialog(true)}>Create matter</Button>
        </div>
      ) : (
        <>
          {allItems.map((matter) => (
            <MatterRow key={matter.id} matter={matter} />
          ))}
          {listQuery.hasNextPage ? (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create matter</DialogTitle>
            <DialogDescription>Add a matter to your firm.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Matter name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((form) => ({ ...form, name: event.target.value }))
              }
            />
            <Input
              placeholder="Short description (optional)"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((form) => ({ ...form, description: event.target.value }))
              }
            />
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialog(false);
                setCreateError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!createForm.name.trim() || create.isPending}
            >
              {create.isPending ? 'Creating...' : 'Create matter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MatterRow({ matter }: { matter: MatterDto }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{matter.name}</h3>
          {matter.description ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{matter.description}</p>
          ) : null}
        </div>
        <div className="shrink-0">{statusBadge(matter.status)}</div>
      </div>
      {matter.matterNumber ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Number: {matter.matterNumber}</span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Created {formatRelativeDate(matter.createdAt)}</span>
      </div>
    </div>
  );
}
