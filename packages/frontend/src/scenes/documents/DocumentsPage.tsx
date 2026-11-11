import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { File as FileIcon, Folder, Reload, Trash } from '@coolicons/react';
import type { DocumentDto, DocumentDtoStatus } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { ErrorState } from '~/layout/ErrorPage';
import { useSession } from '~/lib/auth/session';
import { formatRelativeDate } from '~/lib/format/date';
import {
  useDeleteDocument,
  useDocuments,
  useReprocessDocument,
  useUploadDocument,
  type DocumentFilters,
} from './documents.queries';

const STATUS_LABELS: Record<DocumentDtoStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  done: 'Ready',
  needs_review: 'Needs review',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_VARIANTS: Record<DocumentDtoStatus, 'secondary' | 'outline' | 'destructive'> = {
  queued: 'outline',
  processing: 'outline',
  done: 'secondary',
  needs_review: 'outline',
  failed: 'destructive',
  cancelled: 'outline',
};

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
  const fileInput = useRef<HTMLInputElement>(null);

  const filters: DocumentFilters = { q: search || undefined, status };
  const documents = useDocuments(matterId, filters);
  const upload = useUploadDocument(matterId, filters);
  const items = documents.data?.pages.flatMap((page) => page.items) ?? [];
  const canUpload = can('document.upload');

  const chooseFile = () => fileInput.current?.click();

  const onFile = (file: File | undefined) => {
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
        title="Documents"
        description="Source files for this matter. Originals stay untouched; processing adds pages and text."
        actions={
          canUpload ? (
            <Button onClick={chooseFile} disabled={upload.isPending}>
              {upload.isPending ? `Uploading ${uploadingName ?? 'file'}...` : 'Upload document'}
            </Button>
          ) : undefined
        }
      />

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg,.tif,.tiff,.eml,.msg"
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search file names..."
          aria-label="Search documents"
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter documents">
          <Button
            size="sm"
            variant={status === undefined ? 'secondary' : 'ghost'}
            onClick={() => setStatus(undefined)}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={status === 'queued' ? 'secondary' : 'ghost'}
            onClick={() => setStatus('queued')}
          >
            Queued
          </Button>
          <Button
            size="sm"
            variant={status === 'done' ? 'secondary' : 'ghost'}
            onClick={() => setStatus('done')}
          >
            Ready
          </Button>
          <Button
            size="sm"
            variant={status === 'failed' ? 'secondary' : 'ghost'}
            onClick={() => setStatus('failed')}
          >
            Failed
          </Button>
        </div>
      </div>

      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
      {upload.data?.duplicate ? (
        <p className="text-sm text-muted-foreground">
          That file is already in this matter. Reused the existing document.
        </p>
      ) : null}

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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
          <Folder size={28} className="text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium">{search ? 'No matching files' : 'No documents yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {search
                ? 'Try a different file name or clear the status filter.'
                : 'Upload contracts, correspondence, transcripts, and exhibits to build the record.'}
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
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {items.map((document) => (
              <DocumentRow
                key={document.id}
                matterId={matterId}
                document={document}
                canDelete={can('document.delete')}
                canReprocess={can('document.reprocess')}
              />
            ))}
          </div>
          {documents.hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={documents.isFetchingNextPage}
              onClick={() => void documents.fetchNextPage()}
            >
              {documents.isFetchingNextPage ? 'Loading...' : 'Load more'}
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
}: {
  matterId: string;
  document: DocumentDto;
  canDelete: boolean;
  canReprocess: boolean;
}) {
  const remove = useDeleteDocument(matterId);
  const reprocess = useReprocessDocument(matterId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
        <FileIcon size={16} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(document.sizeBytes)} · {document.type.toUpperCase()} · Uploaded{' '}
          {formatRelativeDate(document.createdAt)}
        </p>
        {document.processingError ? (
          <p className="mt-0.5 text-xs text-destructive">{document.processingError}</p>
        ) : null}
      </div>
      <Badge
        variant={STATUS_VARIANTS[document.status]}
        className="shrink-0 text-xs"
        title={document.processingError ?? undefined}
      >
        {STATUS_LABELS[document.status]}
      </Badge>
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
                onClick={() =>
                  remove.mutate(document.id, { onSuccess: () => setConfirmOpen(false) })
                }
              >
                {remove.isPending ? 'Deleting...' : 'Delete document'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
