'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { Bubble, BubbleContent } from '../ui/bubble';
import {
  Message as MessageRoot,
  MessageContent as MessageBody,
  MessageFooter,
} from '../ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const MessageContext = React.createContext<{ from: 'user' | 'assistant' }>({ from: 'assistant' });

export function useMessage() {
  return React.useContext(MessageContext);
}

/** One turn: the person's message, and the agent's reply with its actions. */
function Message({
  className,
  from = 'assistant',
  children,
  ...props
}: Omit<React.ComponentProps<typeof MessageRoot>, 'align'> & {
  from?: 'user' | 'assistant';
}) {
  return (
    <MessageContext.Provider value={{ from }}>
      <MessageRoot align={from === 'user' ? 'end' : 'start'} className={className} {...props}>
        {children}
      </MessageRoot>
    </MessageContext.Provider>
  );
}

function MessageContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MessageBody>) {
  const { from } = useMessage();
  return (
    <MessageBody className={className} {...props}>
      {from === 'user' ? (
        <Bubble align="end" variant="muted">
          <BubbleContent>{children}</BubbleContent>
        </Bubble>
      ) : (
        children
      )}
    </MessageBody>
  );
}

function MessageActions({ className, ...props }: React.ComponentProps<typeof MessageFooter>) {
  return <MessageFooter className={cn('gap-0.5', className)} {...props} />;
}

function MessageAction({
  className,
  label,
  tooltip,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children' | 'size'> & {
  label?: string;
  tooltip?: string;
  children?: React.ReactNode;
}) {
  const button = (
    <Button
      data-slot="message-action"
      variant="ghost"
      size="icon-sm"
      aria-label={label ?? tooltip}
      className={className}
      {...props}
    >
      {children}
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

const INLINE_TOKEN =
  /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\d{1,3}\])/g;

function renderInline(text: string, onCitationClick?: (index: number) => void): React.ReactNode[] {
  return text.split(INLINE_TOKEN).map((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {link[1]}
        </a>
      );
    }
    const citation = part.match(/^\[(\d{1,3})\]$/);
    if (citation) {
      return (
        <button
          key={index}
          type="button"
          onClick={() => onCitationClick?.(Number(citation[1]) - 1)}
          aria-label={`Open source ${citation[1]}`}
          className="mx-0.5 rounded bg-primary/10 px-1 align-baseline text-[0.75em] font-semibold text-primary tabular-nums hover:bg-primary/20"
        >
          {part}
        </button>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * A dependency-free Markdown-ish renderer. Depose answers are plain prose with
 * citation markers, so this covers paragraphs, lists, quotes, headings, bold,
 * inline code and links without pulling in a full markdown pipeline.
 */
function MessageResponse({
  className,
  children,
  onCitationClick,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  children?: string;
  onCitationClick?: (index: number) => void;
}) {
  const text = children ?? '';
  const blocks = text.split(/\n{2,}/);

  return (
    <div
      data-slot="message-response"
      className={cn('space-y-2.5 text-sm leading-relaxed text-pretty', className)}
      {...props}
    >
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n');
        if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
          return (
            <ul key={blockIndex} className="ml-4 list-disc space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*[-*]\s+/, ''), onCitationClick)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
          return (
            <ol key={blockIndex} className="ml-4 list-decimal space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {renderInline(line.replace(/^\s*\d+\.\s+/, ''), onCitationClick)}
                </li>
              ))}
            </ol>
          );
        }
        if (lines.every((line) => line.startsWith('> '))) {
          return (
            <blockquote
              key={blockIndex}
              className="border-l-2 border-border pl-3 text-muted-foreground"
            >
              {lines.map((line, lineIndex) => (
                <p key={lineIndex}>{renderInline(line.slice(2), onCitationClick)}</p>
              ))}
            </blockquote>
          );
        }
        const heading = block.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1]!.length;
          const Tag = (level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5';
          return <Tag key={blockIndex} className="font-heading font-semibold">{heading[2]}</Tag>;
        }
        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, onCitationClick)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

type BranchContextValue = {
  branches: React.ReactNode[];
  index: number;
  setIndex: (index: number) => void;
};

const BranchContext = React.createContext<BranchContextValue | null>(null);

function MessageBranch({
  branches,
  defaultBranch = 0,
  children,
  className,
}: {
  branches: React.ReactNode[];
  defaultBranch?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const [index, setIndex] = React.useState(defaultBranch);
  return (
    <BranchContext.Provider value={{ branches, index, setIndex }}>
      <div data-slot="message-branch" className={className}>
        {children}
      </div>
    </BranchContext.Provider>
  );
}

function useBranch() {
  const value = React.useContext(BranchContext);
  if (!value) throw new Error('Branch parts must be rendered inside <MessageBranch>.');
  return value;
}

function MessageBranchContent({ className }: { className?: string }) {
  const { branches, index } = useBranch();
  return (
    <div data-slot="message-branch-content" className={className}>
      {branches[Math.min(index, branches.length - 1)] ?? null}
    </div>
  );
}

function MessageBranchSelector({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-branch-selector"
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    />
  );
}

function MessageBranchPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { index, setIndex } = useBranch();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Previous branch"
      disabled={index <= 0}
      className={className}
      onClick={() => setIndex(Math.max(0, index - 1))}
      {...props}
    >
      <ChevronLeftIcon />
    </Button>
  );
}

function MessageBranchNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { branches, index, setIndex } = useBranch();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Next branch"
      disabled={index >= branches.length - 1}
      className={className}
      onClick={() => setIndex(Math.min(branches.length - 1, index + 1))}
      {...props}
    >
      <ChevronRightIcon />
    </Button>
  );
}

function MessageBranchPage({ className }: { className?: string }) {
  const { branches, index } = useBranch();
  return (
    <span
      data-slot="message-branch-page"
      className={cn('text-[11px] text-muted-foreground tabular-nums', className)}
    >
      {branches.length === 0 ? 0 : index + 1} / {branches.length}
    </span>
  );
}

function MessageToolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="message-toolbar"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    />
  );
}

export {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
  MessageToolbar,
};
