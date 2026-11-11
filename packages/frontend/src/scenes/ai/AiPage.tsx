import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { Skeleton } from '@depose/ui/components/skeleton';
import { CircleWarning, Trash } from '@coolicons/react';
import type { AiMessageDto, AiThreadDto } from '~/generated/schemas';
import { PageHeader } from '~/layout/PageHeader';
import { useSession } from '~/lib/auth/session';
import { useClientConfig } from '~/lib/config/client-config';
import { formatRelativeDate } from '~/lib/format/date';
import {
  useAiThread,
  useAiThreads,
  useCreateAiThread,
  useDeleteAiThread,
  useSendAiMessage,
} from './ai.queries';

export function AiPage() {
  const { matterId = '' } = useParams();
  const { can } = useSession();
  const { features } = useClientConfig();
  const threads = useAiThreads(matterId);
  const create = useCreateAiThread(matterId);
  const remove = useDeleteAiThread(matterId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = threads.data ?? [];
  const active = items.find((thread) => thread.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && items.length > 0) setActiveId(items[0].id);
    if (activeId && !items.some((thread) => thread.id === activeId)) setActiveId(null);
  }, [items, activeId]);

  const start = () =>
    create.mutate(undefined, {
      onSuccess: (thread) => setActiveId(thread.id),
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ask Dep AI"
        description={
          features.ai.enabled
            ? 'Model-assisted answers grounded in the confirmed record. Every point carries a citation.'
            : 'Grounded answers from the confirmed record. Every point carries a citation.'
        }
        actions={
          can('ai.ask') ? (
            <Button onClick={start} disabled={create.isPending}>
              {create.isPending ? 'Starting...' : 'New conversation'}
            </Button>
          ) : undefined
        }
      />

      {!can('ai.ask') ? (
        <div className="rounded-lg border border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Your role does not include AI access for this matter.
        </div>
      ) : (
        <div className="grid min-h-[28rem] gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="flex flex-col gap-1 rounded-lg border border-border p-2">
            <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Conversations
            </p>
            {threads.isPending ? (
              <div className="space-y-1 p-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              items.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  active={thread.id === activeId}
                  onSelect={() => setActiveId(thread.id)}
                  onDelete={() => {
                    remove.mutate(thread.id);
                    if (thread.id === activeId) setActiveId(null);
                  }}
                />
              ))
            )}
          </aside>

          {active ? (
            <ChatPane
              key={active.id}
              matterId={matterId}
              thread={active}
              onDeleted={() => setActiveId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center">
              <p className="text-sm font-medium">Ask about this matter</p>
              <p className="max-w-md text-sm text-muted-foreground text-pretty">
                Dep AI searches confirmed facts, opens their sources, and answers only from what
                the record supports. Start a conversation to try it.
              </p>
              <Button size="sm" onClick={start} disabled={create.isPending}>
                Start a conversation
              </Button>
              <p className="mt-2 max-w-md text-xs text-muted-foreground">
                Try: “What happened around the signing date?” or “Which facts mention the
                payment?”
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreadItem({
  thread,
  active,
  onSelect,
  onDelete,
}: {
  thread: AiThreadDto;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      }`}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <span className="block truncate text-sm">{thread.title ?? 'New conversation'}</span>
        <span className="block text-xs text-muted-foreground">
          {formatRelativeDate(thread.updatedAt)}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 group-hover:opacity-100"
        aria-label="Delete conversation"
        onClick={onDelete}
      >
        <Trash size={14} />
      </Button>
    </div>
  );
}

function ChatPane({
  matterId,
  thread,
  onDeleted,
}: {
  matterId: string;
  thread: AiThreadDto;
  onDeleted: () => void;
}) {
  const detail = useAiThread(matterId, thread.id);
  const send = useSendAiMessage(matterId, thread.id);
  const remove = useDeleteAiThread(matterId);
  const [draft, setDraft] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = detail.data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, send.isPending]);

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;
    setDraft('');
    setPendingText(content);
    send.mutate(content, {
      onSettled: () => setPendingText(null),
    });
  };

  return (
    <section className="flex min-h-[28rem] flex-col rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{thread.title ?? 'New conversation'}</p>
          <p className="text-xs text-muted-foreground">Grounded in confirmed facts</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(thread.id, {
              onSuccess: () => onDeleted(),
            })
          }
        >
          Delete
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {detail.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
          </div>
        ) : detail.isError ? (
          <p className="text-sm text-muted-foreground">
            This conversation could not be loaded.{' '}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void detail.refetch()}
            >
              Retry
            </button>
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium">Start with a question</p>
            <p className="max-w-sm text-sm text-muted-foreground text-pretty">
              Dep AI will search confirmed facts and cite the source document for each point.
            </p>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {pendingText ? (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              {pendingText}
            </div>
          </div>
        ) : null}
        {send.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-current" />
            Searching confirmed facts...
          </div>
        ) : null}
        {send.error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <CircleWarning size={16} className="mt-0.5 shrink-0" />
            {send.error instanceof Error ? send.error.message : 'The request failed.'}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about the facts, dates, people, or documents..."
            aria-label="Message Dep AI"
            className="max-h-32 min-h-16 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button onClick={submit} disabled={!draft.trim() || send.isPending}>
            {send.isPending ? 'Asking...' : 'Ask'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter sends, Shift+Enter adds a line. Answers use confirmed facts only.
        </p>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: AiMessageDto }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={isUser ? 'max-w-[85%]' : 'w-full max-w-[95%]'}>
        <div
          className={
            isUser
              ? 'rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
              : 'rounded-lg border border-border bg-card px-3 py-2.5 text-sm'
          }
        >
          <p className="whitespace-pre-line text-pretty">{message.content}</p>

          {!isUser && message.citations.length > 0 ? (
            <div className="mt-3 space-y-1.5 border-t border-border pt-2">
              <p className="text-xs font-medium text-muted-foreground">Sources</p>
              {message.citations.map((citation, index) => (
                <div key={citation.factId} className="rounded-md border border-border px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">
                    [{index + 1}]{' '}
                    {citation.documentName
                      ? `${citation.documentName}${
                          citation.pageNumber ? `, p. ${citation.pageNumber}` : ''
                        }`
                      : 'Manual fact'}
                  </p>
                  {citation.quote ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-pretty">“{citation.quote}”</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {!isUser ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {message.mode === 'model'
                ? `Model${message.model ? ` · ${message.model}` : ''}`
                : 'Grounded retrieval'}
            </p>
          ) : null}

          {!isUser && message.toolCalls.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {message.toolCalls.length} tool {message.toolCalls.length === 1 ? 'call' : 'calls'}
              </summary>
              <div className="mt-1 space-y-1">
                {message.toolCalls.map((call, index) => (
                  <div key={`${call.name}-${index}`} className="flex items-start gap-1.5 text-xs">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {call.name}
                    </Badge>
                    <span className="text-muted-foreground">{call.summary}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
