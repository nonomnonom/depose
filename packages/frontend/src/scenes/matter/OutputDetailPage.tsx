import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { ArrowLeft, CircleWarning } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { api } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';
import { formatDateTime } from '~/lib/format/date';
import type { OutputRow } from './OutputsPage';

interface Citation {
  documentName?: string;
  pageNumber?: number;
  quote?: string;
  [key: string]: unknown;
}

interface OutputDetail {
  output: OutputRow;
  version: {
    id: string;
    version: number;
    content: Record<string, unknown>;
    contentMarkdown: string | null;
    finalizedBy: string | null;
    finalizedAt: string | null;
    createdAt: string;
  } | null;
  sources: { id: string; factId: string; citation: Citation }[];
}

export function OutputDetailPage() {
  const { matterId = '', outputId = '' } = useParams();

  const detail = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'output', outputId],
    queryFn: () => api.get<OutputDetail>(`/api/v1/matters/${matterId}/outputs/${outputId}`),
    enabled: Boolean(matterId && outputId),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={detail.data?.output.title ?? 'Output'}
        description="A versioned work product. The citations below are a snapshot of the facts used at the time it was generated."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/matters/${matterId}/outputs`} />}
          >
            <ArrowLeft size={14} /> All outputs
          </Button>
        }
      />

      {detail.isPending ? (
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      ) : detail.isError ? (
        <ErrorState
          title="Output could not be loaded"
          message={detail.error instanceof Error ? detail.error.message : undefined}
          onRetry={() => void detail.refetch()}
          secondaryHref={`/matters/${matterId}/outputs`}
          secondaryLabel="Back to outputs"
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              <Badge variant="outline">{detail.data.output.status}</Badge>
              <span className="capitalize">{detail.data.output.kind}</span>
              <span>· v{detail.data.output.currentVersion}</span>
              {detail.data.version?.finalizedAt ? (
                <span>· finalised {formatDateTime(detail.data.version.finalizedAt)}</span>
              ) : null}
            </div>
            <div className="max-h-[70dvh] overflow-y-auto p-5">
              {!detail.data.version ? (
                <p className="text-sm text-muted-foreground">
                  This output has no generated version yet.
                </p>
              ) : detail.data.version.contentMarkdown ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-pretty">
                  {detail.data.version.contentMarkdown}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
                  {JSON.stringify(detail.data.version.content, null, 2)}
                </pre>
              )}
            </div>
          </section>

          <aside className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-medium">Sources · {detail.data.sources.length}</h2>
            </div>
            {detail.data.sources.length === 0 ? (
              <p className="flex items-start gap-1.5 px-4 py-6 text-xs text-muted-foreground">
                <CircleWarning size={13} className="mt-0.5 shrink-0" />
                No citations were stored with this version. Treat the output as unverified.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {detail.data.sources.map((source) => {
                  const citation = source.citation;
                  return (
                    <li key={source.id} className="px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        {typeof citation.documentName === 'string'
                          ? citation.documentName
                          : 'Source fact'}
                        {typeof citation.pageNumber === 'number'
                          ? ` · p. ${citation.pageNumber}`
                          : ''}
                      </p>
                      {typeof citation.quote === 'string' ? (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                          “{citation.quote}”
                        </p>
                      ) : null}
                      <Link
                        to={`/matters/${matterId}/facts?focus=${source.factId}`}
                        className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open fact
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
