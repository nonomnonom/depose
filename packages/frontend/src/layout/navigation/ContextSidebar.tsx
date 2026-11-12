import { Link } from 'react-router-dom';

import type { NavGroup } from './navigationLogic';

/** Dumb contextual nav: the layout decides which group set to pass. */
export function ContextSidebar({
  groups,
  activeItem,
  label,
}: {
  groups: NavGroup[];
  activeItem?: string;
  label: string;
}): React.ReactNode {
  return (
    <aside
      className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-sidebar/40 px-3 py-4"
      aria-label={label}
    >
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          {group.entries.map((entry) => {
            const Icon = entry.icon;
            const active = entry.id === activeItem;
            return (
              <Link
                key={entry.id}
                to={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {Icon ? <Icon className="size-4" /> : null}
                <span className="truncate">{entry.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
