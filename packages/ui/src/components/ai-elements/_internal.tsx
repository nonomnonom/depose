'use client';

import * as React from 'react';
import { cn } from 'cn';

import { TraceCollapsible } from '../ui/trace';

const noop = () => {};

/** Open state shared by every Trace based AI pattern. */
export type AiOpenProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * `TraceCollapsible` requires `onOpenChange` whenever `open` is a boolean.
 * This wrapper lets a pattern accept optional controlled/uncontrolled props
 * without forcing callers to build the union themselves.
 */
export function AiCollapsible({
  open,
  defaultOpen,
  onOpenChange,
  className,
  children,
}: AiOpenProps & { className?: string; children?: React.ReactNode }) {
  if (open === undefined) {
    return (
      <TraceCollapsible
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        className={cn('w-full min-w-0', className)}
      >
        {children}
      </TraceCollapsible>
    );
  }

  return (
    <TraceCollapsible
      open={open}
      onOpenChange={onOpenChange ?? noop}
      className={cn('w-full min-w-0', className)}
    >
      {children}
    </TraceCollapsible>
  );
}

/** Open while streaming, but let an explicit user toggle win. */
export function useAutoOpen(running: boolean, defaultOpen?: boolean) {
  const [override, setOverride] = React.useState<boolean | undefined>(undefined);
  const open = override ?? (running || defaultOpen === true);
  return { open, setOpen: setOverride, override: () => override } as const;
}

export function formatTokens(value: number): string {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

export type AgentStatus = 'active' | 'running' | 'pending' | 'complete' | 'error' | 'denied';

/** Maps a friendly agent state onto the three TraceLine statuses. */
export function toTraceStatus(
  status?: AgentStatus | string,
): 'running' | 'pending' | 'error' | undefined {
  switch (status) {
    case 'active':
    case 'running':
    case 'input-streaming':
    case 'input-available':
      return 'running';
    case 'pending':
      return 'pending';
    case 'error':
    case 'failed':
    case 'output-error':
      return 'error';
    default:
      return undefined;
  }
}

export function asText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
