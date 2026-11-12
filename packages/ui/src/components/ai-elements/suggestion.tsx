'use client';

import * as React from 'react';
import { cn } from 'cn';

import { Button } from '../ui/button';

export type SuggestionsProps = React.ComponentProps<'div'>;

/** A horizontally scrolling row of one-click prompts. */
function Suggestions({ className, ...props }: SuggestionsProps) {
  return (
    <div
      data-slot="suggestions"
      className={cn(
        'scrollbar-none flex scroll-fade-x gap-2 overflow-x-auto overscroll-x-contain',
        className,
      )}
      {...props}
    />
  );
}

function Suggestion({
  className,
  suggestion,
  onClick,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <Button
      data-slot="suggestion"
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      onClick={() => onClick?.(suggestion)}
      {...props}
    >
      {children ?? suggestion}
    </Button>
  );
}

export { Suggestions, Suggestion };
