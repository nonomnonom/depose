import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Skeleton } from '@depose/ui/components/skeleton';
import { CircleWarning, Play, Sparkle, Stop } from '@coolicons/react';
import { PageHeader } from '~/features/layout/PageHeader';
import { ErrorState } from '~/features/layout/ErrorPage';
import { MatterContextCard } from '~/features/layout/components/AppShellUx';
import { api } from '~/features/lib/api/client';
import { useSession } from '~/features/lib/auth/session';
import { queryKeys } from '~/features/lib/query/keys';
import { formatDateTime } from '~/features/lib/format/date';



interface SessionRow {
  id: string;
  status: string;
  language: string | null;
  sensitivity: string | null;
  createdAt: string;
  endedAt: string | null;
}

interface LineRow {
  id: string;
  sequence: number;
  speaker: string | null;
  text: string;
  checkStatus: string;
  createdAt: string;
}

interface CheckSource {
  id: string;
  type: 'chunk' | 'fact';
  fileName?: string;
  pageNumber?: number | null;
  excerpt: string;
}

interface CheckResult {
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  verdict: 'supports' | 'contradicts' | 'silent' | 'unclear';
  insufficientEvidence: boolean;
  sources: CheckSource[];
  citedSourceIds: string[];
}

interface RecordResponse {
  line: LineRow;
  alerts: { id: string; kind: string; severity: string; summary: string }[];
  check: CheckResult | null;
  warning?: string;
}

const VERDICT_LABEL: Record<string, string> = {
  supports: 'Record supports',
  contradicts: 'Record contradicts',
  silent: 'Record is silent',
  unclear: 'Needs a human read',
};

const VERDICT_CLASS: Record<string, string> = {
  supports: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  contradicts: 'border-destructive/40 bg-destructive/10 text-destructive',
  silent: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  unclear: 'border-border bg-muted text-muted-foreground',
};

export function LivePage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState('Witness');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const sessions = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'realtime-sessions'],
    queryFn: () => api.get<{ items: SessionRow[] }>(`/api/v1/matters/${matterId}/realtime/sessions`),
    enabled: Boolean(matterId),
  });

  const currentId = activeId ?? sessions.data?.items[0]?.id ?? null;
  const current = sessions.data?.items.find((session) => session.id === currentId) ?? null;

  const lines = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'realtime-lines', currentId],
    queryFn: () =>
      api.get<{ items: LineRow[] }>(
        `/api/v1/matters/${matterId}/realtime/sessions/${currentId}/lines`,
      ),
    enabled: Boolean(matterId && currentId),
    refetchInterval: current?.status === 'active' ? 4_000 : false,
  });

  const createSession = useMutation({
    mutationFn: () =>
      api.post<{ session: SessionRow }>(`/api/v1/matters/${matterId}/realtime/sessions`, {
        sensitivity: 'balanced',
      }),
    onSuccess: (data) => {
      setActiveId(data.session.id);
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.matter(matterId), 'realtime-sessions'],
      });
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Could not start session.'),
  });

  const endSession = useMutation({
    mutationFn: () =>
      api.patch<{ session: SessionRow }>(
        `/api/v1/matters/${matterId}/realtime/sessions/${currentId}/end`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.matter(matterId), 'realtime-sessions'],
      });
      void lines.refetch();
    },
    onError: (mutationError) =>
      setError(mutationError instanceof Error ? mutationError.message : 'Could not end session.'),
  });

  const runCheck = useMutation({
    mutationFn: async (): Promise<CheckResult | null> => {
      if (currentId && current?.status === 'active') {
        const recorded = await api.post<RecordResponse>(
          `/api/v1/matters/${matterId}/realtime/sessions/${currentId}/lines`,
          { speaker: speaker.trim() || undefined, text: statement.trim() },
        );
        if (recorded.warning) setWarning(recorded.warning);
        else setWarning(null);
        void lines.refetch();
        return recorded.check;
      }
      const result = await api.post<
        CheckResult & { sources: CheckSource[]; citedSourceIds: string[] }
      >(`/api/v1/matters/${matterId}/intelligence/realtime-check`, {
        question: statement.trim(),
      });
      setWarning(null);
      return result;
    },
    onSuccess: (result) => {
      setError(null);
      setCheck(result);
      setStatement('');
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error ? mutationError.message : 'The record check failed.',
      ),
  });

  const items = sessions.data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Live check"
        description="Compare a statement spoken in a hearing or deposition against the fact bank. Checking is advisory; a lawyer decides what to do with it."
      />

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-muted-foreground">
        <CircleWarning size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-pretty">
          In England and Wales, hearings are recorded by the court under CPR 39.9 and only
          authorised providers may supply a live transcript. Use this with an authorised feed and
          the court&apos;s permission. In the US, check the jurisdiction&apos;s rules before using
          a realtime feed.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkle size={15} className="text-primary" />
                <h2 className="text-sm font-semibold">Check a statement</h2>
                {current ? (
                  <Badge variant={current.status === 'active' ? 'secondary' : 'outline'}>
                    {current.status === 'active' ? 'Recording' : 'Session ended'}
                  </Badge>
                ) : (
                  <Badge variant="outline">Ad hoc · not stored</Badge>
                )}
              </div>
              {current?.status === 'active' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!can('realtime.end') || endSession.isPending}
                  onClick={() => endSession.mutate()}
                >
                  <Stop size={13} /> End session
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <Input
                  value={speaker}
                  onChange={(event) => setSpeaker(event.target.value)}
                  placeholder="Speaker"
                  aria-label="Speaker"
                />
                <textarea
                  value={statement}
                  onChange={(event) => setStatement(event.target.value)}
                  placeholder="Type or paste what was just said…"
                  aria-label="Statement"
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => runCheck.mutate()}
                  disabled={
                    statement.trim().length < 3 ||
                    runCheck.isPending ||
                    (current ? !can('realtime.send') && current.status === 'active' : false)
                  }
                >
                  <Play size={14} />
                  {runCheck.isPending ? 'Checking the record…' : 'Check against the record'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {current?.status === 'active'
                    ? 'Stored in this session with a citation trail.'
                    : 'Start a session to keep lines and alerts for review.'}
                </p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {warning ? (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CircleWarning size={13} className="mt-0.5 shrink-0" /> {warning}
                </p>
              ) : null}
            </div>
          </section>

          {check ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${VERDICT_CLASS[check.verdict]}`}
                >
                  {VERDICT_LABEL[check.verdict] ?? check.verdict}
                </span>
                <span className="text-xs text-muted-foreground">
                  {check.confidence} confidence · {check.sources.length} sources retrieved
                </span>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-pretty">
                {check.answer}
              </p>
              {check.sources.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  {check.sources.slice(0, 5).map((source) => (
                    <li key={source.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {source.fileName ?? (source.type === 'fact' ? 'Fact' : 'Passage')}
                        {source.pageNumber ? ` · p. ${source.pageNumber}` : ''}
                      </span>
                      <p className="mt-0.5 line-clamp-2">{source.excerpt}</p>
                      {source.type === 'fact' ? (
                        <Link
                          to={`/matters/${matterId}/data/facts?focus=${source.id}`}
                          className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Verify the fact
                        </Link>
                      ) : (
                        <Link
                          to={`/matters/${matterId}/data/search?q=${encodeURIComponent(source.excerpt.slice(0, 80))}`}
                          className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Find the passage
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
                Always review the cited source. A model answer is not evidence.
              </p>
            </section>
          ) : null}

          {currentId ? (
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-medium">
                  Transcript · {lines.data?.items.length ?? 0} lines
                </h2>
              </div>
              {lines.isPending ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (lines.data?.items.length ?? 0) === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  No lines recorded in this session yet.
                </p>
              ) : (
                <ol className="max-h-[50dvh] divide-y divide-border overflow-y-auto">
                  {lines.data?.items.map((line) => (
                    <li key={line.id} className="flex gap-3 px-4 py-2.5">
                      <span className="w-8 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-muted-foreground">
                        {line.sequence}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {line.speaker ?? 'Speaker'}
                        </p>
                        <p className="mt-0.5 text-sm text-pretty">{line.text}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {line.checkStatus === 'checked'
                            ? 'Checked against the record'
                            : line.checkStatus === 'unchecked'
                              ? 'Stored without a check'
                              : 'Not checked yet'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <MatterContextCard title="Live check">
            <p className="text-sm font-medium">Compare a statement against the fact bank</p>
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
              Checking is advisory; a lawyer decides what to do with it.
            </p>
          </MatterContextCard>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <h2 className="text-sm font-medium">Sessions</h2>
              {can('realtime.start') ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={createSession.isPending}
                  onClick={() => createSession.mutate()}
                >
                  {createSession.isPending ? 'Starting…' : 'Start'}
                </Button>
              ) : null}
            </div>
            {sessions.isPending ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sessions.isError ? (
              <ErrorState
                title="Sessions unavailable"
                message={sessions.error instanceof Error ? sessions.error.message : undefined}
                onRetry={() => void sessions.refetch()}
                secondaryHref={`/matters/${matterId}/summary`}
                secondaryLabel="Back to overview"
              />
            ) : items.length === 0 ? (
              <div className="px-3 py-6">
                <p className="text-xs text-muted-foreground">No live sessions yet.</p>
                {can('realtime.start') ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => createSession.mutate()}
                  >
                    Start session
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(session.id)}
                      className={`w-full px-3 py-2.5 text-left transition-colors ${
                        session.id === currentId ? 'bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {session.status === 'active' ? 'Active session' : 'Ended session'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Started {formatDateTime(session.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Lines are stored before checking, so a provider outage never loses testimony. Every
            alert keeps the facts it was raised against.
          </p>
        </aside>
      </div>
    </div>
  );
}

