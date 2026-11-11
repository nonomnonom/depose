import { Fragment } from 'react';
import { Link, useLocation, useMatch } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
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
import { unwrapData } from '~/lib/api/client';
import { mattersControllerGet } from '~/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import { useCommandPalette } from '~/layout/app-shell/CommandPalette';
import { breadcrumbsFor } from '~/layout/app-shell/navigation';
import { ThemeMenu } from '~/layout/app-shell/ThemeMenu';
import { UserMenu } from '~/layout/app-shell/UserMenu';
import { NotificationsMenu } from '~/layout/app-shell/NotificationsMenu';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

export function AppTopbar() {
  const location = useLocation();
  const config = useClientConfig();
  const { me } = useSession();
  const { setOpen } = useCommandPalette();
  const matterMatch = useMatch('/matters/:matterId/*');

  const matterId = matterMatch?.params.matterId;
  const matterQuery = useQuery({
    queryKey: queryKeys.matter(matterId ?? ''),
    queryFn: async () => unwrapData(await mattersControllerGet(matterId ?? '')),
    enabled: Boolean(matterId),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const matter = matterQuery.data?.matter;

  const firmName = me?.firm?.name ?? config.firmName;
  const crumbs = breadcrumbsFor(location.pathname, firmName, matter?.name);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-4">
      <SidebarTrigger          aria-label="Toggle navigation" />
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

      {matter ? (
        <Badge variant="outline" className="hidden text-xs lg:inline-flex">
          {STATUS_LABEL[matter.status] ?? matter.status}
        </Badge>
      ) : null}

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
