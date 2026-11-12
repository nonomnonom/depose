import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { ChevronLeft, ChevronRight, CircleWarning, Download } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { documentsControllerGet, documentsControllerPage, factsControllerList } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';

interface FactRow {
  id: string;
  text: string;
  dateStart: string | null;
  factType: string | null;
  status: string;
  confidence: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  processing: 'Reading',
  done: 'Ready',
  needs_review: 'Needs review',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function DocumentViewerPage() {
  const { matterId = '', documentId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [pageNumber, setPageNumber] = useState(() => Number(params.get('page') ?? 1) || 1);

  const document = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'document', documentId],
    queryFn: async () => unwrapData(await documentsControllerGet(matterId, documentId)).document,
    enabled: Boolean(matterId && documentId),
  });

  const page = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'document-page', documentId, pageNumber],
    queryFn: async () => unwrapData(await documentsControllerPage(matterId, documentId, pageNumber)),
    enabled: Boolean(matterId && documentId && document.data),
    retry: false,
  });

  const facts = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'document-facts', documentId],
    queryFn: async () =>
      unwrapData(await factsControllerList(matterId, { documentId, limit: 100 })),
    enabled: Boolean(matterId && documentId),
  });

  const goToPage = (next: number) => {
    const bounded = Math.max(1, next);
    setPageNumber(bounded);
    const nextParams = new URLSearchParams(params);
    nextParams.set('page', String(bounded));
    setParams(nextParams, { replace: true });
  };

  const totalPages = document.data?.pageCount ?? null;
  const factRows = (facts.data?.items ?? []) as FactRow[];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={document.data?.fileName ?? 'Document'}
        description="The extracted page text and the facts that cite it. The original file is never modified."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link to={`/matters/${matterId}/documents`} />}
            >
              All documents
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={`/api/v1/matters/${matterId}/documents/${documentId}/download`}
                  download={document.data?.fileName}
                />
              }
            >
              <Download size={14} />
              Download
            </Button>
          </>
        }
      />

      {document.isPending ? (
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      ) : document.isError ? (
        <ErrorState
          title="Document could not be loaded"
          message={document.error instanceof Error ? document.error.message : undefined}
          onRetry={() => void document.refetch()}
          secondaryHref={`/matters/${matterId}/documents`}
          secondaryLabel="Back to documents"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{STATUS_LABEL[document.data.status] ?? document.data.status}</Badge>
            <span>{document.data.type.toUpperCase()}</span>
            <span>·</span>
            <span>{document.data.pageCount ?? page.data?.pageNumber ?? 1} pages</span>
            {document.data.processingError ? (
              <span className="flex items-center gap-1 text-destructive">
                <CircleWarning size={12} /> {document.data.processingError}
              </span>
            ) : null}
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Page {pageNumber}
                  {totalPages ? ` of ${totalPages}` : ''}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={pageNumber <= 1}
                    onClick={() => goToPage(pageNumber - 1)}
                  >
                    <ChevronLeft size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={Boolean(totalPages && pageNumber >= totalPages)}
                    onClick={() => goToPage(pageNumber + 1)}
                  >
                    <ChevronRight size={15} />
                  </Button>
                </div>
              </div>
              <div className="max-h-[70dvh] overflow-y-auto p-5">
                {page.isPending ? (
                  <div className="space-y-2">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <Skeleton key={index} className="h-3 w-full" />
                    ))}
                  </div>
                ) : page.isError ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CircleWarning size={15} className="mt-0.5 shrink-0" />
                    <p>
                      No text layer for this page. The file may need OCR, or the page may be an
                      image or an empty page. The original download is unchanged.
                    </p>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-pretty">
                    {page.data.text}
                  </p>
                )}
              </div>
            </section>

            <aside className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-4">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-medium">Facts from this document · {factRows.length}</h2>
              </div>
              {facts.isPending ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : factRows.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  No facts cite this document yet. Run extraction from the documents page.
                </p>
              ) : (
                <ul className="max-h-[62dvh] divide-y divide-border overflow-y-auto">
                  {factRows.map((fact) => (
                    <li key={fact.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{fact.dateStart ?? 'Undated'}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {fact.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-4 text-sm text-pretty">{fact.text}</p>
                      <Link
                        to={`/matters/${matterId}/facts?focus=${fact.id}`}
                        className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open in fact bank
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
