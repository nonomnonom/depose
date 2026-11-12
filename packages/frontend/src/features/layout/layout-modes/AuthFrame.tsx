import type { ReactNode } from 'react';
import { Badge } from '@depose/ui/components/badge';

import logoUrl from '~/assets/mascot/logo-favicon.png';
import { ThemeMenu } from '~/features/layout/navigation/ThemeMenu';
import { useClientConfig } from '~/features/lib/config/client-config';

interface AuthFrameProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  switcher?: ReactNode;
}

/**
 * Branded frame for logged-out and bootstrap scenes (PostHog-style bare auth
 * layout): full-viewport page, logo centered on top, one centered card.
 * Scene controls the copy.
 */
export function AuthFrame({ title, description, children, footer, switcher }: AuthFrameProps): ReactNode {
  const { firmName, features } = useClientConfig();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-background px-4 py-10 sm:px-6">
      <div className="absolute right-4 top-4">
        <ThemeMenu />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <img src={logoUrl} alt="" className="size-7" aria-hidden="true" />
          </span>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold leading-tight">{firmName}</p>
            {features.setup.required ? (
              <Badge variant="outline" className="text-xs">
                New instance
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground text-pretty">{description}</p> : null}
          </div>

          {children}

          {footer ? <div className="mt-5">{footer}</div> : null}
        </div>

        {switcher ? (
          <div className="mt-5 text-center text-sm text-muted-foreground">{switcher}</div>
        ) : null}
      </div>
    </div>
  );
}
