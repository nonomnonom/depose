import { Link } from 'react-router-dom';
import { Settings } from '@coolicons/react';

import type { MatterSection } from '~/app/sceneTypes';
import { urls } from '~/app/urls';

import { matterTabs } from './navigationLogic';

/** Persistent matter tabs. Settings is a separate action, not a Data tab. */
export function MatterTabs({
  matterId,
  active,
}: {
  matterId: string;
  active?: MatterSection;
}): React.ReactNode {
  return (
    <nav
      className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-4"
      aria-label="Matter workspace"
    >
      {matterTabs(matterId).map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`h-full shrink-0 border-b-2 px-3 pt-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}

      <Link
        to={urls.matterSettings(matterId)}
        className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Settings size={14} />
        Matter settings
      </Link>
    </nav>
  );
}
