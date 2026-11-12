import type { ReactNode } from 'react';

import { useScene } from '~/app/sceneLogic';

import { MatterLayout } from './layout-modes/MatterLayout';
import { PlainLayout } from './layout-modes/PlainLayout';
import { WorkspaceLayout } from './layout-modes/WorkspaceLayout';
import { CommandPalette, CommandPaletteProvider } from './navigation/CommandPalette';
import { OfflineBanner } from './navigation/OfflineBanner';

/**
 * PostHog `layout/navigation-3000/Navigation.tsx`: the shell switches layout
 * based on the active scene's own config. The router contributes nothing but
 * the scene id.
 */
export function Navigation({ children }: { children: ReactNode }): ReactNode {
  const { sceneConfig } = useScene();

  if (sceneConfig.layout === 'plain') {
    return <PlainLayout>{children}</PlainLayout>;
  }

  const isWorkspace = sceneConfig.layout === 'app';

  return (
    <CommandPaletteProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <OfflineBanner />
        <div className="flex min-h-0 flex-1">
          {isWorkspace ? (
            <WorkspaceLayout>{children}</WorkspaceLayout>
          ) : (
            <MatterLayout>{children}</MatterLayout>
          )}
        </div>
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
