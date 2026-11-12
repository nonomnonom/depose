import type { ReactNode } from 'react';

import { useScene } from '~/features/sceneLogic';
import { useSession } from '~/features/lib/auth/session';

import { ContextSidebar } from '~/features/layout/navigation/ContextSidebar';
import { GlobalRail } from '~/features/layout/navigation/GlobalRail';
import { TopBar } from '~/features/layout/navigation/TopBar';
import { settingsGroups } from '~/features/layout/navigation/navigationLogic';
import { EmptyState, SidebarCaption } from '~/features/layout/components/AppShellUx';


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
