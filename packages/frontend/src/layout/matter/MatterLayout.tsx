import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import { FileSettingsCorner } from '@coolicons/react';
import { ApiError } from '~/lib/api/errors';
import { unwrapData } from '~/lib/api/client';
import { mattersControllerGet } from '~/generated/endpoints';
import { queryKeys } from '~/lib/query/keys';
import { matterSections } from '~/layout/app-shell/navigation';
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
  const sections = matterSections(matterId)
    .filter((section) => !section.permission || can(section.permission))
    .map((section) => ({
      ...section,
      children: section.children?.filter((child) => !child.permission || can(child.permission)),
    }));
  const activeTop = sections.find(
    (section) =>
      location.pathname === section.href ||
      location.pathname.startsWith(`${section.href}/`) ||
      section.children?.some(
        (child) =>
          location.pathname === child.href || location.pathname.startsWith(`${child.href}/`),
      ),
  );
  const children = activeTop?.children ?? [];
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
          <Button variant="outline" size="sm" render={<Link to={`/matters/${matterId}/settings`} />}>
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

      <nav aria-label="Matter sections" className="flex flex-col border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sections.map((section) => {
            const active = activeTop?.label === section.label;
            return (
              <Link
                key={section.label}
                to={section.children?.[0]?.href ?? section.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
        {children.length > 0 ? (
          <div className="flex items-center gap-1 bg-muted/40 px-1 py-1.5">
            {children.map((child) => {
              const active =
                location.pathname === child.href ||
                location.pathname.startsWith(`${child.href}/`);
              return (
                <Link
                  key={child.href}
                  to={child.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="flex flex-1 flex-col py-6">
        <Outlet context={{ matter }} />
      </div>
    </div>
  );
}
