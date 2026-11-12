'use client';

import * as React from 'react';
import { cn } from 'cn';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, QuoteIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { hostnameOf } from './_internal';

/** Inline citation primitives: a source in the sentence that opens on hover. */
function InlineCitation({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="inline-citation"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

function InlineCitationText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="inline-citation-text" className={className} {...props} />;
}

function InlineCitationCard({ children, ...props }: React.ComponentProps<typeof HoverCard>) {
  return <HoverCard {...props}>{children}</HoverCard>;
}

function InlineCitationCardTrigger({
  className,
  sources,
  children,
  ...props
}: React.ComponentProps<typeof HoverCardTrigger> & { sources?: string[] }) {
  const label =
    children ??
    (sources && sources.length > 0
      ? sources.length === 1
        ? hostnameOf(sources[0]!)
        : `${hostnameOf(sources[0]!)} +${sources.length - 1}`
      : 'source');
  return (
    <HoverCardTrigger
      delay={10}
      closeDelay={100}
      render={
        <Button variant="secondary" size="xs" className={cn('font-mono text-[10px]', className)} />
      }
      {...props}
    >
      {label}
    </HoverCardTrigger>
  );
}

function InlineCitationCardBody({
  className,
  ...props
}: React.ComponentProps<typeof HoverCardContent>) {
  return (
    <HoverCardContent
      className={cn('flex w-80 flex-col gap-2', className)}
      {...props}
    />
  );
}

function InlineCitationSource({
  className,
  title,
  url,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title' | 'children'> & {
  title?: React.ReactNode;
  url?: string;
  children?: React.ReactNode;
}) {
  return (
    <div data-slot="inline-citation-source" className={cn('min-w-0 space-y-1', className)} {...props}>
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      {children}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary underline underline-offset-4"
        >
          {hostnameOf(url)}
          <ExternalLinkIcon className="size-3" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
    </div>
  );
}

function InlineCitationQuote({
  className,
  children,
  ...props
}: React.ComponentProps<'blockquote'>) {
  return (
    <blockquote
      data-slot="inline-citation-quote"
      className={cn(
        'flex gap-2 border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground italic',
        className,
      )}
      {...props}
    >
      <QuoteIcon className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </blockquote>
  );
}

type CarouselValue = {
  index: number;
  count: number;
  previous: () => void;
  next: () => void;
};

const CarouselContext = React.createContext<CarouselValue>({
  index: 0,
  count: 0,
  previous: () => {},
  next: () => {},
});

function InlineCitationCarousel({
  className,
  defaultIndex = 0,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  defaultIndex?: number;
  children?: React.ReactNode;
}) {
  const [index, setIndex] = React.useState(defaultIndex);
  const items = React.Children.toArray(children).filter(Boolean);
  const count = items.length;
  const value = React.useMemo<CarouselValue>(
    () => ({
      index: Math.min(index, Math.max(0, count - 1)),
      count,
      previous: () => setIndex((current) => Math.max(0, current - 1)),
      next: () => setIndex((current) => Math.min(count - 1, current + 1)),
    }),
    [index, count],
  );
  return (
    <CarouselContext.Provider value={value}>
      <div data-slot="inline-citation-carousel" className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function InlineCitationCarouselContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { index } = React.useContext(CarouselContext);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div data-slot="inline-citation-carousel-content" className={className}>
      {items[Math.min(index, Math.max(0, items.length - 1))] ?? null}
    </div>
  );
}

function InlineCitationCarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="inline-citation-carousel-item" className={cn('min-w-0', className)} {...props} />
  );
}

function InlineCitationCarouselHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="inline-citation-carousel-header"
      className={cn('flex items-center justify-between gap-2 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function InlineCitationCarouselFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="inline-citation-carousel-footer"
      className={cn('flex items-center justify-between gap-2', className)}
      {...props}
    />
  );
}

function InlineCitationCarouselPrev({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { previous, index } = React.useContext(CarouselContext);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Previous source"
      disabled={index <= 0}
      onClick={previous}
      className={className}
      {...props}
    >
      <ChevronLeftIcon />
    </Button>
  );
}

function InlineCitationCarouselNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { next, index, count } = React.useContext(CarouselContext);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Next source"
      disabled={index >= count - 1}
      onClick={next}
      className={className}
      {...props}
    >
      <ChevronRightIcon />
    </Button>
  );
}

function InlineCitationIndex({ className }: { className?: string }) {
  const { index, count } = React.useContext(CarouselContext);
  return (
    <span
      data-slot="inline-citation-index"
      className={cn('text-xs text-muted-foreground tabular-nums', className)}
    >
      {count === 0 ? 0 : index + 1} / {count}
    </span>
  );
}

export {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationSource,
  InlineCitationQuote,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselFooter,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationIndex,
};
