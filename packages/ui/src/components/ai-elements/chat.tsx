'use client';

import * as React from 'react';
import { cn } from 'cn';
import { DownloadIcon } from 'lucide-react';

import { Button } from '../ui/button';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '../ui/message-scroller';

type ExportableMessage = {
  role?: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

/** Exports a transcript as Markdown. Accepts plain or AI SDK style messages. */
export function messagesToMarkdown(messages: ExportableMessage[]): string {
  return messages
    .map((message) => {
      const text =
        message.content ??
        (message.parts ?? [])
          .filter((part) => part.type === 'text' || part.text !== undefined)
          .map((part) => part.text ?? '')
          .join('');
      const role = message.role === 'user' ? 'You' : 'Assistant';
      return `### ${role}\n\n${text}`;
    })
    .join('\n\n---\n\n');
}

type ConversationProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  children?: React.ReactNode;
  autoScroll?: boolean;
  defaultScrollPosition?: 'start' | 'end' | 'last-anchor';
  scrollEdgeThreshold?: number;
  scrollPreviousItemPeek?: number;
  scrollMargin?: number;
};

/** The thread. Keeps your place while the reply streams. */
function Conversation({
  className,
  children,
  autoScroll = true,
  defaultScrollPosition = 'end',
  scrollEdgeThreshold,
  scrollPreviousItemPeek,
  scrollMargin,
  ...props
}: ConversationProps) {
  return (
    <MessageScrollerProvider
      autoScroll={autoScroll}
      defaultScrollPosition={defaultScrollPosition}
      scrollEdgeThreshold={scrollEdgeThreshold}
      scrollPreviousItemPeek={scrollPreviousItemPeek}
      scrollMargin={scrollMargin}
    >
      <MessageScroller className={className} {...props}>
        {children}
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function ConversationContent({
  className,
  contentClassName,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MessageScrollerViewport>, 'children'> & {
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <MessageScrollerViewport className={className} {...props}>
      <MessageScrollerContent className={contentClassName}>{children}</MessageScrollerContent>
    </MessageScrollerViewport>
  );
}

function ConversationItem({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerItem>) {
  return <MessageScrollerItem className={className} {...props} />;
}

function ConversationScrollButton({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerButton>) {
  return <MessageScrollerButton className={className} {...props} />;
}

function ConversationEmptyState({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="conversation-empty-state"
      className={cn(
        'flex size-full flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function ConversationDownload({
  className,
  messages,
  filename = 'conversation.md',
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children' | 'onClick'> & {
  messages: ExportableMessage[];
  filename?: string;
  children?: React.ReactNode;
}) {
  const download = React.useCallback(() => {
    const blob = new Blob([messagesToMarkdown(messages)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [messages, filename]);

  return (
    <Button
      data-slot="conversation-download"
      variant="ghost"
      size="icon-sm"
      aria-label="Download conversation"
      className={className}
      onClick={download}
      {...props}
    >
      {children ?? <DownloadIcon />}
    </Button>
  );
}

export {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
  ConversationEmptyState,
  ConversationDownload,
  // Modern names
  Conversation as Chat,
  ConversationContent as ChatContent,
  ConversationItem as ChatItem,
  ConversationScrollButton as ChatScrollButton,
  ConversationEmptyState as ChatEmptyState,
  ConversationDownload as ChatDownload,
};
