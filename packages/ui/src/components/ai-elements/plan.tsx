'use client';

import * as React from 'react';
import { cn } from 'cn';

import {
  Trace,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceLine,
  TraceTitle,
} from '../ui/trace';
import { AiCollapsible, type AiOpenProps } from './_internal';

const PlanContext = React.createContext<{ isStreaming: boolean }>({ isStreaming: false });

export function usePlan() {
  return React.useContext(PlanContext);
}

/** The steps the agent plans to take, and how far it has got. */
function Plan({
  className,
  children,
  isStreaming = false,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Trace> & AiOpenProps & { isStreaming?: boolean }) {
  return (
    <PlanContext.Provider value={{ isStreaming }}>
      <Trace className={className} {...props}>
        <AiCollapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </AiCollapsible>
      </Trace>
    </PlanContext.Provider>
  );
}

function PlanHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TraceCollapsibleTrigger>) {
  const { isStreaming } = usePlan();
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={isStreaming ? 'running' : undefined}>{children}</TraceLine>
    </TraceCollapsibleTrigger>
  );
}

function PlanTitle({ className, ...props }: React.ComponentProps<typeof TraceTitle>) {
  return <TraceTitle className={cn('font-medium text-foreground', className)} {...props} />;
}

function PlanDescription({ className, ...props }: React.ComponentProps<typeof TraceDescription>) {
  return <TraceDescription className={className} {...props} />;
}

function PlanContent({
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

/** The whole line opens the plan, so a trigger renders only its children. */
function PlanTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function PlanAction({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-slot="plan-action"
      className={cn('text-xs text-primary underline-offset-4 hover:underline', className)}
      {...props}
    />
  );
}

function PlanFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="plan-footer"
      className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Plan, PlanHeader, PlanTitle, PlanDescription, PlanContent, PlanTrigger, PlanAction, PlanFooter };
