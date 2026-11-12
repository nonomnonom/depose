import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { PageLoading } from '~/lib/components/PageLoading';
import type { MattersControllerListStatus } from '~/generated/schemas';
import { useClientConfig } from '~/lib/config/client-config';
import { useSession } from '~/lib/auth/session';
import { ApiError } from '~/lib/api/errors';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { MatterRow } from './components/MatterRow';
import { useCreateMatter, useMatters } from './matters.queries';

const STATUS_OPTIONS: { label: string; value?: MattersControllerListStatus }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' },
];

export function MattersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = useClientConfig();
  const { me, can } = useSession();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MattersControllerListStatus | undefined>(undefined);
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  const filters = { q: search || undefined, status };
  const matters = useMatters(filters);
  const create = useCreateMatter(filters);

  useEffect(() => {
    const state = location.state as { createMatter?: boolean } | null;
    if (state?.createMatter) {
      setCreateDialog(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const items = matters.data?.pages.flatMap((page) => page.items) ?? [];
  const canCreate = can('matter.create');

  const closeCreate = () => {
    setCreateDialog(false);
    setCreateError(null);
  };

  const submitCreate = () => {
    setCreateError(null);
    create.mutate(
      {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCreateForm({ name: '', description: '' });
          closeCreate();
        },
        onError: (error) =>
          setCreateError(
            error instanceof ApiError ? error.message : 'Could not create matter.',
          ),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Matters"
        description={
          me?.firm ? `All matters in ${me.firm.name}.` : `All matters in ${config.firmName}.`
        }
        actions={
          canCreate ? <Button onClick={() => setCreateDialog(true)}>Create matter</Button> : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search matters..."
          aria-label="Search matters"
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
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

      {matters.isPending ? (
        <PageLoading />
      ) : matters.isError ? (
        <ErrorState
          title="Matters could not be loaded"
          message={matters.error instanceof Error ? matters.error.message : undefined}
          onRetry={() => void matters.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <p className="text-sm font-medium">
            {search ? 'No matters match that search' : 'No matters yet'}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            {search
              ? 'Try a different name or clear the status filter.'
              : 'Create a matter to start collecting evidence and building the record.'}
          </p>
          {!search && canCreate ? (
            <Button size="sm" onClick={() => setCreateDialog(true)}>
              Create matter
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            {items.map((matter) => (
              <MatterRow key={matter.id} matter={matter} />
            ))}
          </div>
          {matters.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={matters.isFetchingNextPage}
                onClick={() => void matters.fetchNextPage()}
              >
                {matters.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={createDialog} onOpenChange={(open) => (open ? setCreateDialog(true) : closeCreate())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create matter</DialogTitle>
            <DialogDescription>
              Start with a name. You can add a number, type, and team later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="matter-name">Matter name</Label>
              <Input
                id="matter-name"
                placeholder="Acquisition of PT Nusantara"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matter-description">Description</Label>
              <Input
                id="matter-description"
                placeholder="Optional"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, description: event.target.value }))
                }
              />
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreate}>
              Cancel
            </Button>
            <Button
              onClick={submitCreate}
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
