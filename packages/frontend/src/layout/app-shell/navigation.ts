import type { ComponentType } from 'react';
import { Building1, Scale } from '@coolicons/react';
import type { IconProps } from '@coolicons/react/dynamic';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  permission?: string;
  firmOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Firm-level sidebar. Matter sections live inside the matter shell. */
export const firmNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [{ href: '/matters', label: 'Matters', icon: Scale, permission: 'matter.read' }],
  },
  {
    label: 'Firm',
    items: [{ href: '/settings/firm', label: 'Settings', icon: Building1 }],
  },
];

export interface MatterSection {
  label: string;
  href: string;
  permission?: string;
  children?: { label: string; href: string; permission?: string }[];
}

/** Matter top-level navigation, capped at seven items (spec 40). */
export function matterSections(matterId: string): MatterSection[] {
  const base = `/matters/${matterId}`;
  return [
    { label: 'Overview', href: `${base}/overview`, permission: 'matter.read' },
    {
      label: 'Evidence',
      href: `${base}/documents`,
      permission: 'document.read',
      children: [
        { label: 'Documents', href: `${base}/documents`, permission: 'document.read' },
        { label: 'Facts', href: `${base}/facts`, permission: 'fact.read' },
        { label: 'Search', href: `${base}/search`, permission: 'search.read' },
      ],
    },
    { label: 'Subsets', href: `${base}/subsets`, permission: 'subset.read' },
    { label: 'Chronology', href: `${base}/chronology`, permission: 'event.read' },
    { label: 'Dep AI', href: `${base}/ai`, permission: 'ai.ask' },
  ];
}

export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMatterSectionActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SETTINGS_SECTIONS: Record<string, string> = {
  '/settings/firm': 'Firm',
  '/settings/firm/members': 'Members',
  '/settings/firm/domains': 'Domains',
  '/settings/firm/ai': 'AI providers',
  '/settings/firm/integrations/mcp': 'Integrations',
  '/settings/user/profile': 'Profile',
  '/settings/user/security': 'Security',
  '/settings/user/notifications': 'Notifications',
  '/settings/user/appearance': 'Appearance',
  '/settings/user/ai': 'AI',
};

const MATTER_SECTION_LABELS: Record<string, string> = {
  overview: 'Overview',
  documents: 'Documents',
  facts: 'Facts',
  subsets: 'Subsets',
  summary: 'Summary',
  chronology: 'Chronology',
  intelligence: 'Contradictions',
  entities: 'Entities',
  outputs: 'Outputs',
  realtime: 'Live',
  ai: 'Dep AI',
  settings: 'Settings',
};

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

export function breadcrumbsFor(
  pathname: string,
  firmName: string,
  matterName?: string,
): BreadcrumbEntry[] {
  const root: BreadcrumbEntry = { label: firmName, href: '/matters' };

  if (pathname === '/matters') return [root, { label: 'Matters' }];
  if (pathname === '/search') return [root, { label: 'Search' }];
  if (pathname === '/outputs') return [root, { label: 'Outputs' }];
  if (pathname === '/notifications') return [root, { label: 'Notifications' }];

  const matterMatch = pathname.match(/^\/matters\/([^/]+)(?:\/([^/]+))?/);
  if (matterMatch) {
    const [, matterId, section] = matterMatch;
    const label = matterName ?? 'Matter';
    const trail: BreadcrumbEntry[] = [
      root,
      { label: 'Matters', href: '/matters' },
      { label, href: `/matters/${matterId}/overview` },
    ];
    if (section && MATTER_SECTION_LABELS[section]) {
      trail.push({ label: MATTER_SECTION_LABELS[section] });
    }
    return trail;
  }

  if (pathname.startsWith('/settings/matter')) {
    return [root, { label: 'Matter settings' }];
  }

  const settingsKey = Object.keys(SETTINGS_SECTIONS)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));

  if (settingsKey) {
    const trail: BreadcrumbEntry[] = [root, { label: 'Settings', href: '/settings/firm' }];
    const isUser = settingsKey.startsWith('/settings/user');
    if (isUser) {
      trail.push({ label: 'User' });
    } else if (settingsKey !== '/settings/firm') {
      trail.push({ label: 'Firm', href: '/settings/firm' });
    }
    trail.push({ label: SETTINGS_SECTIONS[settingsKey] });
    return trail;
  }

  if (pathname.startsWith('/settings')) {
    return [root, { label: 'Settings', href: '/settings/firm' }];
  }

  return [root];
}
