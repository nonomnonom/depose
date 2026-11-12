import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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
import { Check, Search, Settings, User } from '@coolicons/react';

import { useScene } from '~/features/sceneLogic';
import { Scene } from '~/features/sceneTypes';
import { readCurrentMatterId } from '~/features/lib/logic/currentMatter';
import { useClientConfig } from '~/features/lib/config/client-config';
import { urls } from '~/features/urls';
import { useSession } from '~/features/lib/auth/session';
import { initials } from '~/features/lib/format/date';

import { settingsHref } from '~/features/settings/settingsSections';

import { UserMenu } from './UserMenu';
import { railFooterNav, railNav, type NavEntry } from './navigationLogic';

/**
 * PostHog Today rail: the firm logo sits at the very top-left corner (its
 * dropdown carries the org menu), then labeled entries — only Today (Home) is
 * shipped so far — with Settings + account pinned at the bottom. Entries stay
 * disabled until a matter exists; more surfaces join as they are built.
 */
export function GlobalRail(): React.ReactNode {
  const location = useLocation();
  const { sceneId, sceneConfig, sceneParams } = useScene();

  const routeMatterId = sceneConfig.matterSection ? (sceneParams.params.matterId ?? '') : '';
  const matterId = routeMatterId || readCurrentMatterId() || '';
  /* Rail entries stay clickable outside a matter scene (e.g. settings) by
     falling back to the remembered matter — only a user with no matter at all
     sees them disabled. */
  const hasMatter = Boolean(matterId);

  const top = railNav(matterId || undefined);
  const footer = railFooterNav(routeMatterId || undefined);

  const isActive = (entry: NavEntry): boolean => {
    if (entry.id === 'home') return sceneId === Scene.MatterHome || sceneId === Scene.Home;
    if (entry.id === 'settings') return location.pathname.startsWith('/settings');
    return location.pathname === entry.href || location.pathname.startsWith(`${entry.href}/`);
  };

  return (
    <aside
      className="flex w-16 shrink-0 flex-col items-center gap-1 bg-sidebar pt-1 pb-3"
      aria-label="Main"
    >
      <div className="flex h-12 w-full shrink-0 items-center justify-center">
        <FirmMenu />
      </div>

      <nav className="mt-1 flex flex-col items-center gap-2" aria-label="Modules">
        {top.map((entry) =>
          hasMatter ? (
            <RailLink key={entry.id} entry={entry} active={isActive(entry)} />
          ) : (
            <RailDisabled key={entry.id} entry={entry} />
          ),
        )}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-2">
        {footer.map((entry) => (
          <RailLink key={entry.id} entry={entry} active={isActive(entry)} />
        ))}

        <div className="mt-1">
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}

function RailLink({ entry, active }: { entry: NavEntry; active: boolean }): React.ReactNode {
  const Icon = entry.icon;
  return (
    <Link
      to={entry.href}
      aria-label={entry.label}
      aria-current={active ? 'page' : undefined}
      className="group flex w-full shrink-0 cursor-pointer flex-col items-center gap-1 outline-none hover:text-foreground"
    >
      <span
        className={`relative flex size-10 items-center justify-center rounded-md ${
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground group-hover:bg-accent/50 group-hover:text-foreground'
        }`}
      >
        {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
      </span>
      <span className="max-w-full truncate px-0.5 text-[10px] leading-3 font-medium">
        {entry.label}
      </span>
    </Link>
  );
}

function RailDisabled({ entry }: { entry: NavEntry }): React.ReactNode {
  const Icon = entry.icon;
  return (
    <span
      aria-disabled="true"
      title="Open a matter first"
      className="flex w-full shrink-0 flex-col items-center gap-1 opacity-40"
    >
      <span className="flex size-10 items-center justify-center rounded-md text-muted-foreground">
        {Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
      </span>
      <span className="max-w-full truncate px-0.5 text-[10px] leading-3 font-medium">
        {entry.label}
      </span>
    </span>
  );
}

/**
 * Firm (organisation) menu — PostHog's org avatar at the rail's top-left
 * corner: search, the firm list with the active one checked, invite members,
 * and firm settings.
 */
function FirmMenu(): React.ReactNode {
  const { me, can } = useSession();
  const { firmName: configFirmName } = useClientConfig();
  const firmName = me?.firm?.name ?? configFirmName;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const matches = firmName.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Firm menu"
            className="flex cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
            {initials(firmName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-60">
        <div className="px-2 pt-1 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search firms"
              className="h-8 pl-7 text-sm"
              aria-label="Search firms"
            />
          </div>
        </div>
        <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Firms
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {matches ? (
            <DropdownMenuItem onClick={() => navigate(urls.matters())}>
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
                {initials(firmName)}
              </span>
              <span className="min-w-0 flex-1 truncate">{firmName}</span>
              <Check size={16} className="shrink-0 text-foreground" aria-hidden="true" />
            </DropdownMenuItem>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">No firms match.</p>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {can('firm.member.manage') ? (
            <DropdownMenuItem onClick={() => navigate(settingsHref('firm-members'))}>
              <User size={16} />
              Invite members
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => navigate(settingsHref('firm-general'))}>
            <Settings size={16} />
            Firm settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
