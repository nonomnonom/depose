import type { ComponentType } from 'react';
import {
  Bell,
  Building1,
  CircleWarning,
  Clock,
  FileText,
  Folder,
  Grid,
  Layers,
  Radio,
  Scale,
  Search,
  Settings,
  Sparkle,
  User,
  Users,
} from '@coolicons/react';
import type { IconProps } from '@coolicons/react/dynamic';

import { Scene, type SceneConfig, type SceneParams } from '~/features/sceneTypes';
import { urls } from '~/features/urls';

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

export interface Breadcrumb {
  label: string;
  href?: string;
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

/** Global rail: workspace-level modules only. Matter features never live here. */
export function workspaceNav(): NavEntry[] {
  return [
    { id: 'matters', label: 'Matters', href: urls.matters(), icon: Scale },
    { id: 'notifications', label: 'Notifications', href: urls.notifications(), icon: Bell },
    { id: 'settings', label: 'Settings', href: urls.settingsFirm(), icon: Settings },
  ];
}

/** Contextual sidebar for workspace settings scenes. */
export function settingsGroups(can: Can): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'Firm',
      entries: [
        { id: 'firm', label: 'General', href: urls.settingsFirm(), permission: 'firm.read', icon: Building1 },
        { id: 'members', label: 'Members', href: urls.settingsMembers(), permission: 'firm.member.manage', icon: Users },
        { id: 'domains', label: 'Domains', href: urls.settingsDomains(), permission: 'firm.read', icon: Grid },
        { id: 'ai', label: 'AI', href: urls.settingsAi(), permission: 'firm.update', icon: Sparkle },
        {
          id: 'integrations',
          label: 'Integrations',
          href: urls.settingsMcp(),
          permission: 'firm.mcp.manage',
          icon: Layers,
        },
      ],
    },
    {
      label: 'Account',
      entries: [
        { id: 'profile', label: 'Profile', href: urls.settingsProfile(), icon: User },
        { id: 'notifications', label: 'Notifications', href: urls.settingsNotifications(), icon: Bell },
        { id: 'appearance', label: 'Appearance', href: urls.settingsAppearance(), icon: Sparkle },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, entries: permitted(group.entries, can) }))
    .filter((group) => group.entries.length > 0);
}

/** Persistent matter tabs (Wexler 2.0: Summary / Data / Kim / Realtime). */
export function matterTabs(matterId: string): NavEntry[] {
  return [
    { id: 'summary', label: 'Summary', href: urls.matterSummary(matterId) },
    { id: 'data', label: 'Data', href: urls.matterFacts(matterId) },
    { id: 'kim', label: 'Dep AI', href: urls.matterKim(matterId), icon: Sparkle },
    { id: 'realtime', label: 'Real-time', href: urls.matterRealtime(matterId), icon: Radio },
  ];
}

/** Contextual Data sidebar, shown only for data scenes. */
export function dataGroups(matterId: string, can: Can): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'Facts',
      entries: [
        { id: 'facts', label: 'Facts', href: urls.matterFacts(matterId), permission: 'fact.read', icon: FileText },
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
        { id: 'entities', label: 'Entities', href: urls.matterEntities(matterId), permission: 'fact.read', icon: Users },
      ],
    },
    {
      label: 'Documents',
      entries: [
        {
          id: 'documents',
          label: 'Documents',
          href: urls.matterDocuments(matterId),
          permission: 'document.read',
          icon: Folder,
        },
      ],
    },
    {
      label: 'Workspace',
      entries: [
        { id: 'subsets', label: 'Subsets', href: urls.matterSubsets(matterId), permission: 'subset.read', icon: Layers },
        { id: 'search', label: 'Search', href: urls.matterSearch(matterId), icon: Search },
      ],
    },
  ];

  return groups
    .map((group) => ({ ...group, entries: permitted(group.entries, can) }))
    .filter((group) => group.entries.length > 0);
}

const DETAIL_PARENT: Partial<Record<Scene, { label: string; path: (matterId: string) => string }>> = {
  [Scene.MatterDocument]: { label: 'Documents', path: urls.matterDocuments },
  [Scene.MatterReport]: { label: 'Reports', path: urls.matterReports },
  [Scene.MatterSubset]: { label: 'Subsets', path: urls.matterSubsets },
};

/** Breadcrumb encodes Matter and Subset hierarchy, as in Wexler's newer shell. */
export function breadcrumbsFor(
  sceneId: Scene,
  sceneConfig: SceneConfig,
  sceneParams: SceneParams,
  firmName: string,
  matterName?: string,
): Breadcrumb[] {
  const root: Breadcrumb = { label: firmName, href: urls.matters() };
  const matterId = sceneParams.params.matterId;

  if (sceneConfig.matterSection && matterId) {
    const trail: Breadcrumb[] = [
      { label: 'Matters', href: urls.matters() },
      { label: matterName ?? 'Matter', href: urls.matterSummary(matterId) },
    ];
    const parent = DETAIL_PARENT[sceneId];
    if (parent) trail.push({ label: parent.label, href: parent.path(matterId) });
    trail.push({ label: sceneConfig.name });
    return trail;
  }

  if (sceneConfig.sidebar === 'settings') {
    return [{ label: 'Matters', href: urls.matters() }, { label: 'Settings', href: urls.settingsFirm() }, { label: sceneConfig.name }];
  }

  if (sceneId === Scene.Matters) return [root, { label: 'Matters' }];
  return [root, { label: sceneConfig.name }];
}
