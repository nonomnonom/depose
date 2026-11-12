import type { ReactNode } from 'react';

import { useScene } from '~/features/sceneLogic';
import { GlobalRail } from '~/features/layout/navigation/GlobalRail';
import { MatterSidebar } from '~/features/layout/navigation/MatterSidebar';
import { SettingsSidebar } from '~/features/layout/navigation/SettingsSidebar';
import { TopBar } from '~/features/layout/navigation/TopBar';

/**
 * Layout hierarchy (two levels):
 * 1. App shell: slim rail + top bar wrap EVERY authenticated layout.
 * 2. Page: shadcn-style contextual sidebars (settings, matter data) sit below
 *    the top bar and wrap the page content.
 */
export function WorkspaceLayout({ children }: { children: ReactNode }): ReactNode {
  const { sceneConfig } = useScene();

  return (
    <div className="flex min-w-0 flex-1">
      <GlobalRail />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          {sceneConfig.sidebar === 'settings' ? <SettingsSidebar /> : null}
          {sceneConfig.sidebar === 'data' ? <MatterSidebar /> : null}
          <main
            id="main-content"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
