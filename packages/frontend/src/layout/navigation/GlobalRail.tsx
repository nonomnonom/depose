import { Link, useLocation } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';

import logoUrl from '~/assets/mascot/logo-favicon.png';
import { urls } from '~/app/urls';
import { useClientConfig } from '~/lib/config/client-config';

import { workspaceNav } from './navigationLogic';

/** Persistent workspace rail. Only workspace-level modules live here. */
export function GlobalRail(): React.ReactNode {
  const location = useLocation();
  const { firmName } = useClientConfig();

  return (
    <aside
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3"
      aria-label="Workspace navigation"
    >
      <Link
        to={urls.matters()}
        title={firmName}
        aria-label={firmName}
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
      >
        <img src={logoUrl} alt="" className="size-6" aria-hidden="true" />
      </Link>

      <div className="my-2 h-px w-6 bg-sidebar-border" aria-hidden="true" />

      <nav className="flex flex-col items-center gap-1" aria-label="Modules">
        {workspaceNav().map((entry) => {
          const Icon = entry.icon;
          const active =
            entry.id === 'settings'
              ? location.pathname.startsWith('/settings')
              : location.pathname === entry.href || location.pathname.startsWith(`${entry.href}/`);
          return (
            <Button
              key={entry.id}
              variant={active ? 'secondary' : 'ghost'}
              size="icon"
              aria-label={entry.label}
              aria-current={active ? 'page' : undefined}
              title={entry.label}
              render={<Link to={entry.href} />}
            >
              {Icon ? <Icon /> : null}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
