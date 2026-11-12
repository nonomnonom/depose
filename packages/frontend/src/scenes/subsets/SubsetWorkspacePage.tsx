import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@depose/ui/components/alert-dialog';
import { Skeleton } from '@depose/ui/components/skeleton';
import { ArrowLeft, ArrowRight, FileText, Sparkle, Trash } from '@coolicons/react';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { useDocuments } from '../documents/documents.queries';
import { useDeleteSubset, useSubset, useSubsetFacts } from './subsets.queries';

export function SubsetWorkspacePage() {
  const { matterId = '', subsetId = '' } = useParams();
  const { can } = useSession();
  const subset = useSubset(matterId, subsetId);
  const facts = useSubsetFacts(matterId, subsetId);
  const documents = useDocuments(matterId, {});
  const remove = useDeleteSubset(matterId);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'facts' | 'documents'>('facts');
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (subset.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (subset.isError) {
    return (
      <ErrorState
        title="Subset could not be loaded"
        message={subset.error instanceof Error ? subset.error.message : undefined}
        onRetry={() => void subset.refetch()}
      />
    );
  }

  const data = subset.data;
  const documentIds = new Set(data.documentIds);
  const scopedDocuments = (documents.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (document) => documentIds.has(document.id),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          to={`/matters/${matterId}/data/subsets`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
          All subsets
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{data.subset.name}</h1>
              <Badge variant="outline">Subset</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
              {data.subset.description ??
                'A scoped workspace. Facts stay in the matter; only these documents are visible here.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              render={<Link to={`/matters/${matterId}/kim?subsetId=${subsetId}`} />}
            >
              <Sparkle size={14} />
              Ask inside subset
            </Button>
            {can('subset.delete') ? (
              <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)}>
                <Trash size={15} />
                <span className="sr-only">Delete subset</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card">
        <ScopeMetric label="Documents" value={data.subset.documentCount} />
        <ScopeMetric label="Facts" value={data.subset.factCount} />
        <ScopeMetric
          label="Issue mode"
          value={data.subset.applyMatterIssues ? 'Matter' : 'Own'}
        />
      </div>

      <div className="flex gap-1 border-b border-border" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'facts'}
          onClick={() => setTab('facts')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'facts'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Facts in scope
          {facts.data ? ` · ${facts.data.length}` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'documents'}
          onClick={() => setTab('documents')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'documents'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Documents · {data.subset.documentCount}
        </button>
      </div>

      {tab === 'facts' ? (
        facts.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : facts.data?.length === 0 ? (
          <EmptyScope
            text="No facts cite a document in this subset yet. Upload more evidence or run extraction on the scoped files."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {facts.data?.map((fact) => (
                <li key={fact.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      fact.status === 'confirmed' ? 'bg-primary' : 'border border-primary'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-pretty">{fact.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{fact.dateStart ?? 'Undated'}</span>
                      <span>·</span>
                      <span className="capitalize">{fact.factType}</span>
                      <span>·</span>
                      <span>{fact.status}</span>
                      {fact.mixedSources ? (
                        <>
                          <span>·</span>
                          <span className="text-foreground">Mixed sources</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link to={`/matters/${matterId}/data/facts?focus=${fact.id}`} />}
                  >
                    Open <ArrowRight size={13} />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {scopedDocuments.map((document) => (
              <li key={document.id} className="flex items-center gap-3 px-4 py-3">
                <FileText size={15} className="text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{document.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.type.toUpperCase()}
                    {document.pageCount ? ` · ${document.pageCount} pages` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {document.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {data.subset.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The subset disappears. The documents, facts, and outputs stay in the matter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(subsetId, {
                  onSuccess: () => navigate(`/matters/${matterId}/data/subsets`),
                })
              }
            >
              {remove.isPending ? 'Deleting…' : 'Delete subset'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScopeMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-border p-4 last:border-r-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyScope({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{text}</p>
    </div>
  );
}

