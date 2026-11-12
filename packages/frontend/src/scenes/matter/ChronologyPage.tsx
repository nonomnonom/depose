import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { PageLoading } from '~/lib/components/PageLoading';
import { ArrowRight, Sparkle } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { useFacts } from '../facts/facts.queries';

export function ChronologyPage() {
  const { matterId = '' } = useParams();
  const facts = useFacts(matterId, { status: 'confirmed' });
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const rows = facts.data?.pages.flatMap((page) => page.items) ?? [];
    return rows
      .filter((fact) => fact.dateStart)
      .filter((fact) =>
        search.trim()
          ? fact.text.toLowerCase().includes(search.trim().toLowerCase())
          : true,
      )
      .sort((a, b) => (a.dateStart ?? '').localeCompare(b.dateStart ?? ''));
  }, [facts.data, search]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const fact of items) {
      const key = fact.dateStart?.slice(0, 7) ?? 'Undated';
      const current = map.get(key) ?? [];
      current.push(fact);
      map.set(key, current);
    }
    return [...map.entries()];
  }, [items]);

  const undated = useMemo(() => {
    const rows = facts.data?.pages.flatMap((page) => page.items) ?? [];
    return rows.filter((fact) => !fact.dateStart);
  }, [facts.data]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Chronology"
        description="Dated facts in order. The timeline is a reading of confirmed facts, not a separate record."
        actions={
          <Button variant="outline" render={<Link to={`/matters/${matterId}/kim`} />}>
            <Sparkle size={14} />
            Ask about timing
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter the timeline…"
          aria-label="Filter chronology"
          className="w-full sm:w-72"
        />
        <p className="text-xs text-muted-foreground">
          {items.length} dated fact{items.length === 1 ? '' : 's'}
          {undated.length > 0 ? ` · ${undated.length} undated not shown` : ''}
        </p>
      </div>

      {facts.isPending ? (
        <PageLoading />
      ) : facts.isError ? (
        <ErrorState
          title="The chronology could not be loaded"
          message={facts.error instanceof Error ? facts.error.message : undefined}
          onRetry={() => void facts.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">No dated facts yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            Extraction proposes dates from the document text. Confirm a fact with a date and it
            appears here in order.
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            render={<Link to={`/matters/${matterId}/data/facts`} />}
          >
            Open fact bank <ArrowRight size={13} />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([month, factsInMonth]) => (
            <section key={month}>
              <h2 className="sticky top-0 z-10 bg-background/95 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                {month === 'Undated'
                  ? 'Undated'
                  : new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })}
              </h2>
              <ol className="mt-2 border-l border-border pl-5">
                {factsInMonth.map((fact) => (
                  <li key={fact.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[26px] top-1.5 size-2 rounded-full border-2 border-background bg-primary" />
                    <p className="text-xs font-medium tabular-nums text-primary">
                      {fact.dateStart}
                    </p>
                    <Link
                      to={`/matters/${matterId}/data/facts?focus=${fact.id}`}
                      className="mt-1 block text-sm text-pretty underline-offset-4 hover:underline"
                    >
                      {fact.text}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {fact.factType ?? 'fact'}
                      </Badge>
                      <span>
                        {fact.sourceCount} source{fact.sourceCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

