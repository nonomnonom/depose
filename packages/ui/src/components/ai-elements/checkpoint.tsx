'use client';

import * as React from 'react';
import { cn } from 'cn';
import { GitBranchIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { Marker, MarkerContent, MarkerIcon } from '../ui/marker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

/** A point in the conversation you can return to. */
function Checkpoint({
  className,
  icon,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Marker>, 'variant' | 'children'> & {
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Marker variant="separator" className={cn('my-4', className)} {...props}>
      <MarkerIcon>{icon ?? <GitBranchIcon />}</MarkerIcon>
      <MarkerContent className="flex items-center gap-2">{children}</MarkerContent>
    </Marker>
  );
}

function CheckpointIcon({ className, ...props }: React.ComponentProps<typeof MarkerIcon>) {
  return <MarkerIcon className={className} {...props} />;
}

function CheckpointTrigger({
  className,
  tooltip = 'Restore to this point',
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children' | 'size' | 'variant'> & {
  tooltip?: string;
  children?: React.ReactNode;
}) {
  const button = (
    <Button
      data-slot="checkpoint-trigger"
      variant="outline"
      size="xs"
      className={className}
      {...props}
    >
      {children ?? 'Restore'}
    </Button>
  );
  if (!tooltip) return button;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { Checkpoint, CheckpointIcon, CheckpointTrigger };
