import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { FileText, Sparkle } from '@coolicons/react';
import { PageHeader } from '~/features/layout/PageHeader';
import { ErrorState } from '~/features/layout/ErrorPage';
import { api } from '~/features/lib/api/client';
import { queryKeys } from '~/features/lib/query/keys';
import { formatRelativeDate } from '~/features/lib/format/date';

export interface OutputRow {
  id: string;
  kind: string;
  title: string;
  status: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  review: 'In review',
  final: 'Final',
  superseded: 'Superseded',
};

export function OutputsPage() {
  const { matterId = '' } = useParams();

  const outputs = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'outputs'],
    queryFn: () => api.get<{ items: OutputRow[] }>(`/api/v1/matters/${matterId}/outputs`),
    enabled: Boolean(matterId),
  });

  const items = outputs.data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Outputs"
        description="Work product generated from this matter's facts. Every output keeps the citations it was built from."
        actions={
          <Button variant="outline" render={<Link to={`/matters/${matterId}/kim`} />}>
            <Sparkle size={14} />
            Draft with AI
          </Button>
        }
      />

      {outputs.isPending ? (
        <PageLoading />
      ) : outputs.isError ? (
        <ErrorState
          title="Outputs could not be loaded"
          message={outputs.error instanceof Error ? outputs.error.message : undefined}
          onRetry={() => void outputs.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-card">
            <FileText size={19} className="text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium">No outputs yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            Drafts, chronologies, and reports created from the fact bank appear here. Ask AI
            for a draft when the record is ready.
          </p>
          <Button className="mt-4" size="sm" render={<Link to={`/matters/${matterId}/kim`} />}>
            Open Chats
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {items.map((output) => (
              <li key={output.id}>
                <Link
                  to={`/matters/${matterId}/data/reports/${output.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                    <FileText size={15} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{output.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {output.kind} · v{output.currentVersion} · updated{' '}
                      {formatRelativeDate(output.updatedAt)}
                    </p>
                  </div>
                  <Badge variant={output.status === 'final' ? 'secondary' : 'outline'}>
                    {STATUS_LABEL[output.status] ?? output.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

