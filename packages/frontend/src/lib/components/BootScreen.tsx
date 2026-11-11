import { Spinner } from '@depose/ui/components/spinner';

export function BootScreen({ label = 'Memuat Depose...' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        D
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3.5" />
        <span>{label}</span>
      </div>
    </div>
  );
}
