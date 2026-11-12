import type { ReactNode } from 'react';

import { Badge } from '@depose/ui/components/badge';

import { useScene } from '~/app/sceneLogic';
import { ErrorState, ForbiddenPage, NotFoundPage } from '~/layout/ErrorPage';
import { PageSkeleton } from '~/lib/components/PageSkeleton';
import { ApiError } from '~/lib/api/errors';
import { useSession } from '~/lib/auth/session';
import { useMatter } from '~/lib/logic/matterLogic';

import { ContextSidebar } from '../navigation/ContextSidebar';
import { GlobalRail } from '../navigation/GlobalRail';
import { MatterTabs } from '../navigation/MatterTabs';
import { TopBar } from '../navigation/TopBar';
import { dataGroups } from '../navigation/navigationLogic';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

/**
 * Matter shell: global rail + breadcrumb bar + matter tabs + contextual Data
 * sidebar. `matter-raw` scenes drop the sidebar and default padding so their
 * split panes can own the full viewport (Wexler document viewer / Kim).
 */
export function MatterLayout({ children }: { children: ReactNode }): ReactNode {
  const { sceneConfig, sceneParams } = useScene();
  const { can } = useSession();
  const matterId = sceneParams.params.matterId ?? '';
  const matterQuery = useMatter(matterId);
  const raw = sceneConfig.layout === 'matter-raw';

  const matter = matterQuery.data?.matter;
  const readOnly = matter?.status === 'closed' || matter?.status === 'archived';

  let content: ReactNode = children;
  if (matterQuery.isPending) {
    content = <PageSkeleton rows={4} />;
  } else if (matterQuery.isError) {
    const error = matterQuery.error;
    if (error instanceof ApiError && error.isNotFound) content = <NotFoundPage />;
    else if (error instanceof ApiError && error.isForbidden) content = <ForbiddenPage />;
    else
      content = (
        <ErrorState
          title="Matter could not be loaded"
          message={error instanceof Error ? error.message : 'Request failed.'}
          onRetry={() => void matterQuery.refetch()}
        />
      );
  }

  return (
    <div className="flex min-w-0 flex-1">
      <GlobalRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar matterName={matter?.name} />

        {matter ? (
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-4">
            <span className="truncate text-sm font-medium">{matter.name}</span>
            <Badge variant="outline" className="text-xs">
              {STATUS_LABEL[matter.status] ?? matter.status}
            </Badge>
            {matter.matterNumber ? (
              <span className="truncate text-xs text-muted-foreground">· {matter.matterNumber}</span>
            ) : null}
          </div>
        ) : null}

        <MatterTabs matterId={matterId} active={sceneConfig.matterSection} />

        {readOnly ? (
          <div role="status" className="border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
            {matter?.status === 'closed'
              ? 'This matter is closed. Data is read-only.'
              : 'This matter is archived. Only an admin can restore it.'}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          {sceneConfig.sidebar === 'data' ? (
            <ContextSidebar
              groups={dataGroups(matterId, can)}
              activeItem={sceneConfig.sidebarItem}
              label="Matter data sections"
            />
          ) : null}
          <main
            id="main-content"
            className={raw ? 'min-w-0 flex-1 overflow-y-auto' : 'min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8'}
          >
            {raw ? content : <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{content}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
