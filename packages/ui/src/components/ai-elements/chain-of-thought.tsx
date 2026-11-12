'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, CircleDashedIcon, LoaderCircleIcon } from 'lucide-react';

import { Badge } from '../ui/badge';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, toTraceStatus, type AiOpenProps } from './_internal';

/** A summary that expands into the steps an agent took. */
function ChainOfThought({
  className,
  children,
  open,
  defaultOpen,
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

function ChainOfThoughtHeader({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger> & { icon?: React.ReactNode }) {
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine>
        <TraceIcon>{icon ?? <CheckIcon />}</TraceIcon>
        <TraceTitle>{children}</TraceTitle>
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function ChainOfThoughtContent({
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

function ChainOfThoughtStep({
  className,
  label,
  description,
  status,
  icon,
  ...props
}: Omit<React.ComponentProps<typeof TraceLine>, 'children' | 'status'> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  status?: 'active' | 'pending' | 'complete';
  icon?: React.ReactNode;
}) {
  const resolvedIcon =
    icon ??
    (status === 'active' ? (
      <LoaderCircleIcon className="animate-spin" />
    ) : status === 'pending' ? (
      <CircleDashedIcon />
    ) : (
      <CheckIcon />
    ));

  return (
    <TraceLine status={toTraceStatus(status)} className={className} {...props}>
      <TraceIcon>{resolvedIcon}</TraceIcon>
      <TraceTitle>{label}</TraceTitle>
      {description === undefined ? null : (
        <TraceDescription>{description}</TraceDescription>
      )}
    </TraceLine>
  );
}

function ChainOfThoughtSearchResults({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="chain-of-thought-search-results"
      className={cn('flex flex-wrap gap-1.5 pl-6', className)}
      {...props}
    />
  );
}

function ChainOfThoughtSearchResult({
  className,
  ...props
}: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      data-slot="chain-of-thought-search-result"
      variant="secondary"
      className={cn('font-normal', className)}
      {...props}
    />
  );
}

function ChainOfThoughtImage({ className, alt = '', ...props }: React.ComponentProps<'img'>) {
  return (
    <img
      data-slot="chain-of-thought-image"
      alt={alt}
      className={cn('max-h-48 rounded-md border border-border object-contain', className)}
      {...props}
    />
  );
}

export {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
};
