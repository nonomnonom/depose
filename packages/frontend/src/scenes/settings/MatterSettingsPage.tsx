import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import { PageLoading } from '~/lib/components/PageLoading';
import { Check, CircleWarning } from '@coolicons/react';
import type { MattersControllerUpdateBody } from '~/generated/schemas';
import { mattersControllerUpdate } from '~/generated/endpoints';
import { PageHeader } from '~/layout/PageHeader';
import { unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';
import { useSession } from '~/lib/auth/session';
import { useMatter } from '~/lib/logic/matterLogic';

export function MatterSettingsPage() {
  const { matterId = '' } = useParams();
  const queryClient = useQueryClient();
  const { can } = useSession();
  const matterQuery = useMatter(matterId);
  const update = useMutation({
    mutationFn: async (body: MattersControllerUpdateBody) =>
      unwrapData(await mattersControllerUpdate(matterId, body)).matter,
    onSuccess: (matter) => {
      queryClient.setQueryData(queryKeys.matter(matterId), matter);
      void queryClient.invalidateQueries({ queryKey: ['matter', matterId] });
    },
  });
  const [form, setForm] = useState({
    name: '',
    matterNumber: '',
    type: '',
    description: '',
    status: 'active' as MattersControllerUpdateBody['status'],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matterQuery.data) return;
    const matter = matterQuery.data;
    setForm({
      name: matter.name,
      matterNumber: matter.matterNumber ?? '',
      type: matter.type,
      description: matter.description ?? '',
      status: matter.status,
    });
  }, [matterQuery.data]);

  if (matterQuery.isPending) return <PageLoading />;
  if (matterQuery.isError) {
    return <p className="text-sm text-destructive">Matter settings could not be loaded.</p>;
  }

  const canUpdate = can('matter.update');
  const save = () => {
    setError(null);
    update.mutate(
      {
        name: form.name.trim(),
        matterNumber: form.matterNumber.trim() || null,
        type: form.type.trim() || 'other',
        description: form.description.trim() || null,
        ...(form.status ? { status: form.status } : {}),
      },
      {
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Could not save the matter.'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Matter settings"
        description="Identity, status, and the description the team sees. Access and sharing stay in the matter header."
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Matter identity</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="matter-name">Name</Label>
            <Input
              id="matter-name"
              value={form.name}
              disabled={!canUpdate}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="matter-number">Matter number</Label>
            <Input
              id="matter-number"
              value={form.matterNumber}
              placeholder="Optional"
              disabled={!canUpdate}
              onChange={(event) =>
                setForm((value) => ({ ...value, matterNumber: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="matter-type">Type</Label>
            <select
              id="matter-type"
              value={form.type}
              disabled={!canUpdate}
              onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm disabled:opacity-60"
            >
              {['litigation', 'arbitration', 'investigation', 'advisory', 'other'].map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="matter-description">Description</Label>
            <textarea
              id="matter-description"
              value={form.description}
              disabled={!canUpdate}
              onChange={(event) =>
                setForm((value) => ({ ...value, description: event.target.value }))
              }
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
              placeholder="What the team needs to know about this matter"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Status</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Closing makes the matter read-only for everyone except admins. Archiving hides it from
            active work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-5">
          {(['active', 'closed', 'archived'] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={!canUpdate}
              onClick={() => setForm((value) => ({ ...value, status }))}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                form.status === status
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {form.status === status ? <Check size={13} className="text-primary" /> : null}
              {status}
            </button>
          ))}
          <Badge variant="outline" className="ml-auto text-[10px]">
            Current · {matterQuery.data.status}
          </Badge>
        </div>
      </section>

      {error ? (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <CircleWarning size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {canUpdate ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {update.isSuccess ? 'Saved.' : 'Changes apply to the whole matter.'}
          </p>
          <Button onClick={save} disabled={!form.name.trim() || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role can read this matter but cannot change its settings.
        </p>
      )}
    </div>
  );
}
