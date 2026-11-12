'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CopyIcon, TerminalIcon, Trash2Icon } from 'lucide-react';

import { Button } from '../ui/button';
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, type AiOpenProps } from './_internal';

const TerminalContext = React.createContext<{
  output: string;
  isStreaming: boolean;
  command?: string;
  onClear?: () => void;
}>({ output: '', isStreaming: false });

/** A command the agent runs, with its output as it streams. */
function Terminal({
  className,
  children,
  output,
  command,
  isStreaming = false,
  onClear,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> &
  AiOpenProps & {
    output: string;
    command?: string;
    isStreaming?: boolean;
    onClear?: () => void;
  }) {
  const [override, setOverride] = React.useState<boolean | undefined>(undefined);
  const autoOpen = isStreaming && output.length > 0;
  const resolvedOpen = open ?? override ?? (autoOpen || defaultOpen === true);

  React.useEffect(() => {
    if (!isStreaming) setOverride(undefined);
  }, [isStreaming]);

  return (
    <TerminalContext.Provider value={{ output, isStreaming, command, onClear }}>
      <Trace className={className} {...props}>
        <AiCollapsible
          open={resolvedOpen}
          onOpenChange={(value) => {
            setOverride(value);
            onOpenChange?.(value);
          }}
        >
          {children}
        </AiCollapsible>
      </Trace>
    </TerminalContext.Provider>
  );
}

function TerminalHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  const { isStreaming } = React.useContext(TerminalContext);
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={isStreaming ? 'running' : undefined}>{children}</TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function TerminalTitle({ className, children, ...props }: React.ComponentProps<'span'>) {
  const { command } = React.useContext(TerminalContext);
  return (
    <span data-slot="terminal-title" className={className} {...props}>
      <TraceIcon>
        <TerminalIcon />
      </TraceIcon>
      <TraceTitle className="font-mono">{children ?? command ?? 'Ran a command'}</TraceTitle>
    </span>
  );
}

function TerminalContent({
  className,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  const { output } = React.useContext(TerminalContext);
  return (
    <TraceCollapsibleContent keepMounted className={className} {...props}>
      <CodeBlock size="sm">
        <CodeBlockHeader>
          <CodeBlockTitle>Output</CodeBlockTitle>
          <TerminalActions>
            <TerminalCopyButton />
            <TerminalClearButton />
          </TerminalActions>
        </CodeBlockHeader>
        <CodeBlockContent wrap className="max-h-64">
          {output || '(no output)'}
        </CodeBlockContent>
      </CodeBlock>
    </TraceCollapsibleContent>
  );
}

function TerminalStatus({ className, ...props }: React.ComponentProps<'span'>) {
  const { isStreaming } = React.useContext(TerminalContext);
  return (
    <span
      data-slot="terminal-status"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}
      {...props}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          isStreaming ? 'animate-pulse bg-primary' : 'bg-muted-foreground/50',
        )}
      />
      {isStreaming ? 'Running' : 'Finished'}
    </span>
  );
}

function TerminalActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="terminal-actions"
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    />
  );
}

function TerminalCopyButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { output } = React.useContext(TerminalContext);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Copy output"
      className={className}
      onClick={() => void navigator.clipboard?.writeText(output)}
      {...props}
    >
      <CopyIcon />
    </Button>
  );
}

function TerminalClearButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { onClear } = React.useContext(TerminalContext);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Clear output"
      className={className}
      onClick={onClear}
      {...props}
    >
      <Trash2Icon />
    </Button>
  );
}

export {
  Terminal,
  TerminalHeader,
  TerminalTitle,
  TerminalContent,
  TerminalStatus,
  TerminalActions,
  TerminalCopyButton,
  TerminalClearButton,
};
