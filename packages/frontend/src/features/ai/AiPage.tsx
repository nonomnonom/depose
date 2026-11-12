import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { ScrollArea } from '@depose/ui/components/scroll-area';
import { Skeleton } from '@depose/ui/components/skeleton';
import { Tool, ToolContent, ToolHeader, ToolInput } from '@depose/ui/ai-elements';
import {
  AlertTriangleIcon,
  ArrowRight,
  ChevronLeft,
  CircleWarning,
  FileText,
  Plus,
  Sparkle,
  Trash,
} from '@coolicons/react';
import type {
  ConversationMessageDto,
  ConversationThreadDto,
} from '~/generated/schemas';
import { useSession } from '~/features/lib/auth/session';
import { useClientConfig } from '~/features/lib/config/client-config';
import { formatRelativeDate } from '~/features/lib/format/date';
import {
  AccessBlock,
  EmptyState,
  MatterContextCard,
  SidebarCaption,
} from '~/features/layout/components/AppShellUx';
import { SourceViewer } from '../facts/components/SourceViewer';
import {
  useAiThread,
  useAiThreads,
  useCreateAiThread,
  useDeleteAiThread,
  useSendAiMessage,
} from './ai.queries';

const SUGGESTIONS = [
  'What happened around the signing date?',
  'Which facts mention payment?',
  'Who was involved in the termination?',
  'What is missing from the record?',
];

export function AiPage() {
  const { matterId = '' } = useParams();
  const [params] = useSearchParams();
  const subsetId = params.get('subsetId') ?? undefined;
  const { can } = useSession();
  const { features } = useClientConfig();
  const threads = useAiThreads(matterId);
  const create = useCreateAiThread(matterId);
  const remove = useDeleteAiThread(matterId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showThreads, setShowThreads] = useState(false);

  const items = useMemo(() => threads.data ?? [], [threads.data]);
  const active = items.find((thread) => thread.id === activeId) ?? null;

  useEffect(() => {
    if (items.length === 0) return;
    if (!activeId || !items.some((thread) => thread.id === activeId)) {
      setActiveId(items[0]?.id ?? null);
    }
  }, [items, activeId]);

  const start = (prompt?: string) =>
    create.mutate(
      { ...(subsetId ? { subsetId } : {}) },
      {
        onSuccess: (thread) => {
          setActiveId(thread.id);
          setShowThreads(false);
          if (prompt) sessionStorage.setItem(`dep-ai-draft:${thread.id}`, prompt);
        },
      },
    );

  if (!can('ai.ask')) {
    return (
      <AccessBlock
        message="Your role does not include Dep AI access for this matter. Ask an admin to update your permissions if this should change."
      />
    );
  }

  return (
    <div className="flex min-h-[36rem] flex-col gap-3 lg:h-[calc(100dvh-12rem)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowThreads((value) => !value)}
          >
            <ChevronLeft size={15} />
            Conversations
          </Button>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <Sparkle size={15} className="text-primary" />
            <span>Grounded in confirmed facts and their source pages</span>
            {features.ai.enabled ? null : (
              <Badge variant="outline" className="text-[10px]">
                Retrieval only
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => start()} disabled={create.isPending}>
          <Plus size={14} />
          New conversation
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside
          className={`${
            showThreads ? 'flex' : 'hidden lg:flex'
          } min-h-0 flex-col border-r border-border bg-muted/20`}
        >
          <MatterContextCard title="Conversations">
            <p className="text-sm font-medium">Training questions</p>
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
              Previous Dep AI conversations in this matter.
            </p>
          </MatterContextCard>

          <ScrollArea className="min-h-0 flex-1 mt-3">
            <div className="flex flex-col gap-0.5 p-2">
              {threads.isPending ? (
                <div className="space-y-2 p-1">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : items.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                items.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    active={thread.id === active?.id}
                    onSelect={() => {
                      setActiveId(thread.id);
                      setShowThreads(false);
                    }}
                    onDelete={() => {
                      remove.mutate(thread.id);
                      if (thread.id === active?.id) setActiveId(null);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          {subsetId ? (
            <SidebarCaption className="mt-3 border-t border-border px-3 py-2">
              Scoped to a Subset. Documents outside it are never searched.
            </SidebarCaption>
          ) : null}
        </aside>

        {active ? (
          <ChatPane
            key={active.id}
            matterId={matterId}
            thread={active}
            subsetId={subsetId}
            onDeleted={() => setActiveId(null)}
            onNew={() => start()}
            creating={create.isPending}
          />
        ) : (
          <EmptyConversation
            onStart={start}
            creating={create.isPending}
            subsetScoped={Boolean(subsetId)}
            matterId={matterId}
          />
        )}
      </div>
    </div>
  );
}

function EmptyConversation({
  onStart,
  creating,
  subsetScoped,
  matterId,
}: {
  onStart: (prompt?: string) => void;
  creating: boolean;
  subsetScoped: boolean;
  matterId: string;
}) {
  return (
    <EmptyState
      title="Ask the record"
      description="Dep AI searches confirmed facts, checks the quote on the page, and answers only from what the evidence supports. It will say so when the record cannot answer."
      action={{
        label: subsetScoped ? 'Ask inside this Subset' : 'Start a conversation',
        onClick: () => onStart(),
        disabled: creating,
      }}
    />
  );
}

function ThreadItem({
  thread,
  active,
  onSelect,
  onDelete,
}: {
  thread: ConversationThreadDto;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${
        active ? 'bg-background shadow-sm' : 'hover:bg-muted/60'
      }`}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <span className="block truncate text-sm">{thread.title ?? 'New conversation'}</span>
        <span className="block text-[11px] text-muted-foreground">
          {formatRelativeDate(thread.updatedAt)}
        </span>
      </button>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Delete conversation"
        onClick={onDelete}
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

function ChatPane({
  matterId,
  thread,
  subsetId,
  onDeleted,
  onNew,
  creating,
}: {
  matterId: string;
  thread: ConversationThreadDto;
  subsetId?: string;
  onDeleted: () => void;
  onNew: () => void;
  creating: boolean;
}) {
  const detail = useAiThread(matterId, thread.id);
  const send = useSendAiMessage(matterId, thread.id);
  const remove = useDeleteAiThread(matterId);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(() => detail.data?.messages ?? [], [detail.data]);
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const sources = latestAssistant?.sources ?? latestAssistant?.citations ?? [];

  useEffect(() => {
    const saved = sessionStorage.getItem(`dep-ai-draft:${thread.id}`);
    if (saved) {
      setDraft(saved);
      sessionStorage.removeItem(`dep-ai-draft:${thread.id}`);
    }
  }, [thread.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, send.isPending]);

  const submit = (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || send.isPending) return;
    setDraft('');
    setPendingText(content);
    setActiveSource(0);
    send.mutate(
      { content, mode, ...(subsetId ? { subsetId } : {}) },
      { onSettled: () => setPendingText(null) },
    );
  };

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex min-h-0 flex-col">
        <MatterContextCard title="Conversation">
          <p className="truncate text-sm font-medium">{thread.title ?? 'New conversation'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sources.length > 0
              ? `${sources.length} source${sources.length === 1 ? '' : 's'} in the last answer`
              : 'No answer yet'}
          </p>
        </MatterContextCard>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(['ask', 'agent'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  mode === value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <SidebarCaption>
            {mode === 'ask' ? 'One grounded answer' : 'May search and read pages across steps'}
          </SidebarCaption>
        </div>

        <ScrollArea className="min-h-0 flex-1 mt-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-5">
            {detail.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-3/4" />
                <Skeleton className="ml-auto h-12 w-1/2" />
              </div>
            ) : detail.isError ? (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="flex items-center gap-2">
                  <CircleWarning size={14} className="shrink-0" />
                  This conversation could not be loaded.
                </p>
                <button
                  type="button"
                  className="mt-2 underline underline-offset-4"
                  onClick={() => void detail.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm font-medium">Start with a question</p>
                <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                  Ask about dates, people, payments, or what the documents do not say.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => submit(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onCite={(index) => setActiveSource(index)}
                />
              ))
            )}

            {pendingText ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {pendingText}
                </div>
              </div>
            ) : null}
            {send.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                Searching facts, opening sources, checking citations…
              </div>
            ) : null}
            {send.error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <CircleWarning size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p>{send.error instanceof Error ? send.error.message : 'The request failed.'}</p>
                  <button
                    type="button"
                    className="mt-1 text-xs underline underline-offset-4"
                    onClick={onNew}
                    disabled={creating}
                  >
                    Start a new conversation
                  </button>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="mt-3 border-t border-border p-3">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  subsetId
                    ? 'Ask inside this Subset…'
                    : 'Ask about the facts, dates, people, or documents…'
                }
                aria-label="Message Dep AI"
                className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none"
              />
              <Button size="sm" onClick={() => submit()} disabled={!draft.trim() || send.isPending}>
                {send.isPending ? 'Asking…' : 'Ask'}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Enter sends · Shift+Enter adds a line. Answers never use facts outside this matter
              {subsetId ? ' and Subset' : ''}.
            </p>
          </div>
        </div>
      </section>

      <aside className="hidden min-h-0 flex-col border-l border-border bg-muted/15 lg:flex">
        <MatterContextCard title="Sources">
          {latestAssistant?.evidenceScore !== null && latestAssistant?.evidenceScore !== undefined ? (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              evidence {Math.round(latestAssistant.evidenceScore * 100)}%
            </p>
          ) : null}
        </MatterContextCard>

        <ScrollArea className="min-h-0 flex-1 mt-3">
          <div className="flex flex-col gap-4 p-3">
            {sources.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileText size={20} className="text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  Citations appear here after an answer.
                </p>
              </div>
            ) : (
              sources.map((source, index) => (
                <SourceCard
                  key={source.sourceId}
                  source={source}
                  isActive={activeSource === index}
                  onActivate={() => setActiveSource(index)}
                />
              ))
            )}
            {latestAssistant?.warnings.length ? (
              <div className="rounded-md border border-border px-2.5 py-2 text-[11px] text-muted-foreground">
                {latestAssistant.warnings.includes('vector_unavailable')
                  ? 'Vector search is off. Results use lexical retrieval and may miss paraphrases.'
                  : latestAssistant.warnings.join(', ')}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

function SourceCard({
  source,
  isActive,
  onActivate,
}: {
  source: {
    sourceId: string;
    factStatus: string;
    factText: string;
    documentId: string | null;
    documentName: string | null;
    pageNumber: number | null;
    quote: string | null;
    sourceKind: string;
  };
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        isActive
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        [{source.sourceId}] {source.factStatus}
      </p>
      <p className="mb-2 line-clamp-3 text-xs text-pretty">{source.factText}</p>
      {source.documentId && source.documentName ? (
        <SourceViewer
          matterId={source.documentId}
          source={{
            id: source.sourceId,
            documentId: source.documentId,
            documentName: source.documentName,
            pageNumber: source.pageNumber,
            quote: source.quote ?? '',
            verification: source.sourceKind,
          }}
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">Manual fact · no document</p>
      )}
    </div>
  );
}

function Message({
  message,
  onCite,
}: {
  message: ConversationMessageDto;
  onCite: (index: number) => void;
}) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const sources = message.sources?.length ? message.sources : message.citations;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10">
          <Sparkle size={13} className="text-primary" />
        </span>
        <span className="text-xs font-medium">Dep AI</span>
        {message.mode ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {message.mode}
          </span>
        ) : null}
        {message.model ? (
          <span className="ml-auto truncate text-[10px] text-muted-foreground">{message.model}</span>
        ) : null}
      </div>

      <div className="space-y-2.5 pl-2 text-sm leading-relaxed">
        {message.answer.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="text-pretty">
            {renderCitations(paragraph, sources.length, onCite)}
          </p>
        ))}
      </div>

      {message.insufficientEvidence ? (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <CircleWarning size={13} className="mt-0.5 shrink-0" />
          No confirmed evidence answered this question. Nothing was invented.
          {sources.length ? null : ' Try running extraction or confirming more facts.'}
        </div>
      ) : null}

      {message.unverifiedCitations.length > 0 ? (
        <p className="text-xs text-destructive">
          The answer cited {message.unverifiedCitations.join(', ')} which are not in the evidence
          pack. Treat those claims as unsupported.
        </p>
      ) : null}

      {sources.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((source, index) => (
            <CitationChip
              key={source.sourceId}
              source={source}
              isActive={false}
              onActivate={() => onCite(index)}
            />
          ))}
        </div>
      ) : null}

      {message.toolCalls.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground">
            {message.toolCalls.length} retrieval step
            {message.toolCalls.length === 1 ? '' : 's'}
          </p>
          {message.toolCalls.map((call, index) => (
            <Tool
              key={`${call.name}-${index}`}
              name={call.name}
              state="output-available"
              defaultOpen={false}
            >
              <ToolHeader title={call.summary} />
              <ToolContent>
                <ToolInput input={call.arguments} />
              </ToolContent>
            </Tool>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CitationChip({
  source,
  isActive,
  onActivate,
}: {
  source: {
    sourceId: string;
    documentName: string | null;
    pageNumber: number | null;
    factStatus: string;
  };
  isActive: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`rounded-lg border px-2 py-1 text-left transition-colors ${
        isActive
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-background hover:border-primary/40'
      }`}
    >
      <span className="block truncate text-[11px] font-medium text-muted-foreground">
        [{source.documentName ?? 'Manual fact'}]
      </span>
      <span className="block text-[11px] text-muted-foreground">
        {source.pageNumber ? `p. ${source.pageNumber}` : ''}
      </span>
    </button>
  );
}

function renderCitations(
  text: string,
  sourceCount: number,
  onCite: (index: number) => void,
) {
  const parts = text.split(/(\[\d{1,2}\])/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[(\d{1,2})\]$/);
    if (!match) return <span key={index}>{part}</span>;
    const number = Number(match[1]);
    const valid = number >= 1 && number <= sourceCount;
    return (
      <button
        key={index}
        type="button"
        onClick={() => onCite(number - 1)}
        className={`mx-0.5 rounded px-0.5 align-baseline text-[10px] font-semibold tabular-nums ${
          valid
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'bg-destructive/10 text-destructive'
        }`}
        aria-label={`Open source ${number}`}
      >
        {part}
      </button>
    );
  });
}
