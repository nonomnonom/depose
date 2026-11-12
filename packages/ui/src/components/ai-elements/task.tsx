'use client';

import * as React from 'react';
import { cn } from 'cn';

import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, toTraceStatus, type AiOpenProps, type AgentStatus } from './_internal';

/** The steps the agent takes, as it takes them. */
function Task({
  className,
  children,
  open,
  defaultOpen = true,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> & AiOpenProps) {
  return (
    <Trace className={className} {...props}>
      <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        {children}
      </AiCollapsible>
    </Trace>
  );
}

function TaskTrigger({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger> & { title?: React.ReactNode }) {
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine>
        <TraceTitle>{children ?? title}</TraceTitle>
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function TaskContent({
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

function TaskItem({
  className,
  status,
  icon,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TraceLine>, 'children'> & {
  status?: AgentStatus;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <TraceLine status={toTraceStatus(status)} className={className} {...props}>
      {icon ? <TraceIcon>{icon}</TraceIcon> : null}
      <TraceTitle>{children}</TraceTitle>
    </TraceLine>
  );
}

function TaskItemFile({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="task-item-file"
      className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[11px]', className)}
      {...props}
    />
  );
}

export { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile };
