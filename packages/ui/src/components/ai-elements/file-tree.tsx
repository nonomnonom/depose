'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronRightIcon, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

type FileTreeValue = {
  expanded: Set<string>;
  toggle: (path: string) => void;
  selected?: string;
  onSelect?: (path: string) => void;
};

const FileTreeContext = React.createContext<FileTreeValue>({
  expanded: new Set(),
  toggle: () => {},
});

export function useFileTree() {
  return React.useContext(FileTreeContext);
}

/** The files the agent changed, as a folder tree. */
function FileTree({
  className,
  children,
  defaultExpanded = [],
  expanded: controlledExpanded,
  onExpandedChange,
  selected,
  onSelect,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> & {
  children?: React.ReactNode;
  defaultExpanded?: string[];
  expanded?: string[];
  onExpandedChange?: (paths: string[]) => void;
  selected?: string;
  onSelect?: (path: string) => void;
}) {
  const [internal, setInternal] = React.useState<Set<string>>(new Set(defaultExpanded));
  const expanded = controlledExpanded ? new Set(controlledExpanded) : internal;
  const toggle = React.useCallback(
    (path: string) => {
      const next = new Set(expanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      if (!controlledExpanded) setInternal(next);
      onExpandedChange?.([...next]);
    },
    [expanded, controlledExpanded, onExpandedChange],
  );

  return (
    <FileTreeContext.Provider value={{ expanded, toggle, selected, onSelect }}>
      <div
        data-slot="file-tree"
        className={cn('flex w-full min-w-0 flex-col gap-0.5 text-sm', className)}
        {...props}
      >
        {children}
      </div>
    </FileTreeContext.Provider>
  );
}

function FileTreeFolder({
  className,
  path,
  name,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, 'open' | 'onOpenChange' | 'children'> & {
  path: string;
  name?: string;
  children?: React.ReactNode;
}) {
  const { expanded, toggle } = useFileTree();
  const open = expanded.has(path);
  return (
    <Collapsible open={open} onOpenChange={() => toggle(path)} className={cn('min-w-0', className)} {...props}>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-1.5 font-normal"
          />
        }
      >
        <ChevronRightIcon
          className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <FileTreeIcon open={open} />
        <FileTreeName>{name ?? path.split('/').filter(Boolean).at(-1)}</FileTreeName>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 flex min-w-0 flex-col gap-0.5 border-l border-border pl-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FileTreeFile({
  className,
  path,
  name,
  icon,
  actions,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & {
  path: string;
  name?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { selected, onSelect } = useFileTree();
  return (
    <div data-slot="file-tree-file" className="flex min-w-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        aria-current={selected === path ? 'true' : undefined}
        className={cn(
          'min-w-0 flex-1 justify-start gap-1.5 font-normal',
          selected === path && 'bg-accent text-accent-foreground',
          className,
        )}
        onClick={() => onSelect?.(path)}
        {...props}
      >
        {icon ?? <FileIcon className="size-3.5 shrink-0" />}
        <FileTreeName>{children ?? name ?? path.split('/').filter(Boolean).at(-1)}</FileTreeName>
      </Button>
      {actions ? <FileTreeActions>{actions}</FileTreeActions> : null}
    </div>
  );
}

function FileTreeIcon({
  className,
  open = false,
  children,
  ...props
}: React.ComponentProps<'span'> & { open?: boolean }) {
  return (
    <span
      data-slot="file-tree-icon"
      aria-hidden="true"
      className={cn('flex size-3.5 shrink-0 items-center', className)}
      {...props}
    >
      {children ?? (open ? <FolderOpenIcon /> : <FolderIcon />)}
    </span>
  );
}

function FileTreeName({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="file-tree-name"
      className={cn('min-w-0 truncate font-mono text-xs', className)}
      {...props}
    />
  );
}

function FileTreeActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="file-tree-actions"
      className={cn('flex shrink-0 items-center gap-0.5', className)}
      {...props}
    />
  );
}

export { FileTree, FileTreeFolder, FileTreeFile, FileTreeIcon, FileTreeName, FileTreeActions };
