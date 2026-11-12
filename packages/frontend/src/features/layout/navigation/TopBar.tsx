import { Button } from '@depose/ui/components/button';
import { Kbd } from '@depose/ui/components/kbd';
import { Search } from '@coolicons/react';

import { useScene } from '~/features/sceneLogic';
import { useClientConfig } from '~/features/lib/config/client-config';

import { Breadcrumbs } from './Breadcrumbs';
import { useCommandPalette } from './CommandPalette';
import { breadcrumbsFor } from './navigationLogic';
import { NotificationsMenu } from './NotificationsMenu';
import { ThemeMenu } from './ThemeMenu';
import { UserMenu } from './UserMenu';

/** Persistent breadcrumb bar. Matter name is supplied by the matter layout. */
export function TopBar({ matterName }: { matterName?: string }): React.ReactNode {
  const { sceneId, sceneConfig, sceneParams } = useScene();
  const { firmName } = useClientConfig();
  const { setOpen } = useCommandPalette();
  const crumbs = breadcrumbsFor(sceneId, sceneConfig, sceneParams, firmName, matterName);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
      <Breadcrumbs items={crumbs} />

      <div className="ml-auto flex shrink-0 items-center gap-1">
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
