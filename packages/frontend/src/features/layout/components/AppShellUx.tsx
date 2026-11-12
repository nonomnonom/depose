import { CircleWarning } from '@coolicons/react';
import { Button } from '@depose/ui/components/button';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/30">
        <CircleWarning size={20} className="text-muted-foreground" />
      </div>
      <div>
        <p className="font-heading text-xl font-semibold tracking-tight">{title}</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      {action ? (
        <Button onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function AccessBlock({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
      <CircleWarning className="mt-0.5 shrink-0 text-muted-foreground/70" size={18} />
      <p>{message}</p>
    </div>
  );
}

export function SidebarCaption({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[11px] text-muted-foreground text-pretty ${className ?? ''}`}>{children}</p>
  );
}

export function MatterContextCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <div className="mt-0.5 size-5 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground text-[11px] font-medium uppercase">
        {title}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
