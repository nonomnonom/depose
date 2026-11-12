import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
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
import { PageLoading } from '~/features/lib/components/PageLoading';
import { Plus } from '@coolicons/react';
import { PageHeader } from '~/features/layout/PageHeader';
import { ErrorState } from '~/features/layout/ErrorPage';
import { api } from '~/features/lib/api/client';
import { useSession } from '~/features/lib/auth/session';
import { queryKeys } from '~/features/lib/query/keys';

interface Entity {
  id: string;
  canonicalName: string;
  type: string;
  description: string | null;
  status: string;
  aliases: string[];
  mentionCount: number;
}

interface EntityAlias {
  id: string;
  alias: string;
}

interface RelatedFact {
  id: string;
  text: string;
  dateStart: string | null;
  pageNumber: number | null;
}

interface EntityDetail {
  entity: Entity & { description: string | null };
  aliases: EntityAlias[];
  facts: RelatedFact[];
}

export function EntitiesPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const entities = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'entities'],
    queryFn: () => api.get<{ items: Entity[] }>(`/api/v1/matters/${matterId}/entities`),
    enabled: Boolean(matterId),
  });

  const items = useMemo(() => {
    const rows = entities.data?.items ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (entity) =>
        entity.canonicalName.toLowerCase().includes(needle) ||
        entity.type.toLowerCase().includes(needle) ||
        entity.aliases.some((alias) => alias.toLowerCase().includes(needle)),
    );
  }, [entities.data, search]);

  const activeId = selectedId ?? items[0]?.id ?? null;

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.matter(matterId), 'entities'] });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Entities"
        description="People and organisations named in the record, with the aliases that resolve to them and the facts they appear in."
        actions={
          can('matter.update') ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              Add entity
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search names, aliases, or types…"
          aria-label="Search entities"
          className="w-full sm:w-80"
        />
        <p className="text-xs text-muted-foreground">
          {entities.data ? `${items.length} entities` : ''}
        </p>
      </div>

      {entities.isPending ? (
        <PageLoading />
      ) : entities.isError ? (
        <ErrorState
          title="Entities could not be loaded"
          message={entities.error instanceof Error ? entities.error.message : undefined}
          onRetry={() => void entities.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">
            {search ? 'No matching entities' : 'No entities yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            {search
              ? 'Try another name or clear the search.'
              : 'Entities are resolved from extracted facts. You can also add a person or organisation manually.'}
          </p>
          {!search && can('matter.update') ? (
            <Button className="mt-4" size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              Add entity
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {items.map((entity) => (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(entity.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors ${
                      entity.id === activeId ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{entity.canonicalName}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {entity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entity.mentionCount} {entity.mentionCount === 1 ? 'mention' : 'mentions'}
                      </span>
                    </div>
                    {entity.aliases.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Also known as {entity.aliases.slice(0, 4).join(', ')}
                        {entity.aliases.length > 4 ? `, +${entity.aliases.length - 4}` : ''}
                      </p>
                    ) : null}
                    {entity.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground text-pretty">
                        {entity.description}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:sticky lg:top-4">
            <EntityDetail matterId={matterId} entityId={activeId} onChanged={invalidate} />
          </div>
        </div>
      )}

      <AddEntityDialog
        matterId={matterId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setSelectedId(id);
          invalidate();
        }}
      />
    </div>
  );
}

function EntityDetail({
  matterId,
  entityId,
  onChanged,
}: {
  matterId: string;
  entityId: string | null;
  onChanged: () => void;
}) {
  const { can } = useSession();
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'entity', entityId],
    queryFn: () => api.get<EntityDetail>(`/api/v1/matters/${matterId}/entities/${entityId}`),
    enabled: Boolean(matterId && entityId),
  });

  const addAlias = useMutation({
    mutationFn: (value: string) =>
      api.post(`/api/v1/matters/${matterId}/entities/${entityId}/aliases`, { alias: value }),
    onSuccess: () => {
      setAlias('');
      setError(null);
      void detail.refetch();
      onChanged();
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Could not add alias.'),
  });

  if (!entityId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Select an entity to see its aliases and related facts.
      </div>
    );
  }
  if (detail.isPending) return <PageLoading />;
  if (detail.isError) {
    return (
      <div className="rounded-xl border border-border p-5 text-sm">
        <p className="font-medium">Entity could not be loaded</p>
        <Button className="mt-2" size="sm" variant="outline" onClick={() => void detail.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = detail.data;
  return (
    <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-lg font-semibold">{data.entity.canonicalName}</h2>
          <Badge variant="outline" className="text-[10px] capitalize">
            {data.entity.type}
          </Badge>
        </div>
        {data.entity.description ? (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{data.entity.description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Aliases</p>
        {data.aliases.length === 0 ? (
          <p className="text-xs text-muted-foreground">No aliases recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.aliases.map((entry) => (
              <Badge key={entry.id} variant="secondary" className="text-xs">
                {entry.alias}
              </Badge>
            ))}
          </div>
        )}
        {can('matter.update') ? (
          <form
            className="mt-1 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (alias.trim()) addAlias.mutate(alias.trim());
            }}
          >
            <Input
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="Add an alias"
              aria-label="Add an alias"
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!alias.trim() || addAlias.isPending}>
              Add
            </Button>
          </form>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Related facts · {data.facts.length}
        </p>
        {data.facts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No fact currently links this entity. Mentions appear after extraction runs.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {data.facts.map((fact) => (
              <li key={fact.id}>
                <Link
                  to={`/matters/${matterId}/data/facts?focus=${fact.id}`}
                  className="block rounded-md border border-border px-2.5 py-2 text-xs underline-offset-4 hover:bg-muted/40 hover:underline"
                >
                  <span className="block font-medium tabular-nums text-muted-foreground">
                    {fact.dateStart ?? 'Undated'}
                    {fact.pageNumber ? ` · p. ${fact.pageNumber}` : ''}
                  </span>
                  <span className="mt-0.5 line-clamp-3 block text-pretty">{fact.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function AddEntityDialog({
  matterId,
  open,
  onOpenChange,
  onCreated,
}: {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Person');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ entity: { id: string } }>(`/api/v1/matters/${matterId}/entities`, {
        canonicalName: name.trim(),
        type: type.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      }),
    onSuccess: (data) => {
      setName('');
      setDescription('');
      setError(null);
      onOpenChange(false);
      onCreated(data.entity.id);
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Could not add entity.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a person or organisation</DialogTitle>
          <DialogDescription>
            Use the canonical name. Aliases and related facts can be added after saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Northwind Trading Ltd"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-type">Type</Label>
            <select
              id="entity-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            >
              <option value="Person">Person</option>
              <option value="Organisation">Organisation</option>
              <option value="Place">Place</option>
              <option value="Document">Document</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-description">Description</Label>
            <textarea
              id="entity-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Role in the dispute, if known."
              className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? 'Adding…' : 'Add entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

