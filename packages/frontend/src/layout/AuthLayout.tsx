import type { ReactNode } from 'react';
import { Badge } from '@depose/ui/components/badge';
import logoUrl from '~/assets/mascot/logo-favicon.png';
import { useClientConfig } from '~/lib/config/client-config';
import { ThemeMenu } from '~/layout/ThemeMenu';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  switcher?: ReactNode;
}

/**
 * Auth shell that mirrors the app shell: a slim rail on the left and a single
 * top strip, with the form sitting directly on the app background.
 */
export function AuthLayout({ title, description, children, footer, switcher }: AuthLayoutProps) {
  const { firmName, hostname, features } = useClientConfig();

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="flex items-center gap-3 border-b border-border px-4 py-3 lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-3 lg:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-card">
            <img src={logoUrl} alt="" className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{firmName}</p>
            <p className="truncate text-xs text-muted-foreground">{hostname}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0 lg:mt-auto lg:justify-between">
          {features.setup.required ? (
            <Badge variant="outline" className="text-xs">
              Instance baru
            </Badge>
          ) : (
            <span className="hidden text-xs text-muted-foreground lg:inline">Depose</span>
          )}
          <ThemeMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-border px-6 lg:flex">
          <span className="text-sm text-muted-foreground">Depose</span>
          <span className="text-sm text-muted-foreground/50" aria-hidden="true">
            /
          </span>
          <span className="text-sm font-medium">{title}</span>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground text-pretty">{description}</p>
              ) : null}
            </div>

            {children}

            {footer ? <div className="mt-6">{footer}</div> : null}
            {switcher ? (
              <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                {switcher}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
