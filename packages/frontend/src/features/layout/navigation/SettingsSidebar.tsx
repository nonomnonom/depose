import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '@depose/ui/components/input';
import { Search } from '@coolicons/react';

import { useScene } from '~/features/sceneLogic';
import { useSession } from '~/features/lib/auth/session';
import { readCurrentMatterId } from '~/features/lib/logic/currentMatter';

import {
  SETTINGS_SCOPES,
  defaultSectionForScope,
  settingsHref,
  settingsSections,
  type SettingsScope,
} from '~/features/settings/settingsSections';

/**
 * PostHog-style settings panel (page level, below the top bar): a "Settings"
 * heading, a search across every section, scope tabs (User | Firm | Matter),
 * the active scope's section list, and the danger zone rendered last in red.
 */
export function SettingsSidebar(): React.ReactNode {
  const { sceneParams } = useScene();
  const { can } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const matterId = sceneParams.params.matterId ?? readCurrentMatterId() ?? undefined;
  const currentSectionId = location.pathname.replace(/^\/settings\/?/, '') || undefined;

  const searchable = query.trim().length > 0;
  const matches = (scope: SettingsScope) =>
    settingsSections.filter(
      (section) =>
        section.scope === scope &&
        (!section.matterRequired || Boolean(matterId)) &&
        (!section.permission || can(section.permission)) &&
        section.label.toLowerCase().includes(query.trim().toLowerCase()),
    );

  const activeScope: SettingsScope | null =
    SETTINGS_SCOPES.find((scope) => currentSectionId?.startsWith(`${scope.id}-`))?.id ?? null;

  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      aria-label="Settings sections"
    >
      <div className="flex flex-col gap-2 border-b border-sidebar-border px-3 py-3">
        <p className="text-sm font-semibold">Settings</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all settings..."
            className="h-8 bg-background pl-7 text-sm"
            aria-label="Search all settings"
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-md bg-background p-0.5" role="tablist" aria-label="Settings scope">
          {SETTINGS_SCOPES.map((scope) => {
            const disabled = scope.id === 'matter' && !matterId;
            const active = !searchable && activeScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                title={disabled ? 'Open a matter first' : undefined}
                onClick={() => navigate(settingsHref(defaultSectionForScope(scope.id)))}
                className={`flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                {scope.label}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-3">
        {(searchable
          ? SETTINGS_SCOPES
          : SETTINGS_SCOPES.filter((scope) => scope.id === (activeScope ?? 'firm'))
        ).map((scope) => {
          const entries = matches(scope.id);
          if (entries.length === 0) return null;
          return (
            <div key={scope.id} className="flex flex-col gap-0.5">
              {searchable ? (
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {scope.label}
                </p>
              ) : null}
              {entries.map((section) => {
                const active = !searchable && section.id === currentSectionId;
                return (
                  <Link
                    key={section.id}
                    to={settingsHref(section.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-sidebar-accent text-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{section.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-2 py-2">
        <span
          aria-disabled="true"
          title="Destructive actions will live here"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-destructive"
        >
          <span className="truncate">Danger zone</span>
        </span>
      </div>

    </aside>
  );
}
