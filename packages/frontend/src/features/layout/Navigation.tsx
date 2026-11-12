import type { ReactNode } from 'react';

import { useScene } from '~/features/sceneLogic';

import { MatterLayout } from '~/features/layout/layout-modes/MatterLayout';
import { PlainLayout } from '~/features/layout/layout-modes/PlainLayout';
import { WorkspaceLayout } from '~/features/layout/layout-modes/WorkspaceLayout';
import { CommandPalette, CommandPaletteProvider } from '~/features/layout/navigation/CommandPalette';
import { OfflineBanner } from '~/features/layout/navigation/OfflineBanner';

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
