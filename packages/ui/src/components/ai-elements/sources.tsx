'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ExternalLinkIcon, FileTextIcon } from 'lucide-react';

import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, type AiOpenProps } from './_internal';

const SourcesContext = React.createContext<{ count: number }>({ count: 0 });

/** The links and documents the agent used for a reply. */
function Sources({
  className,
  children,
  count,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> & AiOpenProps & { count?: number }) {
  const resolvedCount = count ?? 0;
  return (
    <SourcesContext.Provider value={{ count: resolvedCount }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </SourcesContext.Provider>
  );
}

function SourcesTrigger({
  className,
  children,
  count,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger> & { count?: number }) {
  const context = React.useContext(SourcesContext);
  const resolvedCount = count ?? context.count;
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine>
        <TraceIcon>
          <FileTextIcon />
        </TraceIcon>
        <TraceTitle>
          {children ?? `Used ${resolvedCount} source${resolvedCount === 1 ? '' : 's'}`}
        </TraceTitle>
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function SourcesContent({
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

function Source({
  className,
  href,
  title,
  children,
  ...props
}: Omit<React.ComponentProps<'a'>, 'title'> & { title?: React.ReactNode }) {
  const label = title ?? children ?? href;
  return (
    <a
      data-slot="source"
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('w-fit max-w-full cursor-pointer hover:text-foreground', className)}
      {...props}
    >
      <TraceLine>
        <TraceIcon>
          <ExternalLinkIcon />
        </TraceIcon>
        <TraceTitle>{label}</TraceTitle>
        <span className="sr-only"> (opens in a new tab)</span>
      </TraceLine>
    </a>
  );
}

export { Sources, SourcesTrigger, SourcesContent, Source };
