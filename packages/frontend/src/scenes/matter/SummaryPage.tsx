import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { ArrowRight, CircleWarning, Sparkle } from '@coolicons/react';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { factsControllerList } from '~/generated/endpoints';
import { api, unwrapData } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';

interface Issue {
  id: string;
  name: string;
  description: string | null;
  status: 'open' | 'closed';
  factCount: number;
}

interface FactRow {
  id: string;
  text: string;
  dateStart: string | null;
  factType: string | null;
  confidence: number | null;
  sourceCount: number;
}

interface ContradictionSummary {
  total: number;
  candidateCount: number;
  byStatus: { status: string; count: number }[];
}

interface Overview {
  documents: { total: number; ready: number; needsReview: number; failed: number };
  facts: { total: number; proposed: number; confirmed: number; rejected: number };
  subsets: number;
}

const ISSUE_STATUS: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
};

export function SummaryPage() {
  const { matterId = '' } = useParams();

  const overview = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'overview'],
    queryFn: () => api.get<Overview>(`/api/v1/matters/${matterId}/overview`),
    enabled: Boolean(matterId),
  });

  const issues = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'issues'],
    queryFn: () => api.get<{ items: Issue[] }>(`/api/v1/matters/${matterId}/issues`),
    enabled: Boolean(matterId),
  });

  const facts = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'summary-facts'],
    queryFn: async () =>
      unwrapData(await factsControllerList(matterId, { status: 'confirmed', limit: 100 })),
    enabled: Boolean(matterId),
  });

  const contradictions = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'inconsistency-summary'],
    queryFn: () =>
      api.get<ContradictionSummary>(
        `/api/v1/matters/${matterId}/inconsistencies/summary`,
      ),
    enabled: Boolean(matterId),
  });

  const loading = overview.isPending || issues.isPending || facts.isPending;
  const failed = overview.isError && issues.isError && facts.isError;

  if (failed) {
    return (
      <ErrorState
        title="The summary could not be loaded"
        message={overview.error instanceof Error ? overview.error.message : undefined}
        onRetry={() => {
          void overview.refetch();
          void issues.refetch();
          void facts.refetch();
          void contradictions.refetch();
        }}
      />
    );
  }

  const confirmed = facts.data?.items ?? [];
  const keyFacts = [...confirmed]
    .sort((left, right) => {
      const byDate = (left.dateStart ?? '9999').localeCompare(right.dateStart ?? '9999');
      if (byDate !== 0) return byDate;
      return (right.confidence ?? 0) - (left.confidence ?? 0);
    })
    .slice(0, 12);
  const openIssues = (issues.data?.items ?? []).filter((issue) => issue.status === 'open');
  const candidateCount = contradictions.data?.candidateCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Summary"
        description="What the record currently stands on: the issues in dispute, the confirmed facts, and where accounts conflict."
        actions={
          <>
            <Button variant="outline" render={<Link to={`/matters/${matterId}/chronology`} />}>
              Chronology
            </Button>
            <Button render={<Link to={`/matters/${matterId}/ai`} />}>
              <Sparkle size={14} />
              Ask Dep AI
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4">
            <Metric
              label="Confirmed facts"
              value={overview.data?.facts.confirmed ?? confirmed.length}
              detail={`${overview.data?.facts.proposed ?? 0} awaiting review`}
            />
            <Metric
              label="Ready documents"
              value={overview.data?.documents.ready ?? 0}
              detail={`of ${overview.data?.documents.total ?? 0} uploaded`}
            />
            <Metric
              label="Open issues"
              value={openIssues.length}
              detail={`of ${issues.data?.items.length ?? 0} issues`}
            />
            <Metric
              label="Conflicts to review"
              value={candidateCount}
              detail={
                contradictions.data?.total
                  ? `${contradictions.data.total} detected in total`
                  : 'none detected'
              }
            />
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Issues in dispute</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    The lens used to judge relevance. Facts can belong to more than one issue.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link to={`/matters/${matterId}/settings`} />}
                >
                  Manage
                </Button>
              </div>
              {issues.data?.items.length === 0 ? (
                <div className="px-5 py-10 text-sm text-muted-foreground">
                  No issues defined yet. Add them in matter settings so fact relevance has a
                  frame.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {issues.data?.items.map((issue) => (
                    <li key={issue.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-pretty">{issue.name}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={issue.status === 'open' ? 'secondary' : 'outline'}>
                            {ISSUE_STATUS[issue.status] ?? issue.status}
                          </Badge>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {issue.factCount} {issue.factCount === 1 ? 'fact' : 'facts'}
                          </span>
                        </div>
                      </div>
                      {issue.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground text-pretty">
                          {issue.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
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
                  render={<Link to={`/matters/${matterId}/facts`} />}
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
                        to={`/matters/${matterId}/facts?focus=${fact.id}`}
                        className="mt-1 block text-sm text-pretty underline-offset-4 hover:underline"
                      >
                        {fact.text}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {candidateCount > 0 ? (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-start gap-3">
                <CircleWarning size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {candidateCount} conflict{candidateCount === 1 ? '' : 's'} waiting for review
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Detection proposes pairs. A lawyer decides whether the conflict is material.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<Link to={`/matters/${matterId}/intelligence`} />}
              >
                Review conflicts <ArrowRight size={13} />
              </Button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-border p-4 last:border-r-0 sm:border-b-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
