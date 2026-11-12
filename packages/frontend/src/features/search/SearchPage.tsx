import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { CircleWarning, Search } from '@coolicons/react';
import { PageHeader } from '~/features/layout/PageHeader';
import { api } from '~/features/lib/api/client';

interface SearchFact {
  id: string;
  text: string;
  dateStart: string | null;
  factType: string;
  status: string;
  score: number;
  sources: {
    sourceId: string;
    documentName: string;
    pageNumber: number | null;
    quote: string | null;
    verification: string;
  }[];
}

interface SearchChunk {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  text: string;
  score: number;
}

interface SearchResult {
  query: string;
  facts: SearchFact[];
  chunks: SearchChunk[];
  warnings: string[];
}

export function SearchPage() {
  const { matterId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get('q') ?? '');
  const query = params.get('q') ?? '';

  const results = useQuery({
    queryKey: ['matter', matterId, 'search', query],
    queryFn: () =>
      api.get<SearchResult>(
        `/api/v1/matters/${matterId}/search?q=${encodeURIComponent(query)}&limit=25`,
      ),
    enabled: Boolean(matterId && query.trim()),
  });

  const run = () => {
    const next = draft.trim();
    if (next) setParams({ q: next }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Search the record"
        description="Facts and source passages, fused from lexical and vector retrieval. Filters stay inside this matter."
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') run();
            }}
            placeholder='Try "payment" or from:2024-01-01 status:confirmed'
            aria-label="Search facts and passages"
            className="pl-9"
          />
        </div>
        <Button onClick={run} disabled={!draft.trim()}>
          Search
        </Button>
      </div>

      {results.data?.warnings.includes('vector_unavailable') ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <CircleWarning size={13} className="mt-0.5 shrink-0" />
          Vector search is not available. Results are lexical only and may miss paraphrases.
        </p>
      ) : null}

      {!query.trim() ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">Search across facts and pages</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            Use field filters like <code className="text-foreground">status:confirmed</code>,{' '}
            <code className="text-foreground">from:2024-01-01</code>, or{' '}
            <code className="text-foreground">-draft</code> to exclude a word.
          </p>
        </div>
      ) : results.isPending ? (
        <PageLoading />
      ) : results.isError ? (
        <div className="rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">Search failed</p>
          <p className="mt-0.5 text-muted-foreground">
            {results.error instanceof Error ? results.error.message : 'Request failed.'}
          </p>
        </div>
      ) : results.data.facts.length === 0 && results.data.chunks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No matches</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a broader term or remove a filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-medium">Facts · {results.data.facts.length}</h2>
            </div>
            {results.data.facts.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">No fact matched.</p>
            ) : (
              <ul className="divide-y divide-border">
                {results.data.facts.map((fact) => (
                  <li key={fact.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-pretty">{fact.text}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {fact.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fact.dateStart ?? 'Undated'} · {fact.factType} ·{' '}
                      {fact.sources[0]?.documentName ?? 'manual'}
                      {fact.sources[0]?.pageNumber ? `, p. ${fact.sources[0].pageNumber}` : ''}
                    </p>
                    {fact.sources[0]?.quote ? (
                      <p className="mt-1.5 line-clamp-2 border-l-2 border-primary/30 pl-2 text-xs text-muted-foreground">
                        “{fact.sources[0].quote}”
                      </p>
                    ) : null}
                    <Link
                      to={`/matters/${matterId}/data/facts?focus=${fact.id}`}
                      className="mt-1.5 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open in fact bank
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-medium">Passages · {results.data.chunks.length}</h2>
            </div>
            {results.data.chunks.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">No passage matched.</p>
            ) : (
              <ul className="divide-y divide-border">
                {results.data.chunks.map((chunk) => (
                  <li key={chunk.id} className="px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {chunk.documentName}
                      {chunk.pageNumber ? ` · p. ${chunk.pageNumber}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      {chunk.text}
                    </p>
                    <Link
                      to={`/matters/${matterId}/data/documents`}
                      className="mt-1.5 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open evidence
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

