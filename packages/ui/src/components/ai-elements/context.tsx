'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CpuIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Progress } from '../ui/progress';
import { formatTokens } from './_internal';

export type ContextUsageData = {
  input?: number;
  output?: number;
  reasoning?: number;
  cached?: number;
  limit?: number;
};

type ContextValue = {
  usedTokens: number;
  maxTokens: number;
  percent: number;
  usage: ContextUsage;
  modelId?: string;
};

const ContextState = React.createContext<ContextValue>({
  usedTokens: 0,
  maxTokens: 1,
  percent: 0,
  usage: {},
});

export function useContextWindow() {
  return React.useContext(ContextState);
}

/** How much of the context window the conversation has used. */
function Context({
  children,
  usedTokens,
  maxTokens,
  usage,
  modelId,
}: {
  children?: React.ReactNode;
  usedTokens: number;
  maxTokens: number;
  usage?: ContextUsage;
  modelId?: string;
}) {
  const resolvedUsage = usage ?? {
    input: usedTokens,
    limit: maxTokens,
  };
  const percent = maxTokens > 0 ? Math.min(100, Math.round((usedTokens / maxTokens) * 100)) : 0;
  return (
    <ContextState.Provider value={{ usedTokens, maxTokens, percent, usage: resolvedUsage, modelId }}>
      <HoverCard>{children}</HoverCard>
    </ContextState.Provider>
  );
}

function ContextTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof HoverCardTrigger>) {
  const { percent } = useContextWindow();
  return (
    <HoverCardTrigger
      delay={10}
      closeDelay={100}
      render={<Button variant="outline" size="sm" className={className} />}
      {...props}
    >
      {children ?? `${percent}% context`}
    </HoverCardTrigger>
  );
}

function ContextContent({
  className,
  ...props
}: React.ComponentProps<typeof HoverCardContent>) {
  return (
    <HoverCardContent
      className={cn('flex w-72 flex-col gap-3', className)}
      {...props}
    />
  );
}

function ContextContentHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const { usedTokens, maxTokens, percent } = useContextWindow();
  return (
    <div data-slot="context-content-header" className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Context</span>
        <span className="text-muted-foreground tabular-nums">
          {formatTokens(usedTokens)} / {formatTokens(maxTokens)}
        </span>
      </div>
      <Progress value={percent} aria-label="Context used" />
    </div>
  );
}

function ContextContentBody({ className, ...props }: React.ComponentProps<'div'>) {
  const { usage } = useContextWindow();
  const rows: Array<[string, number]> = [
    ['Input', usage.input ?? 0],
    ['Output', usage.output ?? 0],
    ['Reasoning', usage.reasoning ?? 0],
  ];
  if (usage.cached !== undefined) rows.push(['Cached', usage.cached]);
  return (
    <div
      data-slot="context-content-body"
      className={cn('flex flex-col gap-1 text-sm', className)}
      {...props}
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular-nums">{formatTokens(value)}</span>
        </div>
      ))}
    </div>
  );
}

function ContextContentFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const { modelId, percent } = useContextWindow();
  return (
    <div
      data-slot="context-content-footer"
      className={cn(
        'flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground',
        className,
      )}
      {...props}
    >
      {modelId ? (
        <span className="flex items-center gap-1 font-mono">
          <CpuIcon className="size-3" />
          {modelId}
        </span>
      ) : (
        <span>{percent}% used</span>
      )}
      <span className="tabular-nums">{100 - percent}% free</span>
    </div>
  );
}

function ContextIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="context-icon" className={cn('flex items-center', className)} {...props}>
      <CpuIcon />
    </span>
  );
}

function ContextUsage({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="context-usage"
      className={cn('flex items-center justify-between gap-3 text-sm', className)}
      {...props}
    />
  );
}

function ContextUsageText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="context-usage-text" className={cn('tabular-nums', className)} {...props} />
  );
}

export {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextIcon,
  ContextUsage,
  ContextUsageText,
};
