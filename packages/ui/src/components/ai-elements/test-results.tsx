'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CheckIcon, CircleXIcon, ClockIcon } from 'lucide-react';

import { CodeBlock, CodeBlockContent } from '../ui/code-block';
import { Progress } from '../ui/progress';
import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { formatDuration, type AiOpenProps } from './_internal';
import { AiCollapsible } from './_internal';

export type TestResultsSummaryData = {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  duration?: number;
};

export type TestCase = {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: { message?: string; stack?: string };
};

export type TestSuiteData = {
  name: string;
  tests: TestCase[];
};

const TestResultsContext = React.createContext<{ summary: TestResultsSummaryData }>({
  summary: { total: 0, passed: 0, failed: 0 },
});

/** A test run by the agent, with its suites and failures. */
function TestResults({
  className,
  children,
  summary,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> & AiOpenProps & { summary: TestResultsSummaryData }) {
  return (
    <TestResultsContext.Provider value={{ summary }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </TestResultsContext.Provider>
  );
}

function TestResultsHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  const { summary } = React.useContext(TestResultsContext);
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={summary.failed > 0 ? 'error' : undefined}>
        <TraceIcon>
          {summary.failed > 0 ? <CircleXIcon /> : <CheckIcon />}
        </TraceIcon>
        {children ?? <TestResultsSummary />}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function TestResultsSummary({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceTitle>) {
  const { summary } = React.useContext(TestResultsContext);
  return (
    <TraceTitle className={cn('font-medium text-foreground', className)} {...props}>
      {children ?? `Ran ${summary.total} tests, ${summary.failed} failed`}
    </TraceTitle>
  );
}

function TestResultsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleContent>) {
  return (
    <TraceCollapsibleContent keepMounted className={cn('space-y-2', className)} {...props}>
      <Trace>{children}</Trace>
    </TraceCollapsibleContent>
  );
}

function TestResultsDuration({ className }: { className?: string }) {
  const { summary } = React.useContext(TestResultsContext);
  if (summary.duration === undefined) return null;
  return (
    <span
      data-slot="test-results-duration"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}
    >
      <ClockIcon className="size-3" />
      {formatDuration(summary.duration)}
    </span>
  );
}

function TestResultsProgress({ className }: { className?: string }) {
  const { summary } = React.useContext(TestResultsContext);
  const percent = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  return (
    <div data-slot="test-results-progress" className={cn('w-full max-w-xs', className)}>
      <Progress value={percent} aria-label="Tests passed" />
    </div>
  );
}

function TestSuite({
  className,
  children,
  name,
  tests = [],
  defaultOpen,
}: AiOpenProps & {
  className?: string;
  children?: React.ReactNode;
  name: string;
  tests?: TestCase[];
}) {
  const hasFailure = tests.some((test) => test.status === 'failed');
  return (
    <AiCollapsible
      className={className}
      defaultOpen={defaultOpen ?? hasFailure}
    >
      <TraceCollapsibleTrigger>
        <TraceLine status={hasFailure ? 'error' : undefined}>
          <TraceIcon>{hasFailure ? <CircleXIcon /> : <CheckIcon />}</TraceIcon>
          <TraceTitle className="font-medium text-foreground">{name}</TraceTitle>
          <TraceDescription>
            {tests.filter((test) => test.status === 'passed').length}/{tests.length}
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TestSuiteContent>{children}</TestSuiteContent>
    </AiCollapsible>
  );
}

function TestSuiteName({ className, ...props }: React.ComponentProps<typeof TraceTitle>) {
  return <TraceTitle className={className} {...props} />;
}

function TestSuiteContent({
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

function TestSuiteStats({ className, ...props }: React.ComponentProps<typeof TraceDescription>) {
  return <TraceDescription className={className} {...props} />;
}

function Test({
  className,
  name,
  status = 'passed',
  duration,
  ...props
}: Omit<React.ComponentProps<typeof TraceLine>, 'children'> & {
  name?: string;
  status?: TestCase['status'];
  duration?: number;
}) {
  return (
    <TraceLine status={status === 'failed' ? 'error' : undefined} className={className} {...props}>
      <TraceIcon>
        {status === 'failed' ? <CircleXIcon /> : <CheckIcon />}
      </TraceIcon>
      <TraceTitle className="font-mono text-xs">{name}</TraceTitle>
      {duration !== undefined ? <TraceDescription>{formatDuration(duration)}</TraceDescription> : null}
    </TraceLine>
  );
}

function TestName({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="test-name" className={cn('font-mono text-xs', className)} {...props} />
  );
}

function TestStatus({ className, status }: { className?: string; status: TestCase['status'] }) {
  return (
    <span
      data-slot="test-status"
      data-status={status}
      className={cn(
        'text-xs',
        status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {status}
    </span>
  );
}

function TestDuration({ className, duration }: { className?: string; duration: number }) {
  return (
    <span
      data-slot="test-duration"
      className={cn('text-xs text-muted-foreground tabular-nums', className)}
    >
      {formatDuration(duration)}
    </span>
  );
}

function TestError({
  className,
  message,
  stack,
  ...props
}: Omit<React.ComponentProps<typeof CodeBlock>, 'children'> & {
  message?: string;
  stack?: string;
}) {
  return (
    <CodeBlock size="sm" variant="destructive" className={className} {...props}>
      <CodeBlockContent wrap className="max-h-48">
        {message ?? ''}
        {stack ? `\n\n${stack}` : ''}
      </CodeBlockContent>
    </CodeBlock>
  );
}

function TestErrorMessage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="test-error-message" className={cn('font-mono text-xs', className)} {...props} />
  );
}

function TestErrorStack({ className, ...props }: React.ComponentProps<'pre'>) {
  return (
    <pre
      data-slot="test-error-stack"
      className={cn('font-mono text-xs whitespace-pre-wrap', className)}
      {...props}
    />
  );
}

export {
  TestResults,
  TestResultsHeader,
  TestResultsSummary,
  TestResultsContent,
  TestResultsDuration,
  TestResultsProgress,
  TestSuite,
  TestSuiteName,
  TestSuiteContent,
  TestSuiteStats,
  Test,
  TestName,
  TestStatus,
  TestDuration,
  TestError,
  TestErrorMessage,
  TestErrorStack,
};
