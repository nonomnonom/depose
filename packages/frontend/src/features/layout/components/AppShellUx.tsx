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

/**
 * Pane header. Sits at the top of a sidebar or split pane, so it reads as part
 * of the surface rather than a card floating inside one.
 */
export function MatterContextCard({
  title,
  children,
  actions,
  className,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-2 border-b border-border px-3 py-2.5 ${className ?? ''}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="mt-1 min-w-0 text-sm">{children}</div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
