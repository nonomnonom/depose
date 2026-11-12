import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Skeleton } from '@depose/ui/components/skeleton';
import { documentsControllerPage } from '~/generated/endpoints';
import type { FactSourceDto } from '~/generated/schemas';
import { unwrapData } from '~/features/lib/api/client';

export function SourceViewer({
  matterId,
  source,
}: {
  matterId: string;
  source: FactSourceDto;
}) {
  const page = useQuery({
    queryKey: ['matter', matterId, 'document-page', source.documentId, source.pageNumber],
    queryFn: async () =>
      unwrapData(
        await documentsControllerPage(matterId, source.documentId, source.pageNumber ?? 1),
      ),
    enabled: Boolean(source.documentId && source.pageNumber),
    staleTime: 5 * 60_000,
  });

  return (
    <article className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[11px]">
          {source.documentName}
        </Badge>
        {source.pageNumber ? (
          <span className="text-xs text-muted-foreground">p. {source.pageNumber}</span>
        ) : null}
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {source.verification === 'fuzzy' ? 'Fuzzy match · review' : source.verification}
        </span>
      </div>

      <blockquote className="rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm text-pretty">
        “{source.quote}”
      </blockquote>

      {source.pageNumber ? (
        <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Page {source.pageNumber}
          </p>
          {page.isPending ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : page.isError ? (
            <p className="text-xs text-muted-foreground">
              Page text is not available. The citation is preserved from extraction.
            </p>
          ) : (
            <Highlighted text={page.data.text} quote={source.quote} />
          )}
        </div>
      ) : null}
    </article>
  );
}

function Highlighted({ text, quote }: { text: string; quote: string }) {
  const normalizedText = text.replace(/\s+/g, ' ');
  const normalizedQuote = quote.replace(/\s+/g, ' ').trim();
  const index = normalizedQuote ? normalizedText.indexOf(normalizedQuote) : -1;
  if (index < 0) {
    return (
      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
        {text}
      </p>
    );
  }
  const start = Math.max(0, index - 320);
  const end = Math.min(normalizedText.length, index + normalizedQuote.length + 420);
  return (
    <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
      {start > 0 ? '…' : ''}
      {normalizedText.slice(start, index)}
      <mark className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {normalizedText.slice(index, index + normalizedQuote.length)}
      </mark>
      {normalizedText.slice(index + normalizedQuote.length, end)}
      {end < normalizedText.length ? '…' : ''}
    </p>
  );
}
