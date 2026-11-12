import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { PageLoading } from '~/lib/components/PageLoading';
import { ArrowRight, ChevronDown, ChevronRight, Sparkle } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { factsControllerList, summaryThemeControllerListSummaries, summaryThemeControllerListThemes } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';

interface ThemeRow {
  id: string;
  matterId: string;
  subsetId: string | null;
  name: string;
  description: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SummaryRow {
  id: string;
  matterId: string;
  subsetId: string | null;
  version: number;
  status: string;
  content: string;
  model: string | null;
  generatedAt: string | null;
}

import type { FactDto } from '~/generated/schemas';

export function SummaryPage() {
  const { matterId = '' } = useParams();
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);

  const themesQuery = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'summary-themes'],
    queryFn: async (): Promise<ThemeRow[]> => {
      const response = await summaryThemeControllerListThemes(matterId);
      const payload = unwrapData(response) as unknown as { items?: ThemeRow[] };
      return payload?.items ?? [];
    },
    enabled: Boolean(matterId),
    retry: false,
  });

  const summariesQuery = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'summary-summaries'],
    queryFn: async (): Promise<SummaryRow[]> => {
      const response = await summaryThemeControllerListSummaries(matterId);
      const payload = unwrapData(response) as unknown as { items?: SummaryRow[] };
      return payload?.items ?? [];
    },
    enabled: Boolean(matterId),
    retry: false,
  });

  const factsQuery = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'summary-facts'],
    queryFn: async (): Promise<FactDto[]> => {
      const response = await factsControllerList(matterId, { status: 'confirmed', limit: 100 });
      const payload = unwrapData(response) as unknown as { items?: FactDto[] };
      return payload?.items ?? [];
    },
    enabled: Boolean(matterId),
    retry: false,
  });

  const loading = themesQuery.isPending || factsQuery.isPending;
  const failed = themesQuery.isError || factsQuery.isError;

  if (failed) {
    return (
      <ErrorState
        title="The summary could not be loaded"
        message={themesQuery.error instanceof Error ? themesQuery.error.message : undefined}
        onRetry={() => {
          void themesQuery.refetch();
          void factsQuery.refetch();
        }}
      />
    );
  }

  const themes = themesQuery.data ?? [];
  const summaries = summariesQuery.data ?? [];
  const keyFacts = [...(factsQuery.data ?? [])]
    .sort((left, right) => {
      const byDate = (left.dateStart ?? '9999-12-31').localeCompare(right.dateStart ?? '9999-12-31');
      if (byDate !== 0) return byDate;
      return (right.confidence ?? 0) - (left.confidence ?? 0);
    })
    .slice(0, 12);

  const summariesBySubset = new Map<string, SummaryRow[]>();
  for (const summary of summaries) {
    if (!summary.subsetId) continue;
    const existing = summariesBySubset.get(summary.subsetId) ?? [];
    existing.push(summary);
    summariesBySubset.set(summary.subsetId, existing);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Summary"
        description="What the record currently stands on: the themes in dispute and the confirmed key facts, each traceable to its source."
        actions={
          <>
            <Button variant="outline" render={<Link to={`/matters/${matterId}/data/chronologies`} />}>
              Chronology
            </Button>
            <Button render={<Link to={`/matters/${matterId}/kim`} />}>
              <Sparkle size={14} />
              Ask Dep AI
            </Button>
          </>
        }
      />

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Themes</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Narrative threads that the key facts hang off. Expand a theme to read its framing.
                </p>
              </div>
            </div>
            {themes.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                No themes yet. Themes are created while the record is being reviewed.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {themes.map((theme) => {
                  const expanded = expandedThemeId === theme.id;
                  const themeSummaries = theme.subsetId ? summariesBySubset.get(theme.subsetId) ?? [] : [];
                  return (
                    <li key={theme.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-2 text-left"
                          onClick={() => setExpandedThemeId(expanded ? null : theme.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium text-pretty">{theme.name}</span>
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {theme.status}
                        </Badge>
                      </div>
                      {theme.description ? (
                        <p className="mt-1 text-xs text-muted-foreground text-pretty">{theme.description}</p>
                      ) : null}
                      {expanded && themeSummaries.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-border bg-background p-3">
                          {themeSummaries.map((summary) => (
                            <div key={summary.id} className="flex flex-col gap-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Summary v{summary.version} � {summary.status}
                              </p>
                              <p className="text-sm text-pretty whitespace-pre-line">{summary.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Key facts</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Confirmed, dated facts in order. Every line links back to its source page.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link to={`/matters/${matterId}/data/facts`} />}
              >
                Fact bank <ArrowRight size={13} />
              </Button>
            </div>
            {keyFacts.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">
                No confirmed facts yet. Confirm proposals in the fact bank and they appear here.
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {keyFacts.map((fact) => (
                  <li key={fact.id} className="relative px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tabular-nums text-primary">
                        {fact.dateStart ?? 'Undated'}
                      </span>
                      {fact.factType ? (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {fact.factType}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {fact.sourceCount} {fact.sourceCount === 1 ? 'source' : 'sources'}
                      </span>
                    </div>
                    <Link
                      to={`/matters/${matterId}/data/facts?focus=${fact.id}`}
                      className="mt-1 block text-sm text-pretty underline-offset-4 hover:underline"
                    >
                      {fact.text}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {(themesQuery.data?.length ?? 0) > 0 ? null : null}
          {themesQuery.data ? null : null}
        </>
      )}
    </div>
  );
}

