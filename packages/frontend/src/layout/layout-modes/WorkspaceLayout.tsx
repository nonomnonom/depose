import type { ReactNode } from 'react';

import { useScene } from '~/app/sceneLogic';
import { useSession } from '~/lib/auth/session';

import { ContextSidebar } from '../navigation/ContextSidebar';
import { GlobalRail } from '../navigation/GlobalRail';
import { TopBar } from '../navigation/TopBar';
import { settingsGroups } from '../navigation/navigationLogic';

/** Workspace shell: global rail + breadcrumb bar + padded content. */
export function WorkspaceLayout({ children }: { children: ReactNode }): ReactNode {
  const { sceneConfig } = useScene();
  const { can } = useSession();

  return (
    <div className="flex min-w-0 flex-1">
      <GlobalRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          {sceneConfig.sidebar === 'settings' ? (
            <ContextSidebar
              groups={settingsGroups(can)}
              activeItem={sceneConfig.sidebarItem}
              label="Settings sections"
            />
          ) : null}
          <main id="main-content" className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
