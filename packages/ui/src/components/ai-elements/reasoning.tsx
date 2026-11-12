'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CircleCheckIcon, LoaderCircleIcon } from 'lucide-react';

import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, formatDuration, type AiOpenProps } from './_internal';

type ReasoningContextValue = {
  isStreaming: boolean;
  duration?: number;
  open: boolean;
};

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null);

export function useReasoning(): ReasoningContextValue {
  const value = React.useContext(ReasoningContext);
  if (!value) throw new Error('Reasoning parts must be rendered inside <Reasoning>.');
  return value;
}

/** The agent's thinking as it streams. Opens while thinking, closes when done. */
function Reasoning({
  className,
  children,
  isStreaming = false,
  duration,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> &
  AiOpenProps & { isStreaming?: boolean; duration?: number }) {
  const [override, setOverride] = React.useState<boolean | undefined>(undefined);
  const resolvedOpen = open ?? override ?? (isStreaming || defaultOpen === true);

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      setOverride(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );

  return (
    <ReasoningContext.Provider value={{ isStreaming, duration, open: resolvedOpen }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={resolvedOpen} onOpenChange={handleOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </ReasoningContext.Provider>
  );
}

function ReasoningTrigger({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger> & { title?: React.ReactNode }) {
  const { isStreaming, duration } = useReasoning();
  const label =
    title ??
    (isStreaming
      ? 'Thinking'
      : duration === undefined
        ? 'Thought'
        : `Thought for ${formatDuration(duration)}`);

  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={isStreaming ? 'running' : undefined}>
        <TraceIcon>
          {isStreaming ? <LoaderCircleIcon className="animate-spin" /> : <CircleCheckIcon />}
        </TraceIcon>
        <TraceTitle>{children ?? label}</TraceTitle>
        {!isStreaming && duration !== undefined ? (
          <TraceDescription>{formatDuration(duration)}</TraceDescription>
        ) : null}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function ReasoningContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent
      keepMounted
      className={cn('text-pretty whitespace-pre-wrap', className)}
      {...props}
    >
      {children}
    </TraceCollapsibleContent>
  );
}

export { Reasoning, ReasoningTrigger, ReasoningContent };
