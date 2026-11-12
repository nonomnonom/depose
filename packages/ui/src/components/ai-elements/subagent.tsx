'use client';

import * as React from 'react';
import { cn } from 'cn';
import { BotIcon, WrenchIcon } from 'lucide-react';

import { Badge } from '../ui/badge';
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, asText, toTraceStatus, type AiOpenProps, type AgentStatus } from './_internal';

const AgentContext = React.createContext<{ name: string; model?: string }>({ name: 'agent' });

/** A subagent run, with its tool calls and result. */
function Agent({
  className,
  children,
  name = 'agent',
  model,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> & AiOpenProps & { name?: string; model?: string }) {
  return (
    <AgentContext.Provider value={{ name, model }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </AgentContext.Provider>
  );
}

function AgentHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  const { name, model } = React.useContext(AgentContext);
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine>
        <TraceIcon>
          <BotIcon />
        </TraceIcon>
        <TraceTitle>{children ?? `Ran the ${name} agent`}</TraceTitle>
        {model ? (
          <Badge variant="outline" className="ml-1 font-mono text-[10px]">
            {model}
          </Badge>
        ) : null}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function AgentContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent keepMounted className={cn('space-y-3', className)} {...props}>
      {children}
    </TraceCollapsibleContent>
  );
}

function AgentInstructions({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="agent-instructions"
      className={cn('text-sm text-muted-foreground text-pretty', className)}
      {...props}
    />
  );
}

function AgentTools({ className, ...props }: React.ComponentProps<typeof Trace>) {
  return <Trace className={cn('gap-1', className)} {...props} />;
}

function AgentTool({
  className,
  name,
  status,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TraceLine>, 'children'> & {
  name?: string;
  status?: AgentStatus;
  children?: React.ReactNode;
}) {
  return (
    <TraceLine status={toTraceStatus(status)} className={className} {...props}>
      <TraceIcon>
        <WrenchIcon />
      </TraceIcon>
      <TraceTitle>{children ?? name}</TraceTitle>
    </TraceLine>
  );
}

function AgentOutput({
  className,
  output,
  language,
  children,
  ...props
}: Omit<React.ComponentProps<typeof CodeBlock>, 'children'> & {
  output?: unknown;
  language?: string;
  children?: React.ReactNode;
}) {
  const text = children ?? asText(output);
  return (
    <CodeBlock size="sm" className={className} {...props}>
      <CodeBlockHeader>
        <CodeBlockTitle>{language ?? 'Result'}</CodeBlockTitle>
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-64">
        {text}
      </CodeBlockContent>
    </CodeBlock>
  );
}

export {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
  // Modern names
  Agent as Subagent,
  AgentHeader as SubagentHeader,
  AgentContent as SubagentContent,
  AgentInstructions as SubagentInstructions,
  AgentTools as SubagentTools,
  AgentTool as SubagentTool,
  AgentOutput as SubagentOutput,
};
