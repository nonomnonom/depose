import type { ComponentType } from 'react';
import {
  CircleWarning,
  Clock,
  FileText,
  Folder,
  House,
  Layers,
  Settings,
  Users,
} from '@coolicons/react';
import type { IconProps } from '@coolicons/react/dynamic';

import { urls } from '~/features/urls';
import {
  SETTINGS_SCOPES,
  settingsHref,
  settingsSections,
} from '~/features/settings/settingsSections';

/**
 * Navigation state is derived from the active scene + session, never from the
 * router (PostHog `layout/navigation-3000/navigationLogic.tsx`). Components in
 * this folder only render what these functions return.
 */
export interface NavEntry {
  id: string;
  label: string;
  href: string;
  permission?: string;
  icon?: ComponentType<IconProps>;
  children?: NavEntry[];
}

export interface NavGroup {
  label: string;
  entries: NavEntry[];
}

type Can = (action: string) => boolean;

function permitted(entries: NavEntry[], can: Can): NavEntry[] {
  return entries
    .filter((entry) => !entry.permission || can(entry.permission))
    .map((entry) => ({
      ...entry,
      children: entry.children ? permitted(entry.children, can) : undefined,
    }));
}

/**
 * Rail top: only what is built so far (Today). New surfaces get a rail slot
 * here as they ship — nothing else is exposed yet.
 */
export function railNav(matterId?: string): NavEntry[] {
  return [
    {
      id: 'home',
      label: 'Home',
      href: matterId ? urls.matterHome(matterId) : urls.matters(),
      icon: House,
    },
  ];
}

/** Pinned to the bottom of the rail (PostHog: More + Settings + account). */
export function railFooterNav(matterId?: string): NavEntry[] {
  return [
    {
      id: 'settings',
      label: 'Settings',
      href: matterId ? settingsHref('matter-general') : settingsHref('firm-general'),
      icon: Settings,
    },
  ];
}

/**
 * Scoped settings entries for the command palette, derived from the unified
 * settings registry (PostHog settingsNavTree: user / organisation / project).
 */
export function settingsGroups(can: Can, matterId?: string): NavGroup[] {
  return SETTINGS_SCOPES.map(({ id: scope, label }) => ({
    label,
    entries: settingsSections
      .filter((section) => section.scope === scope)
      .filter((section) => !section.matterRequired || Boolean(matterId))
      .filter((section) => !section.permission || can(section.permission))
      .map((section) => ({ id: section.id, label: section.label, href: settingsHref(section.id) })),
  })).filter((group) => group.entries.length > 0);
}

/**
 * Contextual matter sidebar — the Wexler feature tree as scoped groups:
 * Context, Documents, Facts, Analysis, Subsets. Shown for matter data scenes.
 */
export function dataGroups(matterId: string, can: Can): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'Context',
      entries: [
        { id: 'entities', label: 'Parties / Entities', href: urls.matterEntities(matterId), permission: 'fact.read', icon: Users },
      ],
    },
    {
      label: 'Documents',
      entries: [
        {
          id: 'documents',
          label: 'Uploads',
          href: urls.matterDocuments(matterId),
          permission: 'document.read',
          icon: Folder,
        },
      ],
    },
    {
      label: 'Facts',
      entries: [
        { id: 'facts', label: 'Facts', href: urls.matterFacts(matterId), permission: 'fact.read', icon: FileText },
      ],
    },
    {
      label: 'Analysis',
      entries: [
        { id: 'summary', label: 'Summary', href: urls.matterSummary(matterId), permission: 'fact.read', icon: FileText },
        {
          id: 'chronologies',
          label: 'Chronologies',
          href: urls.matterChronologies(matterId),
          permission: 'intelligence.read',
          icon: Clock,
        },
        {
          id: 'inconsistencies',
          label: 'Inconsistencies',
          href: urls.matterInconsistencies(matterId),
          permission: 'intelligence.read',
          icon: CircleWarning,
        },
        { id: 'reports', label: 'Reports', href: urls.matterReports(matterId), permission: 'output.read', icon: FileText },
      ],
    },
    {
      label: 'Subsets',
      entries: [
        { id: 'subsets', label: 'Subsets', href: urls.matterSubsets(matterId), permission: 'subset.read', icon: Layers },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, entries: permitted(group.entries, can) }))
    .filter((group) => group.entries.length > 0);
}
