'use client';

import * as React from 'react';
import { cn } from 'cn';
import { BrainIcon } from 'lucide-react';

import { Command, CommandEmpty, CommandInput } from '../ui/command';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/** Two menus: one picks the model, the other picks how hard it thinks. */
function ModelSelector({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
  return <DropdownMenu {...props} />;
}

function ModelSelectorTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  return (
    <DropdownMenuTrigger
      render={<button type="button" className={cn('outline-none', className)} />}
      {...props}
    />
  );
}

function ModelSelectorContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      align="start"
      className={cn('w-64', className)}
      {...props}
    />
  );
}

function ModelSelectorList({
  className,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
  return (
    <DropdownMenuRadioGroup
      value={value}
      onValueChange={onValueChange}
      className={className}
      {...props}
    />
  );
}

function ModelSelectorGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuGroup> & { heading?: string }) {
  return (
    <DropdownMenuGroup className={className} {...props}>
      {heading ? <DropdownMenuLabel>{heading}</DropdownMenuLabel> : null}
      {children}
    </DropdownMenuGroup>
  );
}

function ModelSelectorItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioItem>) {
  return <DropdownMenuRadioItem closeOnClick className={className} {...props} />;
}

function ModelSelectorName({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="model-selector-name" className={cn('truncate font-medium', className)} {...props} />
  );
}

function ModelSelectorLogo({
  className,
  children,
  ...props
}: React.ComponentProps<'span'> & { children?: React.ReactNode }) {
  return (
    <span
      data-slot="model-selector-logo"
      className={cn('flex size-4 shrink-0 items-center justify-center', className)}
      {...props}
    >
      {children ?? <BrainIcon className="size-4" />}
    </span>
  );
}

function ModelSelectorLogoGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="model-selector-logo-group"
      className={cn('flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function ModelSelectorShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcut>) {
  return <DropdownMenuShortcut className={className} {...props} />;
}

function ModelSelectorSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return <DropdownMenuSeparator className={className} {...props} />;
}

/* Searchable variant, kept for callers coming from AI SDK Elements. */
function ModelSelectorDialog({ ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

function ModelSelectorDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

function ModelSelectorDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent className={cn('p-0', className)} {...props} />;
}

function ModelSelectorInput({ className, ...props }: React.ComponentProps<typeof CommandInput>) {
  return <CommandInput className={className} {...props} />;
}

function ModelSelectorEmpty({ className, ...props }: React.ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty className={cn('py-6 text-center text-sm', className)} {...props} />;
}

function ModelSelectorCommand({ className, ...props }: React.ComponentProps<typeof Command>) {
  return <Command className={className} {...props} />;
}

export {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorName,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorShortcut,
  ModelSelectorSeparator,
  ModelSelectorDialog,
  ModelSelectorDialogTrigger,
  ModelSelectorDialogContent,
  ModelSelectorInput,
  ModelSelectorEmpty,
  ModelSelectorCommand,
};
