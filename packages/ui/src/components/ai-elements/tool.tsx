'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, CircleAlertIcon, LoaderCircleIcon, WrenchIcon } from 'lucide-react';

import { CodeBlock, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, asText, toTraceStatus, type AiOpenProps } from './_internal';

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export type ToolPart = {
  type: string;
  toolName?: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export function getStatusBadge(state: ToolState | string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (state) {
    case 'input-streaming':
    case 'input-available':
      return { label: 'Running', variant: 'default' };
    case 'output-error':
      return { label: 'Failed', variant: 'destructive' };
    case 'output-denied':
      return { label: 'Denied', variant: 'outline' };
    default:
      return { label: 'Ran', variant: 'secondary' };
  }
}

const ToolContext = React.createContext<{ state: ToolState; name?: string }>({
  state: 'output-available',
});

/** A tool call the agent makes, from input to output. */
function Tool({
  className,
  children,
  state = 'output-available',
  name,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> &
  AiOpenProps & { state?: ToolState; name?: string }) {
  return (
    <ToolContext.Provider value={{ state, name }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </ToolContext.Provider>
  );
}

function ToolHeader({
  className,
  name,
  title,
  state,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger> & {
  name?: string;
  title?: React.ReactNode;
  state?: ToolState;
}) {
  const context = React.useContext(ToolContext);
  const resolvedState = state ?? context.state;
  const resolvedName = name ?? context.name ?? 'tool';
  const icon =
    resolvedState === 'output-error' ? (
      <CircleAlertIcon />
    ) : resolvedState === 'input-streaming' || resolvedState === 'input-available' ? (
      <LoaderCircleIcon className="animate-spin" />
    ) : (
      <CheckIcon />
    );
  const defaultTitle =
    resolvedState === 'output-denied'
      ? `Denied ${resolvedName}`
      : resolvedState === 'output-error'
        ? `Failed to run ${resolvedName}`
        : resolvedState === 'input-streaming' || resolvedState === 'input-available'
          ? `Running ${resolvedName}…`
          : `Ran ${resolvedName}`;

  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={toTraceStatus(resolvedState)}>
        <TraceIcon>{icon}</TraceIcon>
        <TraceTitle>{title ?? defaultTitle}</TraceTitle>
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function ToolContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent keepMounted className={cn('space-y-2', className)} {...props}>
      {children}
    </TraceCollapsibleContent>
  );
}

function ToolInput({
  className,
  input,
  label = 'Input',
  ...props
}: Omit<React.ComponentProps<typeof CodeBlock>, 'children'> & {
  input: unknown;
  label?: string;
}) {
  const text = asText(input);
  return (
    <CodeBlock size="sm" className={className} {...props}>
      <CodeBlockHeader>
        <CodeBlockTitle>
          <WrenchIcon />
          {label}
        </CodeBlockTitle>
        <CodeBlockCopyButton value={text} />
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-56">
        {text}
      </CodeBlockContent>
    </CodeBlock>
  );
}

function ToolOutput({
  className,
  output,
  errorText,
  label = 'Output',
  ...props
}: Omit<React.ComponentProps<typeof CodeBlock>, 'children'> & {
  output?: unknown;
  errorText?: string;
  label?: string;
}) {
  const failed = Boolean(errorText);
  const text = failed ? asText(errorText) : asText(output);
  return (
    <CodeBlock
      size="sm"
      variant={failed ? 'destructive' : 'default'}
      className={className}
      {...props}
    >
      <CodeBlockHeader>
        <CodeBlockTitle>{failed ? 'Error' : label}</CodeBlockTitle>
        <CodeBlockCopyButton value={text} />
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-64">
        {text}
      </CodeBlockContent>
    </CodeBlock>
  );
}

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput };
