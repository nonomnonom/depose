'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CircleAlertIcon, CopyIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { CodeBlock, CodeBlockContent } from '../ui/code-block';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, type AiOpenProps } from './_internal';

export type StackFrame = {
  raw: string;
  fn?: string;
  file?: string;
  line?: number;
  column?: number;
  external: boolean;
};

export type ParsedStackTrace = {
  type: string;
  message: string;
  frames: StackFrame[];
};

export function parseStackTrace(trace: string): ParsedStackTrace {
  const lines = trace.split('\n').filter((line) => line.trim().length > 0);
  const header = lines[0] ?? 'Error';
  const headerMatch = header.match(/^([A-Za-z][A-Za-z0-9_$]*(?:Error|Exception)?):\s*(.*)$/);
  const type = headerMatch?.[1] ?? 'Error';
  const message = headerMatch?.[2] ?? header;

  const frames = lines.slice(1).map<StackFrame>((raw) => {
    const text = raw.trim().replace(/^at\s+/, '');
    const withFn = text.match(/^(.+?)\s+\((.+):(\d+):(\d+)\)$/);
    const plain = text.match(/^(.+):(\d+):(\d+)$/);
    const match = withFn ?? plain;
    const file = match ? (withFn ? match[2] : match[1]) : undefined;
    return {
      raw: text,
      fn: withFn ? withFn[1] : undefined,
      file,
      line: match ? Number(withFn ? match[3] : match[2]) : undefined,
      column: match ? Number(withFn ? match[4] : match[3]) : undefined,
      external: Boolean(file?.includes('node_modules')),
    };
  });

  return { type, message, frames };
}

const StackTraceContext = React.createContext<{
  parsed: ParsedStackTrace;
  raw: string;
  onFilePathClick?: (path: string) => void;
}>({ parsed: { type: '', message: '', frames: [] }, raw: '' });

/** A failed tool call and its stack frames. */
function StackTrace({
  className,
  children,
  trace,
  onFilePathClick,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> &
  AiOpenProps & { trace: string; onFilePathClick?: (path: string) => void }) {
  const parsed = React.useMemo(() => parseStackTrace(trace), [trace]);
  return (
    <StackTraceContext.Provider value={{ parsed, raw: trace, onFilePathClick }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </StackTraceContext.Provider>
  );
}

function StackTraceHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status="error">
        {children ?? (
          <>
            <TraceIcon>
              <CircleAlertIcon />
            </TraceIcon>
            <StackTraceError />
          </>
        )}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function StackTraceError({ className, children, ...props }: React.ComponentProps<typeof TraceTitle>) {
  const { parsed } = React.useContext(StackTraceContext);
  return (
    <TraceTitle className={className} {...props}>
      {children ?? (
        <>
          Failed: <StackTraceErrorType />: <StackTraceErrorMessage />
        </>
      )}
      <span className="sr-only"> {parsed.type}</span>
    </TraceTitle>
  );
}

function StackTraceErrorType({ className, ...props }: React.ComponentProps<'span'>) {
  const { parsed } = React.useContext(StackTraceContext);
  return (
    <span data-slot="stack-trace-error-type" className={className} {...props}>
      {parsed.type}
    </span>
  );
}

function StackTraceErrorMessage({ className, ...props }: React.ComponentProps<'span'>) {
  const { parsed } = React.useContext(StackTraceContext);
  return (
    <span data-slot="stack-trace-error-message" className={className} {...props}>
      {parsed.message}
    </span>
  );
}

function StackTraceContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent keepMounted className={className} {...props}>
      {children}
    </TraceCollapsibleContent>
  );
}

function StackTraceFrames({ className, ...props }: React.ComponentProps<'div'>) {
  const { parsed, onFilePathClick } = React.useContext(StackTraceContext);
  return (
    <div
      data-slot="stack-trace-frames"
      className={cn('flex flex-col gap-0.5 font-mono text-[11px]', className)}
      {...props}
    >
      {parsed.frames.length === 0 ? (
        <span className="text-muted-foreground">No frames in this trace.</span>
      ) : (
        parsed.frames.map((frame, index) => (
          <div
            key={`${frame.raw}-${index}`}
            className={cn('flex min-w-0 gap-2', frame.external ? 'opacity-50' : 'text-foreground')}
          >
            <span className="shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
            <span className="min-w-0 truncate">
              {frame.fn ? <span className="text-muted-foreground">{frame.fn} · </span> : null}
              {frame.file && onFilePathClick ? (
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={() => onFilePathClick(frame.file!)}
                >
                  {frame.file}
                </button>
              ) : (
                frame.file ?? frame.raw
              )}
              {frame.line !== undefined ? `:${frame.line}:${frame.column ?? 0}` : ''}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function StackTraceActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="stack-trace-actions"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
}

function StackTraceCopyButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { raw } = React.useContext(StackTraceContext);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Copy stack trace"
      className={className}
      onClick={() => void navigator.clipboard?.writeText(raw)}
      {...props}
    >
      <CopyIcon />
    </Button>
  );
}

/** The whole header opens the frames, so this renders nothing. */
function StackTraceExpandButton() {
  return null;
}

function StackTraceCode({ className }: { className?: string }) {
  const { raw } = React.useContext(StackTraceContext);
  return (
    <CodeBlock size="sm" variant="destructive" className={className}>
      <CodeBlockContent wrap className="max-h-56">
        {raw}
      </CodeBlockContent>
    </CodeBlock>
  );
}

export {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceContent,
  StackTraceFrames,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceExpandButton,
  StackTraceCode,
};
