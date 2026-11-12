import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@depose/ui/components/button';
import { Kbd } from '@depose/ui/components/kbd';
import { Avatar, AvatarFallback } from '@depose/ui/components/avatar';
import { Input } from '@depose/ui/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@depose/ui/components/dropdown-menu';
import { Check, ChevronDown, CircleHelp, Plus, Search, Settings } from '@coolicons/react';

import { useScene } from '~/features/sceneLogic';
import { readCurrentMatterId } from '~/features/lib/logic/currentMatter';
import { useSession } from '~/features/lib/auth/session';
import { useMatters } from '~/features/matters/matters.queries';
import { urls } from '~/features/urls';

import { settingsHref } from '~/features/settings/settingsSections';

import { useCommandPalette } from './CommandPalette';

/**
 * Top bar: firm identity on the rail, matter (project) switcher, centered search,
 * and AI + support on the right. Account menu lives at the rail footer.
 */
export function TopBar({ matterName }: { matterName?: string }): React.ReactNode {
  const { sceneParams } = useScene();
  const { setOpen } = useCommandPalette();

  const matterId = sceneParams.params.matterId ?? readCurrentMatterId() ?? '';
  const matters = useMatters({ status: 'active' });
  const matterItems = matters.data?.pages.flatMap((page) => page.items) ?? [];

  const currentMatter =
    matterItems.find((item) => item.id === matterId)?.name ?? matterName ?? (matterId ? 'Matter' : null);

  return (
    <header className="sticky top-0 z-30 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-sidebar pe-2 ps-2">
      <div className="flex min-w-0 items-center">
        <MatterSwitcher
          current={currentMatter}
          items={matterItems.map((item) => ({ id: item.id, name: item.name }))}
          loading={matters.isPending}
        />
      </div>

      <div className="flex w-full min-w-0 items-center gap-2 px-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 justify-start gap-2 bg-background/60 font-normal text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-start">Search</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </Button>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Support"
          render={<a href="mailto:support@depose.ai" />}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

/**
 * Matter = project combobox: search, the project list
 * with the active one checked, project settings, and new project.
 */
function MatterSwitcher({
  current,
  items,
  loading,
}: {
  current: string | null;
  items: Array<{ id: string; name: string }>;
  loading: boolean;
}): React.ReactNode {
  const navigate = useNavigate();
  const { can } = useSession();
  const [query, setQuery] = useState('');
  const label = current ?? (loading ? 'Matters…' : 'Matters');
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 gap-1.5 px-1.5"
            aria-label="Matter switcher"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback className="text-[11px] font-semibold">
            {(current ?? 'M').trim().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-48 min-w-0 truncate">{label}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <div className="px-2 pt-1 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              className="h-8 pl-7 text-sm"
              aria-label="Search projects"
            />
          </div>
        </div>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {filtered.length === 0 && !loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {items.length === 0 ? 'No active matters yet.' : 'No projects match.'}
            </p>
          ) : null}
          {filtered.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => navigate(urls.matterHome(item.id))}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
                {item.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.name === current ? (
                <Check size={16} className="shrink-0 text-foreground" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {current ? (
            <DropdownMenuItem
              onClick={() => navigate(settingsHref('matter-general'))}
            >
              <Settings size={16} />
              Project settings
            </DropdownMenuItem>
          ) : null}
          {can('matter-create') ? (
            <DropdownMenuItem onClick={() => navigate(urls.matters(), { state: { createMatter: true } })}>
              <Plus size={16} />
              New project
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
