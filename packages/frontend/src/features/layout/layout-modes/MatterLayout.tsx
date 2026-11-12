import { useEffect, type ReactNode } from 'react';

import { useScene } from '~/features/sceneLogic';
import { ErrorState, ForbiddenPage, NotFoundPage } from '~/features/layout/ErrorPage';
import { PageLoading } from '~/features/lib/components/PageLoading';
import { ApiError } from '~/features/lib/api/errors';
import { useMatter } from '~/features/lib/logic/matterLogic';
import { forgetCurrentMatter, rememberCurrentMatter } from '~/features/lib/logic/currentMatter';

import { GlobalRail } from '~/features/layout/navigation/GlobalRail';
import { MatterSidebar } from '~/features/layout/navigation/MatterSidebar';
import { SettingsSidebar } from '~/features/layout/navigation/SettingsSidebar';
import { TopBar } from '~/features/layout/navigation/TopBar';
import { useRecordRecentMatter } from '~/features/matter/home/today.queries';

/**
 * Matter shell. Matter is the project: PostHog Today-style rail + top bar with
 * the matter switcher. `matter-raw` scenes drop the padding so their split
 * panes own the viewport.
 */
export function MatterLayout({ children }: { children: ReactNode }): ReactNode {
  const { sceneConfig, sceneParams } = useScene();
  const matterId = sceneParams.params.matterId ?? '';
  const matterQuery = useMatter(matterId);
  const raw = sceneConfig.layout === 'matter-raw';

  const matter = matterQuery.data;
  const readOnly = matter?.status === 'closed' || matter?.status === 'archived';

  const recordRecent = useRecordRecentMatter();
  useEffect(() => {
    if (matter?.id) recordRecent.mutate(matter.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter?.id]);

  // Last-opened matter decides where the app lands next time, so a stale or
  // deleted id is dropped instead of bounced into on every visit.
  useEffect(() => {
    if (matter) rememberCurrentMatter(matter.id);
  }, [matter]);

  useEffect(() => {
    const error = matterQuery.error;
    if (error instanceof ApiError && error.isNotFound) forgetCurrentMatter();
  }, [matterQuery.error]);

  let content: ReactNode = children;
  if (matterQuery.isPending) {
    content = <PageLoading />;
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
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <TopBar matterName={matter?.name} />

        {readOnly ? (
          <div
            role="status"
            className="border-b border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground"
          >
            {matter?.status === 'closed'
              ? 'This matter is closed. Data is read-only.'
              : 'This matter is archived. Only an admin can restore it.'}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          {sceneConfig.sidebar === 'data' ? <MatterSidebar /> : null}
          {sceneConfig.sidebar === 'settings' ? <SettingsSidebar /> : null}
          <main
            id="main-content"
            className={
              raw
                ? 'min-h-0 flex-1 overflow-y-auto'
                : 'min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8'
            }
          >
            {raw ? (
              content
            ) : (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{content}</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
