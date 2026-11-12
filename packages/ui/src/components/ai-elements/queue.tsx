'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, ChevronRightIcon, CircleDashedIcon, XIcon } from 'lucide-react';

import { Button } from '../ui/button';
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, toTraceStatus, type AiOpenProps, type AgentStatus } from './_internal';

/** The agent's todo list, split into what is left and what is done. */
function Queue({ className, ...props }: React.ComponentProps<typeof Trace>) {
  return <Trace className={className} {...props} />;
}

function QueueSection({
  className,
  children,
  open,
  defaultOpen = true,
  onOpenChange,
}: AiOpenProps & { className?: string; children?: React.ReactNode }) {
  return (
    <AiCollapsible
      className={className}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </AiCollapsible>
  );
}

function QueueSectionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      {children}
    </TraceCollapsibleTrigger>
  );
}

function QueueSectionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent keepMounted className={className} {...props}>
      <Trace>{children}</Trace>
    </TraceCollapsibleContent>
  );
}

function QueueSectionLabel({
  className,
  icon,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TraceLine>, 'children'> & {
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <TraceLine className={className} {...props}>
      <TraceIcon>{icon ?? <ChevronRightIcon />}</TraceIcon>
      <TraceTitle>{children}</TraceTitle>
    </TraceLine>
  );
}

function QueueList({ className, ...props }: React.ComponentProps<typeof Trace>) {
  return <Trace className={cn('pl-1', className)} {...props} />;
}

function QueueItem({
  className,
  status,
  ...props
}: React.ComponentProps<typeof TraceLine> & { status?: AgentStatus }) {
  return <TraceLine status={toTraceStatus(status)} className={className} {...props} />;
}

function QueueItemIndicator({
  className,
  status,
  children,
  ...props
}: React.ComponentProps<'span'> & { status?: AgentStatus }) {
  return (
    <TraceIcon className={className} {...props}>
      {children ??
        (status === 'complete' ? (
          <CheckIcon />
        ) : status === 'error' ? (
          <XIcon />
        ) : (
          <CircleDashedIcon />
        ))}
    </TraceIcon>
  );
}

function QueueItemContent({ className, ...props }: React.ComponentProps<typeof TraceTitle>) {
  return <TraceTitle className={cn('text-foreground', className)} {...props} />;
}

function QueueItemDescription({
  className,
  ...props
}: React.ComponentProps<typeof TraceDescription>) {
  return <TraceDescription className={className} {...props} />;
}

function QueueItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="queue-item-actions"
      className={cn('ml-auto flex shrink-0 items-center gap-0.5', className)}
      {...props}
    />
  );
}

function QueueItemAction({
  className,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label?: string }) {
  return (
    <Button
      data-slot="queue-item-action"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      className={className}
      {...props}
    />
  );
}

function QueueItemAttachment({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="queue-item-attachment"
      className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function QueueItemImage({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      data-slot="queue-item-image"
      className={cn('size-6 rounded border border-border object-cover', className)}
      {...props}
    />
  );
}

function QueueItemFile({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="queue-item-file"
      className={cn('flex min-w-0 items-center gap-1.5', className)}
      {...props}
    />
  );
}

function QueueItemFileText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="queue-item-file-text"
      className={cn('truncate text-xs', className)}
      {...props}
    />
  );
}

function QueueItemFileActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="queue-item-file-actions"
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    />
  );
}

function QueueItemFileRemove({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="queue-item-file-remove"
      variant="ghost"
      size="icon-xs"
      aria-label="Remove attachment"
      className={className}
      {...props}
    >
      <XIcon />
    </Button>
  );
}

export {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionContent,
  QueueSectionLabel,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemImage,
  QueueItemFile,
  QueueItemFileText,
  QueueItemFileActions,
  QueueItemFileRemove,
  TraceCollapsible as QueueCollapsible,
};
