import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Checkbox } from '@depose/ui/components/checkbox';
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
import { Switch } from '@depose/ui/components/switch';
import { ArrowRight, Folder, Layers, Plus } from '@coolicons/react';
import type { SubsetDto } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { formatRelativeDate } from '~/lib/format/date';
import { useDocuments } from '../documents/documents.queries';
import { useCreateSubset, useSubsets } from './subsets.queries';

export function SubsetsPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const subsets = useSubsets(matterId);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Subsets"
        description="A deliberately narrow slice of the matter: a set of documents, its own workspace, and a Dep AI scope that cannot see outside it."
        actions={
          can('subset.create') ? (
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              Create subset
            </Button>
          ) : undefined
        }
      />

      {subsets.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : subsets.isError ? (
        <ErrorState
          title="Subsets could not be loaded"
          message={subsets.error instanceof Error ? subsets.error.message : undefined}
          onRetry={() => void subsets.refetch()}
        />
      ) : subsets.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card">
            <Layers size={20} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No subsets yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
              Use a subset for a hearing bundle, a single correspondence chain, or a witness set.
              Facts stay in the matter; the subset only scopes them.
            </p>
          </div>
          {can('subset.create') ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              Create the first subset
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_6rem_6rem_7rem] items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
            <span>Subset</span>
            <span>Documents</span>
            <span>Facts</span>
            <span>Updated</span>
          </div>
          <ul className="divide-y divide-border">
            {subsets.data.map((subset) => (
              <SubsetRow key={subset.id} matterId={matterId} subset={subset} />
            ))}
          </ul>
        </div>
      )}

      <CreateSubsetDialog matterId={matterId} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SubsetRow({ matterId, subset }: { matterId: string; subset: SubsetDto }) {
  return (
    <li>
      <Link
        to={`/matters/${matterId}/subsets/${subset.id}`}
        className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_6rem_6rem_7rem]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{subset.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {subset.applyMatterIssues ? 'Matter issues' : 'Own issues'}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {subset.description ?? 'No description'}
          </p>
        </div>
        <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">
          {subset.documentCount}
        </span>
        <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">
          {subset.factCount}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:block">
          {formatRelativeDate(subset.updatedAt)}
        </span>
        <ArrowRight size={15} className="text-muted-foreground sm:hidden" />
      </Link>
    </li>
  );
}

function CreateSubsetDialog({
  matterId,
  open,
  onOpenChange,
}: {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const documents = useDocuments(matterId, {});
  const create = useCreateSubset(matterId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [applyMatterIssues, setApplyMatterIssues] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = documents.data?.pages.flatMap((page) => page.items) ?? [];
  const visible = items.filter((document) =>
    document.fileName.toLowerCase().includes(filter.toLowerCase()),
  );

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const submit = () => {
    setError(null);
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        applyMatterIssues,
        documentIds: selected,
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          setName('');
          setDescription('');
          setSelected([]);
          navigate(`/matters/${matterId}/subsets/${data.subset.id}`);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Could not create the subset.'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a subset</DialogTitle>
          <DialogDescription>
            Choose the documents this workspace can see. Dep AI inside the subset never searches
            outside this list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subset-name">Name</Label>
              <Input
                id="subset-name"
                placeholder="Hearing bundle — March"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subset-description">Description</Label>
              <textarea
                id="subset-description"
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="What this slice is for"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <label className="flex items-start gap-2.5 rounded-lg border border-border p-3">
              <Switch
                checked={applyMatterIssues}
                onCheckedChange={setApplyMatterIssues}
                aria-label="Apply matter issues"
              />
              <span>
                <span className="block text-sm font-medium">Apply matter issues</span>
                <span className="block text-xs text-muted-foreground">
                  Keep the matter's relevance labels. Turn off to scope issues separately.
                </span>
              </span>
            </label>
          </div>

          <div className="flex min-h-64 flex-col rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="text-xs font-medium">
                {selected.length} selected
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setSelected(
                    selected.length === visible.length
                      ? []
                      : visible.map((document) => document.id),
                  )
                }
              >
                {selected.length === visible.length && visible.length > 0
                  ? 'Clear all'
                  : 'Select all'}
              </button>
            </div>
            <div className="border-b border-border p-2">
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter documents…"
                aria-label="Filter documents for subset"
                className="h-8"
              />
            </div>
            <div className="max-h-56 flex-1 overflow-y-auto p-1.5">
              {documents.isPending ? (
                <div className="space-y-1 p-1">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8 text-center">
                  <Folder size={18} className="text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    {items.length === 0 ? 'Upload documents first.' : 'No matching documents.'}
                  </p>
                </div>
              ) : (
                visible.map((document) => (
                  <label
                    key={document.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.includes(document.id)}
                      onCheckedChange={() => toggle(document.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs">{document.fileName}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!name.trim() || selected.length === 0 || create.isPending}
          >
            {create.isPending ? 'Creating…' : 'Create subset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
