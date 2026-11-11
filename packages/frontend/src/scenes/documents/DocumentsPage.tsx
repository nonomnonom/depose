import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@depose/ui/components/alert-dialog';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Input } from '@depose/ui/components/input';
import { Skeleton } from '@depose/ui/components/skeleton';
import { File as FileIcon, Folder, Reload, Sparkle, Trash, Upload } from '@coolicons/react';
import type { DocumentDto, DocumentDtoStatus } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { formatRelativeDate } from '~/lib/format/date';
import { useRunExtraction } from '../facts/facts.queries';
import {
  useDeleteDocument,
  useDocuments,
  useReprocessDocument,
  useUploadDocument,
  type DocumentFilters,
} from './documents.queries';

const STATUS_LABELS: Record<DocumentDtoStatus, string> = {
  queued: 'Queued',
  processing: 'Reading',
  done: 'Ready',
  needs_review: 'Needs review',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const FILTERS: { label: string; value: DocumentDtoStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Reading', value: 'processing' },
  { label: 'Ready', value: 'done' },
  { label: 'Needs review', value: 'needs_review' },
  { label: 'Failed', value: 'failed' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentDtoStatus | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const filters: DocumentFilters = { q: search || undefined, status };
  const documents = useDocuments(matterId, filters);
  const upload = useUploadDocument(matterId, filters);
  const items = documents.data?.pages.flatMap((page) => page.items) ?? [];
  const canUpload = can('document.upload');

  const chooseFile = () => fileInput.current?.click();

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingName(file.name);
    upload.mutate(file, {
      onError: (error) =>
        setUploadError(error instanceof Error ? error.message : 'Upload failed.'),
      onSettled: () => {
        setUploadingName(null);
        if (fileInput.current) fileInput.current.value = '';
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Evidence"
        description="Source files stay untouched. Depose adds page text, chunks, and proposed facts on top."
        actions={
          canUpload ? (
            <Button onClick={chooseFile} disabled={upload.isPending}>
              <Upload size={15} />
              {upload.isPending ? `Uploading ${uploadingName ?? 'file'}…` : 'Upload documents'}
            </Button>
          ) : undefined
        }
      />

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg,.tif,.tiff,.eml,.msg"
        onChange={(event) => onFiles(event.target.files)}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20 hover:border-border-bold'
        }`}
      >
        <Upload size={20} className="text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            Drop a file here, or{' '}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={chooseFile}
            >
              choose one
            </button>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            PDF, DOCX, text, email, or images. Upload is separate from extraction.
          </p>
        </div>
      </div>

      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      {upload.data?.duplicate ? (
        <p className="text-sm text-muted-foreground">
          That file is already in this matter. The existing document was reused.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search file names…"
          aria-label="Search documents"
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter documents">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {documents.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : documents.isError ? (
        <ErrorState
          title="Documents could not be loaded"
          message={documents.error instanceof Error ? documents.error.message : undefined}
          onRetry={() => void documents.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
          <Folder size={26} className="text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium">{search ? 'No matching files' : 'No documents yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {search
                ? 'Try another file name or clear the status filter.'
                : 'Start with the documents that define the dispute.'}
            </p>
          </div>
          {!search && canUpload ? (
            <Button size="sm" onClick={chooseFile}>
              Upload document
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {items.length} file{items.length === 1 ? '' : 's'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                render={<Link to={`/matters/${matterId}/facts`} />}
              >
                Review proposed facts
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {items.map((document) => (
                <DocumentRow
                  key={document.id}
                  matterId={matterId}
                  document={document}
                  canDelete={can('document.delete')}
                  canReprocess={can('document.reprocess')}
                  canExtract={can('fact.create')}
                />
              ))}
            </ul>
          </div>
          {documents.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={documents.isFetchingNextPage}
              onClick={() => void documents.fetchNextPage()}
            >
              {documents.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function DocumentRow({
  matterId,
  document,
  canDelete,
  canReprocess,
  canExtract,
}: {
  matterId: string;
  document: DocumentDto;
  canDelete: boolean;
  canReprocess: boolean;
  canExtract: boolean;
}) {
  const remove = useDeleteDocument(matterId);
  const reprocess = useReprocessDocument(matterId);
  const extract = useRunExtraction(matterId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ready = document.status === 'done';

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
        <FileIcon size={16} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(document.sizeBytes)} · {document.type.toUpperCase()}
          {document.pageCount ? ` · ${document.pageCount} pages` : ''} ·{' '}
          {formatRelativeDate(document.createdAt)}
        </p>
        {document.processingError ? (
          <p className="mt-0.5 text-xs text-destructive">{document.processingError}</p>
        ) : null}
      </div>
      <Badge
        variant={ready ? 'secondary' : document.status === 'failed' ? 'destructive' : 'outline'}
        className="shrink-0 text-xs"
        title={document.processingError ?? undefined}
      >
        {STATUS_LABELS[document.status]}
      </Badge>
      {ready && canExtract ? (
        <Button
          variant="outline"
          size="sm"
          disabled={extract.isPending}
          onClick={() => extract.mutate(document.id)}
        >
          <Sparkle size={14} />
          {extract.isPending ? 'Starting…' : 'Extract facts'}
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        render={
          <a
            href={`/api/v1/matters/${matterId}/documents/${document.id}/download`}
            download={document.fileName}
          />
        }
      >
        Download
      </Button>
      {canReprocess ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Reprocess ${document.fileName}`}
          disabled={reprocess.isPending}
          onClick={() => reprocess.mutate(document.id)}
        >
          <Reload size={16} />
        </Button>
      ) : null}
      {canDelete ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${document.fileName}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash size={16} />
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {document.fileName}?</AlertDialogTitle>
              <AlertDialogDescription>
                The document disappears from the matter. Facts that cite it keep their citations
                for audit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(document.id, { onSuccess: () => setConfirmOpen(false) })}
              >
                {remove.isPending ? 'Deleting…' : 'Delete document'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </li>
  );
}
