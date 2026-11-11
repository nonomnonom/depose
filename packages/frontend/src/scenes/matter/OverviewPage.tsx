import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Progress } from '@depose/ui/components/progress';
import { Separator } from '@depose/ui/components/separator';
import { Skeleton } from '@depose/ui/components/skeleton';
import {
  ArrowRight,
  Check,
  CircleWarning,
  FileText,
  Sparkle,
  Upload,
} from '@coolicons/react';
import { api } from '~/lib/api/client';
import { queryKeys } from '~/lib/query/keys';
import { formatRelativeDate } from '~/lib/format/date';
import { useSession } from '~/lib/auth/session';

interface Overview {
  documents: {
    total: number;
    ready: number;
    processing: number;
    needsReview: number;
    failed: number;
  };
  facts: { total: number; proposed: number; confirmed: number; rejected: number };
  subsets: number;
  reviewQueue: {
    id: string;
    text: string;
    dateStart: string | null;
    confidence: number | null;
    createdAt: string;
  }[];
  recentDocuments: {
    id: string;
    fileName: string;
    type: string;
    processingStatus: string;
    pageCount: number | null;
    createdAt: string;
  }[];
  recentFacts: {
    id: string;
    text: string;
    dateStart: string | null;
    factType: string;
  }[];
}

const DOC_STATUS: Record<string, string> = {
  queued: 'Queued',
  processing: 'Reading',
  done: 'Ready',
  needs_review: 'Needs review',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function OverviewPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const overview = useQuery({
    queryKey: [...queryKeys.matter(matterId), 'overview'],
    queryFn: () => api.get<Overview>(`/api/v1/matters/${matterId}/overview`),
    enabled: Boolean(matterId),
    refetchInterval: (query) =>
      query.state.data?.documents.processing ? 3_000 : false,
  });

  if (overview.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="rounded-lg border border-border p-5">
        <p className="text-sm font-medium">The matter desk could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.error instanceof Error ? overview.error.message : 'Request failed.'}
        </p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => void overview.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const data = overview.data;
  const empty = data.documents.total === 0;
  const reviewProgress =
    data.facts.total > 0
      ? Math.round(((data.facts.total - data.facts.proposed) / data.facts.total) * 100)
      : 0;
  const ready = Boolean(data.documents.ready > 0 && data.facts.confirmed > 0);

  if (empty) {
    return <FirstRun matterId={matterId} canUpload={can('document.upload')} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Record status
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
              {ready ? 'The record is answering questions' : 'The record is taking shape'}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground text-pretty">
              {ready
                ? `${data.facts.confirmed} confirmed facts across ${data.documents.ready} ready documents. Dep AI can cite them now.`
                : 'Extraction proposes facts. Confirm the ones you trust, and Dep AI can use them as evidence.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ReadinessRing value={reviewProgress} />
            <div>
              <p className="text-sm font-medium">{reviewProgress}% reviewed</p>
              <p className="text-xs text-muted-foreground">
                {data.facts.proposed} awaiting review
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          <Metric label="Documents" value={data.documents.total} detail={`${data.documents.ready} ready`} />
          <Metric label="Facts" value={data.facts.total} detail={`${data.facts.confirmed} confirmed`} />
          <Metric label="In review" value={data.facts.proposed} detail="needs a decision" />
          <Metric label="Subsets" value={data.subsets} detail="scoped workspaces" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <SectionHead
              title="Needs your review"
              detail={
                data.reviewQueue.length > 0
                  ? 'Confirm what the record should stand on. Reject anything the documents do not support.'
                  : 'The review queue is clear.'
              }
              action={
                <Button variant="ghost" size="sm" render={<Link to={`/matters/${matterId}/facts`} />}>
                  Open fact bank <ArrowRight size={14} />
                </Button>
              }
            />
            {data.reviewQueue.length === 0 ? (
              <div className="flex items-center gap-3 border-t border-border px-5 py-8 text-sm text-muted-foreground">
                <Check size={18} className="text-primary" />
                Every proposed fact has been reviewed.
              </div>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {data.reviewQueue.map((fact) => (
                  <li key={fact.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-pretty">{fact.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fact.dateStart ?? 'Undated'}
                        {fact.confidence !== null
                          ? ` · ${Math.round(fact.confidence * 100)}% confidence`
                          : ''}
                        {' · '}
                        proposed {formatRelativeDate(fact.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link to={`/matters/${matterId}/facts?focus=${fact.id}`} />}
                    >
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <SectionHead
              title="Recent evidence"
              detail="The newest files in this matter and where they are in processing."
              action={
                <Button variant="ghost" size="sm" render={<Link to={`/matters/${matterId}/documents`} />}>
                  All documents <ArrowRight size={14} />
                </Button>
              }
            />
            <ul className="divide-y divide-border border-t border-border">
              {data.recentDocuments.map((document) => (
                <li key={document.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/50">
                    <FileText size={15} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{document.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.type.toUpperCase()}
                      {document.pageCount ? ` · ${document.pageCount} pages` : ''}
                      {' · '}
                      {formatRelativeDate(document.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={document.processingStatus === 'done' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {DOC_STATUS[document.processingStatus] ?? document.processingStatus}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkle size={16} className="text-primary" />
              <h2 className="text-sm font-semibold">Ask this record</h2>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Answers are built from confirmed facts and point back to the page they came from.
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              render={<Link to={`/matters/${matterId}/ai`} />}
            >
              Open Dep AI
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Record health</h2>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <HealthRow
                ok={data.documents.ready > 0}
                label="Text extracted"
                detail={`${data.documents.ready} of ${data.documents.total} files`}
              />
              <HealthRow
                ok={data.facts.confirmed > 0}
                label="Facts confirmed"
                detail={`${data.facts.confirmed} usable by Dep AI`}
              />
              <HealthRow
                ok={data.facts.proposed === 0}
                label="Review queue"
                detail={
                  data.facts.proposed === 0
                    ? 'clear'
                    : `${data.facts.proposed} proposed`
                }
              />
              {data.documents.needsReview > 0 ? (
                <HealthRow
                  ok={false}
                  label="No text layer"
                  detail={`${data.documents.needsReview} files need OCR`}
                />
              ) : null}
            </div>
            {data.documents.failed > 0 ? (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
                <CircleWarning size={13} className="mt-0.5 shrink-0" />
                {data.documents.failed} file{data.documents.failed === 1 ? '' : 's'} failed to
                process.
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Recently dated</h2>
            {data.recentFacts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Confirm dated facts to start a chronology.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col gap-3">
                {data.recentFacts.map((fact) => (
                  <li key={fact.id} className="relative border-l border-border pl-3">
                    <span className="absolute -left-[3px] top-1.5 size-1.5 rounded-full bg-primary" />
                    <p className="text-xs font-medium tabular-nums text-muted-foreground">
                      {fact.dateStart ?? 'Undated'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-pretty">{fact.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 -ml-2"
              render={<Link to={`/matters/${matterId}/chronology`} />}
            >
              Chronology <ArrowRight size={14} />
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FirstRun({ matterId, canUpload }: { matterId: string; canUpload: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Upload size={22} className="text-primary" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
        Start with the evidence
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
        Upload the documents that define this matter. Depose reads them, proposes atomic facts,
        and keeps every fact attached to its page.
      </p>
      <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-3">
        {[
          ['1', 'Upload', 'Contracts, letters, transcripts, exhibits.'],
          ['2', 'Review', 'Confirm the facts you would rely on.'],
          ['3', 'Ask', 'Dep AI answers with citations to the page.'],
        ].map(([step, title, detail]) => (
          <div key={step} className="rounded-lg border border-border bg-card p-4">
            <span className="text-xs font-semibold text-primary">{step}</span>
            <p className="mt-2 text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 flex gap-2">
        {canUpload ? (
          <Button render={<Link to={`/matters/${matterId}/documents`} />}>
            Upload documents
          </Button>
        ) : null}
        <Button variant="outline" render={<Link to={`/matters/${matterId}/ai`} />}>
          Open Dep AI
        </Button>
      </div>
    </div>
  );
}

function ReadinessRing({ value }: { value: number }) {
  return (
    <div
      className="relative flex size-14 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--muted) 0deg)`,
      }}
      aria-hidden
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-card text-xs font-semibold tabular-nums">
        {value}%
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-r border-border p-4 last:border-r-0 sm:border-b-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionHead({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function HealthRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {ok ? <Check size={11} /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
