import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { FileSettingsCorner } from '@coolicons/react';
import { ApiError } from '~/lib/api/errors';
import { unwrapData } from '~/lib/api/client';
import { mattersControllerGet } from '~/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import { matterWorkspaceNav } from '~/app/navigation';
import { urls } from '~/app/urls';
import { useSession } from '~/lib/auth/session';
import { PageSkeleton } from '~/lib/components/PageSkeleton';
import { ForbiddenPage, NotFoundPage } from '~/layout/ErrorPage';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

export function MatterLayout() {
  const { matterId = '' } = useParams();
  const location = useLocation();
  const { can } = useSession();

  const matterQuery = useQuery({
    queryKey: queryKeys.matter(matterId),
    queryFn: async () => unwrapData(await mattersControllerGet(matterId)),
    enabled: Boolean(matterId),
    retry: false,
  });

  if (matterQuery.isPending) {
    return <PageSkeleton rows={3} />;
  }

  if (matterQuery.isError) {
    const error = matterQuery.error;
    if (error instanceof ApiError && error.isNotFound) return <NotFoundPage />;
    if (error instanceof ApiError && error.isForbidden) return <ForbiddenPage />;
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">Matter could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Request failed.'}
        </p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => void matterQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const matter = matterQuery.data.matter;
  const nav = matterWorkspaceNav(matterId, can);
  const activeTab = nav.tabs.find(
    (tab) => location.pathname === tab.href || location.pathname.startsWith(`${tab.href}/`),
  );
  const isDataTab = Boolean(activeTab) && activeTab?.href === urls.matterData(matterId);
  const readOnly = matter.status === 'closed' || matter.status === 'archived';

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
                {matter.name}
              </h1>
              <Badge variant="outline" className="text-xs">
                {STATUS_LABEL[matter.status] ?? matter.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {matter.matterNumber ? `${matter.matterNumber} · ` : ''}
              {matter.type}
            </p>
          </div>
          <Button variant="outline" size="sm" render={<Link to={nav.settingsHref} />}>
            <FileSettingsCorner size={15} />
            Matter settings
          </Button>
        </div>
      </header>

      {readOnly ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
        >
          {matter.status === 'closed'
            ? 'This matter is closed. Data is read-only.'
            : 'This matter is archived. Only an admin can restore it.'}
        </div>
      ) : null}

      <nav aria-label="Matter workspace" className="flex items-center gap-1 border-b border-border">
        {nav.tabs.map((tab) => {
          const active = location.pathname === tab.href || location.pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.scene}
              to={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-1 flex-col py-6">
        {isDataTab ? (
          <div className="flex flex-1 gap-6">
            {nav.dataSections.length > 0 ? (
              <aside className="flex w-60 shrink-0 flex-col gap-1" aria-label="Matter data sections">
                {nav.dataSections.map((section) => (
                  <div key={section.href} className="flex flex-col gap-1">
                    <Link
                      to={section.href}
                      className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                        location.pathname === section.href || location.pathname.startsWith(`${section.href}/`)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {section.label}
                    </Link>
                    {(section.children ?? []).length > 0 ? (
                      <div className="ml-6 flex flex-col gap-1">
                        {(section.children ?? []).map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              location.pathname === child.href || location.pathname.startsWith(`${child.href}/`)
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </aside>
            ) : null}
            <div className="min-w-0 flex-1">
              <Outlet context={{ matter }} />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            <Outlet context={{ matter }} />
          </div>
        )}
      </div>
    </div>
  );
}

