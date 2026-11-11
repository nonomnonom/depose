import type { ComponentType } from 'react';
import {
  Building1,
  Scale,
  User,
} from '@coolicons/react';
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

export const navGroups: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { href: '/matters', label: 'Matter', icon: Scale, permission: 'matter.read', firmOnly: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/settings/firm', label: 'Firm', icon: Building1, permission: 'firm.read' },
      { href: '/settings/profile', label: 'Profile', icon: User },
    ],
  },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SETTINGS_SECTIONS: Record<string, string> = {
  '/settings/firm': 'Firm',
  '/settings/firm/domains': 'Domains',
  '/settings/profile': 'Profile',
};

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string, firmName: string): BreadcrumbEntry[] {
  const root: BreadcrumbEntry = { label: firmName, href: '/matters' };

  const section = SETTINGS_SECTIONS[pathname];
  if (section) {
    const trail: BreadcrumbEntry[] = [root, { label: 'Settings', href: '/settings/firm' }];
    if (pathname === '/settings/firm') return [...trail, { label: 'Firm' }];
    if (pathname.startsWith('/settings/firm/')) {
      return [...trail, { label: 'Firm', href: '/settings/firm' }, { label: section }];
    }
    return [...trail, { label: section }];
  }

  if (pathname === '/matters') return [root, { label: 'Matter' }];

  return [root];
}
