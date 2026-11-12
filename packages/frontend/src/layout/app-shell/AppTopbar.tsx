import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@depose/ui/components/breadcrumb';
import { Kbd } from '@depose/ui/components/kbd';
import { SidebarTrigger } from '@depose/ui/components/sidebar';
import { Search } from '@coolicons/react';
import { useClientConfig } from '~/lib/config/client-config';
import { useSession } from '~/lib/auth/session';
import { useCommandPalette } from '~/layout/app-shell/CommandPalette';
import { breadcrumbsFor } from '~/app/navigation';
import { ThemeMenu } from '~/layout/app-shell/ThemeMenu';
import { UserMenu } from '~/layout/app-shell/UserMenu';
import { NotificationsMenu } from '~/layout/app-shell/NotificationsMenu';

export function AppTopbar() {
  const location = useLocation();
  const config = useClientConfig();
  const { me } = useSession();
  const { setOpen } = useCommandPalette();

  const firmName = me?.firm?.name ?? config.firmName;
  const crumbs = breadcrumbsFor(location.pathname, firmName, me?.firm?.name);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-4">
      <SidebarTrigger aria-label="Toggle navigation" />
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem className="min-w-0">
                  {last || !crumb.href ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className="truncate" render={<Link to={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-2 text-muted-foreground sm:inline-flex"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span>Search</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="size-4" />
        </Button>
        <NotificationsMenu />
        <ThemeMenu />
        <UserMenu />
      </div>
    </header>
  );
}


