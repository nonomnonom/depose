import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Depose
          </span>
          <span className="text-sm text-muted-foreground">Fact intelligence for disputes</span>
        </header>
        {children}
      </div>
    </main>
  );
}