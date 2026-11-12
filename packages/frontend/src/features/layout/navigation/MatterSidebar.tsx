import { Link, useLocation } from 'react-router-dom';

import { useScene } from '~/features/sceneLogic';
import { useSession } from '~/features/lib/auth/session';
import { urls } from '~/features/urls';

import { dataGroups, type NavEntry, type NavGroup } from './navigationLogic';

/**
 * Contextual matter sidebar — the Wexler feature tree as scoped groups:
 * Context, Documents, Facts, Analysis, Subsets. Shown alongside matter data
 * scenes (sceneConfig.sidebar === 'data').
 */
export function MatterSidebar(): React.ReactNode {
  const { sceneConfig, sceneParams } = useScene();
  const { can } = useSession();
  const location = useLocation();
  const matterId = sceneParams.params.matterId ?? '';

  const groups: NavGroup[] = dataGroups(matterId, can);
  const activeItem = sceneConfig.sidebarItem;

  const isActive = (entry: NavEntry): boolean =>
    location.pathname === entry.href || location.pathname.startsWith(`${entry.href}/`);

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 w-16 border-r-2 border-border bg-muted/20 z-20 transform translate-x-full lg:translate-x-0"
      aria-label="Matter sections"
    >
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Matter</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            {group.entries.map((entry) => {
              const active = isActive(entry) || activeItem === entry.id;
              return (
                <Link
                  key={entry.id}
                  to={entry.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span className="truncate">{entry.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-2">
        <Link to={urls.matterHome(matterId)} className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Home
        </Link>
      </div>
    </aside>
  );
}
