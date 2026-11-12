import type { ComponentType } from 'react';
import { Building1, Help, Scale } from '@coolicons/react';
import type { IconProps } from '@coolicons/react/dynamic';
import { Scene } from './sceneTypes';
import { urls } from './urls';

export interface NavEntry {
  scene: Scene;
  href: string;
  label: string;
  permission?: string;
  icon?: ComponentType<IconProps>;
}

export interface NavGroup {
  label: string;
  entries: NavEntry[];
}

export const globalNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    entries: [{ scene: Scene.Matters, href: '/matters', label: 'Matters', icon: Scale }],
  },
  {
    label: 'Product',
    entries: [{ scene: Scene.Help, href: '/help', label: 'Help Centre', icon: Help }],
  },
  {
    label: 'Organisation',
    entries: [{ scene: Scene.Settings, href: '/settings/firm', label: 'Settings', icon: Building1 }],
  },
];

export interface MatterNavItem extends NavEntry {
  children?: NavEntry[];
}

export interface MatterWorkspaceNav {
  tabs: NavEntry[];
  dataSections: MatterNavItem[];
  settingsHref: string;
  realtimeHref: string;
}

function canRead(can: (action: string) => boolean, action?: string): boolean {
  return !action || can(action);
}

export function matterWorkspaceNav(matterId: string, can: (action: string) => boolean): MatterWorkspaceNav {
  const tabs: NavEntry[] = [
    { scene: Scene.MatterSummary, href: urls.matterSummary(matterId), label: 'Summary' },
    { scene: Scene.MatterData, href: urls.matterData(matterId), label: 'Data' },
    { scene: Scene.MatterKim, href: urls.matterKim(matterId), label: 'Dep AI' },
    { scene: Scene.MatterRealtime, href: urls.matterRealtime(matterId), label: 'Real-time' },
  ];

  const dataSections: MatterNavItem[] = [
    { scene: Scene.MatterDataFacts, href: urls.matterDataFacts(matterId), label: 'Facts', permission: 'fact.read' },
    {
      scene: Scene.MatterDataChronologies,
      href: urls.matterDataChronologies(matterId),
      label: 'Chronologies',
      permission: 'intelligence.read',
    },
    {
      scene: Scene.MatterDataInconsistencies,
      href: urls.matterDataInconsistencies(matterId),
      label: 'Inconsistencies',
      permission: 'intelligence.read',
      children: [
        { scene: Scene.MatterDataInconsistencies, href: urls.matterDataInconsistencies(matterId), label: 'Inconsistencies' },
        { scene: Scene.MatterDataReports, href: urls.matterDataReports(matterId), label: 'Reports' },
      ],
    },
    { scene: Scene.MatterDataReports, href: urls.matterDataReports(matterId), label: 'Reports', permission: 'output.read' },
    { scene: Scene.MatterDataEntities, href: urls.matterDataEntities(matterId), label: 'Entities', permission: 'fact.read' },
    { scene: Scene.MatterDataDocuments, href: urls.matterDataDocuments(matterId), label: 'Documents', permission: 'document.read' },
    { scene: Scene.MatterDataSubsets, href: urls.matterDataSubsets(matterId), label: 'Subsets', permission: 'subset.read' },
  ];

  return {
    tabs,
    dataSections: dataSections.filter((section) => canRead(can, section.permission)),
    settingsHref: urls.matterSettings(matterId),
    realtimeHref: urls.matterRealtime(matterId),
  };
}

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string, firmName: string, matterName?: string): BreadcrumbEntry[] {
  const root: BreadcrumbEntry = { label: firmName, href: '/matters' };
  if (pathname === '/matters') return [root, { label: 'Matters' }];
  if (pathname === '/help') return [root, { label: 'Help Centre' }];
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return [root, { label: 'Settings' }];
  if (pathname === '/notifications') return [root, { label: 'Notifications' }];

  const matterMatch = pathname.match(/^\/matters\/([^/]+)(\/.*)?$/);
  if (matterMatch) {
    const matterId = matterMatch[1];
    const section = matterMatch[2] ?? '';
    const [segment, ...rest] = section.split('/').filter(Boolean);
    const trail: BreadcrumbEntry[] = [
      root,
      { label: 'Matters', href: '/matters' },
      { label: matterName ?? 'Matter', href: matterId ? urls.matter(matterId) : undefined },
    ];
    const sectionLabel = matterSectionLabel(segment, rest?.[0]);
    if (sectionLabel) trail.push({ label: sectionLabel });
    return trail;
  }

  return [root];
}

function matterSectionLabel(segment?: string, sub?: string): string | undefined {
  switch (segment) {
    case 'summary':
      return 'Summary';
    case 'data':
      return 'Data';
    case 'kim':
      return 'Dep AI';
    case 'realtime':
      return 'Real-time';
    case 'settings':
      return 'Settings';
    case 'search':
      return 'Search';
    case undefined:
      return undefined;
    default:
      if (sub) return sub;
      return segment;
  }
}


